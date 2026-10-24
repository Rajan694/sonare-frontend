import React from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Text } from '../components/ui/Text';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Artwork } from '../components/music/Artwork';
import { Ambient } from '../components/music/Ambient';
import { SongRow } from '../components/music/SongRow';
import { DownloadAllButton } from '../components/music/DownloadAllButton';
import { Badge } from '../components/ui/Badge';
import { IconButton } from '../components/ui/IconButton';
import { StateView } from '../components/ui/StateView';
import { LoadMore } from '../components/ui/LoadMore';
import { usePlayerStore } from '../store/player';
import { albumMeta } from '../../../shared/catalog/meta';
import { api } from '../data/api';
import { useSavedAlbum } from '../data/savedAlbums';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import { usePagedList } from '../hooks/usePagedList';
import type { Track } from '../data/types';
import { songCount } from '../lib/format';
import { playShuffled } from '../lib/playShuffled';
import { requireAccount } from '../data/accountGate';
import { useCollectionMenuStore, queueCollection } from '../store/collectionMenu';
import Icon from '../components/ui/Icon';

export const AlbumScreen = () => {
  const navigation = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);

  const album = useAsync(() => api.album(id), [id]);
  const from = album.data ? { kind: 'Album', name: album.data.title } : undefined;
  const tracksQuery = usePagedList<Track>((cursor) => api.albumTracks(id, cursor), [id]);
  const tracks = tracksQuery.items;
  const info = album.data;

  const { isSaved: favourite, toggle: toggleFavourite } = useSavedAlbum(
    id,
    'Create a free account to save albums you love.',
    info ? albumMeta(info) : undefined,
  );

  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);
  const durationMinutes = Math.round(totalDurationMs / 60000);

  const metaParts = [
    'Album',
    info?.year,
    info?.trackCount || tracks.length ? songCount(info?.trackCount || tracks.length) : null,
    durationMinutes ? `${durationMinutes} min` : null,
  ].filter(Boolean);
  const meta = metaParts.join(' · ');

  const playAll = () => {
    if (!tracks.length) return;
    if (shuffle) toggleShuffle();
    playTrack(tracks[0], tracks, from);
  };

  const isCurrentAlbumPlaying = isPlaying && currentTrack && tracks.some((t) => t.id === currentTrack.id);

  return (
    <Screen scrollable={false}>
      <Ambient uri={artworkUrl(info, 64)} />
      <Header
        title={<Text className="text-ll font-medium text-t2">Album</Text>}
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
      />

      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `${item.id}:${index}`}
        ListHeaderComponent={
          <View className="px-5 pt-2 pb-4 items-center">
            <View className="items-center mb-3.5">
              <Artwork uri={artworkUrl(info, 300)} size={200} rings className="rounded-lg shadow-e4" />
            </View>

            <View className="items-center gap-1 mb-3">
              <Text className="text-h1 font-semibold text-t1 text-center" numberOfLines={2}>
                {info?.title ?? ' '}
              </Text>
              {info?.artist ? (
                info.artistId && !String(info.artistId).startsWith('local:') ? (
                  <Pressable onPress={() => navigation.navigate('Artist', { id: info.artistId })}>
                    <Text className="text-tm font-medium text-t2 text-center">{info.artist}</Text>
                  </Pressable>
                ) : (
                  <Text className="text-tm font-medium text-t2 text-center">{info.artist}</Text>
                )
              ) : null}
              {meta ? <Text className="text-t3 text-bs text-center mt-0.5">{meta}</Text> : null}
            </View>

            {/* Badges row */}
            <View className="flex-row items-center gap-2 mb-4">
              <Badge
                label={info?.source === 'local' ? 'On device' : 'Server'}
                variant={info?.source === 'local' ? 'local' : 'cloud'}
                icon={
                  <Icon
                    name={info?.source === 'local' ? 'smartphone' : 'cloud'}
                    size={10}
                    color={info?.source === 'local' ? '#FFC24D' : '#00E28A'}
                  />
                }
              />
              {info?.downloaded && <Badge label="Downloaded" variant="download" />}
            </View>

            {/* Actions Bar */}
            <View className="flex-row items-center justify-between w-full pt-1 px-1">
              <View className="flex-row items-center gap-1">
                <IconButton
                  icon={
                    <Icon
                      name={favourite ? 'heart-filled' : 'heart'}
                      size={20}
                      color={favourite ? '#00E28A' : '#9A9AA8'}
                    />
                  }
                  size={44}
                  onPress={toggleFavourite}
                  accessibilityLabel="Favourite album"
                />
                <IconButton
                  icon={<Icon name="playlist" size={20} color="#9A9AA8" />}
                  size={44}
                  onPress={async () => {
                    if (tracks.length > 0 && info) {
                      await queueCollection({ kind: 'album', item: info }, tracks, tracksQuery.hasMore);
                    }
                  }}
                  accessibilityLabel="Add to queue"
                />
                <IconButton
                  icon={<Icon name="plus" size={20} color="#9A9AA8" />}
                  size={44}
                  disabled={!tracks.length}
                  onPress={() => {
                    if (info && tracks.length > 0) {
                      requireAccount('Create a free account to make playlists.', () => {
                        useCollectionMenuStore.getState().open(
                          { kind: 'album', item: info },
                          {
                            view: 'playlists',
                            tracks: tracksQuery.hasMore ? undefined : tracks,
                          },
                        );
                      });
                    }
                  }}
                  accessibilityLabel="Add to playlist"
                />
                <DownloadAllButton tracks={tracks} />
              </View>

              <View className="flex-row items-center gap-3">
                <IconButton
                  icon={<Icon name="shuffle" size={20} color={shuffle ? '#00E28A' : '#FFFFFF'} />}
                  size={44}
                  variant="bordered"
                  onPress={() => playShuffled(tracks, from)}
                  accessibilityLabel="Shuffle"
                  disabled={!tracks.length}
                />
                <Pressable
                  onPress={() => {
                    if (isCurrentAlbumPlaying) {
                      setIsPlaying(false);
                    } else {
                      playAll();
                    }
                  }}
                  disabled={!tracks.length}
                  accessibilityRole="button"
                  accessibilityLabel="Play album"
                  className="w-14 h-14 rounded-full items-center justify-center bg-acc shadow-glow-acc"
                >
                  <Icon name={isCurrentAlbumPlaying ? 'pause' : 'play'} size={24} color="#000000" />
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <SongRow
            track={item}
            onPress={() => playTrack(item, tracks, from)}
            isActive={currentTrack?.id === item.id}
            showArtwork={false}
            index={index}
            showIndex
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={tracksQuery.loading}
            error={tracksQuery.error || album.error}
            onRetry={tracksQuery.refetch}
            empty="No songs found for this album."
          />
        }
        ListFooterComponent={
          tracksQuery.hasMore ? (
            <LoadMore
              loading={tracksQuery.loadingMore}
              failed={!!tracksQuery.loadMoreError}
              onPress={tracksQuery.loadMore}
            />
          ) : undefined
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 160 }}
      />
    </Screen>
  );
};
