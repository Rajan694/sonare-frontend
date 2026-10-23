import { Linking, PermissionsAndroid, Platform } from 'react-native';

/**
 * Reading songs on the phone: Android 13+ asks for music and audio, older versions for
 * storage. Music folders and the offline player need it to play phone songs. Downloads do
 * not need this permission.
 */

export type MusicPermission = 'granted' | 'denied' | 'blocked';

const permission = () =>
  Number(Platform.Version) >= 33
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

export const hasMusicPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  return PermissionsAndroid.check(permission()).catch(() => false);
};

/** Asks once; 'blocked' means Android won't ask again and only the app's settings can allow it. */
export const requestMusicPermission = async (): Promise<MusicPermission> => {
  if (Platform.OS !== 'android') return 'denied';
  const result = await PermissionsAndroid.request(permission()).catch(() => PermissionsAndroid.RESULTS.DENIED);
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
};

export const openAppSettings = (): Promise<void> => Linking.openSettings();
