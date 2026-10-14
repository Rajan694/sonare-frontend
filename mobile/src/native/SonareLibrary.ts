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
}

const native = NativeModules.SonareLibrary as NativeSonareLibrary | undefined;

export const SonareLibrary = {
  scan: (): Promise<DeviceSong[]> => native?.scan() ?? Promise.resolve([]),
};
