import { useEffect, useRef } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../api/hooks';
import { useModeStore } from '../../store/modeContext';
import { useAppDispatch, useAppSelector } from '../../store';
import { setYouMayLike, type YouMayLikeSongs } from '../../store/aiSlice';
import { resolvePicks } from '../../../../shared/ai/resolvePicks';
import type { Track } from '../../types';

/**
 * The AI features show only when the backend has a provider answering (GET /app-config `ai`),
 * someone is signed in (every AI call but titles needs an account) and the app is online.
 */
export const useAiEnabled = (): boolean => {
  const available = useAppSelector((state) => state.ai.available);
  const { user } = useAuth();
  const { mode } = useModeStore();
  return available && !!user && mode === 'online';
};

/** Fewer songs found than this and the section isn't worth showing. */
export const MIN_SONGS = 3;

/**
 * "You may like": the AI's picks for this user, found with the app's own search, once per
 * session (kept in the store). Songs in `exclude` (already on Home) are left out. Empty while
 * loading, when AI is off, or when too few were found.
 */
export const useYouMayLike = (exclude: readonly Track[]): YouMayLikeSongs | null => {
  const enabled = useAiEnabled();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const saved = useAppSelector((state) => state.ai.youMayLike);
  const userId = user?.id ?? null;
  const have = !!userId && saved?.userId === userId;
  // Read when the search starts; Home's lists may still be loading, and that's fine.
  const excludeRef = useRef(exclude);
  excludeRef.current = exclude;

  useEffect(() => {
    if (!enabled || !userId || have) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const answer = await api.aiYouMayLike();
        const found = answer.picks.length
          ? await resolvePicks(answer.picks, (q) => api.songSearch(q), {
              limit: 12,
              exclude: new Set(excludeRef.current.map((t) => t.id)),
              signal: controller.signal,
            })
          : [];
        if (controller.signal.aborted) return;
        dispatch(
          setYouMayLike({
            userId,
            generatedAt: answer.generatedAt,
            basedOn: answer.basedOn,
            songs: found.map(({ track, pick }) => (pick.reason ? { track, reason: pick.reason } : { track })),
          }),
        );
      } catch {
        // Nothing to show. AI_UNAVAILABLE also hides AI until app-config says it's back,
        // and it is asked again then.
      }
    })();
    return () => controller.abort();
  }, [enabled, userId, have, dispatch]);

  return enabled && have && saved && saved.songs.length >= MIN_SONGS ? saved : null;
};

/** "A, B and C". */
export const joinNames = (names: readonly string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
