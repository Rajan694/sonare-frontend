import { API_BASE } from './auth';
import { api } from './api';
import { demuxAudio, type DemuxedAudio } from './audioDemux';
import { BufferPlayback } from './bufferPlayback';
import { canStream, StreamPlayback } from './streamPlayback';
import * as dsp from './dsp';
import { localLibrary, type LocalFileData } from './local';
import { API_QUALITY, getSettings } from './settings';
import { CAPS } from '../lib/caps';

/**
 * Audio playback engine.
 *
 * One HTMLAudioElement for the whole app, created lazily on the first play so that
 * construction happens inside a user gesture — browsers block autoplay otherwise.
 *
 * Stream URLs from GET /tracks/:id/stream are time-limited and IP-bound (contract
 * section 8.2), so `expiresAt` is tracked and the url is re-requested on expiry or on a
 * media error rather than failing the track.
 *
 * In the Linux window, local files are decoded and played from memory instead (see
 * bufferPlayback.ts): WebKitGTK's <audio> drops audio at every ~64 KB it reads. Files too
 * long to decode whole are decoded a few seconds at a time (streamPlayback.ts).
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

const listeners = new Set<Listener>();

let audio: HTMLAudioElement | null = null;
let currentTrackId: string | null = null;
let expiresAt = 0;
let muxed = false;
let loading = false;
let error: string | null = null;
/** Guards against a retry loop when the refreshed url fails too. */
let retriedForTrack: string | null = null;
/** The current track when it plays through Web Audio; the element is idle meanwhile. */
let decoded: BufferPlayback | StreamPlayback | null = null;
/** The element emits timeupdate on its own; a decoded track needs a clock for it. */
let ticker: ReturnType<typeof setInterval> | null = null;
const endedListeners = new Set<() => void>();

// Linux only: WebKitGTK is where the element drops audio, and decoding costs memory
// (about 10 MB per minute), which other platforms' players don't need to spend.
const DECODE_LOCAL_FILES = CAPS.localLibrary && window.NL_OS === 'Linux';
// Longer or bigger files (DJ mixes, audiobooks, whole-album recordings) are streamed.
const MAX_DECODE_MS = 15 * 60_000;
const MAX_DECODE_BYTES = 60 * 1024 * 1024;

function status(): PlaybackStatus {
  const media = decoded ?? audio;
  return {
    trackId: currentTrackId,
    playing: !!media && !media.paused && !media.ended,
    loading,
    positionMs: media ? Math.floor(media.currentTime * 1000) : 0,
    durationMs: media && Number.isFinite(media.duration) ? Math.floor(media.duration * 1000) : 0,
    muxed,
    error,
    volume,
  };
}

function emit() {
  const s = status();
  for (const l of listeners) l(s);
}

export function onPlaybackChange(fn: Listener): () => void {
  listeners.add(fn);
  fn(status());
  return () => {
    listeners.delete(fn);
  };
}

/** The backend returns a root-relative url ("/api/v1/stream/<token>"), so resolve it against the API origin. */
function absolute(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return new URL(url, API_BASE).origin + url;
}

function el(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  // Required for the Web Audio EQ: without CORS the graph would output silence.
  a.crossOrigin = 'anonymous';
  a.preload = 'auto';
  a.volume = volume;
  dsp.bindElement(a);
  a.addEventListener('timeupdate', emit);
  a.addEventListener('durationchange', () => {
    // Scans estimate some durations (or have none); the decoder's value is authoritative.
    if (currentTrackId?.startsWith('local:') && Number.isFinite(a.duration)) {
      localLibrary.noteDuration(currentTrackId, Math.round(a.duration * 1000));
    }
    emit();
  });
  a.addEventListener('play', emit);
  a.addEventListener('pause', emit);
  a.addEventListener('ended', () => {
    emit();
    for (const fn of endedListeners) fn();
  });
  a.addEventListener('waiting', () => {
    loading = true;
    emit();
  });
  a.addEventListener('playing', () => {
    loading = false;
    error = null;
    emit();
  });
  a.addEventListener('error', () => {
    // Emptying the element for a decoded track isn't a failure.
    if (decoded || !a.getAttribute('src')) return;
    // A dead stream url is the usual cause: it expired, or YouTube rejected the IP.
    // Re-resolve once before surfacing anything to the user.
    if (currentTrackId && retriedForTrack !== currentTrackId) {
      const id = currentTrackId;
      retriedForTrack = id;
      expiresAt = 0;
      void load(id, true);
      return;
    }
    loading = false;
    error = 'Playback failed';
    emit();
  });
  audio = a;
  return a;
}

async function resolveStream(trackId: string): Promise<string> {
  const res = await api.getTrackStream(trackId, API_QUALITY[getSettings().streamQuality] ?? 'auto');
  expiresAt = res.expiresAt ?? 0;
  muxed = !!res.muxed;
  return absolute(res.url);
}

function startTicker() {
  ticker ??= setInterval(emit, 250);
}

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

function releaseDecoded() {
  stopTicker();
  decoded?.dispose();
  decoded = null;
}

/** Stops the element and drops its source, so a decoded track plays alone. */
function emptyElement(a: HTMLAudioElement) {
  a.pause();
  if (a.getAttribute('src')) {
    a.removeAttribute('src');
    a.load();
  }
}

function decodedEnded() {
  stopTicker();
  emit();
  for (const fn of endedListeners) fn();
}

function streamFailed() {
  stopTicker();
  error = 'Playback failed';
  emit();
}

/** Decodes a local file for BufferPlayback; null when Web Audio can't (the element then tries). */
async function decode(file: LocalFileData): Promise<BufferPlayback | null> {
  const graph = await dsp.graphInput();
  if (!graph) return null;
  try {
    // decodeAudioData takes the buffer over; keep the original for the element fallback.
    const buffer = await graph.ctx.decodeAudioData(file.data.slice(0));
    if (buffer.duration * 1000 > MAX_DECODE_MS) return null;
    const playback = new BufferPlayback(graph.ctx, graph.input, buffer, decodedEnded);
    playback.setVolume(volume);
    playback.setRate(dsp.getDsp().speed);
    return playback;
  } catch {
    return null;
  }
}

/** Streams a file too long to decode whole; null when WebCodecs can't decode it. */
async function stream(media: DemuxedAudio): Promise<StreamPlayback | null> {
  if (!(await canStream(media))) return null;
  const graph = await dsp.graphInput();
  if (!graph) return null;
  const playback = new StreamPlayback(graph.ctx, graph.input, media, decodedEnded, streamFailed);
  playback.setVolume(volume);
  playback.setRate(dsp.getDsp().speed);
  return playback;
}

/**
 * Plays a local file through Web Audio: decoded whole when it's short enough, streamed
 * when not. Null leaves it to the element (formats neither path reads, e.g. M4A).
 */
async function webAudioPlayback(file: LocalFileData): Promise<BufferPlayback | StreamPlayback | null> {
  // The demuxer knows the exact length; a folder scan may not.
  const media = demuxAudio(file.data, file.ext);
  const durationMs = media ? media.duration * 1000 : file.durationMs;
  const small = file.data.byteLength <= MAX_DECODE_BYTES && (durationMs === null || durationMs <= MAX_DECODE_MS);
  const whole = small ? await decode(file) : null;
  return whole ?? (media ? stream(media) : null);
}

/**
 * Point the player at `trackId`, fetching a fresh stream url when the cached one is
 * missing or past `expiresAt`. Does not start playback on its own.
 */
export async function load(trackId: string, force = false): Promise<void> {
  const a = el();
  const stale = Date.now() >= expiresAt - 5_000;
  if (!force && currentTrackId === trackId && !stale && (decoded || a.src)) return;

  currentTrackId = trackId;
  loading = true;
  error = null;
  releaseDecoded();
  emit();

  try {
    // Local files, and server tracks that have been downloaded, play from disk.
    const localId = localLibrary.localIdFor(trackId);
    let src: string;
    if (localId) {
      // Created here, still close to the click that chose the track: an AudioContext made
      // later can start suspended and stay silent.
      if (DECODE_LOCAL_FILES) void dsp.ensureGraph();
      const file = await localLibrary.readFile(trackId);
      expiresAt = Number.POSITIVE_INFINITY;
      muxed = false;
      if (currentTrackId !== trackId) return;
      if (DECODE_LOCAL_FILES) {
        const playback = await webAudioPlayback(file);
        if (currentTrackId !== trackId) {
          playback?.dispose();
          return;
        }
        if (playback) {
          emptyElement(a);
          decoded = playback;
          loading = false;
          if (trackId.startsWith('local:')) localLibrary.noteDuration(trackId, Math.round(playback.duration * 1000));
          emit();
          return;
        }
      }
      src = localLibrary.blobUrlFor(file);
    } else {
      src = await resolveStream(trackId);
    }
    // Another track may have been selected while this request was in flight.
    if (currentTrackId !== trackId) return;
    a.src = src;
    a.load();
  } catch (e) {
    if (currentTrackId !== trackId) return;
    loading = false;
    error = e instanceof Error ? e.message : 'Could not load stream';
    emit();
    throw e;
  }
}

export async function playTrackId(trackId: string): Promise<void> {
  if (currentTrackId !== trackId) retriedForTrack = null;
  await load(trackId);
  await play();
}

/** Re-resolve the current track's source (fresh stream url / re-read file) and play. */
export async function retry(): Promise<void> {
  if (!currentTrackId) return;
  retriedForTrack = null;
  await load(currentTrackId, true);
  await play();
}

export async function play(): Promise<void> {
  if (decoded) {
    try {
      await decoded.play();
      error = null;
      startTicker();
    } catch (e) {
      error = e instanceof Error && e.name === 'NotAllowedError' ? 'Press play to start audio' : 'Playback failed';
    }
    emit();
    return;
  }
  const a = el();
  if (!a.src) return;
  void dsp.ensureGraph();
  try {
    await a.play();
  } catch (e) {
    // Autoplay rejection is not a stream failure — report it plainly.
    loading = false;
    error = e instanceof Error && e.name === 'NotAllowedError' ? 'Press play to start audio' : 'Playback failed';
    emit();
  }
}

export function pause(): void {
  if (decoded) {
    decoded.pause();
    stopTicker();
    emit();
    return;
  }
  audio?.pause();
}

export function toggle(): void {
  if (decoded) {
    if (decoded.paused) void play();
    else pause();
    return;
  }
  const a = el();
  if (!a.src) return;
  if (a.paused) void play();
  else a.pause();
}

export function seek(positionMs: number): void {
  if (decoded) {
    decoded.seek(positionMs / 1000);
    emit();
    return;
  }
  const a = el();
  if (!a.src || !Number.isFinite(a.duration)) return;
  a.currentTime = Math.max(0, Math.min(positionMs / 1000, a.duration));
  emit();
}

const VOLUME_KEY = 'sonare_volume';

function storedVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 1;
    const v = Number(raw);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  } catch {
    // Private mode or blocked storage — fall back to full volume.
    return 1;
  }
}

let volume = storedVolume();

export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = volume;
  decoded?.setVolume(volume);
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Not worth failing playback over an unwritable localStorage.
  }
  emit();
}

/** Volume to restore on unmute; never 0, or unmuting would do nothing. */
let volumeBeforeMute = 1;

export function toggleMute(): void {
  if (volume > 0) {
    volumeBeforeMute = volume;
    setVolume(0);
  } else {
    setVolume(volumeBeforeMute);
  }
}

export function getVolume(): number {
  return volume;
}

export function onEnded(fn: () => void): () => void {
  endedListeners.add(fn);
  return () => {
    endedListeners.delete(fn);
  };
}

// The speed setting (Equalizer screen) reaches the element through dsp.ts; a decoded track
// takes it from here.
dsp.subscribeDsp(() => decoded?.setRate(dsp.getDsp().speed));

export function getStatus(): PlaybackStatus {
  return status();
}
