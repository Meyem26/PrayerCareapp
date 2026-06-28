import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { BETA_WELCOME_STORAGE_KEY } from '@/constants/beta';

async function readFlag(key: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(key) === '1';
  }
  const value = await SecureStore.getItemAsync(key);
  return value === '1';
}

async function writeFlag(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, '1');
    }
    return;
  }
  await SecureStore.setItemAsync(key, '1');
}

export async function hasSeenBetaWelcome(): Promise<boolean> {
  return readFlag(BETA_WELCOME_STORAGE_KEY);
}

export async function markBetaWelcomeSeen(): Promise<void> {
  await writeFlag(BETA_WELCOME_STORAGE_KEY);
}
