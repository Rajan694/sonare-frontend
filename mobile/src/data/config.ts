import { Platform } from 'react-native';

// The Android emulator reaches the host machine's localhost through 10.0.2.2. A physical
// phone needs the machine's LAN IP here instead (and the backend reachable on it).
const HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

export const API_ORIGIN = `http://${HOST}:3010`;
export const API_BASE = `${API_ORIGIN}/api/v1`;

/** The API returns artwork and stream urls as paths; the app needs them absolute. */
export function absoluteUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^(https?|file):\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

type ArtSize = 64 | 140 | 300 | 640;

/** Absolute artwork url for anything with a `thumbnail`, at the nearest server size. */
export function artworkUrl(item?: { thumbnail?: string } | null, size: ArtSize = 140): string | undefined {
  const url = absoluteUrl(item?.thumbnail);
  if (!url || !url.includes('/artwork') || url.includes('size=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}size=${size}`;
}
