import { Platform } from 'react-native';

const DEV_API_ORIGIN =
  Platform.OS === 'android' ? 'http://10.0.2.2:3010' : 'http://127.0.0.1:3010';
const PROD_API_ORIGIN = 'https://api.sonare.example'; // TODO(release): set the real HTTPS API origin
export const API_ORIGIN = __DEV__ ? DEV_API_ORIGIN : PROD_API_ORIGIN;
export const API_BASE = `${API_ORIGIN}/api/v1`;

/** The API returns artwork and stream urls as paths; the app needs them absolute. */
export function absoluteUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^(https?|file):\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

type ArtSize = 64 | 140 | 300 | 640;

/** Absolute artwork url for anything with a `thumbnail`, at the nearest server size. */
export function artworkUrl(
  item?: { thumbnail?: string } | null,
  size: ArtSize = 140,
): string | undefined {
  const url = absoluteUrl(item?.thumbnail);
  if (!url || !url.includes('/artwork') || url.includes('size=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}size=${size}`;
}
