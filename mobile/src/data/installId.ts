/**
 * Anonymous install identifier sent as X-Sonare-Install on every backend request.
 *
 * The id is a UUID v4 created once per install and stored in AsyncStorage so it
 * survives restarts. It contains no personal data and is not linked to any account;
 * it lets the backend count distinct devices without tracking individuals.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sonare_install_id';

// Cached in memory so every request after the initial read is instant.
let cached: string | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Load the install id at app start-up.
 *
 * Reads AsyncStorage once. If an id is already stored, adopts it. If nothing is
 * stored, persists either the temporary id created by an early getInstallId()
 * call or generates and saves a fresh one. Never overwrites a stored id.
 */
export const initInstallId = (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        cached = stored;
      } else {
        const id = cached ?? crypto.randomUUID();
        cached = id;
        await AsyncStorage.setItem(STORAGE_KEY, id);
      }
    } catch {
      // AsyncStorage read failed; keep using temporary in-memory id.
      if (!cached) {
        cached = crypto.randomUUID();
      }
    }
  })();

  return initPromise;
};

/**
 * Return the install id synchronously.
 *
 * Before the stored value has been read, hands out a temporary in-memory id
 * without writing anything to storage. Once initInstallId resolves, the stored
 * value takes over (or the temporary id is persisted if storage was empty).
 */
export const getInstallId = (): string => {
  if (!cached) {
    cached = crypto.randomUUID();
  }
  if (!initPromise) {
    initInstallId().catch(() => {});
  }
  return cached;
};
