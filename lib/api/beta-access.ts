/**
 * @deprecated Signup no longer checks the beta waitlist.
 * Kept for reference / admin tooling only.
 */
export async function canCreateBetaAccount(_email: string): Promise<{
  allowed: boolean;
  error: string | null;
}> {
  return { allowed: true, error: null };
}
