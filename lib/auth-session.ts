import { supabase } from '@/lib/supabase';

/** Confirm auth; refresh only when session is missing. */
export async function ensureAuthenticated(): Promise<{
  userId: string | null;
  error: string | null;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  const existingUserId = sessionData.session?.user?.id ?? null;

  if (existingUserId) {
    return { userId: existingUserId, error: null };
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    return {
      userId: null,
      error: 'Your session expired. Please sign out and sign in again.',
    };
  }

  const userId = refreshData.session?.user?.id ?? null;
  if (!userId) {
    return {
      userId: null,
      error: 'You must be signed in to continue.',
    };
  }

  return { userId, error: null };
}
