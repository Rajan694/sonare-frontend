import { EmitterSubscription, NativeEventEmitter, NativeModules } from 'react-native';

/**
 * The app's native downloader (android/app/src/main/java/com/mobile/downloads). It writes
 * Range-requested chunks to a part file and moves the finished file into the picked folder
 * or Music/Sonare. The queue, url refreshes and retries live in src/store/downloads.ts.
 */

export interface StartOptions {
  id: string;
  url: string;
  /** File name without extension. */
  baseName: string;
  /** Used when Android has no extension of its own for `mimeType`. */
  extension: string;
  mimeType: string;
  /** 0 when unknown. */
  totalBytes: number;
  title?: string;
  artist?: string;
  album?: string;
  /** A folder from pickFolder(); absent = Music/Sonare. */
  treeUri?: string;
}

export interface ProgressEvent {
  id: string;
  receivedBytes: number;
  totalBytes: number;
}

export interface DoneEvent {
  id: string;
  /** content:// (or file:// on Android 9 and older); the player takes it as-is. */
  uri: string;
  name: string;
  size: number;
}

export interface ErrorEvent {
  id: string;
  /** E_URL: the url is dead, get a fresh one. E_NETWORK, E_HTTP, E_SAVE. */
  code: 'E_URL' | 'E_NETWORK' | 'E_HTTP' | 'E_SAVE';
  message: string;
  status: number;
  receivedBytes: number;
}

interface NativeSonareDownloads {
  setActive(count: number): void;
  start(options: StartOptions): Promise<void>;
  pause(id: string): Promise<number>;
  discard(id: string): Promise<void>;
  partSize(id: string): Promise<number>;
  deleteFile(uri: string, expectedName: string | null): Promise<boolean>;
  exists(uri: string, expectedName: string | null): Promise<boolean>;
  pickFolder(): Promise<{ uri: string; name: string } | null>;
  defaultLocation(): Promise<string>;
}

const native = NativeModules.SonareDownloads as NativeSonareDownloads | undefined;
if (!native) {
  console.warn('SonareDownloads native module is missing — rebuild the Android app.');
}
const emitter = native ? new NativeEventEmitter(NativeModules.SonareDownloads) : null;

const on = <T>(event: string, handler: (payload: T) => void): EmitterSubscription | { remove: () => void } => {
  return (
    emitter?.addListener(`SonareDownloads.${event}`, (...args) => handler(args[0] as T)) ?? {
      remove: () => {},
    }
  );
};

const missing = () =>
  Promise.reject(new Error('Downloads need the Android app rebuilt with the SonareDownloads module'));

export const SonareDownloads = {
  available: !!native,
  /** Queued + running downloads: the native side keeps a foreground service up while > 0. */
  setActive: (count: number) => native?.setActive(count),
  start: (options: StartOptions) => native?.start(options) ?? missing(),
  pause: (id: string) => native?.pause(id) ?? Promise.resolve(0),
  discard: (id: string) => native?.discard(id) ?? Promise.resolve(),
  partSize: (id: string) => native?.partSize(id) ?? Promise.resolve(0),
  /** Rejects with code E_MISSING when the file has moved or is gone, E_DELETE when it can't be deleted. */
  deleteFile: (uri: string, expectedName?: string) => native?.deleteFile(uri, expectedName ?? null) ?? missing(),
  exists: (uri: string, expectedName?: string) => native?.exists(uri, expectedName ?? null) ?? Promise.resolve(false),
  pickFolder: () => native?.pickFolder() ?? missing(),
  defaultLocation: () => native?.defaultLocation() ?? Promise.resolve('Music/Sonare'),

  onProgress: (handler: (e: ProgressEvent) => void) => on('progress', handler),
  onDone: (handler: (e: DoneEvent) => void) => on('done', handler),
  onError: (handler: (e: ErrorEvent) => void) => on('error', handler),
};
