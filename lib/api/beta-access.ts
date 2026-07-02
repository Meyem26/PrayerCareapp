import { BETA_MODE, LANDING_URL } from '@/constants/beta';
import { supabase } from '@/lib/supabase';

const WAITLIST_HELP =
  'This email is not on the beta waitlist yet. Join on our website first, then create your account with the same email.';

const ACCESS_CHECK_UNAVAILABLE =
  "We couldn't verify your beta access right now. Please try again in a few minutes, or join the beta on our website if you haven't yet.";

export async function canCreateBetaAccount(email: string): Promise<{
  allowed: boolean;
  error: string | null;
}> {
  if (!BETA_MODE) {
    return { allowed: true, error: null };
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { allowed: false, error: 'Please enter your email.' };
  }

  const { data, error } = await supabase.rpc('is_on_beta_waitlist', {
    check_email: trimmed,
  });

  if (error) {
    console.warn('Beta waitlist check failed:', error.message);
    return { allowed: false, error: ACCESS_CHECK_UNAVAILABLE };
  }

  if (!data) {
    const siteHost = LANDING_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return {
      allowed: false,
      error: `${WAITLIST_HELP} (${siteHost})`,
    };
  }

  return { allowed: true, error: null };
}
