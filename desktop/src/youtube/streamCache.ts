import { filesystem, os, storage } from '@neutralinojs/lib';
import type { LocalFileData } from '../storage/local';
import { curlBinary, curlTempDir, escapeCurlConfigValue, parseDumpedHeaders, tempFileId } from './curlFetch';

// In-app streams are downloaded whole by curl into this cache and played like local files: the
// webview can't read googlevideo (no CORS) and the <audio> element goes through the EQ graph.
// Always with a Range header: without one googlevideo sends ~35 KB/s, with one a song takes ~1 s.

export const MAX_STREAM_CACHE_BYTES = 500 * 1024 * 1024;
const STORAGE_KEY = 'sonare_yt_stream_index';

export interface CachedStreamEntry {
  videoId: string;
  itag: number;
  path: string;
  size: number;
  ext: string;
  mimeType: string;
  lastAccessed: number;
}

/** A download googlevideo refused (403 on a limited url); the caller can get a fresh url and retry. */
export class StreamDownloadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'StreamDownloadError';
  }
}

let cacheDirPromise: Promise<string> | null = null;
let indexLoaded = false;
const streamIndex = new Map<string, CachedStreamEntry>();
const inFlight = new Map<string, Promise<string>>();

/** In-app stream urls point at googlevideo; the backend's relay doesn't. */
export const isGooglevideo = (url: string): boolean => {
  try {
    return new URL(url).hostname.endsWith('googlevideo.com');
  } catch {
    return false;
  }
};

export const cacheKey = (videoId: string, itag: number): string => `${videoId}-${itag}`;

export const extensionForStream = (mimeType: string, itag?: number): string => {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('mp4') || lower.includes('m4a') || itag === 140) return 'm4a';
  return 'webm';
};

export const getStreamCacheDir = (): Promise<string> => {
  cacheDirPromise ??= (async () => {
    const base = `${(await os.getPath('cache')).replace(/[/\\]+$/, '')}/sonare`;
    for (const dir of [base, `${base}/yt-stream`]) {
      await filesystem.createDirectory(dir).catch(() => {
        // Already there.
      });
    }
    return `${base}/yt-stream`;
  })();
  return cacheDirPromise;
};

const loadIndex = async (): Promise<void> => {
  if (indexLoaded) return;
  indexLoaded = true;
  try {
    const entries = JSON.parse(await storage.getData(STORAGE_KEY)) as CachedStreamEntry[];
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (entry.videoId && entry.itag && entry.path) streamIndex.set(cacheKey(entry.videoId, entry.itag), entry);
    }
  } catch {
    // Nothing stored yet.
  }
};

const saveIndex = async (): Promise<void> => {
  await storage.setData(STORAGE_KEY, JSON.stringify([...streamIndex.values()])).catch(() => {});
};

/** Delete least-recently-played files until the cache fits. */
const evictOldest = async (): Promise<void> => {
  let total = [...streamIndex.values()].reduce((sum, e) => sum + e.size, 0);
  if (total <= MAX_STREAM_CACHE_BYTES) return;
  const oldestFirst = [...streamIndex.entries()].sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
  for (const [key, entry] of oldestFirst) {
    if (total <= MAX_STREAM_CACHE_BYTES) break;
    await filesystem.remove(entry.path).catch(() => {});
    total -= entry.size;
    streamIndex.delete(key);
  }
  await saveIndex();
};

/**
 * Download `url` to `path` with curl (ranged, so googlevideo doesn't throttle it). Gives up if the
 * transfer stalls (< 4 KB/s for 20 s) instead of hanging the player. Throws StreamDownloadError for
 * an HTTP error, and when the file doesn't end up `contentLength` bytes long (when that is known).
 */
export const curlDownload = async (url: string, path: string, contentLength = 0): Promise<void> => {
  const dir = await curlTempDir();
  const id = tempFileId();
  const cfgPath = `${dir}/dl-${id}.conf`;
  const hdrPath = `${dir}/dl-${id}.hdr`;
  try {
    await filesystem.writeFile(
      cfgPath,
      [
        'silent',
        'show-error',
        'location',
        'connect-timeout = 15',
        'speed-limit = 4096',
        'speed-time = 20',
        'retry = 2',
        'header = "Range: bytes=0-"',
        `dump-header = "${escapeCurlConfigValue(hdrPath)}"`,
        `output = "${escapeCurlConfigValue(path)}"`,
        `url = "${escapeCurlConfigValue(url)}"`,
      ].join('\n'),
    );
    const run = await os.execCommand(`${curlBinary()} -K "${cfgPath}"`);
    const { status } = parseDumpedHeaders(await filesystem.readFile(hdrPath).catch(() => ''));
    if (run.exitCode !== 0) throw new StreamDownloadError(`curl exited ${run.exitCode}: ${run.stdErr.trim()}`, status);
    if (status !== 200 && status !== 206) throw new StreamDownloadError(`Stream download got HTTP ${status}`, status);
    if (contentLength > 0) {
      const { size } = await filesystem.getStats(path);
      if (size !== contentLength)
        throw new StreamDownloadError(`Stream download stopped at ${size} of ${contentLength} bytes`, status);
    }
  } finally {
    void filesystem.remove(cfgPath).catch(() => {});
    void filesystem.remove(hdrPath).catch(() => {});
  }
};

export const streamCache = {
  getStreamCacheDir,

  /** The cached file for this stream, or null (also when it was deleted from disk). */
  getCachedPath: async (videoId: string, itag: number): Promise<string | null> => {
    await loadIndex();
    const key = cacheKey(videoId, itag);
    const entry = streamIndex.get(key);
    if (!entry) return null;
    try {
      if ((await filesystem.getStats(entry.path)).size > 0) {
        entry.lastAccessed = Date.now();
        void saveIndex();
        return entry.path;
      }
    } catch {
      // Gone from disk.
    }
    streamIndex.delete(key);
    void saveIndex();
    return null;
  },

  /** The cached file, downloading it first if needed. Concurrent calls for one stream share a download. */
  getOrDownload: async (
    videoId: string,
    url: string,
    itag: number,
    mimeType: string,
    contentLength = 0,
  ): Promise<string> => {
    const cached = await streamCache.getCachedPath(videoId, itag);
    if (cached) return cached;
    const key = cacheKey(videoId, itag);
    const pending = inFlight.get(key);
    if (pending) return pending;

    const download = (async () => {
      const ext = extensionForStream(mimeType, itag);
      const finalPath = `${await getStreamCacheDir()}/${key}.${ext}`;
      const partPath = `${finalPath}.part`;
      try {
        await curlDownload(url, partPath, contentLength);
        await filesystem.move(partPath, finalPath);
      } catch (err) {
        await filesystem.remove(partPath).catch(() => {});
        throw err;
      }
      const { size } = await filesystem.getStats(finalPath);
      streamIndex.set(key, { videoId, itag, path: finalPath, size, ext, mimeType, lastAccessed: Date.now() });
      await evictOldest();
      await saveIndex();
      return finalPath;
    })().finally(() => inFlight.delete(key));

    inFlight.set(key, download);
    return download;
  },

  readFile: async (filePath: string, mimeType?: string): Promise<LocalFileData> => {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'webm';
    return {
      data: await filesystem.readBinaryFile(filePath),
      mime: mimeType || (ext === 'm4a' ? 'audio/mp4' : 'audio/webm'),
      ext,
      durationMs: null,
    };
  },

  remove: async (videoId: string, itag: number): Promise<void> => {
    await loadIndex();
    const key = cacheKey(videoId, itag);
    const entry = streamIndex.get(key);
    if (!entry) return;
    streamIndex.delete(key);
    await filesystem.remove(entry.path).catch(() => {});
    await saveIndex();
  },

  clear: async (): Promise<void> => {
    await loadIndex();
    for (const entry of streamIndex.values()) await filesystem.remove(entry.path).catch(() => {});
    streamIndex.clear();
    await saveIndex();
  },

  /** Testing: forget the index, folders and downloads in flight. */
  _reset: (): void => {
    streamIndex.clear();
    indexLoaded = false;
    cacheDirPromise = null;
    inFlight.clear();
  },

  /** Testing: the in-memory index. */
  _getIndex: (): Map<string, CachedStreamEntry> => streamIndex,
};
