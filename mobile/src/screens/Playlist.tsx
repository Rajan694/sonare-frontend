import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { SongRow } from '../components/music/SongRow';
import { Badge } from '../components/ui/Badge';
import { Sheet } from '../components/ui/Sheet';
import { Artwork } from '../components/music/Artwork';
import { StateView } from '../components/ui/StateView';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { api, isOwnPlaylist } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import { songCount } from '../lib/format';
import { confirmDeletePlaylist } from '../lib/confirmDeletePlaylist';
import Icon from '../components/ui/Icon';

export function PlaylistScreen() {
  const navigation = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const own = isOwnPlaylist(id);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const [menuOpen, setMenuOpen] = useState(false);

  const playlist = useAsync(() => (own ? api.myPlaylist(id) : api.playlist(id)), [id], { refetchOnFocus: own });
  const tracksQuery = useAsync(() => (own ? api.myPlaylistTracks(id) : api.playlistTracks(id)), [id], { refetchOnFocus: own });
  const allTracks = tracksQuery.data?.items ?? [];
  const tracks = allTracks.filter(t => t.source === 'server');
  const info = playlist.data;

  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);
  const durationMinutes = Math.round(totalDurationMs / 60000);

  const removeAt = async (index: number) => {
    await api.removeFromPlaylist(id, index).catch(() => {});
    tracksQuery.refetch();
    playlist.refetch();
    useLibraryStore.getState().reloadPlaylists().catch(() => {});
  };

  // Only leaves the screen once the playlist is really gone; a failure is reported instead.
  const deletePlaylist = async () => {
    setMenuOpen(false);
    if (await confirmDeletePlaylist({ id, name: info?.name })) navigation.goBack();
  };

  const playAll = (shuffled: boolean) => {
    if (!tracks.length) return;
    if (shuffled !== shuffle) toggleShuffle();
    const first = shuffled ? tracks[Math.floor(Math.random() * tracks.length)] : tracks[0];
    playTrack(first, tracks);
  };

  const isCurrentPlaylistPlaying = isPlaying && currentTrack && tracks.some((t) => t.id === currentTrack.id);

  return (
    <Screen scrollable={false}>
      <Header
        title=""
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
        right={
          <View className="flex-row items-center gap-1">
            <Text className="text-ll font-medium text-t2 mr-2">Playlist</Text>
            {own && (
              <IconButton icon={<Icon name="more" size={20} color="#FFFFFF" />} onPress={() => setMenuOpen(true)} accessibilityLabel="Playlist options" />
            )}
          </View>
        }
      />

      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `${item.id}:${index}`}
        ListHeaderComponent={
          <View>
            <View className="flex-row items-start px-5 pt-2 pb-4 gap-4">
              <Artwork
                uri={tracks.length ? artworkUrl({ thumbnail: `/api/v1/playlists/${id}/artwork` }, 300) : undefined}
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
                <Text className="text-t3 text-bs">
                  {own ? 'Made by you' : 'Online playlist'}
                </Text>
                <View className="flex-row items-center gap-1.5 flex-wrap mt-0.5">
                  {info?.kind === 'synced' && (
                    <Badge label="Synced" variant="neutral" icon={<Icon name="refresh" size={10} color="#9A9AA8" />} />
                  )}
                  {own && info?.downloadedCount ? (
                    <Badge label="On device" variant="local" icon={<Icon name="smartphone" size={10} color="#FFC24D" />} />
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
                <IconButton
                  icon={<Icon name="heart" size={20} color="#9A9AA8" />}
                  size={44}
                  onPress={() => {}}
                  accessibilityLabel="Favourite playlist"
                />
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
              </View>
              <View className="flex-row items-center gap-3">
                <IconButton
                  icon={<Icon name="shuffle" size={20} color={shuffle ? '#00E28A' : '#FFFFFF'} />}
                  size={44}
                  variant="bordered"
                  onPress={() => playAll(true)}
                  disabled={!tracks.length}
                  accessibilityLabel="Shuffle"
                />
                <Pressable
                  onPress={() => {
                    if (isCurrentPlaylistPlaying) {
                      setIsPlaying(false);
                    } else {
                      playAll(false);
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
        renderItem={({ item, index }) => (
          <SongRow
            track={item}
            onPress={() => playTrack(item, tracks)}
            isActive={currentTrack?.id === item.id}
            index={index}
            showIndex
            extraAction={own ? { label: 'Remove from playlist', onPress: () => removeAt(allTracks.indexOf(item)) } : undefined}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={tracksQuery.loading && !tracksQuery.data}
            error={tracksQuery.error}
            onRetry={tracksQuery.refetch}
            empty={own ? 'This playlist is empty. Long-press any song and choose "Add to playlist".' : 'No playable songs in this playlist.'}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 128 }}
      />

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View className="px-6 pb-6">
          <Button variant="ghost" className="justify-start px-2 py-3" onPress={deletePlaylist} accessibilityLabel="Delete playlist">
            <Text className="text-red text-tm">Delete playlist</Text>
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
}
