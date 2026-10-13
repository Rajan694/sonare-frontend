import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { requireAccount } from './accountGate';
import type { Track } from '../types';

/**
 * Favourite state that survives across screens.
 *
 * Track lists come from many independent hooks, so a heart toggled in one place would
 * otherwise stay stale everywhere else until that list refetched. This keeps a small
 * overlay of user-made changes that every heart reads on top of the fetched value.
 */

const overrides = new Map<string, boolean>();
const listeners = new Set<() => void>();
const savedListeners = new Set<() => void>();

const emit = () => {
  for (const l of listeners) l();
};

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** The effective favourite state: a local toggle wins over whatever the server last returned. */
export const isFavourite = (trackId: string, serverValue: boolean): boolean => {
  const o = overrides.get(trackId);
  return o === undefined ? serverValue : o;
};

/** `track` goes with a new favourite as its metadata (the backend may not know a song found in-app). */
export const setFavourite = async (trackId: string, next: boolean, track?: Track): Promise<void> => {
  const previous = overrides.get(trackId);
  // Optimistic: flip immediately so the heart feels instant.
  overrides.set(trackId, next);
  emit();
  try {
    await api.setTrackFavourite(trackId, next, track);
    for (const l of savedListeners) l();
  } catch (e) {
    // Roll back to whatever we knew before rather than leaving a lie on screen.
    if (previous === undefined) overrides.delete(trackId);
    else overrides.set(trackId, previous);
    emit();
    throw e;
  }
};

/** Runs `fn` after a heart change reached the server, so lists of favourites can refetch. */
export const onFavouritesSaved = (fn: () => void): (() => void) => {
  savedListeners.add(fn);
  return () => {
    savedListeners.delete(fn);
  };
};

/**
 * For lists that show or hide rows by favourite state: re-renders on every heart toggle
 * and returns the effective-state lookup.
 */
export const useFavouriteLookup = (): typeof isFavourite => {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  return isFavourite;
};

/**
 * Binds one track's heart. `track.favourite` is the value from the fetched track object;
 * the returned state folds in any local toggle.
 */
export const useFavourite = (track: Track | null | undefined) => {
  const [, force] = useState(0);

  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  const trackId = track?.id;
  const serverValue = !!track?.favourite;
  const favourite = trackId ? isFavourite(trackId, serverValue) : false;

  const toggle = useCallback(() => {
    if (!track) return;
    // Favourites live in the account; a guest is asked to sign in first, then it's saved.
    requireAccount('Create a free account to save songs you love.', () =>
      setFavourite(track.id, !isFavourite(track.id, serverValue), track).catch(() => {
        // setFavourite already rolled the UI back; nothing useful to show here.
      }),
    );
  }, [track, serverValue]);

  return { favourite, toggle };
};
