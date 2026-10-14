import { api } from './api';
import { notifyPlaylistsChanged } from './hooks';
import { promptDialog } from '../store/dialogs';
import { showToast } from '../store/toasts';
import type { Playlist, Track } from '../types';

/** Asks for a name in the app's own dialog and creates a synced playlist; null when cancelled or failed. */
export const createPlaylistWithPrompt = async (
  options: { title?: string; initialValue?: string; confirmLabel?: string } = {},
): Promise<Playlist | null> => {
  const name = await promptDialog({
    title: options.title ?? 'New playlist',
    label: 'Name',
    placeholder: 'My playlist',
    initialValue: options.initialValue,
    confirmLabel: options.confirmLabel ?? 'Create',
  });
  return name ? createPlaylistNamed(name) : null;
};

/** Asks for a new name for one of the user's playlists and saves it; the new name, or null. */
export const renamePlaylistWithPrompt = async (playlist: { id: string; name: string }): Promise<string | null> => {
  const name = await promptDialog({
    title: 'Rename playlist',
    label: 'Name',
    placeholder: 'My playlist',
    initialValue: playlist.name,
    confirmLabel: 'Rename',
    maxLength: 100,
  });
  if (!name || name === playlist.name) return null;
  try {
    await api.updatePlaylist(playlist.id, { name });
    notifyPlaylistsChanged();
    showToast({ title: 'Playlist renamed', description: name, icon: 'check' });
    return name;
  } catch (e) {
    showToast({
      title: 'Could not rename playlist',
      description: e instanceof Error ? e.message : undefined,
      icon: 'info',
    });
    return null;
  }
};

/** Creates a synced playlist; null (after a toast) when it failed. */
export const createPlaylistNamed = async (name: string): Promise<Playlist | null> => {
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
};

/** Adds the tracks and says so in a toast; false when it failed. */
export const addTracksWithToast = async (playlist: { id: string; name: string }, tracks: Track[]): Promise<boolean> => {
  try {
    await api.addTracksToPlaylist(playlist.id, tracks);
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
};
