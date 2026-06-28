import Constants from 'expo-constants';

/** Set `extra.betaMode` to false in app.json when leaving private beta. */
export const BETA_MODE =
  Constants.expoConfig?.extra?.betaMode !== false &&
  process.env.EXPO_PUBLIC_BETA_MODE !== 'false';

export const BETA_WELCOME_STORAGE_KEY = 'prayercare_beta_welcome_seen';
