import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { requireAccount } from './accountGate';
import { getCurrentUser, onAuthChange } from './auth';
import type { Track } from '../types';

/**
 * Favourite state that survives across screens.
 *
 * Track lists come from many independent hooks and arrive with `favourite: false`, so a heart
 * toggled in one place would otherwise stay stale everywhere else. Two overlays fix that: the
 * account's liked ids (loaded once per sign-in) and this session's own toggles on top of them.
 */

const overrides = new Map<string, boolean>();
/** The account's liked ids; null until they load, and while signed out. */
let likedIds: Set<string> | null = null;
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

/** Whose ids are loaded (or loading): a token refresh for the same account loads nothing again. */
let likedFor: string | null = null;

const loadLikedIds = async (userId: string) => {
  try {
    const { ids } = await api.getFavouriteIds();
    if (likedFor !== userId) return;
    likedIds = new Set(ids);
    // Toggles made before the list arrived stay on top of it.
    for (const [id, liked] of overrides) {
      if (liked) likedIds.add(id);
      else likedIds.delete(id);
    }
  } catch {
    // No list: hearts fall back to the value each list brought with it, as before.
    if (likedFor === userId) likedIds = null;
  }
  emit();
};

const followAccount = (userId: string | null) => {
  if (userId === likedFor) return;
  likedFor = userId;
  // Another account (or none): the last one's hearts don't carry over.
  likedIds = null;
  overrides.clear();
  if (userId) void loadLikedIds(userId);
  emit();
};

onAuthChange((user) => followAccount(user?.id ?? null));
followAccount(getCurrentUser()?.id ?? null);

/** The effective favourite state: a local toggle wins, then the account's liked ids, then the fetched value. */
export const isFavourite = (trackId: string, serverValue: boolean): boolean => {
  const o = overrides.get(trackId);
  if (o !== undefined) return o;
  if (likedIds?.has(trackId)) return true;
  return serverValue;
};

/** `track` goes with a new favourite as its metadata (the backend may not know a song found in-app). */
export const setFavourite = async (trackId: string, next: boolean, track?: Track): Promise<void> => {
  const previous = overrides.get(trackId);
  const wasLiked = likedIds?.has(trackId) ?? false;
  // Optimistic: flip immediately so the heart feels instant.
  overrides.set(trackId, next);
  if (likedIds) {
    if (next) likedIds.add(trackId);
    else likedIds.delete(trackId);
  }
  emit();
  try {
    await api.setTrackFavourite(trackId, next, track);
    for (const l of savedListeners) l();
  } catch (e) {
    // Roll back to whatever we knew before rather than leaving a lie on screen.
    if (previous === undefined) overrides.delete(trackId);
    else overrides.set(trackId, previous);
    if (likedIds) {
      if (wasLiked) likedIds.add(trackId);
      else likedIds.delete(trackId);
    }
    emit();
    throw e;
  }
};

/** Tells saved-listeners only after the server accepted the change. */
export const onFavouritesSaved = (fn: () => void): (() => void) => {
  savedListeners.add(fn);
  return () => {
    savedListeners.delete(fn);
  };
};

/** A lookup for lists that draw many hearts from one fetched value (e.g. search results). */
export const useFavouriteLookup = (): typeof isFavourite => {
  const [, force] = useState(0);

  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  return isFavourite;
};

/** Binds one heart. */
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
