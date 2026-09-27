import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from '../data/api';
import { absoluteUrl } from '../data/config';
import {
  API_QUALITY,
  useSettingsStore,
  type AudioQuality,
  type DownloadFormat,
} from '../data/settings';
import type { StreamInfo, Track } from '../data/types';
import { SonareDownloads } from '../native/SonareDownloads';

/**
 * Download manager for the phone.
 *
 * Audio comes from the same place as playback: GET /tracks/:id/stream picks the stream for
 * the chosen quality and format, and the backend relay passes Range requests through to
 * YouTube. Files are saved as served, never re-encoded: AAC as .m4a, and Opus in WebM as
 * .mka (Android has no audio/webm type; WebM is a subset of Matroska).
 *
 * The native module downloads into a part file in chunks, so pause, errors and the app
 * being killed all keep what arrived; starting again resumes from there. It also retries
 * dropped connections itself: JS timers stop while the app is in the background. This
 * store runs the queue, fetches fresh stream urls when one dies (they expire after an
 * hour), and starts over if YouTube now serves a different file than the part holds.
 *
 * Finished files go to the folder picked in Settings, or Music/Sonare. The list and the
 * folder are per device (AsyncStorage); quality and format are account settings.
 */

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'failed'
  | 'done';

export interface DownloadItem {
  /** The server track id; a track has at most one download. */
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string | null;
  albumId: string | null;
  durationMs: number | null;
  thumbnail?: string;
  status: DownloadStatus;
  quality: AudioQuality;
  format: DownloadFormat;
  /** The folder this download was started in; absent = Music/Sonare. */
  treeUri?: string;
  itag?: number;
  mimeType?: string;
  codec?: string;
  bitrateKbps?: number;
  /** 0 until the server says how big the file is. */
  totalBytes: number;
  receivedBytes: number;
  /** When done: what the player plays, and the name it was saved under. */
  uri?: string;
  fileName?: string;
  /** Done, but the file was moved or deleted outside the app. */
  missing?: boolean;
  error?: string;
  addedAt: number;
  completedAt?: number;
}

export interface DownloadLocation {
  /** A folder picked with the system picker; absent = the default. */
  treeUri?: string;
  label: string;
}

export interface RemoveResult {
  /** False when the file wasn't where it was saved (or couldn't be deleted): only the list entry went. */
  fileDeleted: boolean;
  reason?: string;
}

interface DownloadsStore {
  ready: boolean;
  items: Record<string, DownloadItem>;
  location: DownloadLocation;
  hydrate: () => Promise<void>;
  /** Queue server tracks; ones already listed are resumed if paused or failed. Returns how many are new. */
  enqueue: (tracks: Track[]) => number;
  pause: (id: string) => Promise<void>;
  resume: (id: string) => void;
  pauseAll: () => Promise<void>;
  resumeAll: () => void;
  remove: (id: string) => Promise<RemoveResult>;
  chooseLocation: () => Promise<boolean>;
  resetLocation: () => Promise<void>;
  /** Re-check that finished files are still where they were saved. */
  checkFiles: () => Promise<void>;
}

const ITEMS_KEY = 'sonare.downloads';
const LOCATION_KEY = 'sonare.downloadLocation';
const MAX_PARALLEL = 2;
const MAX_URL_REFRESHES = 3;

/** Ids the native side is working on. */
const running = new Set<string>();
const refreshes: Record<string, number> = {};
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let hydrated: Promise<void> | null = null;
let listening = false;

const safeName = (s: string) =>
  s
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'track';
const extensionFor = (mimeType: string) =>
  /mp4|m4a|aac/i.test(mimeType) ? 'm4a' : 'webm';
/** "audio/webm; codecs=opus" -> "audio/webm", which is what MediaStore and SAF want. */
const bareMime = (mimeType: string) =>
  mimeType.split(';')[0].trim() || 'audio/webm';
/** The server says 0 (or -1, from NewPipe) when YouTube didn't give a size: unknown. */
const knownSize = (n: number | undefined) => (n && n > 0 ? n : 0);

export const useDownloadsStore = create<DownloadsStore>((set, get, store) => {
  const patch = (
    id: string,
    change: Partial<DownloadItem>,
    persistNow = true,
  ) => {
    const item = get().items[id];
    if (!item) return;
    set({ items: { ...get().items, [id]: { ...item, ...change } } });
    persist(persistNow);
  };

  const persist = (now: boolean) => {
    clearTimeout(persistTimer);
    const save = () =>
      void AsyncStorage.setItem(
        ITEMS_KEY,
        JSON.stringify(Object.values(get().items)),
      ).catch(() => {});
    if (now) save();
    else persistTimer = setTimeout(save, 1500);
  };

  const fail = (id: string, message: string) => {
    running.delete(id);
    patch(id, { status: 'failed', error: message });
    pump();
  };

  const pump = () => {
    const queued = Object.values(get().items)
      .filter(i => i.status === 'queued' && !running.has(i.id))
      .sort((a, b) => a.addedAt - b.addedAt);
    for (const item of queued) {
      if (running.size >= MAX_PARALLEL) break;
      void start(item.id);
    }
  };

  const resolveStream = async (item: DownloadItem): Promise<StreamInfo> => {
    const stream = await api.stream(
      item.id,
      API_QUALITY[item.quality],
      item.format,
    );
    // The only thing on offer is a video file ~13x the size; not worth saving as "audio".
    if (stream.muxed)
      throw new Error(
        'Only a video stream is available for this song right now. Try again later.',
      );
    return stream;
  };

  // An unknown size on either side can't prove a different file, so only the itag decides then.
  const sameFile = (s: StreamInfo, it: DownloadItem) => {
    const size = knownSize(s.contentLength);
    return (
      (!it.itag || !s.itag || it.itag === s.itag) &&
      (!it.totalBytes || !size || it.totalBytes === size)
    );
  };

  const start = async (id: string) => {
    running.add(id);
    patch(id, { status: 'downloading', error: undefined });
    try {
      const item = get().items[id]!;
      const stream = await resolveStream(item);
      const part = await SonareDownloads.partSize(id);
      if (part > 0 && !sameFile(stream, item))
        await SonareDownloads.discard(id);
      const kept = part > 0 && sameFile(stream, item) ? part : 0;
      const totalBytes =
        (kept > 0 && knownSize(item.totalBytes)) ||
        knownSize(stream.contentLength);
      // Paused (or removed) while the url was being fetched.
      if (get().items[id]?.status !== 'downloading') {
        running.delete(id);
        return;
      }
      patch(id, {
        itag: stream.itag,
        mimeType: stream.mimeType,
        codec: stream.codec,
        bitrateKbps: stream.bitrateKbps,
        totalBytes,
        receivedBytes: kept,
      });
      const mimeType = bareMime(stream.mimeType);
      await SonareDownloads.start({
        id,
        url: absoluteUrl(stream.url)!,
        baseName: safeName(`${item.artist} - ${item.title}`),
        extension: extensionFor(mimeType),
        mimeType,
        totalBytes,
        title: item.title,
        artist: item.artist,
        album: item.album ?? undefined,
        treeUri: item.treeUri,
      });
    } catch (e: any) {
      fail(id, e?.message || 'Download failed');
    }
  };

  const listen = () => {
    if (listening) return;
    listening = true;
    // Android cuts a background app's network within seconds; a foreground service (with a
    // "Downloading" notification) keeps it while anything is queued.
    let active = -1;
    store.subscribe(s => {
      const n = Object.values(s.items).filter(
        i => i.status === 'queued' || i.status === 'downloading',
      ).length;
      if (n === active) return;
      active = n;
      SonareDownloads.setActive(n);
    });
    SonareDownloads.onProgress(e => {
      if (get().items[e.id]?.status !== 'downloading') return;
      patch(
        e.id,
        {
          receivedBytes: e.receivedBytes,
          totalBytes: e.totalBytes || get().items[e.id]!.totalBytes,
        },
        false,
      );
    });
    SonareDownloads.onDone(e => {
      running.delete(e.id);
      delete refreshes[e.id];
      patch(e.id, {
        status: 'done',
        uri: e.uri,
        fileName: e.name,
        totalBytes: e.size,
        receivedBytes: e.size,
        completedAt: Date.now(),
        missing: false,
        error: undefined,
      });
      pump();
    });
    SonareDownloads.onError(e => {
      running.delete(e.id);
      const item = get().items[e.id];
      if (!item || item.status !== 'downloading') return pump();
      patch(e.id, { receivedBytes: e.receivedBytes }, false);
      if (
        e.code === 'E_URL' &&
        (refreshes[e.id] = (refreshes[e.id] ?? 0) + 1) <= MAX_URL_REFRESHES
      ) {
        // Expired token or a dead YouTube url: fetch a fresh one and carry on.
        void start(e.id);
        return;
      }
      // E_NETWORK arrives only after the native side has given up retrying.
      fail(
        e.id,
        e.code === 'E_URL'
          ? 'The server keeps refusing this download. Try again later.'
          : e.message,
      );
    });
  };

  return {
    ready: false,
    items: {},
    location: { label: 'Music/Sonare' },

    hydrate: () => {
      hydrated ??= (async () => {
        listen();
        const [rawItems, rawLocation, defaultLabel] = await Promise.all([
          AsyncStorage.getItem(ITEMS_KEY).catch(() => null),
          AsyncStorage.getItem(LOCATION_KEY).catch(() => null),
          SonareDownloads.defaultLocation().catch(() => 'Music/Sonare'),
        ]);
        let items: Record<string, DownloadItem> = {};
        try {
          const list = rawItems ? (JSON.parse(rawItems) as DownloadItem[]) : [];
          // A download that was running when the app closed carries on where it stopped.
          items = Object.fromEntries(
            list.map(i => [
              i.id,
              i.status === 'downloading'
                ? { ...i, status: 'queued' as const }
                : i,
            ]),
          );
        } catch {
          // Unreadable list: start empty.
        }
        let location: DownloadLocation = { label: defaultLabel };
        try {
          const saved = rawLocation
            ? (JSON.parse(rawLocation) as DownloadLocation)
            : null;
          if (saved?.treeUri) location = saved;
        } catch {
          // Default location.
        }
        set({ ready: true, items, location });
        pump();
        void get().checkFiles();
      })();
      return hydrated;
    },

    enqueue: tracks => {
      const { downloadQuality, downloadFormat } = useSettingsStore.getState();
      const { items, location } = get();
      const next = { ...items };
      let added = 0;
      const now = Date.now();
      for (const t of tracks) {
        if (t.source !== 'server') continue;
        const existing = next[t.id];
        if (existing) {
          if (existing.status === 'paused' || existing.status === 'failed')
            next[t.id] = { ...existing, status: 'queued', error: undefined };
          continue;
        }
        next[t.id] = {
          id: t.id,
          title: t.title,
          artist: t.artist,
          artistId: t.artistId,
          album: t.album,
          albumId: t.albumId,
          durationMs: t.durationMs,
          thumbnail: t.thumbnail,
          status: 'queued',
          quality: downloadQuality,
          format: downloadFormat,
          treeUri: location.treeUri,
          totalBytes: 0,
          receivedBytes: 0,
          addedAt: now + added++,
        };
      }
      set({ items: next });
      persist(true);
      pump();
      return added;
    },

    pause: async id => {
      const item = get().items[id];
      if (!item || (item.status !== 'queued' && item.status !== 'downloading'))
        return;
      patch(id, { status: 'paused' });
      if (!running.has(id)) return;
      const kept = await SonareDownloads.pause(id);
      running.delete(id);
      if (get().items[id]?.status === 'paused')
        patch(id, { receivedBytes: kept });
      pump();
    },

    resume: id => {
      const item = get().items[id];
      if (!item || (item.status !== 'paused' && item.status !== 'failed'))
        return;
      delete refreshes[id];
      patch(id, { status: 'queued', error: undefined });
      pump();
    },

    pauseAll: async () => {
      const active = Object.values(get().items).filter(
        i => i.status === 'queued' || i.status === 'downloading',
      );
      await Promise.all(active.map(i => get().pause(i.id)));
    },

    resumeAll: () => {
      for (const i of Object.values(get().items))
        if (i.status === 'paused' || i.status === 'failed') get().resume(i.id);
    },

    remove: async id => {
      let item = get().items[id];
      if (!item) return { fileDeleted: false };
      if (item.status !== 'done') {
        // Stops it too, if it's running.
        await SonareDownloads.discard(id).catch(() => {});
        running.delete(id);
        // It may have finished while it was being stopped: then there's a file to delete.
        item = get().items[id] ?? item;
      }
      let result: RemoveResult = { fileDeleted: true };
      if (item.status === 'done' && item.uri) {
        try {
          await SonareDownloads.deleteFile(item.uri, item.fileName);
        } catch (e: any) {
          result = {
            fileDeleted: false,
            reason:
              e?.code === 'E_MISSING'
                ? 'The file is no longer where it was downloaded'
                : e?.message || "Couldn't delete the file",
          };
        }
      }
      const rest = { ...get().items };
      delete rest[id];
      set({ items: rest });
      persist(true);
      pump();
      return result;
    },

    chooseLocation: async () => {
      const picked = await SonareDownloads.pickFolder();
      if (!picked) return false;
      const location = { treeUri: picked.uri, label: picked.name };
      set({ location });
      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(location));
      return true;
    },

    resetLocation: async () => {
      const label = await SonareDownloads.defaultLocation().catch(
        () => 'Music/Sonare',
      );
      set({ location: { label } });
      await AsyncStorage.removeItem(LOCATION_KEY);
    },

    checkFiles: async () => {
      const done = Object.values(get().items).filter(
        i => i.status === 'done' && i.uri,
      );
      const present = await Promise.all(
        done.map(i =>
          SonareDownloads.exists(i.uri!, i.fileName).catch(() => true),
        ),
      );
      done.forEach((i, n) => {
        if (!!i.missing === !present[n]) return;
        patch(i.id, { missing: !present[n] });
      });
    },
  };
});

/** The file to play for a track, when it has been downloaded and is still there. */
export function localUriFor(trackId: string): string | null {
  const item = useDownloadsStore.getState().items[trackId];
  return item?.status === 'done' && item.uri && !item.missing ? item.uri : null;
}

/** 0..1, or null while the size is unknown. */
export function downloadProgress(item: DownloadItem): number | null {
  return item.totalBytes > 0
    ? Math.min(1, item.receivedBytes / item.totalBytes)
    : null;
}

/** A playable Track for a download (Downloads screen, offline Home / Library). */
export function downloadTrack(item: DownloadItem): Track {
  return {
    id: item.id,
    title: item.title,
    artistId: item.artistId,
    artist: item.artist,
    albumId: item.albumId,
    album: item.album,
    durationMs: item.durationMs,
    source: 'server',
    codec: item.codec ?? null,
    bitrateKbps: item.bitrateKbps ?? null,
    playCount: 0,
    favourite: false,
    addedAt: item.addedAt,
    thumbnail: item.thumbnail,
  };
}

/** Finished downloads that are still on the phone, newest first. */
export function downloadedTracks(items: Record<string, DownloadItem>): Track[] {
  return Object.values(items)
    .filter(i => i.status === 'done' && !i.missing)
    .sort((a, b) => (b.completedAt ?? b.addedAt) - (a.completedAt ?? a.addedAt))
    .map(downloadTrack);
}
