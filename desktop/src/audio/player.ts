import { filesystem } from '@neutralinojs/lib';
import { API_BASE } from '../api/auth';
import { api } from '../api/api';
import { demuxAudio, demuxWebmPrefix, type DemuxedAudio } from './audioDemux';
import { BufferPlayback } from './bufferPlayback';
import { canStream, StreamPlayback } from './streamPlayback';
import * as dsp from './dsp';
import { localLibrary, type LocalFileData } from '../storage/local';
import { API_QUALITY, getSettings } from '../storage/settings';
import { CAPS } from '../lib/caps';
import { inAppYoutube, isInAppYoutubeAllowed } from '../youtube/inApp';
import { isGooglevideo, StreamDownloadError, streamCache } from '../youtube/streamCache';

/**
 * Audio playback engine.
 *
 * Two slots, each with its own HTMLAudioElement (created lazily, the first inside the user
 * gesture that started playback - browsers block autoplay otherwise): the active one plays,
 * the standby one holds the next song once the app has said what that is (setNext), so it can
 * start the moment this one ends (gapless) or fade in over its last seconds (crossfade). With
 * both off, the next song's stream is still looked up ahead of time, so it starts quickly.
 *
 * Stream URLs from GET /tracks/:id/stream are time-limited and IP-bound (contract
 * section 8.2), so `expiresAt` is tracked and the url is re-requested on expiry or on a
 * media error rather than failing the track.
 *
 * In the Linux window, local files are decoded and played from memory instead (see
 * bufferPlayback.ts): WebKitGTK's <audio> drops audio at every ~64 KB it reads. Files too
 * long to decode whole are decoded a few seconds at a time (streamPlayback.ts). In-app YouTube
 * songs there start playing from the first part of their download (playWhileDownloading).
 */

export interface PlaybackStatus {
  trackId: string | null;
  playing: boolean;
  loading: boolean;
  positionMs: number;
  durationMs: number;
  /** True when the backend fell back to a muxed video stream because no adaptive audio existed. */
  muxed: boolean;
  error: string | null;
  /** 0..1 */
  volume: number;
}

type Listener = (s: PlaybackStatus) => void;
type Playback = BufferPlayback | StreamPlayback;

interface Slot {
  audio: HTMLAudioElement | null;
  /** The track when it plays through Web Audio; the element is idle meanwhile. */
  decoded: Playback | null;
  trackId: string | null;
  expiresAt: number;
  muxed: boolean;
  /** Standby only: loaded far enough to start at once. */
  ready: boolean;
  /** Bumped per load, so a slow answer for an older load is ignored. */
  token: number;
}

const newSlot = (): Slot => ({
  audio: null,
  decoded: null,
  trackId: null,
  expiresAt: 0,
  muxed: false,
  ready: false,
  token: 0,
});

const listeners = new Set<Listener>();
const endedListeners = new Set<() => void>();
const advanceListeners = new Set<(trackId: string) => void>();

let active = newSlot();
let standby = newSlot();
/** The slot fading out during a crossfade. */
let fading: Slot | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | undefined;
/** What the app will play after the active track by itself, and the active track's album. */
let next: { id: string; album: string | null } | null = null;
let currentAlbum: string | null = null;
/** The standby's decoded track is scheduled to start where the active one ends. */
let gaplessScheduled = false;
/** A next song the standby couldn't load; it loads the usual way when its turn comes. */
let standbyFailed: string | null = null;

let loading = false;
let error: string | null = null;
/** Guards against a retry loop when the refreshed url fails too. */
let retriedForTrack: string | null = null;
/** The element emits timeupdate on its own; a decoded track needs a clock for it. */
let ticker: ReturnType<typeof setInterval> | null = null;

// Linux only: WebKitGTK is where the element drops audio, and decoding costs memory
// (about 10 MB per minute), which other platforms' players don't need to spend.
const DECODE_LOCAL_FILES = CAPS.localLibrary && window.NL_OS === 'Linux';
// Longer or bigger files (DJ mixes, audiobooks, whole-album recordings) are streamed.
const MAX_DECODE_MS = 15 * 60_000;
const MAX_DECODE_BYTES = 60 * 1024 * 1024;
/** Into a song, when the next one starts loading: not right at the start, which needs the bandwidth. */
const PREPARE_AFTER_S = 5;

const media = (slot: Slot) => slot.decoded ?? slot.audio;

const status = (): PlaybackStatus => {
  const m = media(active);
  return {
    trackId: active.trackId,
    playing: !!m && !m.paused && !m.ended,
    loading,
    positionMs: m ? Math.floor(m.currentTime * 1000) : 0,
    durationMs: m && Number.isFinite(m.duration) ? Math.floor(m.duration * 1000) : 0,
    muxed: active.muxed,
    error,
    volume,
  };
};

const emit = () => {
  const s = status();
  for (const l of listeners) l(s);
};

export const onPlaybackChange = (fn: Listener): (() => void) => {
  listeners.add(fn);
  fn(status());
  return () => {
    listeners.delete(fn);
  };
};

/** The backend returns a root-relative url ("/api/v1/stream/<token>"), so resolve it against the API origin. */
const absolute = (url: string): string => {
  if (/^https?:\/\//.test(url)) return url;
  return new URL(url, API_BASE).origin + url;
};

/** Loaded far enough to start at once. */
const slotLoaded = (slot: Slot): boolean => slot.ready || !!slot.decoded;

/** Stops the element and drops its source, so a decoded track plays alone. */
const emptyElement = (a: HTMLAudioElement) => {
  a.pause();
  if (a.getAttribute('src')) {
    a.removeAttribute('src');
    a.load();
  }
};

/** Back to an empty slot: nothing loaded, nothing playing, full level. */
const releaseSlot = (slot: Slot) => {
  slot.token++;
  slot.trackId = null;
  slot.ready = false;
  slot.decoded?.dispose();
  slot.decoded = null;
  if (slot.audio) emptyElement(slot.audio);
  setLevel(slot, 1);
  if (slot === standby) gaplessScheduled = false;
};

const el = (slot: Slot): HTMLAudioElement => {
  if (slot.audio) return slot.audio;
  const a = new Audio();
  // Required for the Web Audio EQ: without CORS the graph would output silence.
  a.crossOrigin = 'anonymous';
  a.preload = 'auto';
  a.volume = volume;
  dsp.bindElement(a);
  a.addEventListener('timeupdate', () => {
    if (slot !== active) return;
    emit();
    checkTransition();
  });
  a.addEventListener('durationchange', () => {
    if (slot !== active) return;
    // Scans estimate some durations (or have none); the decoder's value is authoritative.
    if (slot.trackId?.startsWith('local:') && Number.isFinite(a.duration)) {
      localLibrary.noteDuration(slot.trackId, Math.round(a.duration * 1000));
    }
    emit();
  });
  a.addEventListener('play', () => slot === active && emit());
  a.addEventListener('pause', () => slot === active && emit());
  a.addEventListener('ended', () => {
    if (slot === active) activeEnded();
    else if (slot === fading) endFade();
  });
  a.addEventListener('waiting', () => {
    if (slot !== active) return;
    loading = true;
    emit();
  });
  a.addEventListener('playing', () => {
    if (slot !== active) return;
    loading = false;
    error = null;
    emit();
  });
  a.addEventListener('canplaythrough', () => {
    if (slot === standby && slot.trackId) slot.ready = true;
  });
  a.addEventListener('error', () => {
    // Emptying the element for a decoded track isn't a failure.
    if (slot.decoded || !a.getAttribute('src')) return;
    // A standby that won't load is dropped; the next song then loads as usual.
    if (slot === standby) {
      standbyFailed = slot.trackId;
      return releaseSlot(slot);
    }
    if (slot !== active) return;
    // A dead stream url is the usual cause: it expired, or YouTube rejected the IP.
    // Re-resolve once before surfacing anything to the user.
    if (slot.trackId && retriedForTrack !== slot.trackId) {
      const id = slot.trackId;
      retriedForTrack = id;
      slot.expiresAt = 0;
      void load(id, true);
      return;
    }
    loading = false;
    error = 'Playback failed';
    emit();
  });
  slot.audio = a;
  return a;
};

interface ResolvedStream {
  url: string;
  /** A googlevideo url from the in-app catalog (absolute), rather than the backend's relay path. */
  direct: boolean;
  rawId: string;
  itag: number;
  mimeType: string;
  contentLength: number;
  expiresAt: number;
  muxed: boolean;
}

const resolveStream = async (trackId: string): Promise<ResolvedStream> => {
  const res = await api.getTrackStream(trackId, API_QUALITY[getSettings().streamQuality] ?? 'auto');
  // In the desktop window the in-app catalog answers with a googlevideo url; the backend with its relay.
  const direct = isInAppYoutubeAllowed() && isGooglevideo(res.url);
  return {
    url: direct ? res.url : absolute(res.url),
    direct,
    rawId: trackId.startsWith('yt:') ? trackId.slice(3) : trackId,
    itag: res.itag ?? (/mp4|m4a/.test(res.mimeType ?? '') ? 140 : 251),
    mimeType: res.mimeType || 'audio/webm',
    contentLength: res.contentLength ?? 0,
    expiresAt: res.expiresAt ?? 0,
    muxed: !!res.muxed,
  };
};

/** Streams looked up ahead of time for the next song (prefetch), by track; each is used once. */
const aheadStreams = new Map<string, Promise<ResolvedStream>>();

/** The stream for a load: the one looked up ahead while it has a minute left, else a fresh one. */
const streamFor = async (trackId: string, force: boolean): Promise<ResolvedStream> => {
  const ahead = force ? undefined : aheadStreams.get(trackId);
  aheadStreams.delete(trackId);
  const r = ahead ? await ahead.catch(() => null) : null;
  if (r && (r.expiresAt === 0 || r.expiresAt > Date.now() + 60_000)) return r;
  return resolveStream(trackId);
};

/**
 * Download an in-app stream into the cache. A 403 means YouTube gave this session a "limited"
 * url, so start a fresh session, get a new url and try once more.
 */
const downloadInApp = async (trackId: string, resolved: ResolvedStream, force: boolean): Promise<string> => {
  if (force) await streamCache.remove(resolved.rawId, resolved.itag);
  const fetchInto = (r: ResolvedStream) =>
    streamCache.getOrDownload(r.rawId, r.url, r.itag, r.mimeType, r.contentLength);
  try {
    return await fetchInto(resolved);
  } catch (err) {
    if (!(err instanceof StreamDownloadError) || err.status !== 403) throw err;
    await (await inAppYoutube.getSource()).refresh();
    const fresh = await resolveStream(trackId);
    if (!fresh.direct) throw err;
    return fetchInto(fresh);
  }
};

/** Looks up the next song's stream now (and in the desktop window downloads it), so it starts at once. */
const prefetch = (trackId: string) => {
  if (aheadStreams.has(trackId) || localLibrary.localIdFor(trackId)) return;
  const pending = resolveStream(trackId);
  aheadStreams.set(trackId, pending);
  // Only the next song or two are worth keeping.
  for (const id of aheadStreams.keys()) if (aheadStreams.size > 3) aheadStreams.delete(id);
  pending
    .then((resolved) => (resolved.direct ? downloadInApp(trackId, resolved, false) : undefined))
    .catch(() => {
      // Looked up again when the song loads.
      if (aheadStreams.get(trackId) === pending) aheadStreams.delete(trackId);
    });
};

const startTicker = () => {
  ticker ??= setInterval(() => {
    emit();
    checkTransition();
  }, 250);
};

const stopTicker = () => {
  if (ticker) clearInterval(ticker);
  ticker = null;
};

const decodedEnded = (playback: Playback) => {
  if (active.decoded === playback) {
    stopTicker();
    activeEnded();
  } else if (fading?.decoded === playback) {
    endFade();
  }
};

const decodedFailed = (playback: Playback) => {
  if (active.decoded !== playback) return;
  stopTicker();
  error = 'Playback failed';
  emit();
};

/** Decodes a local file for BufferPlayback; null when Web Audio can't (the element then tries). */
const decode = async (file: LocalFileData): Promise<BufferPlayback | null> => {
  const graph = await dsp.graphInput();
  if (!graph) return null;
  try {
    // decodeAudioData takes the buffer over; keep the original for the element fallback.
    const buffer = await graph.ctx.decodeAudioData(file.data.slice(0));
    if (buffer.duration * 1000 > MAX_DECODE_MS) return null;
    const playback: BufferPlayback = new BufferPlayback(graph.ctx, graph.input, buffer, () => decodedEnded(playback));
    playback.setVolume(volume);
    playback.setRate(dsp.getDsp().speed);
    return playback;
  } catch {
    return null;
  }
};

/** Streams a file too long to decode whole; null when WebCodecs can't decode it. */
const stream = async (demuxed: DemuxedAudio): Promise<StreamPlayback | null> => {
  if (!(await canStream(demuxed))) return null;
  const graph = await dsp.graphInput();
  if (!graph) return null;
  const playback: StreamPlayback = new StreamPlayback(
    graph.ctx,
    graph.input,
    demuxed,
    () => decodedEnded(playback),
    () => decodedFailed(playback),
  );
  playback.setVolume(volume);
  playback.setRate(dsp.getDsp().speed);
  return playback;
};

/**
 * Plays a local file through Web Audio: decoded whole when it's short enough, streamed
 * when not. Null leaves it to the element (formats neither path reads, e.g. M4A).
 */
const webAudioPlayback = async (file: LocalFileData): Promise<Playback | null> => {
  // The demuxer knows the exact length; a folder scan may not.
  const demuxed = demuxAudio(file.data, file.ext);
  const durationMs = demuxed ? demuxed.duration * 1000 : file.durationMs;
  const small = file.data.byteLength <= MAX_DECODE_BYTES && (durationMs === null || durationMs <= MAX_DECODE_MS);
  const whole = small ? await decode(file) : null;
  return whole ?? (demuxed ? stream(demuxed) : null);
};

/**
 * Where to play a file's bytes from: Linux decodes them in memory (WebKitGTK's <audio> drops
 * audio), elsewhere a blob url. Null when the decoded player took over, or the slot moved on
 * to another load meanwhile.
 */
const fileSource = async (slot: Slot, isCurrent: () => boolean, file: LocalFileData): Promise<string | null> => {
  if (DECODE_LOCAL_FILES) {
    const playback = await webAudioPlayback(file);
    if (!isCurrent()) {
      playback?.dispose();
      return null;
    }
    if (playback) {
      emptyElement(el(slot));
      slot.decoded = playback;
      const id = slot.trackId!;
      if (id.startsWith('local:')) localLibrary.noteDuration(id, Math.round(playback.duration * 1000));
      if (slot === active) {
        loading = false;
        emit();
      } else {
        slot.ready = true;
      }
      return null;
    }
  }
  return localLibrary.blobUrlFor(file);
};

/** Seconds of a downloading song that must be here before it starts playing. */
const PROGRESSIVE_START_S = 4;
const PROGRESSIVE_POLL_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Linux window, in-app YouTube: plays a song from the first part of its download instead of
 * waiting for all of it (audit I3), adding the rest to the decoder as it arrives. Resolves true
 * once it plays; false when it can't (not Opus in WebM, no WebCodecs, already cached, or the
 * download ended before enough arrived), and the caller then waits for the whole file as before.
 * The download is the cache's own, so the finished file is cached like any other.
 *
 * Only for the song being played: the next song is downloaded ahead anyway, and a whole file
 * decodes into a BufferPlayback, which can join the song after it sample-exact.
 */
const playWhileDownloading = async (
  slot: Slot,
  isCurrent: () => boolean,
  trackId: string,
  resolved: ResolvedStream,
  force: boolean,
): Promise<boolean> => {
  if (!/webm/i.test(resolved.mimeType)) return false;
  if (!force && (await streamCache.getCachedPath(resolved.rawId, resolved.itag))) return false;
  const graph = await dsp.graphInput();
  if (!graph || !isCurrent()) return false;
  const partPath = await streamCache.partPathFor(resolved.rawId, resolved.itag, resolved.mimeType);

  const download: { result: 'done' | 'failed' | null; path: string | null } = { result: null, path: null };
  void downloadInApp(trackId, resolved, force).then(
    (path) => {
      download.path = path;
      download.result = 'done';
    },
    () => {
      download.result = 'failed';
    },
  );

  let bytes = new Uint8Array(Math.max(resolved.contentLength, 1 << 20));
  let filled = 0;
  const readMore = async (path: string) => {
    let size = 0;
    try {
      size = (await filesystem.getStats(path)).size;
    } catch {
      return; // Not started yet.
    }
    if (size <= filled) return;
    const chunk = new Uint8Array(await filesystem.readBinaryFile(path, { pos: filled, size: size - filled }));
    if (filled + chunk.length > bytes.length) {
      const bigger = new Uint8Array(Math.max(bytes.length * 2, filled + chunk.length));
      bigger.set(bytes.subarray(0, filled));
      bytes = bigger;
    }
    bytes.set(chunk, filled);
    filled += chunk.length;
  };
  // A copy each time: the playback hands its bytes over to the decoder worker.
  const prefix = () => demuxWebmPrefix(bytes.slice(0, filled));

  let playback: StreamPlayback | null = null;
  let sentCount = 0;
  const start = (media: DemuxedAudio, totalSeconds: number) => {
    const p: StreamPlayback = new StreamPlayback(
      graph.ctx,
      graph.input,
      media,
      () => decodedEnded(p),
      () => decodedFailed(p),
      { totalSeconds },
    );
    p.setVolume(volume);
    p.setRate(dsp.getDsp().speed);
    emptyElement(el(slot));
    slot.decoded = p;
    slot.expiresAt = Number.POSITIVE_INFINITY;
    slot.muxed = false;
    if (slot === active) {
      loading = false;
      emit();
    } else {
      slot.ready = true;
    }
    return p;
  };

  try {
    for (;;) {
      // Read the state before the bytes, so bytes that came with the finish aren't missed.
      const result = download.result;
      await readMore(result === 'done' && download.path ? download.path : partPath);
      if (!playback) {
        // Finished or failed before enough arrived: the usual whole-file path takes over.
        if (result || !isCurrent()) return false;
        const { media, declaredDuration } = prefix();
        if (media && declaredDuration && media.duration >= PROGRESSIVE_START_S) {
          if (!(await canStream(media)) || !isCurrent()) return false;
          sentCount = media.count;
          playback = start(media, declaredDuration);
          // Keep adding the rest in the background; the song plays meanwhile.
          void (async () => {
            for (;;) {
              await sleep(PROGRESSIVE_POLL_MS);
              const p = playback!;
              // Another song took the slot: the download carries on into the cache.
              if (slot.decoded !== p) return;
              const state = download.result;
              await readMore(state === 'done' && download.path ? download.path : partPath);
              if (state === 'done') {
                const whole = demuxAudio(bytes.slice(0, filled).buffer, 'webm');
                const media = whole ?? prefix().media;
                if (media) p.grow(media, true);
                return;
              }
              if (state === 'failed') {
                const { media } = prefix();
                if (media) p.grow(media, true);
                if (slot === active) {
                  error = 'The song stopped downloading';
                  emit();
                }
                return;
              }
              const { media } = prefix();
              if (media && media.count > sentCount) {
                sentCount = media.count;
                p.grow(media, false);
              }
            }
          })().catch(() => {
            // Reading the file failed: what arrived keeps playing.
          });
          return true;
        }
      }
      await sleep(PROGRESSIVE_POLL_MS);
    }
  } catch {
    return false;
  }
};

/**
 * Point `slot` at `trackId`, fetching a fresh stream url when needed. Does not start playback.
 * The active slot reports loading and errors; a standby that fails is just dropped.
 */
const loadInto = async (slot: Slot, trackId: string, force: boolean): Promise<void> => {
  const token = ++slot.token;
  slot.trackId = trackId;
  slot.ready = false;
  slot.decoded?.dispose();
  slot.decoded = null;
  setLevel(slot, 1);
  const isCurrent = () => slot.token === token;
  const isActive = () => slot === active;
  if (isActive()) {
    loading = true;
    error = null;
    stopTicker();
    emit();
  }
  const a = el(slot);

  try {
    // Local files, and server tracks that have been downloaded, play from disk.
    const localId = localLibrary.localIdFor(trackId);
    let src: string;
    if (localId) {
      // Created here, still close to the click that chose the track: an AudioContext made
      // later can start suspended and stay silent.
      if (DECODE_LOCAL_FILES) void dsp.ensureGraph();
      const file = await localLibrary.readFile(trackId);
      slot.expiresAt = Number.POSITIVE_INFINITY;
      slot.muxed = false;
      if (!isCurrent()) return;
      const fileSrc = await fileSource(slot, isCurrent, file);
      if (!fileSrc) return;
      src = fileSrc;
    } else {
      // Start the audio graph now, close to the click: the download below can outlast the click's
      // user activation, and an AudioContext created after that stays suspended (silent).
      if (DECODE_LOCAL_FILES && isInAppYoutubeAllowed()) void dsp.ensureGraph();
      const resolved = await streamFor(trackId, force);
      if (!isCurrent()) return;
      slot.expiresAt = resolved.expiresAt;
      slot.muxed = resolved.muxed;
      if (!resolved.direct) {
        src = resolved.url;
      } else {
        if (DECODE_LOCAL_FILES && isActive() && (await playWhileDownloading(slot, isCurrent, trackId, resolved, force)))
          return;
        if (!isCurrent()) return;
        let path: string | null = null;
        try {
          path = await downloadInApp(trackId, resolved, force);
        } catch (err) {
          console.warn(
            '[in-app-yt] stream download failed, using the backend:',
            err instanceof Error ? err.message : err,
          );
        }
        if (!isCurrent()) return;
        if (path) {
          slot.expiresAt = Number.POSITIVE_INFINITY;
          slot.muxed = false;
          const fileSrc = await fileSource(slot, isCurrent, await streamCache.readFile(path, resolved.mimeType));
          if (!fileSrc) return;
          src = fileSrc;
        } else {
          const res = await api.getBackendTrackStream(trackId, API_QUALITY[getSettings().streamQuality] ?? 'auto');
          slot.expiresAt = res.expiresAt ?? 0;
          slot.muxed = !!res.muxed;
          src = absolute(res.url);
        }
      }
    }
    // Another track may have been selected while this request was in flight.
    if (!isCurrent()) return;
    a.src = src;
    a.load();
  } catch (e) {
    if (!isCurrent()) return;
    if (!isActive()) {
      standbyFailed = trackId;
      return releaseSlot(slot);
    }
    loading = false;
    error = e instanceof Error ? e.message : 'Could not load stream';
    emit();
    throw e;
  }
};

/** The standby becomes the active slot; the old active one is emptied (or left to fade out). */
const takeStandby = () => {
  const old = active;
  active = standby;
  standby = old;
  gaplessScheduled = false;
  retriedForTrack = null;
  loading = false;
  error = null;
  return old;
};

/**
 * Point the player at `trackId`, fetching a fresh stream url when the cached one is
 * missing or past `expiresAt`. Does not start playback on its own.
 */
export const load = async (trackId: string, force = false): Promise<void> => {
  finishFade();
  // The next song, already prepared in the standby slot: take it over instead of loading again.
  if (!force && standby.trackId === trackId && slotLoaded(standby)) {
    releaseSlot(takeStandby());
    emit();
    return;
  }
  const a = el(active);
  const stale = Date.now() >= active.expiresAt - 5_000;
  if (!force && active.trackId === trackId && !stale && (active.decoded || a.src)) return;
  if (standby.trackId === trackId) releaseSlot(standby);
  await loadInto(active, trackId, force);
};

/** Moves to `positionMs` as soon as the loaded track can seek (a restored queue resumes mid-song). */
const seekWhenReady = (positionMs: number) => {
  if (active.decoded) {
    active.decoded.seek(positionMs / 1000);
    emit();
    return;
  }
  const a = el(active);
  if (a.readyState >= HTMLMediaElement.HAVE_METADATA) seek(positionMs);
  else a.addEventListener('loadedmetadata', () => seek(positionMs), { once: true });
};

/**
 * Loads and plays `trackId`; `fromStart` restarts it when it is the track already loaded, and
 * `startMs` starts it from there.
 */
export const playTrackId = async (trackId: string, fromStart = false, startMs = 0): Promise<void> => {
  const same = active.trackId === trackId;
  if (!same) retriedForTrack = null;
  await load(trackId);
  if (active.trackId !== trackId) return;
  if (startMs > 0) seekWhenReady(startMs);
  else if (same && fromStart) seek(0);
  await play();
};

/** Re-resolve the current track's source (fresh stream url / re-read file) and play. */
export const retry = async (): Promise<void> => {
  const id = active.trackId;
  if (!id) return;
  retriedForTrack = null;
  await load(id, true);
  await play();
};

const playSlot = async (slot: Slot): Promise<void> => {
  if (slot.decoded) {
    try {
      await slot.decoded.play();
      if (slot === active) {
        error = null;
        startTicker();
      }
    } catch (e) {
      if (slot === active)
        error = e instanceof Error && e.name === 'NotAllowedError' ? 'Press play to start audio' : 'Playback failed';
    }
    emit();
    return;
  }
  const a = el(slot);
  if (!a.src) return;
  void dsp.ensureGraph();
  try {
    await a.play();
  } catch (e) {
    if (slot !== active) return;
    // Autoplay rejection is not a stream failure — report it plainly.
    loading = false;
    error = e instanceof Error && e.name === 'NotAllowedError' ? 'Press play to start audio' : 'Playback failed';
    emit();
  }
};

export const play = (): Promise<void> => playSlot(active);

/** Calls the user makes (pause, seek, another song) end a crossfade or a scheduled gapless start. */
const settle = () => {
  finishFade();
  if (gaplessScheduled) {
    gaplessScheduled = false;
    standby.decoded?.pause();
    standby.decoded?.seek(0);
  }
};

export const pause = (): void => {
  settle();
  if (active.decoded) {
    active.decoded.pause();
    stopTicker();
    emit();
    return;
  }
  active.audio?.pause();
};

export const toggle = (): void => {
  const m = active.decoded ?? el(active);
  if (!active.decoded && !el(active).src) return;
  if (m.paused) void play();
  else pause();
};

export const seek = (positionMs: number): void => {
  settle();
  if (active.decoded) {
    active.decoded.seek(positionMs / 1000);
    emit();
    return;
  }
  const a = el(active);
  if (!a.src || !Number.isFinite(a.duration)) return;
  a.currentTime = Math.max(0, Math.min(positionMs / 1000, a.duration));
  emit();
};

// ── Next song: prefetch, gapless and crossfade ─────────────────────────────────────

const sameAlbum = (a: string | null, b: string | null) => !!a && a === b;

/** Gapless or crossfade is on: the next song waits ready in the standby slot. */
const wantStandby = () => getSettings().gapless || dsp.getDsp().crossfade;

/** Crossfade, except between songs of one album when gapless is on (like the Android app). */
const wantCrossfade = () =>
  dsp.getDsp().crossfade && !!next && !(getSettings().gapless && sameAlbum(currentAlbum, next.album));

/** Crossfades ramp a slot's level in the Web Audio chain; without one there is nothing to ramp. */
const canFade = (slot: Slot): boolean => !!slot.decoded || !!(slot.audio && dsp.faderFor(slot.audio));

/** Ramps a slot's level in the chain; false when there is nothing to ramp. */
const fadeSlot = (slot: Slot, level: number, seconds: number): boolean => {
  if (slot.decoded) {
    slot.decoded.fadeTo(level, seconds);
    return true;
  }
  const fader = slot.audio && dsp.faderFor(slot.audio);
  if (!fader) return false;
  const t = fader.context.currentTime;
  fader.gain.cancelScheduledValues(t);
  fader.gain.setValueAtTime(fader.gain.value, t);
  fader.gain.linearRampToValueAtTime(level, t + Math.max(0.01, seconds));
  return true;
};

function setLevel(slot: Slot, level: number) {
  if (slot.decoded) {
    slot.decoded.fadeTo(level, 0.01);
    return;
  }
  const fader = slot.audio && dsp.faderFor(slot.audio);
  if (!fader) return;
  fader.gain.cancelScheduledValues(0);
  fader.gain.value = level;
}

function endFade() {
  clearTimeout(fadeTimer);
  const out = fading;
  fading = null;
  if (out) releaseSlot(out);
}

/** A user action during a crossfade: the new song plays alone, at full level, at once. */
function finishFade() {
  if (!fading) return;
  setLevel(active, 1);
  endFade();
}

/** The standby song starts now; the app hears about it through onAdvance. */
const startNext = (fadeSeconds: number) => {
  const old = takeStandby();
  if (fadeSeconds > 0 && fadeSlot(old, 0, fadeSeconds)) {
    fading = old;
    setLevel(active, 0);
    fadeSlot(active, 1, fadeSeconds);
    fadeTimer = setTimeout(endFade, fadeSeconds * 1000 + 250);
  } else {
    releaseSlot(old);
  }
  currentAlbum = next?.album ?? null;
  next = null;
  void play();
  for (const fn of advanceListeners) fn(active.trackId!);
  emit();
};

/** The active song finished. A song waiting in the standby slot starts at once (gapless). */
function activeEnded() {
  emit();
  if (next && standby.trackId === next.id && slotLoaded(standby) && wantStandby()) {
    startNext(0);
    return;
  }
  for (const fn of endedListeners) fn();
}

/** Runs on every position update of the active song: prepares and starts the next one. */
function checkTransition() {
  const m = media(active);
  if (!next || !m || m.paused || !Number.isFinite(m.duration) || m.duration <= 0) return;
  const rate = dsp.getDsp().speed || 1;
  const remaining = (m.duration - m.currentTime) / rate;
  const due = m.currentTime >= PREPARE_AFTER_S || remaining < 30;
  if (!due) return;

  if (!wantStandby()) {
    prefetch(next.id);
    return;
  }
  if (standby.trackId !== next.id) {
    if (standbyFailed !== next.id) void loadInto(standby, next.id, false);
    return;
  }
  if (!slotLoaded(standby) || fading) return;

  const fadeS = dsp.CROSSFADE_MS / 1000;
  if (wantCrossfade() && remaining <= fadeS && m.duration > fadeS * 2 && canFade(active) && canFade(standby)) {
    startNext(remaining);
    return;
  }
  // Two decoded songs can join sample-exact: start the next one where this one ends.
  if (!gaplessScheduled && remaining < 1 && active.decoded instanceof BufferPlayback) {
    const endsAt = active.decoded.endsAt;
    if (endsAt !== null && standby.decoded instanceof BufferPlayback) {
      gaplessScheduled = true;
      void standby.decoded.playAt(endsAt);
    }
  }
}

/**
 * What plays after the current song by itself (null: nothing, or repeat one), and the current
 * song's album (crossfade skips songs of one album when gapless is on). The app calls this
 * whenever the queue or its position changes.
 */
export const setNext = (song: { id: string; album: string | null } | null, album: string | null): void => {
  currentAlbum = album;
  if (next?.id === song?.id && next?.album === song?.album) return;
  next = song;
  standbyFailed = null;
  if (standby.trackId && standby.trackId !== song?.id) releaseSlot(standby);
};

/** The engine moved on to the next song by itself (gapless or crossfade). */
export const onAdvance = (fn: (trackId: string) => void): (() => void) => {
  advanceListeners.add(fn);
  return () => {
    advanceListeners.delete(fn);
  };
};

// ── Volume ──────────────────────────────────────────────────────────────────────────

const VOLUME_KEY = 'sonare_volume';

const storedVolume = (): number => {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 1;
    const v = Number(raw);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  } catch {
    // Private mode or blocked storage — fall back to full volume.
    return 1;
  }
};

let volume = storedVolume();

export const setVolume = (v: number): void => {
  volume = Math.max(0, Math.min(1, v));
  for (const slot of [active, standby]) {
    if (slot.audio) slot.audio.volume = volume;
    slot.decoded?.setVolume(volume);
  }
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Not worth failing playback over an unwritable localStorage.
  }
  emit();
};

/** Volume to restore on unmute; never 0, or unmuting would do nothing. */
let volumeBeforeMute = 1;

export const toggleMute = (): void => {
  if (volume > 0) {
    volumeBeforeMute = volume;
    setVolume(0);
  } else {
    setVolume(volumeBeforeMute);
  }
};

export const getVolume = (): number => {
  return volume;
};

export const onEnded = (fn: () => void): (() => void) => {
  endedListeners.add(fn);
  return () => {
    endedListeners.delete(fn);
  };
};

// The speed setting (Equalizer screen) reaches the elements through dsp.ts; decoded tracks
// take it from here.
dsp.subscribeDsp(() => {
  for (const slot of [active, standby]) slot.decoded?.setRate(dsp.getDsp().speed);
});

export const getStatus = (): PlaybackStatus => {
  return status();
};
