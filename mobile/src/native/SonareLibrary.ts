import { NativeModules } from 'react-native';

/**
 * The music on the phone, from MediaStore (android/app/src/main/java/com/mobile/library):
 * other apps' songs, copied files, and Sonare's own downloads, also from an earlier install.
 * Needs the music permission (src/lib/musicPermission.ts).
 */

export interface DeviceSong {
  /** MediaStore's row id. */
  mediaId: string;
  /** content:// uri the player can open. */
  uri: string;
  title: string;
  artist: string | null;
  album: string | null;
  durationMs: number;
  /** Folder under the phone's storage, e.g. "Music/Sonare" or "Download". */
  folder: string;
  fileName: string;
  size: number;
  modifiedAt: number;
}

interface NativeSonareLibrary {
  scan(): Promise<DeviceSong[]>;
  artworkFor(mediaIds: string[]): Promise<Record<string, string | null>>;
  artworkPixels(uri: string, size: number): Promise<string | null>;
}

const native = NativeModules.SonareLibrary as NativeSonareLibrary | undefined;

export const SonareLibrary = {
  scan: (): Promise<DeviceSong[]> => native?.scan() ?? Promise.resolve([]),
  /**
   * The cover art embedded in each song, keyed by mediaId: a file:// uri of a cached JPEG, or
   * null when the file has none (the app keeps its placeholder).
   */
  artworkFor: (mediaIds: string[]): Promise<Record<string, string | null>> =>
    native?.artworkFor?.(mediaIds) ?? Promise.resolve({}),
  /**
   * An image (file://, content:// or https://) scaled to size x size, as base64 RGBA bytes, for
   * shared/color/artColor.ts. Null when it can't be read.
   */
  artworkPixels: (uri: string, size: number): Promise<string | null> =>
    native?.artworkPixels?.(uri, size) ?? Promise.resolve(null),
};
