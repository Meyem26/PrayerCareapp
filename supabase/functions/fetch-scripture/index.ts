import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { getTranslationConfig, normalizeReference, resolveTranslationForFetch } from './catalog.ts';
import { getScriptureProvider } from './providers/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    const apiBibleKey = Deno.env.get('API_BIBLE_KEY');

    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Not authenticated.' }, 401);
    }

    const body = (await req.json()) as { reference?: string; translationId?: string };
    const reference = body.reference?.trim();
    const preferredTranslationId = body.translationId ?? 'WEB';

    if (!reference) {
      return jsonResponse({ error: 'Scripture reference is required.' }, 400);
    }

    const translation = resolveTranslationForFetch(preferredTranslationId);
    const normalized = normalizeReference(reference);
    const preferred = getTranslationConfig(preferredTranslationId);
    const usedFallback = Boolean(preferred && !preferred.autoFetch);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: cached } = await supabaseAdmin
      .from('scripture_api_cache')
      .select('text')
      .eq('translation_id', translation.id)
      .eq('reference_normalized', normalized)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached?.text) {
      return jsonResponse({
        reference,
        text: cached.text,
        translation_id: translation.id,
        provider: translation.provider,
        cached: true,
        fallback_from: usedFallback ? preferredTranslationId : null,
      });
    }

    let provider;
    try {
      provider = getScriptureProvider(translation.provider, apiBibleKey);
    } catch (providerError) {
      return jsonResponse({ error: (providerError as Error).message }, 503);
    }

    let result;
    try {
      result = await provider.fetchPassage(reference, translation);
    } catch (fetchError) {
      return jsonResponse({ error: (fetchError as Error).message }, 502);
    }

    await supabaseAdmin.from('scripture_api_cache').upsert(
      {
        translation_id: translation.id,
        reference_normalized: normalized,
        text: result.text,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'translation_id,reference_normalized' },
    );

    return jsonResponse({
      reference: result.reference,
      text: result.text,
      translation_id: result.translation_id,
      provider: result.provider,
      cached: false,
      fallback_from: usedFallback ? preferredTranslationId : null,
    });
  } catch (error) {
    console.error('fetch-scripture error:', error);
    return jsonResponse({ error: 'Unexpected server error.' }, 500);
  }
});
