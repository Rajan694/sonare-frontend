import React, { useEffect, useState } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text } from '../components/ui/Text';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { SongRow } from '../components/music/SongRow';
import { DownloadAllButton } from '../components/music/DownloadAllButton';
import { Badge } from '../components/ui/Badge';
import { Sheet } from '../components/ui/Sheet';
import { Field } from '../components/ui/Field';
import { Artwork } from '../components/music/Artwork';
import { Ambient } from '../components/music/Ambient';
import { StateView } from '../components/ui/StateView';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { useModeStore } from '../store/mode';
import { playlistMeta } from '../../../shared/catalog/meta';
import { api, isOwnPlaylist } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import { useSavedAlbum } from '../data/savedAlbums';
import { songCount } from '../lib/format';
import { playShuffled } from '../lib/playShuffled';
import { confirmDeletePlaylist } from '../lib/confirmDeletePlaylist';
import { DragHandle } from '../components/music/DragHandle';
import { useRowDrag } from '../hooks/useRowDrag';
import type { Track } from '../data/types';
import Icon from '../components/ui/Icon';

export const PlaylistDetailScreen = () => {
  const navigation = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const own = isOwnPlaylist(id);
  const online = useModeStore((state) => state.mode) === 'online';
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const playlist = useAsync(() => (own ? api.myPlaylist(id) : api.playlist(id)), [id], { refetchOnFocus: own });
  // YouTube playlists are saved to the library the same way albums are.
  const { isSaved, toggle: toggleSaved } = useSavedAlbum(
    id,
    'Create a free account to save playlists you love.',
    playlist.data && !own ? playlistMeta(playlist.data) : undefined,
  );
  const from = playlist.data ? { kind: 'Playlist', name: playlist.data.name } : undefined;
  const tracksQuery = useAsync(() => (own ? api.myPlaylistTracks(id) : api.playlistTracks(id)), [id], {
    refetchOnFocus: own,
  });
  const playlistItems = tracksQuery.data?.items;
  // An own playlist is edited on the phone first (remove / reorder), seeded from the query.
  const [entries, setEntries] = useState<Track[]>([]);
  useEffect(() => {
    if (playlistItems) setEntries(playlistItems);
  }, [playlistItems]);
  // A drag on a row turns the list's own scrolling off, so the drag can't scroll it.
  const [dragging, setDragging] = useState(false);
  const allTracks = own ? entries : (playlistItems ?? []);
  const tracks = allTracks.filter((t) => t.source === 'server');
  const info = playlist.data;

  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);
  const durationMinutes = Math.round(totalDurationMs / 60000);

  /** Drops the row straight away; a failure puts it back and says why. */
  const removeAt = async (index: number) => {
    const track = entries[index];
    if (!track) return;
    const previous = entries;
    setEntries(entries.filter((_, i) => i !== index));
    try {
      await api.removeFromPlaylist(id, { entryId: track.entryId, index });
      playlist.refetch();
      useLibraryStore
        .getState()
        .reloadPlaylists()
        .catch(() => {});
    } catch (e: any) {
      setEntries(previous);
      Alert.alert("Couldn't remove the song", e?.message || 'Check your connection and try again.');
    }
  };

  /** Moves the row at `index` by `by` places: shown at once, then saved; a failure restores it. */
  const moveEntry = (index: number, by: number) => {
    const track = entries[index];
    const to = Math.max(0, Math.min(entries.length - 1, index + by));
    if (!track || !track.entryId || to === index) return;
    const previous = entries;
    const next = [...entries];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    setEntries(next);
    api.reorderPlaylist(id, { entryId: track.entryId, to }).catch((e: any) => {
      setEntries(previous);
      Alert.alert("Couldn't move the song", e?.message || 'Check your connection and try again.');
    });
  };

  // Only leaves the screen once the playlist is really gone; a failure is reported instead.
  const deletePlaylist = async () => {
    setMenuOpen(false);
    if (await confirmDeletePlaylist({ id, name: info?.name })) navigation.goBack();
  };

  const startRename = () => {
    setMenuOpen(false);
    setName(info?.name ?? '');
    setDescription(info?.description ?? '');
    setRenameError(null);
    setRenameOpen(true);
  };

  // Saves the new name (and description, empty clears it) and refreshes the screen and the list.
  const saveRename = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return;
    setSaving(true);
    setRenameError(null);
    try {
      await api.updatePlaylist(id, { name: trimmedName, description: description.trim() });
      setRenameOpen(false);
      playlist.refetch();
      useLibraryStore
        .getState()
        .reloadPlaylists()
        .catch(() => {});
    } catch (e: any) {
      setRenameError(e?.message ?? 'Could not rename the playlist');
    } finally {
      setSaving(false);
    }
  };

  // Opens search in "add to this playlist" mode; the songs are added from there.
  const addSongs = () =>
    navigation.navigate('Search', { screen: 'SearchRoot', params: { addTo: id, addToName: info?.name } });

  const playAll = () => {
    if (!tracks.length) return;
    if (shuffle) toggleShuffle();
    playTrack(tracks[0], tracks, from);
  };

  const isCurrentPlaylistPlaying = isPlaying && currentTrack && tracks.some((t) => t.id === currentTrack.id);

  return (
    <Screen scrollable={false}>
      <Ambient
        uri={
          artworkUrl(info, 64) ??
          (tracks.length ? artworkUrl({ thumbnail: `/api/v1/playlists/${id}/artwork` }, 64) : undefined)
        }
      />
      <Header
        title={<Text className="text-ll font-medium text-t2">Playlist</Text>}
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
        right={
          <View className="flex-row items-center gap-2">
            {own && online && (
              <Button
                variant="outline"
                size="sm"
                icon={<Icon name="plus" size={16} color="#FFFFFF" />}
                onPress={addSongs}
                accessibilityLabel="Add songs"
              >
                Add songs
              </Button>
            )}
            {own && (
              <IconButton
                icon={<Icon name="more" size={20} color="#FFFFFF" />}
                onPress={() => setMenuOpen(true)}
                accessibilityLabel="Playlist options"
              />
            )}
          </View>
        }
      />

      <FlatList
        data={tracks}
        scrollEnabled={!(own && dragging)}
        keyExtractor={(item, index) => item.entryId ?? `${item.id}:${index}`}
        ListHeaderComponent={
          <View>
            <View className="flex-row items-start px-5 pt-2 pb-4 gap-4">
              <Artwork
                uri={
                  artworkUrl(info, 300) ??
                  (tracks.length ? artworkUrl({ thumbnail: `/api/v1/playlists/${id}/artwork` }, 300) : undefined)
                }
                size={132}
                rings
                className="rounded-lg shadow-e4 flex-none"
              />
              <View className="flex-1 justify-center gap-1.5 min-w-0">
                <Text className="text-h1 font-semibold text-t1 truncate" numberOfLines={2}>
                  {info?.name ?? ' '}
                </Text>
                <Text className="text-t2 text-bs">
                  {songCount(info?.trackCount ?? tracks.length)}
                  {durationMinutes ? ` · ${durationMinutes} min` : ''}
                </Text>
                <Text className="text-t3 text-bs">{own ? 'Made by you' : 'Online playlist'}</Text>
                <View className="flex-row items-center gap-1.5 flex-wrap mt-0.5">
                  {info?.kind === 'synced' && (
                    <Badge label="Synced" variant="download" icon={<Icon name="refresh" size={10} color="#4DA3FF" />} />
                  )}
                  {own && info?.downloadedCount ? (
                    <Badge
                      label="On device"
                      variant="local"
                      icon={<Icon name="smartphone" size={10} color="#FFC24D" />}
                    />
                  ) : null}
                  {!own && (
                    <Badge label="Online" variant="cloud" icon={<Icon name="cloud" size={10} color="#00E28A" />} />
                  )}
                </View>
              </View>
            </View>

            {/* Actions row */}
            <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
              <View className="flex-row items-center gap-1">
                {!own && (
                  <IconButton
                    icon={
                      <Icon
                        name={isSaved ? 'heart-filled' : 'heart'}
                        size={20}
                        color={isSaved ? '#00E28A' : '#9A9AA8'}
                      />
                    }
                    size={44}
                    onPress={toggleSaved}
                    accessibilityLabel="Favourite playlist"
                  />
                )}
                <IconButton
                  icon={<Icon name="playlist" size={20} color="#9A9AA8" />}
                  size={44}
                  onPress={() => {
                    if (tracks.length > 0) {
                      const queueState = usePlayerStore.getState();
                      tracks.forEach((t) => queueState.addToQueue(t));
                    }
                  }}
                  accessibilityLabel="Add to queue"
                />
                <DownloadAllButton tracks={tracks} />
              </View>
              <View className="flex-row items-center gap-3">
                <IconButton
                  icon={<Icon name="shuffle" size={20} color={shuffle ? '#00E28A' : '#FFFFFF'} />}
                  size={44}
                  variant="bordered"
                  onPress={() => playShuffled(tracks, from)}
                  disabled={!tracks.length}
                  accessibilityLabel="Shuffle"
                />
                <Pressable
                  onPress={() => {
                    if (isCurrentPlaylistPlaying) {
                      setIsPlaying(false);
                    } else {
                      playAll();
                    }
                  }}
                  disabled={!tracks.length}
                  accessibilityRole="button"
                  accessibilityLabel="Play playlist"
                  className="w-14 h-14 rounded-full items-center justify-center bg-acc shadow-glow-acc"
                >
                  <Icon name={isCurrentPlaylistPlaying ? 'pause' : 'play'} size={24} color="#000000" />
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) =>
          own ? (
            <OwnRow
              track={item}
              index={index}
              isActive={currentTrack?.id === item.id}
              onPress={() => playTrack(item, tracks, from)}
              onRemove={() => removeAt(allTracks.indexOf(item))}
              onMove={(by) => moveEntry(allTracks.indexOf(item), by)}
              onDraggingChange={setDragging}
            />
          ) : (
            <SongRow
              track={item}
              onPress={() => playTrack(item, tracks, from)}
              isActive={currentTrack?.id === item.id}
              index={index}
              showIndex
            />
          )
        }
        ListEmptyComponent={
          <StateView
            loading={tracksQuery.loading && !tracksQuery.data}
            error={tracksQuery.error}
            onRetry={tracksQuery.refetch}
            empty={own ? 'This playlist is empty. Tap Add songs to find some.' : 'No playable songs in this playlist.'}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 160 }}
      />

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View className="px-6 pb-6 gap-2">
          <Text className="text-t1 text-h2 font-medium" numberOfLines={1}>
            {info?.name ?? 'Playlist'}
          </Text>
          <Button
            variant="ghost"
            className="justify-start px-2 py-3"
            onPress={startRename}
            accessibilityLabel="Rename playlist"
          >
            <Text className="text-t1 text-tm">Rename</Text>
          </Button>
          <Button
            variant="ghost"
            className="justify-start px-2 py-3"
            onPress={deletePlaylist}
            accessibilityLabel="Delete playlist"
          >
            <Text className="text-red text-tm">Delete playlist</Text>
          </Button>
        </View>
      </Sheet>

      <Sheet visible={renameOpen} onClose={() => setRenameOpen(false)}>
        <View className="px-6 pb-6 gap-4">
          <Text className="text-t1 text-h2 font-medium">Rename playlist</Text>
          <Field
            placeholder="Playlist name"
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => saveRename()}
            accessibilityLabel="Playlist name"
          />
          <Field
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            returnKeyType="done"
            onSubmitEditing={() => saveRename()}
            accessibilityLabel="Playlist description"
          />
          {renameError && <Text className="text-red text-bs">{renameError}</Text>}
          <Button variant="accent" onPress={() => saveRename()} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
};

const ROW_HEIGHT = 60;

/** One own-playlist row: the song, its drag handle, and the reorder animation. */
const OwnRow = ({
  track,
  index,
  isActive,
  onPress,
  onRemove,
  onMove,
  onDraggingChange,
}: {
  track: Track;
  index: number;
  isActive: boolean;
  onPress: () => void;
  onRemove: () => void;
  onMove: (by: number) => void;
  onDraggingChange: (dragging: boolean) => void;
}) => {
  const { gesture, style, dragging } = useRowDrag(ROW_HEIGHT, onMove);
  // The list turns its scrolling off while a row is being dragged.
  useEffect(() => onDraggingChange(dragging), [dragging, onDraggingChange]);

  return (
    <Animated.View style={[style, dragging && { zIndex: 10 }]}>
      <SongRow
        track={track}
        onPress={onPress}
        isActive={isActive}
        index={index}
        showIndex
        extraAction={{ label: 'Remove from playlist', onPress: onRemove }}
        trailing={<DragHandle gesture={gesture} accessibilityLabel={`Reorder ${track.title}`} onMove={onMove} />}
      />
    </Animated.View>
  );
};
