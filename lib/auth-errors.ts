/** Map Supabase Auth errors to calm, user-facing copy (never show raw API text). */

export function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes('email_provider_disabled') ||
    lower.includes('email is disabled') ||
    lower.includes('signup is disabled') ||
    lower.includes('signup_disabled') ||
    lower.includes('signups are disabled')
  ) {
    return 'Account creation is temporarily unavailable. Please try again later or contact the PrayerCare team.';
  }

  if (lower.includes('user_already_exists') || lower.includes('already registered')) {
    return 'An account already exists for this email. Try Sign In instead, or use Forgot password.';
  }

  if (lower.includes('weak_password') || lower.includes('password')) {
    return 'Please choose a stronger password (at least 8 characters).';
  }

  if (lower.includes('invalid_email') || lower.includes('valid email')) {
    return 'Please enter a valid email address.';
  }

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  if (message.length < 120) {
    return message;
  }

  return 'Something went wrong. Please try again in a moment.';
}
