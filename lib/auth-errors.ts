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

  if (
    lower.includes('error sending confirmation') ||
    lower.includes('error sending recovery') ||
    lower.includes('error sending magic link') ||
    lower.includes('smtp') ||
    lower.includes('unable to send')
  ) {
    return 'We could not send the confirmation email. Check spam, or try again later. If this keeps happening, email delivery needs to be fixed in Supabase (SMTP).';
  }

  if (lower.includes('database error') || lower.includes('database_error')) {
    return 'Account setup failed on our side. Please try again in a moment, or contact the PrayerCare team.';
  }

  if (lower.includes('weak_password') || (lower.includes('password') && lower.includes('least'))) {
    return 'Please choose a stronger password (at least 8 characters).';
  }

  if (lower.includes('invalid_email') || lower.includes('valid email')) {
    return 'Please enter a valid email address.';
  }

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  // App-authored messages (waitlist, etc.) — never replace with a generic fallback.
  if (
    lower.includes('beta waitlist') ||
    lower.includes('beta access') ||
    lower.includes('join on') ||
    lower.includes('create your account')
  ) {
    return message;
  }

  if (message.length < 120) {
    return message;
  }

  // Keep a short usable hint instead of hiding all long API errors.
  const firstSentence = message.split(/[.\n]/)[0]?.trim();
  if (firstSentence && firstSentence.length < 120) {
    return `${firstSentence}. Please try again, or contact the PrayerCare team if it continues.`;
  }

  return 'Something went wrong. Please try again in a moment.';
}
