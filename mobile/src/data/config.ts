import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Where the Sonare API is.
 *
 * Debug builds use `localhost:3010`, carried to the computer over USB by
 * `adb reverse tcp:3010 tcp:3010` (../runFE.sh mobile sets it up, like it does for Metro).
 * That works the same on the emulator and on a phone, and keeps working when the
 * emulator's network is cut to test Offline Mode; the old 10.0.2.2 emulator alias only
 * worked on the emulator, and Android 17 gates it behind local-network access.
 *
 * A phone on Wi-Fi without a cable can be pointed at the computer's LAN address in
 * Settings → Server address (saved on the phone, see setServerOrigin).
 */
const DEV_API_ORIGIN = 'http://localhost:3010';
// Production API; the domain is not registered yet.
const PROD_API_ORIGIN = 'https://api.sonare.dev';
export const DEFAULT_API_ORIGIN = __DEV__ ? DEV_API_ORIGIN : PROD_API_ORIGIN;

const STORAGE_KEY = 'sonare.serverOrigin';
let origin = DEFAULT_API_ORIGIN;

/** The API origin in use, e.g. `http://localhost:3010`. */
export const apiOrigin = (): string => {
  return origin;
};

/** `${apiOrigin()}/api/v1`. */
export const apiBase = (): string => {
  return `${origin}/api/v1`;
};

/** A saved custom address, or null when the default is used. */
export const customServerOrigin = (): string | null => {
  return origin === DEFAULT_API_ORIGIN ? null : origin;
};

/**
 * `192.168.1.20:3010` → `http://192.168.1.20:3010`; trailing slashes and `/api/v1` are
 * dropped. Null when it isn't a usable http(s) address.
 */
export const normalizeServerOrigin = (input: string): string | null => {
  let text = input.trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`;
  text = text.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
  const match = /^(https?):\/\/([^/\s:]+)(:\d{1,5})?$/i.exec(text);
  return match ? `${match[1].toLowerCase()}://${match[2]}${match[3] ?? ''}` : null;
};

/** Saves a custom server address; null goes back to the default. */
export const setServerOrigin = async (next: string | null): Promise<void> => {
  origin = next ?? DEFAULT_API_ORIGIN;
  try {
    if (next) await AsyncStorage.setItem(STORAGE_KEY, next);
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Applies until the app restarts.
  }
};

/** Loads the saved address; RootNavigator waits for it before the first request. */
export const loadServerOrigin = async (): Promise<void> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    const valid = saved ? normalizeServerOrigin(saved) : null;
    if (valid) origin = valid;
  } catch {
    // The default stays.
  }
};

/** The API returns artwork and stream urls as paths; the app needs them absolute. */
export const absoluteUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (/^(https?|file):\/\//.test(path)) return path;
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

type ArtSize = 64 | 140 | 300 | 640;

/** Absolute artwork url for anything with a `thumbnail`, at the nearest server size. */
export const artworkUrl = (item?: { thumbnail?: string } | null, size: ArtSize = 140): string | undefined => {
  const url = absoluteUrl(item?.thumbnail);
  if (!url || !url.includes('/artwork') || url.includes('size=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}size=${size}`;
};
