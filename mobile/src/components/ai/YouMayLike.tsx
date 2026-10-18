import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '../ui/Text';
import Icon from '../ui/Icon';
import { Artwork } from '../music/Artwork';
import { artworkUrl } from '../../data/config';
import { usePlayerStore } from '../../store/player';
import { joinNames, useYouMayLike } from '../../store/ai';
import type { Track } from '../../data/types';

/** Home's "You may like" shelf: songs the AI picked from the listening history. Nothing until found. */
export const YouMayLike = ({ exclude }: { exclude: readonly Track[] }) => {
  const found = useYouMayLike(exclude);
  const playTrack = usePlayerStore((s) => s.playTrack);
  if (!found) return null;
  const queue = found.songs.map((s) => s.track);

  return (
    <View className="gap-3" accessibilityLabel="You may like">
      <View className="gap-0.5">
        <View className="flex-row items-center gap-2">
          <Icon name="sparkles" size={18} color="#00E28A" />
          <Text className="text-h2 font-semibold text-t1">You may like</Text>
        </View>
        {found.basedOn.length > 0 && (
          <Text className="text-t3 text-bs" numberOfLines={1}>
            Based on {joinNames(found.basedOn)}
          </Text>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5"
        contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
      >
        {found.songs.map(({ track, reason }, idx) => (
          <Animated.View key={track.id} entering={FadeIn.delay(idx * 40)} className="w-[132px]">
            <Pressable
              onPress={() => playTrack(track, queue, { kind: 'Home', name: 'You may like' })}
              accessibilityRole="button"
              accessibilityLabel={`Play ${track.title}`}
            >
              <Artwork uri={artworkUrl(track, 300)} size={132} rings className="rounded-md mb-2.5" />
              <Text className="text-t1 text-tm font-medium truncate" numberOfLines={1}>
                {track.title}
              </Text>
              <Text className="text-t2 text-bs truncate" numberOfLines={1}>
                {reason ?? track.artist}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};
