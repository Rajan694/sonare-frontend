import { useEffect } from 'react';
import { api } from '../../data/api';
import { absoluteUrl, artworkUrl } from '../../data/config';
import { useAuthStore } from '../../data/auth';
import { queuePlay } from '../../data/sync';
import { useSettingsStore } from '../../data/settings';
import type { Track } from '../../data/types';
import { SonarePlayer, type LoadOptions } from '../../native/SonarePlayer';
import { CROSSFADE_MS, currentGains, useAudioStore } from '../../store/audio';
import { usePlayerStore } from '../../store/player';
import { localUriFor } from '../../store/downloads';
import { sleepAtTrackEnd, watchSleepTimer } from '../../store/sleepTimer';
import { watchOutput } from '../../store/output';
import { watchPlayerPersistence } from '../../store/playerPersist';

// A play counts once the listener has heard 30s, or half of anything shorter. Asking for
// a stream url doesn't count, or skipping through a queue would inflate every count.
const PLAY_THRESHOLD_MS = 30_000;

/** Which track the native player holds, once its stream has been handed over. */
let loadedId: string | null = null;
let listen: { trackId: string; startedAt: number; counted: boolean } | null = null;
let endedHandled = false;
/** Bumped per load so a slow stream fetch for a skipped track is ignored. */
let loadToken = 0;
let started = false;
/** Set when the native player moved on by itself, so the store change that follows doesn't reload. */
let advancedTo: string | null = null;
/** The next track the native player holds; undefined when it holds nothing we know of. */
let nextSent: string | null | undefined;
let nextToken = 0;

const current = () => usePlayerStore.getState().currentTrack;

/** Downloaded songs play from the phone, online or not; everything else streams. */
async function streamUrl(track: Track): Promise<string> {
  return localUriFor(track.id) ?? absoluteUrl((await api.stream(track.id)).url)!;
}

function loadOptions(track: Track, url: string): LoadOptions {
  return {
    id: track.id,
    url,
    title: track.title,
    artist: track.artist,
    album: track.album ?? undefined,
    artworkUrl: artworkUrl(track, 640),
  };
}

/**
 * Hands the native player the track after the current one, so it can start it gapless or
 * crossfade into it. Only needed while one of those is on; otherwise the next track loads
 * when this one ends, as before.
 */
async function prepareNext() {
  const token = ++nextToken;
  const next = usePlayerStore.getState().upcomingTrack();
  const wanted =
    (useSettingsStore.getState().gapless || useAudioStore.getState().crossfade) &&
    next?.source === 'server' &&
    loadedId !== null &&
    loadedId === current()?.id;
  if (!wanted || !next) {
    if (nextSent !== null) SonarePlayer.setNext(null);
    nextSent = null;
    return;
  }
  if (nextSent === next.id) return;
  try {
    const url = await streamUrl(next);
    if (token !== nextToken) return;
    SonarePlayer.setNext(loadOptions(next, url));
    nextSent = next.id;
  } catch {
    // No stream for it yet: it loads normally once the current track ends.
  }
}

/** Sends the Audio screen's settings to the native player. */
function pushAudioSettings() {
  const audio = useAudioStore.getState();
  const settings = useSettingsStore.getState();
  SonarePlayer.setAudioEffects({
    enabled: audio.enabled,
    gains: currentGains(settings.eqPreset),
    bassBoost: audio.bassBoost,
    virtualizer: audio.virtualizer,
    normalization: settings.normalization,
  });
  SonarePlayer.setSpeed(audio.speed);
  SonarePlayer.setTransitions({ crossfadeMs: audio.crossfade ? CROSSFADE_MS : 0, gapless: settings.gapless });
}

/** The native player already plays `id` (it moved on by itself): take it over without reloading. */
function adopt(id: string) {
  advancedTo = null;
  ++loadToken; // a load still in flight for an older track must not replace this one
  loadedId = id;
  listen = { trackId: id, startedAt: Date.now(), counted: false };
  endedHandled = false;
  nextSent = undefined;
  prepareNext();
}

async function loadCurrent() {
  const token = ++loadToken;
  loadedId = null;
  listen = null;
  endedHandled = false;
  const player = usePlayerStore.getState();
  const track = player.currentTrack;
  if (!track) {
    SonarePlayer.stop();
    return;
  }
  if (track.source !== 'server') {
    player.setError('This track is only on another device');
    return;
  }
  player.setBuffering(true);
  try {
    const url = await streamUrl(track);
    if (token !== loadToken) return;
    // A restored queue resumes where it was left; anything else starts at 0.
    const { startAtMs } = usePlayerStore.getState();
    if (startAtMs !== null) usePlayerStore.setState({ startAtMs: null });
    await SonarePlayer.load({
      ...loadOptions(track, url),
      autoplay: usePlayerStore.getState().isPlaying,
      ...(startAtMs && { startMs: startAtMs }),
    });
    if (token !== loadToken) return;
    loadedId = track.id;
    listen = { trackId: track.id, startedAt: Date.now(), counted: false };
    // load() clears whatever next track the player held.
    nextSent = undefined;
    prepareNext();
    // Paused while the stream was loading: nothing applied it yet, so apply it now.
    if (!usePlayerStore.getState().isPlaying) SonarePlayer.pause();
  } catch (e: any) {
    if (token === loadToken) usePlayerStore.getState().setError(e?.message || 'Could not load this track');
  }
}

/**
 * Wires the player store to the native player, once. This deliberately avoids React
 * effects: with the app in the background React Native pauses the JS timers React's
 * scheduler runs on, so "next" from the lock screen would wait until the app reopened.
 * A store subscription and native events run straight away.
 */
function startAudio() {
  if (started) return;
  started = true;

  // A fresh JS runtime (dev reload) while the service still plays: nothing owns that audio.
  if (!current()) SonarePlayer.stop();

  // Native -> store.
  SonarePlayer.onState((e) => {
    const player = usePlayerStore.getState();
    if (!e.mediaId || e.mediaId !== player.currentTrack?.id) return; // the previous item winding down
    player.setBuffering(e.buffering);
    if (e.ended) {
      if (!endedHandled) {
        endedHandled = true;
        if (sleepAtTrackEnd()) {
          // Sleep timer "End of track": stop here, ready to play this track again.
          player.setIsPlaying(false);
          player.seekTo(0);
        } else {
          player.onTrackEnded();
        }
      }
      return;
    }
    endedHandled = false;
    // Paused or resumed from the lock screen, a headset, or an audio-focus loss.
    if (player.isPlaying !== e.playWhenReady) player.setIsPlaying(e.playWhenReady);
  });

  SonarePlayer.onProgress((e) => {
    const player = usePlayerStore.getState();
    if (!listen || listen.trackId !== player.currentTrack?.id || loadedId !== listen.trackId) return;
    player.setPositionMs(e.positionMs);
    if (e.durationMs > 0 && e.durationMs !== player.durationMs) player.setDurationMs(e.durationMs);
    const threshold = Math.min(PLAY_THRESHOLD_MS, player.durationMs / 2 || PLAY_THRESHOLD_MS);
    // History belongs to an account; guests just listen.
    if (!listen.counted && e.positionMs >= threshold && useAuthStore.getState().status === 'signedIn') {
      listen.counted = true;
      queuePlay(listen.trackId, listen.startedAt, e.positionMs);
    }
  });

  SonarePlayer.onError((e) => usePlayerStore.getState().setError(e.message || 'Playback failed'));

  SonarePlayer.onRemote((e) => {
    const player = usePlayerStore.getState();
    if (e.command === 'next') player.playNext();
    else player.playPrevious();
  });

  // Gapless or crossfade: the player already started the next track. Move the queue along.
  SonarePlayer.onAdvance(({ mediaId }) => {
    const player = usePlayerStore.getState();
    const track = player.queue.find((t) => t.id === mediaId);
    if (!track) {
      // The queue changed under the player: put back the track the queue says is current.
      loadCurrent();
      return;
    }
    advancedTo = mediaId;
    player.setCurrentTrack(track);
  });

  watchSleepTimer();
  watchOutput();
  watchPlayerPersistence();

  // Audio settings -> native, now and whenever they change (including when the phone's saved
  // ones finish loading).
  pushAudioSettings();
  useAudioStore.getState().hydrate();
  useAudioStore.subscribe((state, prev) => {
    pushAudioSettings();
    if (state.crossfade !== prev.crossfade) prepareNext();
  });
  useSettingsStore.subscribe((state, prev) => {
    if (
      state.eqPreset !== prev.eqPreset ||
      state.normalization !== prev.normalization ||
      state.gapless !== prev.gapless
    ) {
      pushAudioSettings();
    }
    if (state.gapless !== prev.gapless) prepareNext();
  });

  // Store -> native.
  usePlayerStore.subscribe((state, prev) => {
    if (state.currentTrack?.id !== prev.currentTrack?.id) {
      if (state.currentTrack && state.currentTrack.id === advancedTo) adopt(state.currentTrack.id);
      else loadCurrent(); // the new load carries play state and starts from 0
      return;
    }
    if (state.queue !== prev.queue || state.repeat !== prev.repeat) prepareNext();
    const ready = loadedId !== null && loadedId === state.currentTrack?.id;
    if (ready && state.isPlaying !== prev.isPlaying) {
      if (state.isPlaying) SonarePlayer.play();
      else SonarePlayer.pause();
    }
    if (ready && state.seekRequest && state.seekRequest.nonce !== prev.seekRequest?.nonce) {
      SonarePlayer.seekTo(state.seekRequest.ms);
    }
  });
}

/** Mount once near the root; starts the audio wiring. Renders nothing. */
export function AudioEngine() {
  useEffect(startAudio, []);
  return null;
}
