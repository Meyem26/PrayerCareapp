import { DEFAULT_BIBLE_TRANSLATION_ID } from '@/constants/bible-translations';
import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';
import type { FetchedScripture } from '@/types/sermon';

export async function fetchScriptureFromApi(
  reference: string,
  translationId?: string,
): Promise<{ data: FetchedScripture | null; error: string | null }> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: null, error: authError };

  const { data, error } = await supabase.functions.invoke('fetch-scripture', {
    body: { reference: reference.trim(), translationId: translationId ?? DEFAULT_BIBLE_TRANSLATION_ID },
  });

  if (error) {
    return {
      data: null,
      error: error.message ?? 'Could not fetch scripture. Deploy the fetch-scripture Edge Function.',
    };
  }

  if (data?.error) {
    return { data: null, error: String(data.error) };
  }

  return { data: data as FetchedScripture, error: null };
}
