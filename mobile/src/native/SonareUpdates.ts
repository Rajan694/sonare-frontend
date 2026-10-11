import { NativeModules } from 'react-native';

/** One update download, as Android's DownloadManager reports it. */
export interface UpdateDownloadStatus {
  state: 'pending' | 'running' | 'paused' | 'done' | 'failed' | 'missing';
  bytes?: number;
  total?: number;
  /** DownloadManager's COLUMN_REASON for a failed or paused download. */
  reason?: number;
}

interface NativeSonareUpdates {
  download(url: string, fileName: string, title: string): Promise<number>;
  status(id: number): Promise<UpdateDownloadStatus>;
  checksum(id: number): Promise<string>;
  install(id: number): Promise<'started' | 'permission'>;
  remove(id: number): Promise<void>;
}

const native = NativeModules.SonareUpdates as NativeSonareUpdates | undefined;

const missing = () => Promise.reject(new Error('Updates need the Android app rebuilt with the SonareUpdates module'));

/**
 * App updates (android/app/src/main/java/com/mobile/updates): DownloadManager fetches the APK
 * (with its own notification, also in the background), and the system installer installs it.
 */
export const SonareUpdates = {
  available: !!native,
  download: (url: string, fileName: string, title: string) => native?.download(url, fileName, title) ?? missing(),
  status: (id: number) => native?.status(id) ?? missing(),
  /** Hex sha256 of a finished download. */
  checksum: (id: number) => native?.checksum(id) ?? missing(),
  /** 'permission' when Android first asked the user to let Sonare install apps. */
  install: (id: number) => native?.install(id) ?? missing(),
  remove: (id: number) => native?.remove(id) ?? Promise.resolve(),
};
