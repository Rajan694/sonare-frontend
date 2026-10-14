import { useEffect } from 'react';
import { AppState } from 'react-native';
import { api } from '../../data/api';
import { absoluteUrl, artworkUrl } from '../../data/config';
import { useAuthStore } from '../../data/auth';
import { queuePlay } from '../../data/sync';
import { API_QUALITY, useSettingsStore } from '../../data/settings';
import type { StreamInfo, Track } from '../../data/types';
import { SonarePlayer, type LoadOptions } from '../../native/SonarePlayer';
import { CROSSFADE_MS, currentGains, useAudioStore } from '../../store/audio';
import { usePlayerStore } from '../../store/player';
import { localUriFor } from '../../store/downloads';
import { refreshInAppSession } from '../../youtube/inApp';
import { noteLevel, saveWaveforms, watchWaveform } from '../../store/waveforms';
import { watchPlayerPersistence } from '../../store/playerPersist';

// A play counts once the listener has heard 30s, or half of anything shorter. Asking for
// a stream url doesn't count, or skipping through a queue would inflate every count.
const PLAY_THRESHOLD_MS = 30_000;

/** Which track the native player holds, once its stream has been handed over. */
let loadedId: string | null = null;
let listen: { trackId: string; startedAt: number; counted: boolean } | null = null;
/** The previous progress event, so each level covers the stretch between two of them. */
let lastProgress: { trackId: string; positionMs: number } | null = null;
let endedHandled = false;
/** Bumped per load so a slow stream fetch for a skipped track is ignored. */
let loadToken = 0;
let started = false;
/** Set when the native player moved on by itself, so the store change that follows doesn't reload. */
let advancedTo: string | null = null;
/** The next track the native player holds; undefined when it holds nothing we know of. */
let nextSent: string | null | undefined;
let nextToken = 0;
/** Reloads after the player gave up on a refused stream url; a couple per track. */
let reloads: { trackId: string; count: number } | null = null;
const MAX_RELOADS = 2;

const current = () => usePlayerStore.getState().currentTrack;

/**
 * Stream urls already looked up, by track. The next track's is fetched while the current one
 * plays (prefetchNext), so skipping or reaching the end doesn't wait for YouTube.
 */
const streams = new Map<string, StreamInfo>();
const pendingStreams = new Map<string, Promise<StreamInfo>>();
const MAX_STREAMS = 20;

const knownStream = (id: string): StreamInfo | undefined => {
  const info = streams.get(id);
  // A minute of margin: a url that expires while it loads is no use.
  return info && info.expiresAt > Date.now() + 60_000 ? info : undefined;
};

// A new streaming quality applies from the next track: looked-up urls are for the old one.
useSettingsStore.subscribe((state, prev) => {
  if (state.streamQuality !== prev.streamQuality) streams.clear();
});

const fetchStream = (track: Track): Promise<StreamInfo> => {
  let pending = pendingStreams.get(track.id);
  if (!pending) {
    pending = api
      .stream(track.id, API_QUALITY[useSettingsStore.getState().streamQuality] ?? 'auto')
      .then((info) => {
        streams.delete(track.id);
        streams.set(track.id, info);
        if (streams.size > MAX_STREAMS) streams.delete(streams.keys().next().value!);
        return info;
      })
      .finally(() => pendingStreams.delete(track.id));
    pendingStreams.set(track.id, pending);
  }
  return pending;
};

/** Downloaded songs play from the phone, online or not; everything else streams. */
const streamUrl = async (track: Track): Promise<string> => {
  const local = localUriFor(track.id);
  if (local) return local;
  return absoluteUrl((knownStream(track.id) ?? (await fetchStream(track))).url)!;
};

/** Look up the next track's stream now, so it starts at once when its turn comes. */
const prefetchNext = () => {
  const next = usePlayerStore.getState().upcomingTrack();
  if (!next || next.source !== 'server' || localUriFor(next.id) || knownStream(next.id)) return;
  fetchStream(next).catch(() => {
    // Asked again when the track loads.
  });
};

/** Refused urls being answered, with when; one refusal is answered once (JS timers stall in the background). */
const swapping = new Map<string, number>();
const SWAP_AGAIN_MS = 30_000;

/**
 * The server refused a stream url while the player was loading it (YouTube urls can stop
 * working mid-song). The player keeps retrying for a while and plays from its buffer, so
 * fetch a fresh url for the same file and hand it over: no reload, no gap.
 */
const swapRefusedStream = ({ mediaId, url }: { mediaId: string | null; url: string }) => {
  const now = Date.now();
  if (!mediaId || now - (swapping.get(url) ?? 0) < SWAP_AGAIN_MS) return;
  const player = usePlayerStore.getState();
  const track = player.currentTrack?.id === mediaId ? player.currentTrack : player.queue.find((t) => t.id === mediaId);
  if (!track || track.source !== 'server' || localUriFor(track.id)) return;
  swapping.set(url, now);
  const before = streams.get(mediaId);
  streams.delete(mediaId);
  refreshInAppSession()
    .catch(() => {})
    .then(() => fetchStream(track))
    .then((fresh) => {
      // The retry carries on from the same byte, so it must be the same file; anything else
      // is left to the reload once the player gives up.
      const sameFile =
        !before ||
        ((before.itag === undefined || before.itag === fresh.itag) &&
          (!before.contentLength || before.contentLength === fresh.contentLength));
      if (sameFile) SonarePlayer.replaceUrl(url, absoluteUrl(fresh.url)!);
    })
    .catch(() => {});
};

const loadOptions = (track: Track, url: string): LoadOptions => {
  return {
    id: track.id,
    url,
    title: track.title,
    artist: track.artist,
    album: track.album ?? undefined,
    artworkUrl: artworkUrl(track, 640),
  };
};

/**
 * Hands the native player the track after the current one, so it can start it gapless or
 * crossfade into it. Only needed while one of those is on; otherwise the next track loads
 * when this one ends, as before.
 */
const prepareNext = async () => {
  const token = ++nextToken;
  prefetchNext();
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
};

/** Sends the Audio screen's settings to the native player. */
const pushAudioSettings = () => {
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
};

/** The native player already plays `id` (it moved on by itself): take it over without reloading. */
const adopt = (id: string) => {
  advancedTo = null;
  ++loadToken; // a load still in flight for an older track must not replace this one
  loadedId = id;
  listen = { trackId: id, startedAt: Date.now(), counted: false };
  const adopted = current();
  if (adopted) watchWaveform(adopted);
  endedHandled = false;
  nextSent = undefined;
  prepareNext();
};

const loadCurrent = async () => {
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
    watchWaveform(track);
    // load() clears whatever next track the player held.
    nextSent = undefined;
    prepareNext();
    // Paused while the stream was loading: nothing applied it yet, so apply it now.
    if (!usePlayerStore.getState().isPlaying) SonarePlayer.pause();
  } catch (e: any) {
    if (token === loadToken) usePlayerStore.getState().setError(e?.message || 'Could not load this track');
  }
};

/**
 * Wires the player store to the native player, once. This deliberately avoids React
 * effects: with the app in the background React Native pauses the JS timers React's
 * scheduler runs on, so "next" from the lock screen would wait until the app reopened.
 * A store subscription and native events run straight away.
 */
const startAudio = () => {
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
        player.onTrackEnded();
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
    // The waveform: the level heard since the last event covers the stretch played since then.
    // After a seek (a jump) it holds audio from before it, so that one is skipped.
    const prev = lastProgress?.trackId === listen.trackId ? lastProgress.positionMs : null;
    const step = prev === null ? -1 : e.positionMs - prev;
    if (e.level !== undefined && step > 0 && step <= 2000 * useAudioStore.getState().speed) {
      noteLevel(listen.trackId, e.durationMs, prev!, e.positionMs, e.level);
    }
    lastProgress = { trackId: listen.trackId, positionMs: e.positionMs };
    const threshold = Math.min(PLAY_THRESHOLD_MS, player.durationMs / 2 || PLAY_THRESHOLD_MS);
    // History belongs to an account; guests just listen.
    if (!listen.counted && e.positionMs >= threshold && useAuthStore.getState().status === 'signedIn') {
      listen.counted = true;
      queuePlay(player.currentTrack!, listen.startedAt, e.positionMs);
    }
  });

  SonarePlayer.onError((e) => {
    const track = current();
    // A YouTube url that stopped working mid-song (403) and couldn't be swapped in time: get a
    // fresh one and carry on from there.
    if (reloads?.trackId !== track?.id) reloads = track ? { trackId: track.id, count: 0 } : null;
    if (
      e.code === 'ERROR_CODE_IO_BAD_HTTP_STATUS' &&
      track &&
      reloads &&
      e.mediaId === track.id &&
      reloads.count < MAX_RELOADS &&
      !localUriFor(track.id)
    ) {
      reloads.count++;
      streams.delete(track.id);
      refreshInAppSession()
        .catch(() => {})
        .then(() => {
          if (current()?.id !== track.id) return;
          usePlayerStore.setState({ startAtMs: e.positionMs || null });
          loadCurrent();
        });
      return;
    }
    usePlayerStore.getState().setError(e.message || 'Playback failed');
  });

  SonarePlayer.onRemote((e) => {
    const player = usePlayerStore.getState();
    if (e.command === 'next') player.playNext();
    else player.playPrevious();
  });

  SonarePlayer.onStreamRefused(swapRefusedStream);

  // Gapless or crossfade: the player already started the next track. Move the queue along.
  SonarePlayer.onAdvance(({ mediaId }) => {
    const player = usePlayerStore.getState();
    const at = player.upcomingIndex();
    if (at < 0 || player.queue[at].id !== mediaId) {
      // The queue changed under the player: put back the track the queue says is current.
      loadCurrent();
      return;
    }
    advancedTo = mediaId;
    player.playAt(at);
  });

  // Partial waveforms are written every few seconds; write the latest before Android may stop the app.
  AppState.addEventListener('change', (next) => {
    if (next === 'background') saveWaveforms();
  });

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
    // Another queue entry is current (the same song again counts: it can be in the queue twice).
    if (state.playId !== prev.playId) {
      reloads = null;
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
};

/** Mount once near the root; starts the audio wiring. Renders nothing. */
export const AudioEngine = () => {
  useEffect(startAudio, []);
  return null;
};
