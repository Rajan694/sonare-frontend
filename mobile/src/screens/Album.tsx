import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Artwork } from '../components/music/Artwork';
import { SongRow } from '../components/music/SongRow';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { StateView } from '../components/ui/StateView';
import { usePlayerStore } from '../store/player';
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import { AnimatedView } from '../lib/motion';
import { songCount } from '../lib/format';
import Icon from '../components/ui/Icon';

export function AlbumScreen() {
  const navigation = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);

  const album = useAsync(() => api.album(id), [id]);
  const tracksQuery = useAsync(() => api.albumTracks(id), [id]);
  const tracks = tracksQuery.data?.items ?? [];
  const info = album.data;
  const meta = [info?.year, info?.trackCount ? songCount(info.trackCount) : null].filter(Boolean).join(' · ');

  const playAll = (shuffled: boolean) => {
    if (!tracks.length) return;
    if (shuffled !== shuffle) toggleShuffle();
    playTrack(shuffled ? tracks[Math.floor(Math.random() * tracks.length)] : tracks[0], tracks);
  };

  return (
    <Screen scrollable={false}>
      <Header
        title={info?.title}
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
          <AnimatedView className="px-4 pt-6 pb-4 items-center">
            <Artwork uri={artworkUrl(info, 300)} size={200} className="mb-4" />
            <Text className="text-h1 font-semibold text-t1 mb-1 text-center">{info?.title ?? ' '}</Text>
            {info?.artist ? (
              <Text
                className="text-tl text-t2 mb-2"
                onPress={info.artistId ? () => navigation.navigate('Artist', { id: info.artistId }) : undefined}
              >
                {info.artist}
              </Text>
            ) : null}
            {meta ? <Text className="text-t3 text-bs mb-4">{meta}</Text> : null}
            <View className="flex-row gap-3">
              <Button onPress={() => playAll(false)} variant="accent" accessibilityLabel="Play album" disabled={!tracks.length}>Play</Button>
              <Button variant="outline" onPress={() => playAll(true)} disabled={!tracks.length}>Shuffle</Button>
            </View>
          </AnimatedView>
        }
        renderItem={({ item, index }) => (
          <SongRow
            track={item}
            onPress={() => playTrack(item, tracks)}
            isActive={currentTrack?.id === item.id}
            showArtwork={false}
            index={index}
            showIndex
          />
        )}
        ListEmptyComponent={
          <StateView loading={tracksQuery.loading} error={tracksQuery.error || album.error} onRetry={tracksQuery.refetch} empty="No songs found for this album." />
        }
        contentContainerStyle={{ paddingBottom: 128 }}
      />
    </Screen>
  );
}
