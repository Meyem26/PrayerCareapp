import Constants from 'expo-constants';

/**
 * Private beta gate (waitlist, welcome modal, feedback FAB).
 * Opt-in only: set `extra.betaMode: true` or `EXPO_PUBLIC_BETA_MODE=true`.
 * Public launch keeps this false.
 */
export const BETA_MODE =
  Constants.expoConfig?.extra?.betaMode === true ||
  process.env.EXPO_PUBLIC_BETA_MODE === 'true';

export const BETA_WELCOME_STORAGE_KEY = 'prayercare_beta_welcome_seen';

export const LANDING_URL =
  process.env.EXPO_PUBLIC_LANDING_URL ?? 'https://www.prayercare.online';

export const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'https://app.prayercare.online';

/** Expo Router path — use with WEB_APP_URL for invite links. */
export const APP_SIGN_UP_PATH = '/sign-up';

export function getAppSignUpUrl(): string {
  return `${WEB_APP_URL.replace(/\/$/, '')}${APP_SIGN_UP_PATH}`;
}

export function getGroupJoinUrlByCode(inviteCode: string): string {
  return `${WEB_APP_URL.replace(/\/$/, '')}/groups/join?code=${encodeURIComponent(inviteCode)}`;
}

export function getGroupJoinUrlByToken(token: string): string {
  return `${WEB_APP_URL.replace(/\/$/, '')}/groups/join?token=${encodeURIComponent(token)}`;
}
