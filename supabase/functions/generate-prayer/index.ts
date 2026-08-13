import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import {
  AI_PRAYER_SYSTEM_PROMPT,
  AI_PRAYER_USER_PROMPT,
  AI_VERSE_SYSTEM_PROMPT,
  AI_VERSE_USER_PROMPT,
  parseJsonFromModel,
} from './prompts.ts';
import { verifyScriptureReference } from './verify-scripture.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 3;
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

type RequestBody = {
  type: 'prayer' | 'verse';
  heart?: string;
  title?: string;
  prayerPoint?: string;
  translationId?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Never return model-authored verse wording — only API-verified text. */
async function attachVerifiedScripture(
  suggestedReference: string,
  translationId: string,
): Promise<{
  scripture_reference: string;
  scripture_text: string;
  scripture_verified: boolean;
  scripture_translation_id: string | null;
  scripture_note: string | null;
}> {
  if (!suggestedReference.trim()) {
    return {
      scripture_reference: '',
      scripture_text: '',
      scripture_verified: false,
      scripture_translation_id: null,
      scripture_note: null,
    };
  }

  const result = await verifyScriptureReference(suggestedReference, translationId);
  if (result.verified) {
    return {
      scripture_reference: result.reference,
      scripture_text: result.text,
      scripture_verified: true,
      scripture_translation_id: result.translation_id,
      scripture_note: null,
    };
  }

  return {
    scripture_reference: '',
    scripture_text: '',
    scripture_verified: false,
    scripture_translation_id: null,
    scripture_note: result.reason,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return jsonResponse({ error: 'OpenAI is not configured on the server.' }, 503);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Not authenticated.' }, 401);
    }

    const body = (await req.json()) as RequestBody;
    const translationId = body.translationId ?? 'WEB';

    const { count, error: countError } = await supabase
      .from('ai_generation_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (countError) {
      console.error('Rate limit check failed:', countError.message);
    } else if ((count ?? 0) >= DAILY_LIMIT) {
      return jsonResponse(
        { error: `Daily AI limit reached (${DAILY_LIMIT} requests). Try again tomorrow.` },
        429,
      );
    }

    let systemPrompt: string;
    let userPrompt: string;
    let generationType: string;

    if (body.type === 'verse') {
      if (!body.title?.trim() || !body.prayerPoint?.trim()) {
        return jsonResponse({ error: 'Title and prayer point are required for verse generation.' }, 400);
      }
      systemPrompt = AI_VERSE_SYSTEM_PROMPT;
      userPrompt = AI_VERSE_USER_PROMPT(body.title, body.prayerPoint, translationId);
      generationType = 'verse';
    } else {
      if (!body.heart?.trim()) {
        return jsonResponse({ error: 'Please share what is on your heart.' }, 400);
      }
      systemPrompt = AI_PRAYER_SYSTEM_PROMPT;
      userPrompt = AI_PRAYER_USER_PROMPT(body.heart, translationId);
      generationType = 'prayer';
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text();
      console.error('OpenAI error:', errText);
      return jsonResponse({ error: 'AI generation failed. Please try again.' }, 502);
    }

    const completion = await openAiResponse.json();
    const content = completion.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      return jsonResponse({ error: 'AI returned an empty response.' }, 502);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonFromModel(content);
    } catch {
      return jsonResponse({ error: 'AI response could not be parsed.' }, 502);
    }

    // Discard any model-authored verse wording immediately (do not trust it).
    delete parsed.scripture_text;
    delete parsed.scriptureText;
    delete parsed.text;

    await supabase.from('ai_generation_logs').insert({
      user_id: user.id,
      generation_type: generationType,
    });

    if (body.type === 'verse') {
      const reference = String(parsed.reference ?? parsed.scripture_reference ?? '').trim();
      if (!reference) {
        return jsonResponse({ error: 'AI did not suggest a Scripture reference. Please try again.' }, 502);
      }

      const verified = await attachVerifiedScripture(reference, translationId);
      if (!verified.scripture_verified || !verified.scripture_text) {
        return jsonResponse(
          {
            error:
              verified.scripture_note ??
              'That Scripture reference could not be verified. Please try again or enter a verse manually.',
          },
          422,
        );
      }

      return jsonResponse({
        reference: verified.scripture_reference,
        text: verified.scripture_text,
        translation_id: verified.scripture_translation_id,
        verified: true,
      });
    }

    const title = String(parsed.title ?? '').trim();
    const prayer_point = String(parsed.prayer_point ?? parsed.prayerPoint ?? '').trim();
    const prayer_text = String(parsed.prayer_text ?? parsed.prayerText ?? '').trim();
    const suggestedRef = String(
      parsed.scripture_reference ?? parsed.scriptureReference ?? '',
    ).trim();

    if (!title || !prayer_text) {
      return jsonResponse({ error: 'AI prayer response was incomplete.' }, 502);
    }

    const scripture = await attachVerifiedScripture(suggestedRef, translationId);

    return jsonResponse({
      title,
      prayer_point,
      prayer_text,
      scripture_reference: scripture.scripture_reference,
      scripture_text: scripture.scripture_text,
      scripture_verified: scripture.scripture_verified,
      scripture_translation_id: scripture.scripture_translation_id,
      scripture_note: scripture.scripture_note,
    });
  } catch (error) {
    console.error('generate-prayer error:', error);
    return jsonResponse({ error: 'Unexpected server error.' }, 500);
  }
});
