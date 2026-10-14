import type { Track } from '../types';
import { resolveArtworkUrl, trackArtwork } from '../components/music/Artwork';

/**
 * The Media Session API: lock-screen and notification controls for the web app on phones,
 * media keys and the browser's media hub on desktops, and MPRIS in the Linux window where
 * WebKitGTK provides it. Does nothing where the API is missing.
 */

export interface MediaSessionActions {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (positionMs: number) => void;
}

const session = (): MediaSession | undefined => {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : undefined;
};

/** Wires the controls once; returns the cleanup. */
export const bindMediaSession = (actions: MediaSessionActions): (() => void) => {
  const ms = session();
  if (!ms) return () => {};
  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => actions.play()],
    ['pause', () => actions.pause()],
    ['nexttrack', () => actions.next()],
    ['previoustrack', () => actions.previous()],
    ['seekto', (d) => d.seekTime !== undefined && actions.seekTo(d.seekTime * 1000)],
  ];
  for (const [action, handler] of handlers) {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      // An action this browser doesn't know.
    }
  }
  return () => {
    for (const [action] of handlers) {
      try {
        ms.setActionHandler(action, null);
      } catch {
        // As above.
      }
    }
  };
};

/** What's playing, for the lock screen / media hub. */
export const showInMediaSession = (track: Track | null, playing: boolean): void => {
  const ms = session();
  if (!ms) return;
  ms.playbackState = track ? (playing ? 'playing' : 'paused') : 'none';
  if (!track) {
    ms.metadata = null;
    return;
  }
  if (typeof MediaMetadata === 'undefined') return;
  const art = resolveArtworkUrl(trackArtwork(track, 640), 640);
  ms.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album ?? '',
    artwork: art ? [{ src: art, sizes: '640x640' }] : [],
  });
};

/** The position bar on the lock screen; skipped when the duration isn't known. */
export const showPositionInMediaSession = (positionMs: number, durationMs: number, rate = 1): void => {
  const ms = session();
  if (!ms?.setPositionState || !(durationMs > 0)) return;
  try {
    ms.setPositionState({
      duration: durationMs / 1000,
      position: Math.min(positionMs, durationMs) / 1000,
      playbackRate: rate,
    });
  } catch {
    // A position past the end while a track changes; the next update fixes it.
  }
};
