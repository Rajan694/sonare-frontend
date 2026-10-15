import { Alert, Platform } from 'react-native';
import { useLocalMusicStore } from '../store/localMusic';
import { openAppSettings } from './musicPermission';

// Asked at most once per app session from each place, so saying "Not now" isn't nagged again
// on the next tap.
const offered = new Set<string>();

/**
 * Offers the music permission when it's missing: from the offline player (to play the music
 * folders' songs) and from downloading (so downloads are found again after a reinstall). Nothing
 * waits on the answer; without it, downloads still play, the music folders just stay empty.
 * When Android won't ask any more, the button opens Sonare's app settings instead.
 */
export const offerMusicAccess = (where: 'offline' | 'download'): void => {
  if (Platform.OS !== 'android' || offered.has(where)) return;
  const { permission, requestAccess } = useLocalMusicStore.getState();
  if (permission === 'granted' || permission === 'unknown') return;
  offered.add(where);
  const message =
    where === 'offline'
      ? 'Allow access to music and audio so Offline Mode can play the songs in your music folders, not only your downloads.'
      : 'Allow access to music and audio so your downloads are found again if Sonare is reinstalled.';
  if (permission === 'blocked') {
    Alert.alert('Music on this phone', `${message} Turn it on in Sonare's app settings (Permissions).`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open settings', onPress: () => void openAppSettings() },
    ]);
    return;
  }
  Alert.alert('Music on this phone', message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Allow', onPress: () => void requestAccess() },
  ]);
};

/** Test hook. */
export const resetMusicAccessOffers = (): void => offered.clear();
