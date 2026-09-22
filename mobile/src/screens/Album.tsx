import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Artwork } from '../components/music/Artwork';
import { SongRow } from '../components/music/SongRow';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { IconButton } from '../components/ui/IconButton';
import { mockTracks, mockAlbums } from '../data/mock';
import { usePlayerStore } from '../store/player';
import { AnimatedView } from '../lib/motion';
import Icon from '../components/ui/Icon';

export function AlbumScreen() {
  const navigation = useNavigation<any>();
  const album = mockAlbums[0];
  const albumTracks = mockTracks.filter(t => t.albumId === album.id);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const handlePlayTrack = (track: typeof mockTracks[0]) => {
    setCurrentTrack(track);
    setQueue(albumTracks);
    setIsPlaying(true);
  };

  return (
    <Screen scrollable={false}>
      <Header
        title={album.title}
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
      />

      <View className="flex-1">
        <AnimatedView className="px-4 pt-6 pb-4 items-center">
          <Artwork uri={album.id} size={200} className="mb-4" />
          <Text className="text-h1 font-semibold text-t1 mb-1">{album.title}</Text>
          <Text className="text-tl text-t2 mb-2">{album.artist}</Text>
          <View className="flex-row items-center gap-2 mb-4">
            <Badge
              label={album.source === 'local' ? 'On device' : 'Server'}
              variant={album.source === 'local' ? 'local' : 'cloud'}
            />
            <Text className="text-t3 text-bs">{album.year}</Text>
            <Text className="text-t3 text-bs">·</Text>
            <Text className="text-t3 text-bs">{album.trackCount} songs</Text>
          </View>
          <View className="flex-row gap-3">
            <Button
              onPress={() => {
                setCurrentTrack(albumTracks[0]);
                setQueue(albumTracks);
                setIsPlaying(true);
              }}
              variant="accent"
              accessibilityLabel="Play album"
            >
              Play
            </Button>
            <Button variant="outline" onPress={() => {}}>
              Shuffle
            </Button>
          </View>
        </AnimatedView>

        <FlatList
          data={albumTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <AnimatedView delay={index * 50}>
              <SongRow
                track={item}
                onPress={() => handlePlayTrack(item)}
                isPlaying={currentTrack?.id === item.id}
                showArtwork={false}
                index={index}
                showIndex
              />
            </AnimatedView>
          )}
          contentContainerStyle={{ paddingBottom: 128 }}
        />
      </View>
    </Screen>
  );
}
