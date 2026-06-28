/**
 * Dashboard deploy version — paste ALL of this into Supabase Edge Functions editor.
 * Function name must be: generate-prayer
 *
 * Supabase Dashboard → Edge Functions → Create function → name: generate-prayer
 * Replace the default code with this entire file, then Deploy.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const AI_PRAYER_SYSTEM_PROMPT = `You are a compassionate Christian prayer assistant for PrayerCare.

Your role is to help users express their burdens in biblical, heartfelt prayer.

Rules:
- Write respectful Christian prayers that naturally end in the name of Jesus (e.g. "In Jesus' name, Amen").
- Ground every prayer in Scripture — include an appropriate reference and full verse text.
- Be encouraging, compassionate, and theologically balanced.
- Never use prosperity-gospel language or promises Scripture does not make.
- Never speak with divine authority or claim to speak for God.
- Never replace Scripture with AI opinions — Scripture stands on its own.
- Output valid JSON only, no markdown or code fences.`;

const AI_PRAYER_USER_PROMPT = (userInput: string, translationId: string) =>
  `The user shared what's on their heart:

"""
${userInput.trim()}
"""

Preferred Bible translation: ${translationId}

Generate a prayer package with:
1. title — short and meaningful
2. prayer_point — one sentence summary of the request
3. prayer_text — a personal prayer (3–5 sentences), ending naturally in Jesus' name
4. scripture_reference — e.g. "Philippians 4:6-7"
5. scripture_text — full verse(s) from the preferred translation

Respond as JSON:
{
  "title": "...",
  "prayer_point": "...",
  "prayer_text": "...",
  "scripture_reference": "...",
  "scripture_text": "..."
}`;

const AI_VERSE_SYSTEM_PROMPT = `You are a Scripture assistant for PrayerCare.
Suggest one Bible verse that genuinely supports the prayer context.
Be theologically sound. Never use prosperity-gospel language.
Output valid JSON only, no markdown or code fences.`;

const AI_VERSE_USER_PROMPT = (
  title: string,
  prayerPoint: string,
  translationId: string,
) => `Prayer context:
Title: ${title}
Point: ${prayerPoint}
Preferred translation: ${translationId}

Suggest one encouraging Bible verse that genuinely supports this prayer.

Respond as JSON:
{
  "reference": "...",
  "text": "..."
}`;

function parseJsonFromModel(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

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

    await supabase.from('ai_generation_logs').insert({
      user_id: user.id,
      generation_type: generationType,
    });

    if (body.type === 'verse') {
      const reference = String(parsed.reference ?? '').trim();
      const text = String(parsed.text ?? '').trim();
      if (!reference || !text) {
        return jsonResponse({ error: 'AI verse response was incomplete.' }, 502);
      }
      return jsonResponse({ reference, text });
    }

    const title = String(parsed.title ?? '').trim();
    const prayer_point = String(parsed.prayer_point ?? parsed.prayerPoint ?? '').trim();
    const prayer_text = String(parsed.prayer_text ?? parsed.prayerText ?? '').trim();
    const scripture_reference = String(
      parsed.scripture_reference ?? parsed.scriptureReference ?? '',
    ).trim();
    const scripture_text = String(parsed.scripture_text ?? parsed.scriptureText ?? '').trim();

    if (!title || !prayer_text) {
      return jsonResponse({ error: 'AI prayer response was incomplete.' }, 502);
    }

    return jsonResponse({
      title,
      prayer_point,
      prayer_text,
      scripture_reference,
      scripture_text,
    });
  } catch (error) {
    console.error('generate-prayer error:', error);
    return jsonResponse({ error: 'Unexpected server error.' }, 500);
  }
});
