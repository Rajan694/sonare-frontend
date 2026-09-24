import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
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
import { AnimatedView } from '../lib/motion';
import { songCount } from '../lib/format';
import { confirmDeletePlaylist } from '../lib/confirmDeletePlaylist';
import Icon from '../components/ui/Icon';

export function PlaylistScreen() {
  const navigation = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const own = isOwnPlaylist(id);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const [menuOpen, setMenuOpen] = useState(false);

  const playlist = useAsync(() => (own ? api.myPlaylist(id) : api.playlist(id)), [id], { refetchOnFocus: own });
  const tracksQuery = useAsync(() => (own ? api.myPlaylistTracks(id) : api.playlistTracks(id)), [id], { refetchOnFocus: own });
  const allTracks = tracksQuery.data?.items ?? [];
  const tracks = allTracks.filter(t => t.source === 'server');
  const info = playlist.data;

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

  return (
    <Screen scrollable={false}>
      <Header
        title={info?.name}
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
        right={own ? (
          <IconButton icon={<Icon name="more" size={20} color="#FFFFFF" />} onPress={() => setMenuOpen(true)} accessibilityLabel="Playlist options" />
        ) : undefined}
      />

      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `${item.id}:${index}`}
        ListHeaderComponent={
          <AnimatedView className="px-4 pt-6 pb-4 items-center">
            <Artwork uri={tracks.length ? artworkUrl({ thumbnail: `/api/v1/playlists/${id}/artwork` }, 300) : undefined} size={200} className="rounded-xl mb-4" />
            <Text className="text-h1 font-semibold text-t1 mb-2 text-center">{info?.name ?? ' '}</Text>
            <View className="flex-row items-center gap-2 mb-4">
              {info?.kind === 'synced' && <Badge label="Synced" variant="neutral" />}
              {!own && <Badge label="Online" variant="cloud" />}
              <Text className="text-t3 text-bs">{songCount(info?.trackCount ?? tracks.length)}</Text>
            </View>
            <View className="flex-row gap-3">
              <Button onPress={() => playAll(false)} variant="accent" disabled={!tracks.length}>Play</Button>
              <Button variant="outline" onPress={() => playAll(true)} disabled={!tracks.length}>Shuffle</Button>
            </View>
          </AnimatedView>
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
        contentContainerStyle={{ paddingBottom: 128 }}
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
