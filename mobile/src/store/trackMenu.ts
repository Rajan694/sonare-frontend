import { create } from 'zustand';
import type { Track } from '../data/types';

export interface TrackMenuAction {
  label: string;
  onPress: () => void;
}

/**
 * The long-press menu for a song. One app-wide sheet (TrackMenuHost) instead of one per
 * row, so it can be reopened from anywhere — e.g. straight back into "Add to playlist"
 * after a guest signs in.
 */
interface TrackMenuStore {
  track: Track | null;
  view: 'menu' | 'playlists';
  /** Screen-specific extra, e.g. "Remove from playlist". */
  extraAction?: TrackMenuAction;
  open: (track: Track, options?: { view?: 'menu' | 'playlists'; extraAction?: TrackMenuAction }) => void;
  setView: (view: 'menu' | 'playlists') => void;
  close: () => void;
}

export const useTrackMenuStore = create<TrackMenuStore>(set => ({
  track: null,
  view: 'menu',
  extraAction: undefined,
  open: (track, options) => set({ track, view: options?.view ?? 'menu', extraAction: options?.extraAction }),
  setView: view => set({ view }),
  close: () => set({ track: null, extraAction: undefined }),
}));
