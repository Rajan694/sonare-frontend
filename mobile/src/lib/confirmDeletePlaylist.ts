import { Alert } from 'react-native';
import { useLibraryStore } from '../store/library';

/**
 * Asks first, then deletes one of the user's playlists. Resolves true once it is gone;
 * a failure is reported here, so callers only decide where to go next.
 */
export function confirmDeletePlaylist(playlist: { id: string; name?: string }): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Delete playlist?',
      `"${playlist.name ?? 'This playlist'}" will be removed from all your devices.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await useLibraryStore.getState().deletePlaylist(playlist.id);
              resolve(true);
            } catch {
              Alert.alert("Couldn't delete the playlist", 'Check your connection and try again.');
              resolve(false);
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
