import { api } from './api';
import { notifyPlaylistsChanged } from './hooks';
import { promptDialog } from '../store/dialogs';
import { showToast } from '../store/toasts';
import type { Playlist, Track } from '../types';

/** Asks for a name in the app's own dialog and creates a synced playlist; null when cancelled or failed. */
export async function createPlaylistWithPrompt(
  options: { title?: string; initialValue?: string; confirmLabel?: string } = {},
): Promise<Playlist | null> {
  const name = await promptDialog({
    title: options.title ?? 'New playlist',
    label: 'Name',
    placeholder: 'My playlist',
    initialValue: options.initialValue,
    confirmLabel: options.confirmLabel ?? 'Create',
  });
  return name ? createPlaylistNamed(name) : null;
}

/** Creates a synced playlist; null (after a toast) when it failed. */
export async function createPlaylistNamed(name: string): Promise<Playlist | null> {
  try {
    const created = await api.createPlaylist({ name, kind: 'synced' });
    notifyPlaylistsChanged();
    return created;
  } catch (e) {
    showToast({
      title: 'Could not create playlist',
      description: e instanceof Error ? e.message : undefined,
      icon: 'info',
    });
    return null;
  }
}

/** Adds the tracks and says so in a toast; false when it failed. */
export async function addTracksWithToast(playlist: { id: string; name: string }, tracks: Track[]): Promise<boolean> {
  try {
    await api.addTracksToPlaylist(
      playlist.id,
      tracks.map((t) => t.id),
    );
    notifyPlaylistsChanged();
    showToast({
      title: `Added to ${playlist.name}`,
      description: tracks.length === 1 ? tracks[0].title : `${tracks.length} songs`,
      icon: 'playlist',
      variant: 'acc',
    });
    return true;
  } catch {
    showToast({ title: 'Could not add to playlist', icon: 'info' });
    return false;
  }
}
