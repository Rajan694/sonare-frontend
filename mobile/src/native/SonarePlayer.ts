import { EmitterSubscription, NativeEventEmitter, NativeModules } from 'react-native';
import type { SpatialParams } from '../../../shared/spatial';

/**
 * The app's own native player (android/app/src/main/java/com/mobile/player): Media3 in a
 * media session service, so audio keeps going in the background and the notification /
 * lock screen get play-pause, seek and next/previous. Its audio runs through Sonare's own
 * processing (equalizer, bass boost, virtualizer, normalization), and it can move on to the
 * next track by itself, gapless or with a crossfade.
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
  /** The stream cache's key for a streamed track (its id and format; the url changes every time). */
  cacheKey?: string;
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
  /** How loud (RMS, 0..1) the audio decoded since the last event was; the waveform is drawn from it. */
  level?: number;
}

export interface PlayerErrorEvent {
  message: string;
  /** Media3's error code name, e.g. ERROR_CODE_IO_BAD_HTTP_STATUS when the server refused the url. */
  code?: string;
  mediaId?: string | null;
  positionMs?: number;
}

export interface AudioEffects {
  /** Off passes the audio through untouched. */
  enabled: boolean;
  /** dB per band (32, 64, 150, 400, 1k, 2.4k, 6k, 14k Hz), -12..12. */
  gains: number[];
  /** 0..100. */
  bassBoost: number;
  /** 0..100. */
  virtualizer: number;
  normalization: boolean;
}

export interface Transitions {
  /** 0 turns crossfading off; at most 12000. */
  crossfadeMs: number;
  gapless: boolean;
}

/** What 1, 2 or 3 quick presses of a headset's button do (SonarePlaybackService counts them). */
export type HeadsetAction = 'playPause' | 'next' | 'previous' | 'like' | 'none';

export interface HeadsetActions {
  single: HeadsetAction;
  double: HeadsetAction;
  triple: HeadsetAction;
}

/** Remote commands JS carries out: next / previous move the queue, like hearts the current song. */
export type RemoteCommand = 'next' | 'previous' | 'like';

interface NativeSonarePlayer {
  load(options: LoadOptions): Promise<void>;
  play(): void;
  pause(): void;
  seekTo(positionMs: number): void;
  stop(): void;
  setNext(options: LoadOptions | null): void;
  replaceUrl(url: string, fresh: string): void;
  streamCacheBytes(): Promise<number>;
  clearStreamCache(): Promise<number>;
  setTransitions(options: Transitions): void;
  setSpeed(speed: number): void;
  setPitch(semitones: number): void;
  setFades(enabled: boolean): void;
  setHeadsetActions(actions: HeadsetActions): void;
  setLiked(liked: boolean): void;
  setAudioEffects(options: AudioEffects): void;
  setSpatialAudio(options: SpatialParams): void;
}

const native = NativeModules.SonarePlayer as NativeSonarePlayer | undefined;
if (!native) {
  console.warn('SonarePlayer native module is missing — rebuild the Android app.');
}
const emitter = native ? new NativeEventEmitter(NativeModules.SonarePlayer) : null;

const on = <T>(event: string, handler: (payload: T) => void): EmitterSubscription | { remove: () => void } => {
  return (
    emitter?.addListener(`SonarePlayer.${event}`, (...args) => handler(args[0] as T)) ?? {
      remove: () => {},
    }
  );
};

export const SonarePlayer = {
  load: (options: LoadOptions) => native?.load(options) ?? Promise.resolve(),
  play: () => native?.play(),
  pause: () => native?.pause(),
  seekTo: (positionMs: number) => native?.seekTo(positionMs),
  stop: () => native?.stop(),
  /**
   * Loads of the track loaded with `url` go to `fresh` from now on: the answer to onStreamRefused,
   * so the player's retry carries on without reloading the track.
   */
  replaceUrl: (url: string, fresh: string) => native?.replaceUrl?.(url, fresh),
  /** Bytes held by the stream cache (songs played recently, so a replay needn't download). */
  streamCacheBytes: (): Promise<number> => native?.streamCacheBytes?.() ?? Promise.resolve(0),
  /** Empties the stream cache; resolves with what's left (a song being played stays). */
  clearStreamCache: (): Promise<number> => native?.clearStreamCache?.() ?? Promise.resolve(0),
  /** The track after the current one; the player starts it by itself (gapless or crossfade). */
  setNext: (options: LoadOptions | null) => native?.setNext(options),
  setTransitions: (options: Transitions) => native?.setTransitions(options),
  /** 0.5..2; pitch is preserved. */
  setSpeed: (speed: number) => native?.setSpeed(speed),
  /** -6..6 semitones, independent of the speed; 0 is the recording's own pitch. */
  setPitch: (semitones: number) => native?.setPitch?.(semitones),
  /** Short (~300 ms) volume fades on play, pause and moving to another song. */
  setFades: (enabled: boolean) => native?.setFades?.(enabled),
  /** The actions for 1, 2 and 3 quick presses of a headset's play button. */
  setHeadsetActions: (actions: HeadsetActions) => native?.setHeadsetActions?.(actions),
  /** Whether the current song is liked: the home-screen widget's heart shows it. */
  setLiked: (liked: boolean) => native?.setLiked?.(liked),
  setAudioEffects: (options: AudioEffects) => native?.setAudioEffects(options),
  setSpatialAudio: (options: SpatialParams) => native?.setSpatialAudio(options),

  onState: (handler: (e: PlayerStateEvent) => void) => on('state', handler),
  onProgress: (handler: (e: ProgressEvent) => void) => on('progress', handler),
  onError: (handler: (e: PlayerErrorEvent) => void) => on('error', handler),
  /**
   * Next / previous pressed on the lock screen, notification, a headset or the widget; like
   * from a headset press or the widget's heart.
   */
  onRemote: (handler: (e: { command: RemoteCommand }) => void) => on('remote', handler),
  /** The player moved on to the next track by itself; sent before the state change it causes. */
  onAdvance: (handler: (e: { mediaId: string }) => void) => on('advance', handler),
  /** The server refused a stream url (403) while loading; the player retries for a while. */
  onStreamRefused: (handler: (e: { mediaId: string | null; url: string }) => void) => on('streamRefused', handler),
};
