import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { mockTracks, mockArtists } from '../data/mock';
import { AnimatedView } from '../lib/motion';

export function ArtistScreen() {
  const navigation = useNavigation<any>();
  const artist = mockArtists[0];
  const artistTracks = mockTracks.filter(t => t.artistId === artist.id);

  return (
    <Screen scrollable={false}>
      <Header
        title={artist.name}
        left={
          <IconButton
            icon={<Text className="text-t1 text-h2">←</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
      />

      <View className="flex-1">
        <AnimatedView className="px-4 pt-6 pb-4 items-center">
          <View className="w-32 h-32 rounded-full bg-s3 mb-4" />
          <Text className="text-h1 font-semibold text-t1 mb-2">{artist.name}</Text>
          {artist.monthlyListeners && (
            <Text className="text-t2 text-bm mb-4">
              {artist.monthlyListeners.toLocaleString()} monthly listeners
            </Text>
          )}
          <View className="flex-row gap-3">
            <Button variant="accent" onPress={() => {}}>
              {artist.following ? 'Following' : 'Follow'}
            </Button>
            <Button variant="outline" onPress={() => {}}>
              Shuffle
            </Button>
          </View>
        </AnimatedView>

        <View className="px-4 mb-3">
          <Text className="text-h2 font-semibold text-t1">Popular</Text>
        </View>

        <FlatList
          data={artistTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <AnimatedView delay={index * 50}>
              <Pressable className="srow">
                <Text className="w-[20px] text-t3 text-bm text-right">{index + 1}</Text>
                <View className="flex-1 gap-0.5">
                  <Text numberOfLines={1} className="text-t1 text-tm font-medium">
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} className="text-t2 text-bs">
                    {item.album}
                  </Text>
                </View>
              </Pressable>
            </AnimatedView>
          )}
          contentContainerStyle={{ paddingBottom: 128 }}
        />
      </View>
    </Screen>
  );
}
