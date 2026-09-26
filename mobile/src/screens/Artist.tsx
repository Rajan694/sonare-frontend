import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { SongRow } from '../components/music/SongRow';
import { Artwork } from '../components/music/Artwork';
import { StateView } from '../components/ui/StateView';
import { usePlayerStore } from '../store/player';
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import { requireAccount } from '../data/accountGate';
import { useAuthStore } from '../data/auth';
import Icon from '../components/ui/Icon';

export function ArtistScreen() {
  const navigation = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);

  // Following is per account, so re-read it when someone signs in or out.
  const userId = useAuthStore((state) => state.user?.id);
  const artist = useAsync(() => api.artist(id), [id, userId]);
  const top = useAsync(() => api.artistTopTracks(id, 20), [id]);
  const albums = useAsync(() => api.artistAlbums(id), [id]);
  const tracks = top.data?.items ?? [];
  const info = artist.data;

  const [following, setFollowing] = useState(false);
  useEffect(() => setFollowing(!!info?.following), [info?.following]);

  const toggleFollow = () =>
    requireAccount('Create a free account to follow artists.', async () => {
      const next = !following;
      setFollowing(next);
      await api.setFollowing(id, next).catch(() => setFollowing(!next));
    });

  const shufflePlay = () => {
    if (!tracks.length) return;
    if (!shuffle) toggleShuffle();
    playTrack(tracks[Math.floor(Math.random() * tracks.length)], tracks);
  };

  const isCurrentArtistPlaying = isPlaying && currentTrack && tracks.some((t) => t.id === currentTrack.id);

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
          <Text className="text-ll font-medium text-t2 mr-2">Artist</Text>
        }
      />

      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `${item.id}:${index}`}
        ListHeaderComponent={
          <View>
            <View className="px-5 pt-2 pb-4 items-center">
              <Artwork uri={artworkUrl(info, 300)} size={132} rings className="rounded-full mb-3 shadow-e4" />
              <View className="items-center gap-1 mb-3">
                <Text className="text-h1 font-semibold text-t1 text-center">{info?.name ?? ' '}</Text>
                {info?.monthlyListeners ? (
                  <Text className="text-t3 text-bs">
                    {info.monthlyListeners.toLocaleString()} monthly listeners
                  </Text>
                ) : info?.albumCount ? (
                  <Text className="text-t3 text-bs">
                    {info.albumCount} {info.albumCount === 1 ? 'album' : 'albums'}
                  </Text>
                ) : null}
              </View>

              <View className="flex-row items-center gap-3">
                <Button
                  variant={following ? 'outline' : 'accent'}
                  size="sm"
                  onPress={toggleFollow}
                  accessibilityLabel={following ? 'Unfollow' : 'Follow'}
                  icon={following ? <Icon name="heart" size={14} color="#00E28A" /> : undefined}
                >
                  {following ? 'Following' : 'Follow'}
                </Button>
                <IconButton
                  icon={<Icon name="shuffle" size={19} color={shuffle ? '#00E28A' : '#FFFFFF'} />}
                  size={40}
                  variant="bordered"
                  onPress={shufflePlay}
                  disabled={!tracks.length}
                  accessibilityLabel="Shuffle"
                />
                <Pressable
                  onPress={() => {
                    if (isCurrentArtistPlaying) {
                      setIsPlaying(false);
                    } else if (tracks.length) {
                      playTrack(tracks[0], tracks);
                    }
                  }}
                  disabled={!tracks.length}
                  accessibilityRole="button"
                  accessibilityLabel="Play artist"
                  className="w-12 h-12 rounded-full items-center justify-center bg-acc shadow-glow-acc"
                >
                  <Icon name={isCurrentArtistPlaying ? 'pause' : 'play'} size={21} color="#000000" />
                </Pressable>
              </View>
            </View>

            <View className="px-5 pt-3 pb-1">
              <Text className="text-h2 font-semibold text-t1">Popular</Text>
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
          />
        )}
        ListFooterComponent={
          (albums.data?.items.length ?? 0) > 0 ? (
            <View className="mt-4 mb-8">
              <View className="flex-row items-baseline justify-between px-5 mb-3">
                <Text className="text-h2 font-semibold text-t1">Albums</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible -mx-5 px-5" contentContainerStyle={{ gap: 12 }}>
                {albums.data!.items.map(a => (
                  <Pressable key={a.id} onPress={() => navigation.push('Album', { id: a.id })} className="w-[124px]" accessibilityRole="button" accessibilityLabel={a.title}>
                    <Artwork uri={artworkUrl(a, 300)} size={124} rings className="rounded-md mb-2" />
                    <Text className="text-t1 text-tm font-medium truncate" numberOfLines={1}>{a.title}</Text>
                    {a.year ? <Text className="text-t2 text-bs truncate" numberOfLines={1}>{a.year}</Text> : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <StateView loading={top.loading} error={top.error || artist.error} onRetry={top.refetch} empty="No songs found for this artist." />
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 128 }}
      />
    </Screen>
  );
}
