import { ensureAuthenticated } from '@/lib/auth-session';
import { supabase } from '@/lib/supabase';

/**
 * Permanently deletes the signed-in account and personal data via Edge Function.
 * Requires deployed `delete-account` function with service role.
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) {
    return { error: authError };
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: 'DELETE' },
  });

  if (error) {
    const raw = error.message ?? '';
    const looksMissing =
      /failed to send|fetch|network|404|not found|edge function/i.test(raw);
    return {
      error: looksMissing
        ? 'Account deletion is not available yet. Deploy the delete-account Edge Function in Supabase, then try again.'
        : raw || 'Could not delete your account. Please try again.',
    };
  }

  if (data?.error) {
    return { error: String(data.error) };
  }

  return { error: null };
}
