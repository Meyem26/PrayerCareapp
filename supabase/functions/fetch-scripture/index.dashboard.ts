/**
 * Dashboard deploy — paste ALL of this into Supabase Edge Functions editor.
 * Function name: fetch-scripture
 * No secrets required (uses free bible-api.com).
 * Optional secret: API_BIBLE_KEY (licensed translations only)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BIBLE_API_COM_BASE = 'https://bible-api.com';
const API_BIBLE_BASE = 'https://api.scripture.api.bible/v1';

type TranslationConfig = {
  id: string;
  provider: 'bible-api-com' | 'api-bible';
  providerTranslationId: string;
  autoFetch: boolean;
};

const TRANSLATION_CATALOG: TranslationConfig[] = [
  { id: 'WEB', provider: 'bible-api-com', providerTranslationId: 'web', autoFetch: true },
  { id: 'KJV', provider: 'bible-api-com', providerTranslationId: 'kjv', autoFetch: true },
  { id: 'ASV', provider: 'bible-api-com', providerTranslationId: 'asv', autoFetch: true },
  { id: 'NIV', provider: 'api-bible', providerTranslationId: '9879dbb37efb29-04', autoFetch: false },
  { id: 'ESV', provider: 'api-bible', providerTranslationId: '214377fb1782388-01', autoFetch: false },
  { id: 'CSB', provider: 'api-bible', providerTranslationId: '6614b0b05011c8b8-01', autoFetch: false },
  { id: 'LSG', provider: 'api-bible', providerTranslationId: 'a761ca71e0b3ddcf-01', autoFetch: false },
];

const DEFAULT_TRANSLATION_ID = 'WEB';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeReference(reference: string): string {
  return reference.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getTranslationConfig(id: string): TranslationConfig | undefined {
  return TRANSLATION_CATALOG.find((t) => t.id === id);
}

function resolveTranslationForFetch(preferredId: string): TranslationConfig {
  const preferred = getTranslationConfig(preferredId);
  if (preferred?.autoFetch) return preferred;
  return getTranslationConfig(DEFAULT_TRANSLATION_ID)!;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchFromBibleApiCom(
  reference: string,
  translation: TranslationConfig,
): Promise<{ reference: string; text: string; translation_id: string; provider: string }> {
  const path = encodeURIComponent(reference.trim());
  const url = `${BIBLE_API_COM_BASE}/${path}?translation=${translation.providerTranslationId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      'Could not fetch verse. Check the reference format (e.g. John 3:16 or Philippians 4:6-7).',
    );
  }

  const json = await response.json();
  const text = typeof json.text === 'string' ? json.text.trim() : '';

  if (!text) {
    throw new Error(
      `No verse found for "${reference}". Try a format like John 3:16 or Philippians 4:6-7.`,
    );
  }

  return {
    reference: json.reference ?? reference,
    text,
    translation_id: translation.id,
    provider: 'bible-api-com',
  };
}

async function fetchFromApiBible(
  reference: string,
  translation: TranslationConfig,
  apiKey: string,
): Promise<{ reference: string; text: string; translation_id: string; provider: string }> {
  const searchUrl = `${API_BIBLE_BASE}/bibles/${translation.providerTranslationId}/search?query=${encodeURIComponent(reference)}&limit=5`;
  const response = await fetch(searchUrl, { headers: { 'api-key': apiKey } });

  if (!response.ok) {
    throw new Error(
      'Could not fetch verse from API.Bible. Check your API key and translation license.',
    );
  }

  const searchJson = await response.json();
  const verses = searchJson?.data?.verses ?? searchJson?.data?.passages ?? [];
  let text = '';

  if (Array.isArray(verses) && verses.length > 0) {
    text = stripHtml(verses[0].text ?? verses[0].content ?? '');
  }

  if (!text && Array.isArray(searchJson?.data?.passages) && searchJson.data.passages[0]?.content) {
    text = stripHtml(searchJson.data.passages[0].content);
  }

  if (!text) {
    throw new Error(
      `No verse found for "${reference}". Try a format like John 3:16 or Philippians 4:6-7.`,
    );
  }

  return { reference, text, translation_id: translation.id, provider: 'api-bible' };
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
    const preferredTranslationId = body.translationId ?? DEFAULT_TRANSLATION_ID;

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

    let result;
    try {
      if (translation.provider === 'api-bible') {
        if (!apiBibleKey) {
          return jsonResponse({ error: 'API_BIBLE_KEY is not configured for licensed translations.' }, 503);
        }
        result = await fetchFromApiBible(reference, translation, apiBibleKey);
      } else {
        result = await fetchFromBibleApiCom(reference, translation);
      }
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
