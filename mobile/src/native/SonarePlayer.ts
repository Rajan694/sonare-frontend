import { EmitterSubscription, NativeEventEmitter, NativeModules } from 'react-native';

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
  /** 0 turns crossfading off. */
  crossfadeMs: number;
  gapless: boolean;
}

export interface OutputDevice {
  /** AudioDeviceInfo id; -1 when unknown. */
  id: number;
  type: 'speaker' | 'wired' | 'bluetooth' | 'usb';
  name: string;
}

interface NativeSonarePlayer {
  load(options: LoadOptions): Promise<void>;
  play(): void;
  pause(): void;
  seekTo(positionMs: number): void;
  stop(): void;
  setNext(options: LoadOptions | null): void;
  setTransitions(options: Transitions): void;
  setSpeed(speed: number): void;
  setAudioEffects(options: AudioEffects): void;
  getOutputDevice(): Promise<OutputDevice>;
  getOutputDevices(): Promise<OutputDevice[]>;
  setOutputDevice(id: number): void;
  setSleepTimer(ms: number): void;
  setPauseAtEndOfTrack(value: boolean): void;
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
  /** The track after the current one; the player starts it by itself (gapless or crossfade). */
  setNext: (options: LoadOptions | null) => native?.setNext(options),
  setTransitions: (options: Transitions) => native?.setTransitions(options),
  /** Pitch is preserved. */
  setSpeed: (speed: number) => native?.setSpeed(speed),
  setAudioEffects: (options: AudioEffects) => native?.setAudioEffects(options),
  getOutputDevice: (): Promise<OutputDevice> =>
    native?.getOutputDevice() ?? Promise.resolve({ id: -1, type: 'speaker', name: 'Phone speaker' }),
  /** Every connected output, phone speaker first. */
  getOutputDevices: (): Promise<OutputDevice[]> => native?.getOutputDevices?.() ?? Promise.resolve([]),
  /** Play on this output while it stays connected; -1 leaves it to Android. */
  setOutputDevice: (id: number) => native?.setOutputDevice?.(id),
  /** Pause after `ms`; 0 cancels. Kept natively, so it fires with the app in the background. */
  setSleepTimer: (ms: number) => native?.setSleepTimer?.(ms),
  /** Stop when the current track ends instead of moving on. */
  setPauseAtEndOfTrack: (value: boolean) => native?.setPauseAtEndOfTrack?.(value),

  onState: (handler: (e: PlayerStateEvent) => void) => on('state', handler),
  onProgress: (handler: (e: ProgressEvent) => void) => on('progress', handler),
  onError: (handler: (e: { message: string }) => void) => on('error', handler),
  /** Next / previous pressed on the lock screen, notification or a headset. */
  onRemote: (handler: (e: { command: 'next' | 'previous' }) => void) => on('remote', handler),
  /** The player moved on to the next track by itself; sent before the state change it causes. */
  onAdvance: (handler: (e: { mediaId: string }) => void) => on('advance', handler),
  /** Audio output changed (headphones plugged in, Bluetooth connected…). */
  onOutput: (handler: (e: OutputDevice) => void) => on('output', handler),
  /** The sleep timer ran out and paused playback. */
  onSleep: (handler: () => void) => on('sleep', handler),
};
