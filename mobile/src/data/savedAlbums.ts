import { useEffect, useState } from 'react';
import { api } from './api';
import { requireAccount } from './accountGate';
import { useAuthStore } from './auth';
import { useAsync } from './hooks';
import type { AlbumMeta } from './types';

/**
 * Whether the album (or YouTube playlist, which the server saves the same way) with `id`
 * is in the signed-in user's library, and a toggle that saves or removes it. Guests are
 * sent to sign in first. `meta` goes with a save: the backend may never have seen it.
 */
export const useSavedAlbum = (id: string, reason: string, meta?: AlbumMeta) => {
  // Saved albums are per account: read them for whoever is signed in.
  const userId = useAuthStore((state) => state.user?.id);
  const saved = useAsync(async () => api.libraryAlbums(), [userId], { enabled: !!userId });
  const [override, setOverride] = useState<boolean | null>(null);
  useEffect(() => setOverride(null), [id, userId]);
  const isSaved = override ?? !!saved.data?.items?.some((a) => a.id === id);

  const toggle = () =>
    requireAccount(reason, async () => {
      const next = !isSaved;
      setOverride(next);
      try {
        await api.setAlbumFavourite(id, next, meta);
      } catch {
        setOverride(!next);
      }
    });

  return { isSaved, toggle };
};
