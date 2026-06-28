import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';
import type {
  AiGenerateRequest,
  GeneratedPrayer,
  GeneratedVerse,
} from '@/types/ai';

type AiResponse =
  | { data: GeneratedPrayer; error: null }
  | { data: GeneratedVerse; error: null }
  | { data: null; error: string };

export async function generateWithAi(request: AiGenerateRequest): Promise<AiResponse> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase.functions.invoke('generate-prayer', {
    body: request,
  });

  if (error) {
    return {
      data: null,
      error: error.message ?? 'AI request failed. Check that the Edge Function is deployed.',
    };
  }

  if (data?.error) {
    return { data: null, error: String(data.error) };
  }

  if (request.type === 'prayer') {
    return { data: data as GeneratedPrayer, error: null };
  }

  return { data: data as GeneratedVerse, error: null };
}

export async function generatePrayerWithAi(
  heart: string,
  translationId?: string,
): Promise<{ data: GeneratedPrayer | null; error: string | null }> {
  const result = await generateWithAi({ type: 'prayer', heart, translationId });
  return { data: result.data as GeneratedPrayer | null, error: result.error };
}

export async function generateVerseWithAi(
  title: string,
  prayerPoint: string,
  translationId?: string,
): Promise<{ data: GeneratedVerse | null; error: string | null }> {
  const result = await generateWithAi({
    type: 'verse',
    title,
    prayerPoint,
    translationId,
  });
  return { data: result.data as GeneratedVerse | null, error: result.error };
}
