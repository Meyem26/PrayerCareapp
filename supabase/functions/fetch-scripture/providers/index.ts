import { ApiBibleProvider } from './api-bible.ts';
import { BibleApiComProvider } from './bible-api-com.ts';
import type { ScriptureProvider } from '../catalog.ts';

export function getScriptureProvider(
  providerId: string,
  apiBibleKey?: string | null,
): ScriptureProvider {
  if (providerId === 'api-bible') {
    if (!apiBibleKey) {
      throw new Error('API_BIBLE_KEY is not configured for licensed translations.');
    }
    return new ApiBibleProvider(apiBibleKey);
  }

  return new BibleApiComProvider();
}
