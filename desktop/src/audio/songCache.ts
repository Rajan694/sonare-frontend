import { CAPS } from '../lib/caps';

// The web build's song cache: public/sw.js saves each song the browser streams whole, and
// plays it from there next time (no stream lookup, no download). The desktop window has its
// own stream cache (youtube/streamCache.ts). Keep the names in step with public/sw.js.

const CACHE = 'sonare-songs-v1';
const SONG_PREFIX = '/__sonare_song/';
const INDEX_URL = '/__sonare_song_index';
export const MAX_SONG_CACHE_BYTES = 100_000_000;

/** One entry per song and quality, like the Android app's stream cache (urls change every time). */
export const songCacheKey = (trackId: string, quality: string): string => `${trackId}:${quality}`;

/** The service worker is in charge of this page, so tagged streams get saved and saved songs play. */
const active = (): boolean =>
  CAPS.songCache &&
  typeof caches !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !!navigator.serviceWorker?.controller;

const openCache = () => caches.open(CACHE);

export const songCache = {
  /** Starts the service worker (web build only). Songs are saved from the next page load on. */
  register: (): void => {
    if (!CAPS.songCache || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[song-cache] service worker not registered:', err instanceof Error ? err.message : err);
    });
  },

  /** Where to play a saved song from, or null when it isn't saved. */
  savedSrc: async (key: string): Promise<string | null> => {
    if (!active()) return null;
    try {
      const hit = await (await openCache()).match(SONG_PREFIX + encodeURIComponent(key));
      return hit ? SONG_PREFIX + encodeURIComponent(key) : null;
    } catch {
      return null;
    }
  },

  /** The stream url, tagged so the service worker saves the song once it has arrived whole. */
  tag: (url: string, key: string): string => {
    if (!active()) return url;
    try {
      const tagged = new URL(url, location.href);
      tagged.searchParams.set('sonare_ck', key);
      return tagged.toString();
    } catch {
      return url;
    }
  },

  /** Forgets one song (it failed to play from the cache). */
  remove: async (key: string): Promise<void> => {
    if (typeof caches === 'undefined') return;
    await (await openCache()).delete(SONG_PREFIX + encodeURIComponent(key)).catch(() => false);
  },

  /** What the cache holds, in bytes. */
  bytes: async (): Promise<number> => {
    if (typeof caches === 'undefined') return 0;
    try {
      const res = await (await openCache()).match(INDEX_URL);
      const index = res ? ((await res.json()) as Record<string, { size: number }>) : {};
      return Object.values(index).reduce((sum, e) => sum + (e.size || 0), 0);
    } catch {
      return 0;
    }
  },

  clear: async (): Promise<void> => {
    if (typeof caches === 'undefined') return;
    await caches.delete(CACHE);
  },
};
