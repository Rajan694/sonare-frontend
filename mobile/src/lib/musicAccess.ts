import { Alert, Platform } from 'react-native';
import { useLocalMusicStore } from '../store/localMusic';
import { openAppSettings } from './musicPermission';

// Asked at most once per app session, so saying "Not now" isn't nagged again
// on the next tap.
let offeredOffline = false;

/**
 * Offers the music permission when it's missing in ModeSwitch (to play the music folders'
 * songs in Offline Mode). Downloads do not need this permission. Nothing waits on the answer;
 * without it, downloads still play, the music folders just stay empty.
 * When Android won't ask any more, the button opens Sonare's app settings instead.
 */
export const offerMusicAccess = (): void => {
  if (Platform.OS !== 'android' || offeredOffline) return;
  const { permission, requestAccess } = useLocalMusicStore.getState();
  if (permission === 'granted' || permission === 'unknown') return;
  offeredOffline = true;
  const message =
    'Allow access to music and audio so Offline Mode can play the songs in your music folders, not only your downloads.';
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
export const resetMusicAccessOffers = (): void => {
  offeredOffline = false;
};
