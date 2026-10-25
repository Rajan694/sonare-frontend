import { useEffect } from 'react';
import { create } from 'zustand';
import { SonareLibrary } from '../native/SonareLibrary';
import { mediaIdFor, useLocalMusicStore } from './localMusic';
import { useDownloadsStore } from './downloads';
import { artworkUrl, type ArtSize } from '../data/config';
import type { Track } from '../data/types';

interface DeviceArtStore {
  /** MediaStore row id -> file:// URI of cached JPEG cover, or null when the song has no artwork */
  cache: Record<string, string | null>;
  /** Requests artwork for a batch of mediaIds (debounced ~100ms, chunked <= 50) */
  request: (mediaIds: string[]) => void;
  clear: () => void;
}

const DEBOUNCE_MS = 100;
const BATCH_SIZE = 50;

let pendingIds = new Set<string>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const flushQueue = async (get: () => DeviceArtStore, set: (state: Partial<DeviceArtStore>) => void) => {
  const idsToFetch = Array.from(pendingIds);
  pendingIds.clear();
  debounceTimer = null;

  if (idsToFetch.length === 0) return;

  for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
    const chunk = idsToFetch.slice(i, i + BATCH_SIZE);
    try {
      const results = await SonareLibrary.artworkFor(chunk);
      set({
        cache: {
          ...get().cache,
          ...chunk.reduce<Record<string, string | null>>((acc, id) => {
            acc[id] = results[id] ?? null;
            return acc;
          }, {}),
        },
      });
    } catch {
      set({
        cache: {
          ...get().cache,
          ...chunk.reduce<Record<string, string | null>>((acc, id) => {
            acc[id] = null;
            return acc;
          }, {}),
        },
      });
    }
  }
};

export const useDeviceArtStore = create<DeviceArtStore>((set, get) => ({
  cache: {},
  request: (mediaIds: string[]) => {
    const { cache } = get();
    let hasNew = false;
    for (const id of mediaIds) {
      if (id && !(id in cache) && !pendingIds.has(id)) {
        pendingIds.add(id);
        hasNew = true;
      }
    }
    if (!hasNew) return;

    if (!debounceTimer) {
      debounceTimer = setTimeout(() => {
        void flushQueue(get, set);
      }, DEBOUNCE_MS);
    }
  },
  clear: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingIds.clear();
    set({ cache: {} });
  },
}));

/**
 * Returns the cover art URI (file://...) for a phone song (local or downloaded).
 * Queries the device art store with debounced batching and memoizes the result.
 */
export const useDeviceArt = (track?: Track | null): string | undefined => {
  const trackId = track?.id;

  // Re-render when the device songs list or downloads change
  useLocalMusicStore((s) => s.songs);
  useDownloadsStore((s) => (trackId ? s.items[trackId] : undefined));

  const mediaId = trackId ? mediaIdFor(trackId) : null;

  const isCached = useDeviceArtStore((s) => (mediaId ? mediaId in s.cache : false));
  const uri = useDeviceArtStore((s) => (mediaId ? s.cache[mediaId] : undefined));

  useEffect(() => {
    if (mediaId && !isCached) {
      useDeviceArtStore.getState().request([mediaId]);
    }
  }, [mediaId, isCached]);

  return uri ?? undefined;
};

/** A track's artwork: a phone song's own embedded cover when it has one, else the catalogue's. */
export const useTrackArtwork = (track: Track | null | undefined, size: ArtSize): string | undefined => {
  const deviceArt = useDeviceArt(track);
  return deviceArt ?? artworkUrl(track, size);
};
