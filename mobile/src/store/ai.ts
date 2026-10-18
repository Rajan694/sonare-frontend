import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { getAppConfig, subscribeAppConfig } from '../youtube/appConfig';
import { useAuthStore } from '../data/auth';
import { useModeStore } from './mode';
import { api } from '../data/api';
import { resolvePicks } from '../../../shared/ai/resolvePicks';
import type { Track } from '../data/types';

// AI features (src/components/ai): whether the backend has an AI provider answering
// (GET /app-config `ai`), and "You may like" once found, so going back to Home doesn't search
// for every song again.

export interface YouMayLikeSongs {
  userId: string;
  generatedAt: number;
  basedOn: string[];
  /** Each song with the AI's reason for it, in the AI's order. */
  songs: { track: Track; reason?: string }[];
}

interface AiStore {
  available: boolean;
  youMayLike: YouMayLikeSongs | null;
  setAvailable: (available: boolean) => void;
  setYouMayLike: (found: YouMayLikeSongs | null) => void;
}

export const useAiStore = create<AiStore>((set) => ({
  available: getAppConfig().ai === true,
  youMayLike: null,
  setAvailable: (available) => set({ available }),
  setYouMayLike: (youMayLike) => set({ youMayLike }),
}));

// Every app-config the phone reads (cached at start, then polled) says whether AI is on.
subscribeAppConfig((config) => useAiStore.getState().setAvailable(config.ai === true));

/**
 * The AI features show only when the backend has a provider answering, someone is signed in
 * (every AI call but titles needs an account) and the app is in Online mode.
 */
export const useAiEnabled = (): boolean => {
  const available = useAiStore((s) => s.available);
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const online = useModeStore((s) => s.mode === 'online');
  return available && signedIn && online;
};

/** Fewer songs found than this and the section isn't worth showing. */
export const MIN_SONGS = 3;

/**
 * "You may like": the AI's picks for this user, found with the app's own search, once per
 * session (kept in the store). Songs in `exclude` (already on Home) are left out. Null while
 * loading, when AI is off, or when too few were found.
 */
export const useYouMayLike = (exclude: readonly Track[]): YouMayLikeSongs | null => {
  const enabled = useAiEnabled();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const saved = useAiStore((s) => s.youMayLike);
  const have = !!userId && saved?.userId === userId;
  // Read when the search starts; Home's lists may still be loading, and that's fine.
  const excludeRef = useRef(exclude);
  excludeRef.current = exclude;

  useEffect(() => {
    if (!enabled || !userId || have) return;
    const controller = new AbortController();
    (async () => {
      try {
        const answer = await api.aiYouMayLike();
        const found = answer.picks.length
          ? await resolvePicks(answer.picks, api.songSearch, {
              limit: 12,
              exclude: new Set(excludeRef.current.map((t) => t.id)),
              signal: controller.signal,
            })
          : [];
        if (controller.signal.aborted) return;
        useAiStore.getState().setYouMayLike({
          userId,
          generatedAt: answer.generatedAt,
          basedOn: answer.basedOn,
          songs: found.map(({ track, pick }) => (pick.reason ? { track, reason: pick.reason } : { track })),
        });
      } catch {
        // Nothing to show. AI_UNAVAILABLE also hides AI until app-config says it's back,
        // and it is asked again then.
      }
    })();
    return () => controller.abort();
  }, [enabled, userId, have]);

  return enabled && have && saved && saved.songs.length >= MIN_SONGS ? saved : null;
};

/** "A, B and C". */
export const joinNames = (names: readonly string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
