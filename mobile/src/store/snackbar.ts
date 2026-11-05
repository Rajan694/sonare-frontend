import { create } from 'zustand';
import type { IconName } from '../components/ui/Icon';
import type { Track } from '../data/types';

/**
 * The short message above the mini player after Add to queue, Play next or Add to playlist
 * (SnackbarHost). A new one replaces the one on screen. Something the app did by itself
 * (resumed a long track, replaced the queue) says so and offers a one-tap way back.
 */
export interface SnackbarItem {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** A button on the right, e.g. "Undo"; tapping it also closes the snackbar. */
  action?: { label: string; onPress: () => void };
}

/** Long enough to read; one with a button stays a little longer, so there's time to tap it. */
const SHOW_MS = 2500;
const SHOW_WITH_ACTION_MS = 5000;

interface SnackbarStore {
  current: SnackbarItem | null;
  visible: boolean;
  showSnackbar: (item: SnackbarItem) => void;
  hideSnackbar: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useSnackbarStore = create<SnackbarStore>((set) => ({
  current: null,
  visible: false,
  showSnackbar: (item) => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({ current: item, visible: true });
    hideTimer = setTimeout(
      () => {
        set({ visible: false });
        hideTimer = null;
      },
      item.action ? SHOW_WITH_ACTION_MS : SHOW_MS,
    );
  },
  hideSnackbar: () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({ visible: false });
  },
}));

export const showSnackbar = (item: SnackbarItem): void => {
  useSnackbarStore.getState().showSnackbar(item);
};

export const hideSnackbar = (): void => {
  useSnackbarStore.getState().hideSnackbar();
};

/** The song's title for one song, "N songs" for more. */
export const songsSubtitle = (tracks: Pick<Track, 'title'>[]): string =>
  tracks.length === 1 ? tracks[0].title : `${tracks.length} songs`;
