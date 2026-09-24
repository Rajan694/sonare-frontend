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
import { AnimatedView } from '../lib/motion';
import Icon from '../components/ui/Icon';

export function ArtistScreen() {
  const navigation = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
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
      />

      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `${item.id}:${index}`}
        ListHeaderComponent={
          <View>
            <AnimatedView className="px-4 pt-6 pb-4 items-center">
              <Artwork uri={artworkUrl(info, 300)} size={132} className="rounded-full mb-4" />
              <Text className="text-h1 font-semibold text-t1 mb-2 text-center">{info?.name ?? ' '}</Text>
              {info?.monthlyListeners ? (
                <Text className="text-t2 text-bm mb-4">
                  {info.monthlyListeners.toLocaleString()} subscribers
                </Text>
              ) : null}
              <View className="flex-row gap-3">
                <Button variant={following ? 'outline' : 'accent'} onPress={toggleFollow} accessibilityLabel={following ? 'Unfollow' : 'Follow'}>
                  {following ? 'Following' : 'Follow'}
                </Button>
                <Button variant="outline" onPress={shufflePlay} disabled={!tracks.length}>
                  Shuffle
                </Button>
              </View>
            </AnimatedView>

            {(albums.data?.items.length ?? 0) > 0 && (
              <View className="mb-4">
                <Text className="text-h2 font-semibold text-t1 px-4 mb-3">Albums</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                  {albums.data!.items.map(a => (
                    <Pressable key={a.id} onPress={() => navigation.push('Album', { id: a.id })} className="w-[132px]" accessibilityRole="button" accessibilityLabel={a.title}>
                      <Artwork uri={artworkUrl(a, 300)} size={132} className="rounded-lg mb-2" />
                      <Text className="text-t1 text-tm font-medium" numberOfLines={1}>{a.title}</Text>
                      {a.year ? <Text className="text-t2 text-bs">{a.year}</Text> : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text className="text-h2 font-semibold text-t1 px-4 mb-1">Popular</Text>
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
        ListEmptyComponent={
          <StateView loading={top.loading} error={top.error || artist.error} onRetry={top.refetch} empty="No songs found for this artist." />
        }
        contentContainerStyle={{ paddingBottom: 128 }}
      />
    </Screen>
  );
}
