import { create } from 'zustand';
import type { IconName } from '../components/ui/Icon';
import type { Track } from '../data/types';

/**
 * The short message above the mini player after Add to queue, Play next or Add to playlist
 * (SnackbarHost). A new one replaces the one on screen.
 */
export interface SnackbarItem {
  title: string;
  subtitle?: string;
  icon?: IconName;
}

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
    hideTimer = setTimeout(() => {
      set({ visible: false });
      hideTimer = null;
    }, 2500);
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
