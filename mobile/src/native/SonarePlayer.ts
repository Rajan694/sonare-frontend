import { EmitterSubscription, NativeEventEmitter, NativeModules } from 'react-native';

/**
 * The app's own native player (android/app/src/main/java/com/mobile/player): Media3 in a
 * media session service, so audio keeps going in the background and the notification /
 * lock screen get play-pause, seek and next/previous.
 */

export interface LoadOptions {
  /** Track id; echoed back as `mediaId` on state events. */
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  /** Shown on the lock screen and in the notification. */
  artworkUrl?: string;
  startMs?: number;
  autoplay?: boolean;
}

export interface PlayerStateEvent {
  playWhenReady: boolean;
  isPlaying: boolean;
  buffering: boolean;
  ended: boolean;
  mediaId: string | null;
}

export interface ProgressEvent {
  positionMs: number;
  durationMs: number;
  bufferedMs: number;
}

interface NativeSonarePlayer {
  load(options: LoadOptions): Promise<void>;
  play(): void;
  pause(): void;
  seekTo(positionMs: number): void;
  stop(): void;
}

const native = NativeModules.SonarePlayer as NativeSonarePlayer | undefined;
if (!native) {
  console.warn('SonarePlayer native module is missing — rebuild the Android app.');
}
const emitter = native ? new NativeEventEmitter(NativeModules.SonarePlayer) : null;

function on<T>(event: string, handler: (payload: T) => void): EmitterSubscription | { remove: () => void } {
  return emitter?.addListener(`SonarePlayer.${event}`, handler) ?? { remove: () => {} };
}

export const SonarePlayer = {
  load: (options: LoadOptions) => native?.load(options) ?? Promise.resolve(),
  play: () => native?.play(),
  pause: () => native?.pause(),
  seekTo: (positionMs: number) => native?.seekTo(positionMs),
  stop: () => native?.stop(),

  onState: (handler: (e: PlayerStateEvent) => void) => on('state', handler),
  onProgress: (handler: (e: ProgressEvent) => void) => on('progress', handler),
  onError: (handler: (e: { message: string }) => void) => on('error', handler),
  /** Next / previous pressed on the lock screen, notification or a headset. */
  onRemote: (handler: (e: { command: 'next' | 'previous' }) => void) => on('remote', handler),
};
