import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { SongRow } from '../components/music/SongRow';
import { Badge } from '../components/ui/Badge';
import { mockTracks, mockPlaylists } from '../data/mock';
import { usePlayerStore } from '../store/player';
import { AnimatedView } from '../lib/motion';
import Icon from '../components/ui/Icon';

export function PlaylistScreen() {
  const navigation = useNavigation<any>();
  const playlist = mockPlaylists[0];
  const playlistTracks = mockTracks.slice(0, 5);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const handlePlayTrack = (track: typeof mockTracks[0]) => {
    setCurrentTrack(track);
    setQueue(playlistTracks);
    setIsPlaying(true);
  };

  return (
    <Screen scrollable={false}>
      <Header
        title={playlist.name}
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
          <View className="w-48 h-48 rounded-xl bg-s3 mb-4" />
          <Text className="text-h1 font-semibold text-t1 mb-2">{playlist.name}</Text>
          <View className="flex-row items-center gap-2 mb-4">
            {playlist.kind === 'local' && <Badge label="Local" variant="local" />}
            {playlist.kind === 'synced' && <Badge label="Synced" variant="neutral" />}
            {playlist.kind === 'online' && <Badge label="Online" variant="cloud" />}
            <Text className="text-t3 text-bs">{playlist.trackCount} songs</Text>
          </View>
          <View className="flex-row gap-3">
            <Button
              onPress={() => {
                setCurrentTrack(playlistTracks[0]);
                setQueue(playlistTracks);
                setIsPlaying(true);
              }}
              variant="accent"
            >
              Play
            </Button>
            <Button variant="outline" onPress={() => {}}>
              Shuffle
            </Button>
          </View>
        </AnimatedView>

        <FlatList
          data={playlistTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <AnimatedView delay={index * 50}>
              <SongRow
                track={item}
                onPress={() => handlePlayTrack(item)}
                isPlaying={currentTrack?.id === item.id}
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
