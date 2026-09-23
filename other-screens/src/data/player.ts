import { API_BASE } from './auth'
import { api } from './api'
import * as dsp from './dsp'
import { localLibrary } from './local'
import { getSettings, type UserSettings } from './settings'

const STREAM_QUALITY: Record<UserSettings['downloadQuality'], 'auto' | 'low' | 'high'> = {
  low: 'low',
  normal: 'auto',
  high: 'high',
  lossless: 'high',
}

/**
 * Audio playback engine.
 *
 * One HTMLAudioElement for the whole app, created lazily on the first play so that
 * construction happens inside a user gesture — browsers block autoplay otherwise.
 *
 * Stream URLs from GET /tracks/:id/stream are time-limited and IP-bound (contract
 * section 8.2), so `expiresAt` is tracked and the url is re-requested on expiry or on a
 * media error rather than failing the track.
 */

export interface PlaybackStatus {
  trackId: string | null
  playing: boolean
  loading: boolean
  positionMs: number
  durationMs: number
  /** True when the backend fell back to a muxed video stream because no adaptive audio existed. */
  muxed: boolean
  error: string | null
  /** 0..1 */
  volume: number
}

type Listener = (s: PlaybackStatus) => void

const listeners = new Set<Listener>()

let audio: HTMLAudioElement | null = null
let currentTrackId: string | null = null
let expiresAt = 0
let muxed = false
let loading = false
let error: string | null = null
/** Guards against a retry loop when the refreshed url fails too. */
let retriedForTrack: string | null = null

function status(): PlaybackStatus {
  return {
    trackId: currentTrackId,
    playing: !!audio && !audio.paused && !audio.ended,
    loading,
    positionMs: audio ? Math.floor(audio.currentTime * 1000) : 0,
    durationMs: audio && Number.isFinite(audio.duration) ? Math.floor(audio.duration * 1000) : 0,
    muxed,
    error,
    volume,
  }
}

function emit() {
  const s = status()
  for (const l of listeners) l(s)
}

export function onPlaybackChange(fn: Listener): () => void {
  listeners.add(fn)
  fn(status())
  return () => {
    listeners.delete(fn)
  }
}

/** The backend returns a root-relative url ("/api/v1/stream/<token>"), so resolve it against the API origin. */
function absolute(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  return new URL(url, API_BASE).origin + url
}

function el(): HTMLAudioElement {
  if (audio) return audio
  const a = new Audio()
  // Required for the Web Audio EQ: without CORS the graph would output silence.
  a.crossOrigin = 'anonymous'
  a.preload = 'auto'
  a.volume = volume
  dsp.bindElement(a)
  a.addEventListener('timeupdate', emit)
  a.addEventListener('durationchange', () => {
    // Scans estimate some durations (or have none); the decoder's value is authoritative.
    if (currentTrackId?.startsWith('local:') && Number.isFinite(a.duration)) {
      localLibrary.noteDuration(currentTrackId, Math.round(a.duration * 1000))
    }
    emit()
  })
  a.addEventListener('play', emit)
  a.addEventListener('pause', emit)
  a.addEventListener('ended', emit)
  a.addEventListener('waiting', () => {
    loading = true
    emit()
  })
  a.addEventListener('playing', () => {
    loading = false
    error = null
    emit()
  })
  a.addEventListener('error', () => {
    // A dead stream url is the usual cause: it expired, or YouTube rejected the IP.
    // Re-resolve once before surfacing anything to the user.
    if (currentTrackId && retriedForTrack !== currentTrackId) {
      const id = currentTrackId
      retriedForTrack = id
      expiresAt = 0
      void load(id, true)
      return
    }
    loading = false
    error = 'Playback failed'
    emit()
  })
  audio = a
  return a
}

async function resolveStream(trackId: string): Promise<string> {
  const res = await api.getTrackStream(trackId, STREAM_QUALITY[getSettings().downloadQuality] ?? 'auto')
  expiresAt = res.expiresAt ?? 0
  muxed = !!res.muxed
  return absolute(res.url)
}

/**
 * Point the element at `trackId`, fetching a fresh stream url when the cached one is
 * missing or past `expiresAt`. Does not start playback on its own.
 */
export async function load(trackId: string, force = false): Promise<void> {
  const a = el()
  const stale = Date.now() >= expiresAt - 5_000
  if (!force && currentTrackId === trackId && !stale && a.src) return

  currentTrackId = trackId
  loading = true
  error = null
  emit()

  try {
    // Local files, and server tracks that have been downloaded, play from disk.
    const localId = localLibrary.localIdFor(trackId)
    let src: string
    if (localId) {
      src = await localLibrary.objectUrl(trackId)
      expiresAt = Number.POSITIVE_INFINITY
      muxed = false
    } else {
      src = await resolveStream(trackId)
    }
    // Another track may have been selected while this request was in flight.
    if (currentTrackId !== trackId) return
    a.src = src
    a.load()
  } catch (e) {
    if (currentTrackId !== trackId) return
    loading = false
    error = e instanceof Error ? e.message : 'Could not load stream'
    emit()
    throw e
  }
}

export async function playTrackId(trackId: string): Promise<void> {
  if (currentTrackId !== trackId) retriedForTrack = null
  await load(trackId)
  await play()
}

/** Re-resolve the current track's source (fresh stream url / re-read file) and play. */
export async function retry(): Promise<void> {
  if (!currentTrackId) return
  retriedForTrack = null
  await load(currentTrackId, true)
  await play()
}

export async function play(): Promise<void> {
  const a = el()
  if (!a.src) return
  void dsp.ensureGraph()
  try {
    await a.play()
  } catch (e) {
    // Autoplay rejection is not a stream failure — report it plainly.
    loading = false
    error = e instanceof Error && e.name === 'NotAllowedError' ? 'Press play to start audio' : 'Playback failed'
    emit()
  }
}

export function pause(): void {
  audio?.pause()
}

export function toggle(): void {
  const a = el()
  if (!a.src) return
  if (a.paused) void play()
  else a.pause()
}

export function seek(positionMs: number): void {
  const a = el()
  if (!a.src || !Number.isFinite(a.duration)) return
  a.currentTime = Math.max(0, Math.min(positionMs / 1000, a.duration))
  emit()
}

const VOLUME_KEY = 'sonare_volume'

function storedVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    if (raw === null) return 1
    const v = Number(raw)
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1
  } catch {
    // Private mode or blocked storage — fall back to full volume.
    return 1
  }
}

let volume = storedVolume()

export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v))
  if (audio) audio.volume = volume
  try {
    localStorage.setItem(VOLUME_KEY, String(volume))
  } catch {
    // Not worth failing playback over an unwritable localStorage.
  }
  emit()
}

/** Volume to restore on unmute; never 0, or unmuting would do nothing. */
let volumeBeforeMute = 1

export function toggleMute(): void {
  if (volume > 0) {
    volumeBeforeMute = volume
    setVolume(0)
  } else {
    setVolume(volumeBeforeMute)
  }
}

export function getVolume(): number {
  return volume
}

export function onEnded(fn: () => void): () => void {
  const a = el()
  a.addEventListener('ended', fn)
  return () => a.removeEventListener('ended', fn)
}

export function getStatus(): PlaybackStatus {
  return status()
}
