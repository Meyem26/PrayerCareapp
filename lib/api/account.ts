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
    return {
      error:
        error.message ??
        'Could not delete your account. Check that the delete-account function is deployed.',
    };
  }

  if (data?.error) {
    return { error: String(data.error) };
  }

  return { error: null };
}
