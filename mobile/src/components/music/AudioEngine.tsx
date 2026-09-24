import { useEffect } from 'react';
import { api } from '../../data/api';
import { absoluteUrl, artworkUrl } from '../../data/config';
import { useAuthStore } from '../../data/auth';
import { SonarePlayer } from '../../native/SonarePlayer';
import { usePlayerStore } from '../../store/player';

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

const current = () => usePlayerStore.getState().currentTrack;

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
    const stream = await api.stream(track.id);
    if (token !== loadToken) return;
    await SonarePlayer.load({
      id: track.id,
      url: absoluteUrl(stream.url)!,
      title: track.title,
      artist: track.artist,
      album: track.album ?? undefined,
      artworkUrl: artworkUrl(track, 640),
      autoplay: usePlayerStore.getState().isPlaying,
    });
    if (token !== loadToken) return;
    loadedId = track.id;
    listen = { trackId: track.id, startedAt: Date.now(), counted: false };
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
  SonarePlayer.onState(e => {
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

  SonarePlayer.onProgress(e => {
    const player = usePlayerStore.getState();
    if (!listen || listen.trackId !== player.currentTrack?.id || loadedId !== listen.trackId) return;
    player.setPositionMs(e.positionMs);
    if (e.durationMs > 0 && e.durationMs !== player.durationMs) player.setDurationMs(e.durationMs);
    const threshold = Math.min(PLAY_THRESHOLD_MS, player.durationMs / 2 || PLAY_THRESHOLD_MS);
    // History belongs to an account; guests just listen.
    if (!listen.counted && e.positionMs >= threshold && useAuthStore.getState().status === 'signedIn') {
      listen.counted = true;
      api.reportPlays([{ trackId: listen.trackId, at: listen.startedAt, ms: e.positionMs }]).catch(() => {});
    }
  });

  SonarePlayer.onError(e => usePlayerStore.getState().setError(e.message || 'Playback failed'));

  SonarePlayer.onRemote(e => {
    const player = usePlayerStore.getState();
    if (e.command === 'next') player.playNext();
    else player.playPrevious();
  });

  // Store -> native.
  usePlayerStore.subscribe((state, prev) => {
    if (state.currentTrack?.id !== prev.currentTrack?.id) {
      loadCurrent();
      return; // the new load carries play state and starts from 0
    }
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
