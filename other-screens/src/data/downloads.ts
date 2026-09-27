import { useEffect, useSyncExternalStore } from 'react';
import { storage } from '@neutralinojs/lib';
import { CAPS } from '../lib/caps';
import { showToast } from '../store/toastStore';
import { api } from './api';
import { API_BASE } from './auth';
import { localLibrary } from './local';
import { API_QUALITY, getSettings, type AudioQuality, type DownloadFormat } from './settings';
import {
  askForWebFolderOnce,
  concat,
  FileMissingError,
  getLocation,
  loadLocation,
  targetFor,
  type PartFile,
  type TargetKind,
} from './downloadTargets';
import type { Track } from './types';

/**
 * Download manager (desktop and web).
 *
 * Audio comes from the same place as playback: GET /tracks/:id/stream picks the stream for
 * the chosen quality and format, and the backend relay at /stream/:token passes Range
 * requests through to YouTube. Files are saved exactly as YouTube serves them (Opus in
 * WebM, or AAC in M4A) - no re-encoding.
 *
 * Each download is fetched in CHUNK-sized Range requests and appended to a part file
 * (downloadTargets.ts). Pause aborts the request in flight; resume asks for the bytes after
 * what the part file already holds, so progress survives pauses, errors and restarts.
 * Stream urls expire after an hour, so a 403 fetches a fresh one - and if YouTube now
 * serves a different file (another itag, or another size), the download starts over.
 *
 * The list is per device and kept in Neutralino storage (desktop) or localStorage (web).
 */

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'failed' | 'done';

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
  target: TargetKind;
  /** Native: the folder this download was started in. */
  dir?: string;
  itag?: number;
  mimeType?: string;
  codec?: string;
  bitrateKbps?: number;
  /** 0 until the server says how big the file is. */
  totalBytes: number;
  receivedBytes: number;
  /** When done: file path (native), file name in the folder (web folder), or name the browser saved. */
  path?: string;
  /** Browser target: a copy is kept in this browser, so the file can be saved again. */
  copyKept?: boolean;
  error?: string;
  addedAt: number;
  completedAt?: number;
}

export interface DownloadsSnapshot {
  ready: boolean;
  /** Newest first. */
  items: DownloadItem[];
  byId: Map<string, DownloadItem>;
  /** Queued + downloading. */
  activeCount: number;
}

const STORAGE_KEY = 'sonare_downloads';
const MAX_PARALLEL = 2;
/** Per Range request. Small enough that YouTube never throttles it, big enough to be quick. */
const CHUNK = 2 * 1024 * 1024;
/** Bytes gathered before each write to the part file (each write is a native-bridge call). */
const FLUSH_AT = 512 * 1024;
const MAX_NETWORK_RETRIES = 4;
const MAX_URL_REFRESHES = 3;

let items: DownloadItem[] = [];
let snapshot: DownloadsSnapshot = { ready: false, items: [], byId: new Map(), activeCount: 0 };
const listeners = new Set<() => void>();
const running = new Map<string, { abort: AbortController; done: Promise<void> }>();
/** Songs finished since the queue was last empty, for the "all done" toast. */
let finishedInBatch = 0;
let loadPromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  const sorted = [...items].sort((a, b) => b.addedAt - a.addedAt);
  snapshot = {
    ready: true,
    items: sorted,
    byId: new Map(sorted.map((i) => [i.id, i])),
    activeCount: sorted.filter((i) => i.status === 'queued' || i.status === 'downloading').length,
  };
  for (const l of listeners) l();
}

async function writeStore(json: string) {
  if (CAPS.offlineDownloads) await storage.setData(STORAGE_KEY, json);
  else localStorage.setItem(STORAGE_KEY, json);
}

async function readStore(): Promise<string | null> {
  if (CAPS.offlineDownloads) return storage.getData(STORAGE_KEY);
  return localStorage.getItem(STORAGE_KEY);
}

function persistSoon(immediate = false) {
  clearTimeout(persistTimer);
  const save = () => void writeStore(JSON.stringify(items)).catch(() => {});
  if (immediate) save();
  else persistTimer = setTimeout(save, 1500);
}

function patch(id: string, change: Partial<DownloadItem>, persistNow = true) {
  let found = false;
  items = items.map((i) => {
    if (i.id !== id) return i;
    found = true;
    return { ...i, ...change };
  });
  if (!found) return;
  emit();
  persistSoon(persistNow);
}

function get(id: string): DownloadItem | undefined {
  return items.find((i) => i.id === id);
}

function load(): Promise<void> {
  loadPromise ??= (async () => {
    await loadLocation();
    try {
      const raw = await readStore();
      const parsed = raw ? (JSON.parse(raw) as DownloadItem[]) : [];
      // A download that was running when the app closed carries on where it stopped.
      items = Array.isArray(parsed)
        ? parsed.map((i) => (i.status === 'downloading' ? { ...i, status: 'queued' } : i))
        : [];
    } catch {
      items = [];
    }
    if (CAPS.offlineDownloads) await importLegacyDownloads();
    // A browser folder needs its permission re-granted by a click after a reload.
    for (const i of items) {
      if (i.status === 'queued' && !(await targetFor(i).ready(false))) {
        i.status = 'paused';
        i.error = 'Press resume to let Sonare use the download folder again';
      }
    }
    emit();
    pump();
  })();
  return loadPromise;
}

/** Downloads made before this list existed are only in the local library index. */
async function importLegacyDownloads() {
  const known = new Set(items.map((i) => i.id));
  const legacy = (await localLibrary.downloadedEntries()).filter((e) => !known.has(e.serverId));
  if (legacy.length === 0) return;
  const format = getSettings().downloadFormat;
  items = [
    ...items,
    ...legacy.map<DownloadItem>((e) => ({
      id: e.serverId,
      title: e.title,
      artist: e.artist,
      artistId: '',
      album: e.album,
      albumId: null,
      durationMs: e.durationMs,
      thumbnail: e.thumbnail,
      status: 'done',
      quality: 'high',
      format: /aac|mp4a/i.test(e.codec ?? '') ? 'm4a' : format,
      target: 'native',
      dir: e.dir,
      codec: e.codec,
      bitrateKbps: e.bitrateKbps,
      totalBytes: e.size,
      receivedBytes: e.size,
      path: e.path,
      addedAt: e.addedAt,
      completedAt: e.addedAt,
    })),
  ];
  persistSoon(true);
}

function pump() {
  for (const item of [...items].sort((a, b) => a.addedAt - b.addedAt)) {
    if (running.size >= MAX_PARALLEL) break;
    if (item.status === 'queued' && !running.has(item.id)) start(item.id);
  }
  if (running.size === 0 && finishedInBatch > 0 && !items.some((i) => i.status === 'queued')) {
    const n = finishedInBatch;
    finishedInBatch = 0;
    showToast({
      title: 'Downloads finished',
      description: n === 1 ? '1 song saved' : `${n} songs saved`,
      icon: 'download',
      variant: 'gold',
    });
  }
}

function start(id: string) {
  const abort = new AbortController();
  const done = run(id, abort.signal).finally(() => {
    running.delete(id);
    pump();
  });
  running.set(id, { abort, done });
}

function absolute(url: string): string {
  return /^https?:\/\//.test(url) ? url : new URL(API_BASE).origin + url;
}

function safeName(s: string): string {
  return (
    s
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'track'
  );
}

/** The server says 0 (or -1, from NewPipe) when YouTube didn't give a size: unknown. */
function knownSize(n: number | undefined): number {
  return n && n > 0 ? n : 0;
}

function extensionFor(mimeType: string): string {
  return /mp4|m4a|aac/i.test(mimeType) ? 'm4a' : 'webm';
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

class HttpStatusError extends Error {
  constructor(public status: number) {
    super(`Server answered ${status}`);
  }
}

async function resolveStream(item: DownloadItem) {
  const stream = await api.getTrackStream(item.id, API_QUALITY[item.quality], item.format);
  if (stream.muxed) {
    // The only thing on offer is a video file ~13x the size; not worth saving as "audio".
    throw new Error('Only a video stream is available for this song right now. Try again later.');
  }
  return stream;
}

async function run(id: string, signal: AbortSignal): Promise<void> {
  const initial = get(id);
  if (!initial) return;
  patch(id, { status: 'downloading', error: undefined });
  const target = targetFor(initial);
  let part: PartFile | null = null;
  try {
    if (!(await target.ready(true))) throw new Error('Sonare is not allowed to write to the download folder');
    let stream = await resolveStream(initial);
    part = await target.open();
    let received = await part.size();

    // Resuming against a different file than the part holds would corrupt it. An unknown
    // size on either side can't prove a difference, so only the itag decides then.
    const sameFile = (s: typeof stream, it: DownloadItem) => {
      const size = knownSize(s.contentLength);
      return (!it.itag || !s.itag || it.itag === s.itag) && (!it.totalBytes || !size || it.totalBytes === size);
    };
    if (received > 0 && !sameFile(stream, initial)) {
      await part.discard();
      part = await target.open();
      received = 0;
    }
    let total = (received > 0 && knownSize(initial.totalBytes)) || knownSize(stream.contentLength);
    patch(id, {
      itag: stream.itag,
      mimeType: stream.mimeType,
      codec: stream.codec,
      bitrateKbps: stream.bitrateKbps,
      totalBytes: total,
      receivedBytes: received,
    });

    let url = absolute(stream.url);
    let networkFailures = 0;
    let refreshes = 0;
    while (!signal.aborted && (total === 0 || received < total)) {
      let res: Response;
      try {
        res = await fetch(url, { headers: { Range: `bytes=${received}-${received + CHUNK - 1}` }, signal });
        if (res.status === 416) {
          // Asked past the end: the part already holds the whole file.
          const size = res.headers.get('content-range')?.match(/\/(\d+)\s*$/);
          if (size) total = Number(size[1]);
          if (received > 0 && (total === 0 || received >= total)) {
            total = received;
            break;
          }
        }
        if (res.status === 403 || res.status === 404 || res.status === 410 || res.status === 502)
          throw new HttpStatusError(res.status);
        if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
      } catch (e) {
        if (signal.aborted) break;
        if (e instanceof HttpStatusError) {
          // Expired token or a dead YouTube url: get a fresh one for the same file.
          if (++refreshes > MAX_URL_REFRESHES)
            throw new Error('The server keeps refusing this download. Try again later.');
          const current = get(id)!;
          stream = await resolveStream(current);
          if (!sameFile(stream, current)) {
            await part.discard();
            part = await target.open();
            received = 0;
            total = knownSize(stream.contentLength);
            patch(id, {
              itag: stream.itag,
              mimeType: stream.mimeType,
              codec: stream.codec,
              bitrateKbps: stream.bitrateKbps,
              totalBytes: total,
              receivedBytes: 0,
            });
          }
          url = absolute(stream.url);
          continue;
        }
        if (++networkFailures > MAX_NETWORK_RETRIES) throw e;
        await sleep(1000 * 2 ** networkFailures, signal);
        continue;
      }

      if (res.status === 200 && received > 0) {
        // The server ignored Range and is sending the whole file: take it from the top.
        await part.discard();
        part = await target.open();
        received = 0;
      }
      const range = res.headers.get('content-range')?.match(/\/(\d+)\s*$/);
      if (range) total = Number(range[1]);
      else if (res.status === 200) total = Number(res.headers.get('content-length')) || total;

      const reader = res.body!.getReader();
      const startedAt = received;
      let pending: Uint8Array[] = [];
      let pendingBytes = 0;
      const flush = async () => {
        if (pendingBytes === 0) return;
        const bytes = concat(pending);
        pending = [];
        pendingBytes = 0;
        await part!.append(bytes);
        received += bytes.length;
        patch(id, { receivedBytes: received, totalBytes: total }, false);
      };
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          pending.push(value);
          pendingBytes += value.length;
          if (pendingBytes >= FLUSH_AT) await flush();
        }
        networkFailures = 0;
        refreshes = 0;
      } catch (e) {
        // Keep whatever arrived before the pause or the dropped connection.
        await flush();
        if (signal.aborted) break;
        if (++networkFailures > MAX_NETWORK_RETRIES) throw e;
        await sleep(1000 * 2 ** networkFailures, signal);
        continue;
      }
      await flush();
      if (res.status === 200) break;
      // No Content-Range to read the size from: a short chunk means that was the end.
      if (total === 0 && received - startedAt < CHUNK) total = received;
    }

    if (signal.aborted) {
      await part.flush();
      patch(id, { receivedBytes: received });
      return;
    }

    const item = get(id)!;
    const fileName = `${safeName(`${item.artist} - ${item.title}`)}.${extensionFor(item.mimeType ?? '')}`;
    const saved = await part.finish(fileName, item.mimeType ?? 'audio/webm');
    if (item.target === 'native') {
      await localLibrary.addDownload({
        serverId: item.id,
        path: saved.path,
        dir: item.dir ?? saved.path.slice(0, saved.path.lastIndexOf('/')),
        title: item.title,
        artist: item.artist,
        album: item.album,
        durationMs: item.durationMs,
        codec: item.codec,
        bitrateKbps: item.bitrateKbps,
        thumbnail: item.thumbnail,
      });
    }
    finishedInBatch++;
    patch(id, {
      status: 'done',
      path: saved.path,
      totalBytes: saved.size,
      receivedBytes: saved.size,
      completedAt: Date.now(),
      copyKept: saved.copyKept,
      error: undefined,
    });
  } catch (e) {
    await part?.flush().catch(() => {});
    if (signal.aborted) return;
    const message = e instanceof Error ? e.message : 'Download failed';
    patch(id, { status: 'failed', error: message });
    showToast({ title: 'Download failed', description: `${get(id)?.title ?? ''}: ${message}`, icon: 'info' });
  }
}

async function stop(id: string) {
  const r = running.get(id);
  if (!r) return;
  r.abort.abort();
  await r.done;
}

function newItem(track: Track): DownloadItem {
  const { downloadQuality, downloadFormat } = getSettings();
  const location = getLocation();
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artistId: track.artistId,
    album: track.album,
    albumId: track.albumId,
    durationMs: track.durationMs,
    thumbnail: track.thumbnail,
    status: 'queued',
    quality: downloadQuality,
    format: downloadFormat,
    target: location.kind,
    dir: location.path,
    totalBytes: 0,
    receivedBytes: 0,
    addedAt: Date.now(),
  };
}

export interface RemoveResult {
  /** False when the file wasn't at its download location any more (or can't be reached). */
  fileDeleted: boolean;
  reason?: string;
}

export const downloads = {
  /** Loads the list and resumes interrupted downloads. Called once at startup. */
  init(): Promise<void> {
    return load();
  },

  /**
   * Queue server tracks for download; ones already downloaded or queued are skipped.
   * Returns how many were added. Call it from the click that asked for the download: the
   * first one on Chromium asks for a folder, which needs that click.
   */
  async enqueue(tracks: Track[]): Promise<number> {
    await load();
    const known = new Set(items.map((i) => i.id));
    const fresh = tracks.filter((t) => t.source !== 'local' && !known.has(t.id));
    if (fresh.length > 0 && (await askForWebFolderOnce()) === 'browser') {
      showToast({
        title: "Saving to your browser's Downloads",
        description: 'You can choose a folder in Settings › Downloads',
        icon: 'folder',
      });
    }
    // Failed and paused ones the user asks for again are simply resumed.
    for (const t of tracks) {
      const existing = get(t.id);
      if (existing && (existing.status === 'failed' || existing.status === 'paused'))
        patch(t.id, { status: 'queued', error: undefined });
    }
    if (fresh.length > 0) {
      const now = Date.now();
      items = [...items, ...fresh.map((t, i) => ({ ...newItem(t), addedAt: now + i }))];
      emit();
      persistSoon(true);
    }
    pump();
    return fresh.length;
  },

  async pause(id: string): Promise<void> {
    const item = get(id);
    if (!item || (item.status !== 'queued' && item.status !== 'downloading')) return;
    patch(id, { status: 'paused' });
    await stop(id);
    // run() may have written its last bytes after the status change; keep it paused.
    if (get(id)?.status !== 'done') patch(id, { status: 'paused' });
  },

  /** Resume a paused download, or retry a failed one. */
  async resume(id: string): Promise<void> {
    await load();
    const item = get(id);
    if (!item || (item.status !== 'paused' && item.status !== 'failed')) return;
    patch(id, { status: 'queued', error: undefined });
    pump();
  },

  async pauseAll(): Promise<void> {
    await Promise.all(
      items.filter((i) => i.status === 'queued' || i.status === 'downloading').map((i) => downloads.pause(i.id)),
    );
  },

  async resumeAll(): Promise<void> {
    for (const i of items)
      if (i.status === 'paused' || i.status === 'failed') patch(i.id, { status: 'queued', error: undefined });
    pump();
  },

  /**
   * Remove a download from the list. A finished file is deleted from the folder it was
   * saved to; if that fails (moved, renamed, already deleted, no access) it's only
   * removed from the list. An unfinished one has its part file thrown away.
   */
  async remove(id: string): Promise<RemoveResult> {
    await load();
    let item = get(id);
    if (!item) return { fileDeleted: false };
    await stop(id);
    // It may have finished while it was being stopped: then there's a file to delete.
    item = get(id) ?? item;
    const target = targetFor(item);
    let result: RemoveResult = { fileDeleted: true };
    if (item.status === 'done' && item.path) {
      try {
        await target.removeFile(item.path);
      } catch (e) {
        result = {
          fileDeleted: false,
          reason:
            e instanceof FileMissingError
              ? e.message
              : `Couldn't delete the file: ${e instanceof Error ? e.message : 'unknown error'}`,
        };
      }
    } else {
      try {
        await (await target.open()).discard();
      } catch {
        // Nothing to clean up.
      }
    }
    if (item.target === 'native') await localLibrary.forgetDownload(id);
    items = items.filter((i) => i.id !== id);
    emit();
    persistSoon(true);
    return result;
  },

  /** Browser target: hand the kept copy to the browser's Downloads again. False when there is none. */
  async saveAgain(id: string): Promise<boolean> {
    const item = get(id);
    if (!item || item.status !== 'done' || !item.path) return false;
    const saved = (await targetFor(item).saveAgain?.(item.path)) ?? false;
    if (!saved && item.copyKept) patch(id, { copyKept: false });
    return saved;
  },

  /** Remove several downloads; returns how many files could not be deleted from disk. */
  async removeMany(ids: string[]): Promise<number> {
    let kept = 0;
    for (const id of ids) if (!(await downloads.remove(id)).fileDeleted) kept++;
    return kept;
  },

  /** A playable Track for a download (for the Downloads screen). */
  toTrack(item: DownloadItem): Track {
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
  },
};

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDownloadsSnapshot(): DownloadsSnapshot {
  return snapshot;
}

export function useDownloads(): DownloadsSnapshot {
  useEffect(() => {
    void load();
  }, []);
  return useSyncExternalStore(subscribe, getDownloadsSnapshot);
}

/** One track's download, if it has one. Re-renders only when that item changes. */
export function useDownload(trackId: string): DownloadItem | undefined {
  return useSyncExternalStore(subscribe, () => snapshot.byId.get(trackId));
}

/** 0..1, or null when the size isn't known yet. */
export function downloadProgress(item: DownloadItem): number | null {
  return item.totalBytes > 0 ? Math.min(1, item.receivedBytes / item.totalBytes) : null;
}
