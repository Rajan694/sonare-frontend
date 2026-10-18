import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from '../data/api';
import type { AppRelease } from '../data/types';
import { appVersion, isLocalBuild } from '../native/SonareBuild';
import { SonareUpdates } from '../native/SonareUpdates';
import { findLatest, findUpdate } from '../../../shared/releases';

/**
 * Settings → About: whether a newer APK was uploaded on the admin page, its download (Android's
 * DownloadManager, which also shows a notification) and its install. The download's id is kept
 * on the phone, so a finished download is still offered after the app restarts.
 */

const SAVED_KEY = 'sonare.updateDownload';
const POLL_MS = 500;

/** 'dev': a local build (Metro or a dev APK), which is never offered the release APK. */
export type UpdateStatus =
  'idle' | 'checking' | 'current' | 'dev' | 'available' | 'downloading' | 'downloaded' | 'error';

interface AppUpdateStore {
  status: UpdateStatus;
  /** The newer build, once one is found. */
  release: AppRelease | null;
  /** The newest build, newer or not: its notes are "What's new". */
  latest: AppRelease | null;
  /** 0..1 while downloading. */
  progress: number;
  error: string | null;
  downloadId: number | null;
  check: () => Promise<void>;
  download: () => Promise<void>;
  /** 'permission' when Android first asked the user to let Sonare install apps. */
  install: () => Promise<'started' | 'permission' | undefined>;
}

let poll: ReturnType<typeof setInterval> | null = null;

const stopPolling = () => {
  if (poll) clearInterval(poll);
  poll = null;
};

const safeFileName = (name: string) => name.replace(/[^\w.-]+/g, '_') || 'sonare-update.apk';

const messageOf = (e: unknown, fallback: string) => (e instanceof Error && e.message) || fallback;

export const useAppUpdateStore = create<AppUpdateStore>((set, get) => {
  /** A finished download: hand it over only if it is the file that was uploaded. */
  const verify = async (id: number, release: AppRelease) => {
    const hash = await SonareUpdates.checksum(id).catch(() => '');
    // GitHub records a digest for every new asset; older ones have none to compare with.
    if (hash && (!release.sha256 || hash === release.sha256.toLowerCase())) {
      set({ status: 'downloaded', progress: 1, downloadId: id, error: null });
      return;
    }
    await SonareUpdates.remove(id);
    AsyncStorage.removeItem(SAVED_KEY).catch(() => {});
    set({ status: 'error', downloadId: null, error: "The download doesn't match the uploaded file. Try again." });
  };

  /** Follow a download until it ends (the screen is open; the notification covers the rest). */
  const follow = (id: number, release: AppRelease) => {
    stopPolling();
    set({ status: 'downloading', downloadId: id, error: null });
    poll = setInterval(async () => {
      const st = await SonareUpdates.status(id).catch(() => ({ state: 'missing' as const }));
      if (st.state === 'running' || st.state === 'pending' || st.state === 'paused') {
        const total = st.total && st.total > 0 ? st.total : release.sizeBytes;
        set({ progress: total > 0 ? Math.min(1, (st.bytes ?? 0) / total) : 0 });
        return;
      }
      stopPolling();
      if (st.state === 'done') {
        await verify(id, release);
        return;
      }
      AsyncStorage.removeItem(SAVED_KEY).catch(() => {});
      set({ status: 'error', downloadId: null, error: 'The download failed. Check the connection and try again.' });
    }, POLL_MS);
  };

  return {
    status: 'idle',
    release: null,
    latest: null,
    progress: 0,
    error: null,
    downloadId: null,

    check: async () => {
      if (get().status === 'checking' || get().status === 'downloading') return;
      set({ status: 'checking', error: null });
      try {
        const { items } = await api.releases();
        const latest = findLatest(items, 'android', ['apk']);
        const release = findUpdate(items, 'android', appVersion, ['apk']);
        if (!release) {
          set({ status: 'current', release: null, latest });
          return;
        }
        if (isLocalBuild) {
          set({ status: 'dev', release: null, latest });
          return;
        }
        set({ latest });
        set({ release });
        // A download of this build from before (maybe before a restart).
        const saved = JSON.parse((await AsyncStorage.getItem(SAVED_KEY)) ?? 'null') as {
          id: number;
          releaseId: string;
        } | null;
        if (saved?.releaseId === release.id) {
          const st = await SonareUpdates.status(saved.id).catch(() => null);
          if (st?.state === 'done') return verify(saved.id, release);
          if (st && st.state !== 'failed' && st.state !== 'missing') return follow(saved.id, release);
        }
        set({ status: 'available' });
      } catch (e) {
        set({ status: 'error', error: messageOf(e, "Couldn't check for updates") });
      }
    },

    download: async () => {
      const { release, status } = get();
      if (!release || status === 'downloading') return;
      try {
        const id = await SonareUpdates.download(
          api.releaseDownloadUrl(release.id),
          safeFileName(release.fileName),
          `Sonare ${release.version}`,
        );
        AsyncStorage.setItem(SAVED_KEY, JSON.stringify({ id, releaseId: release.id })).catch(() => {});
        set({ progress: 0 });
        follow(id, release);
      } catch (e) {
        set({ status: 'error', error: messageOf(e, "Couldn't start the download") });
      }
    },

    install: async () => {
      const { downloadId } = get();
      if (downloadId === null) return undefined;
      try {
        return await SonareUpdates.install(downloadId);
      } catch (e) {
        set({ status: 'error', downloadId: null, error: messageOf(e, "Couldn't open the installer") });
        return undefined;
      }
    },
  };
});

export const resetAppUpdateForTesting = () => {
  stopPolling();
  useAppUpdateStore.setState({
    status: 'idle',
    release: null,
    latest: null,
    progress: 0,
    error: null,
    downloadId: null,
  });
};
