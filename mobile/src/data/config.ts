import { isDevApk } from '../native/SonareBuild';
import { directImageUrl, sizedImageUrl } from '../../../shared/catalog/images';

/**
 * Where the Sonare API is.
 *
 * Debug builds use `localhost:3010`, carried to the computer over USB by
 * `adb reverse tcp:3010 tcp:3010` (../runFE.sh mobile sets it up, like it does for Metro).
 * That works the same on the emulator and on a phone, and keeps working when the
 * emulator's network is cut to test Offline Mode. Release builds talk to the production API.
 * There is no setting for it in the app.
 */
const DEV_API_ORIGIN = 'http://localhost:3010';
// Production API.
const PROD_API_ORIGIN = 'https://api.sonare.vip';
export const DEFAULT_API_ORIGIN = __DEV__ ? DEV_API_ORIGIN : PROD_API_ORIGIN;
/** Plain http is for development: debug builds and dev APKs (`./buildFE.sh dev android`). */
export const ALLOWS_HTTP = __DEV__ || isDevApk;

const origin = DEFAULT_API_ORIGIN;

/** The API origin in use, e.g. `http://localhost:3010`. */
export const apiOrigin = (): string => {
  return origin;
};

/** `${apiOrigin()}/api/v1`. */
export const apiBase = (): string => {
  return `${origin}/api/v1`;
};

/** The API returns artwork and stream urls as paths; the app needs them absolute. */
export const absoluteUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (/^(https?|file):\/\//.test(path)) return path;
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

export type ArtSize = 64 | 140 | 300 | 640;

/** Absolute artwork url for anything with a `thumbnail`, at the nearest server size. */
export const artworkUrl = (item?: { thumbnail?: string } | null, size: ArtSize = 140): string | undefined => {
  const url = absoluteUrl(item?.thumbnail);
  if (!url) return undefined;
  const direct = directImageUrl(url);
  if (direct && /^https?:\/\//i.test(direct) && !direct.includes('/artwork')) {
    return sizedImageUrl(direct, size);
  }
  if (!url.includes('/artwork') || url.includes('size=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}size=${size}`;
};
