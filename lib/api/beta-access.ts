import { BETA_MODE } from '@/constants/beta';
import { supabase } from '@/lib/supabase';

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
    if (error.message.includes('is_on_beta_waitlist')) {
      return {
        allowed: false,
        error: 'Beta access check is not set up yet. Run migration 017 in Supabase.',
      };
    }
    return { allowed: false, error: error.message };
  }

  if (!data) {
    return {
      allowed: false,
      error:
        'This email is not on the beta waitlist yet. Join at our website first, then create your account with the same email.',
    };
  }

  return { allowed: true, error: null };
}
