import { setKeyValue } from './offlineDb';

const LEGACY_KEYS = [
  'novel-ai-history',
  'novel-ai-knowledge',
  'novel-ai-style-templates',
  'novel-ai-custom-story-templates'
] as const;

const MIGRATION_FLAG = 'novel-ai-migration-version';
const CURRENT_VERSION = '1';

const safeParse = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

export async function migrateLegacyLocalStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  const version = window.localStorage.getItem(MIGRATION_FLAG);
  if (version === CURRENT_VERSION) {
    return;
  }

  await Promise.all(
    LEGACY_KEYS.map(async (key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return;
      }
      const parsed = safeParse(raw);
      await setKeyValue(key, parsed);
      window.localStorage.removeItem(key);
    })
  );

  window.localStorage.setItem(MIGRATION_FLAG, CURRENT_VERSION);
}




