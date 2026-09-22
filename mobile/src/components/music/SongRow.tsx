import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/cn';
import { Track } from '../../data/types';
import { Artwork } from './Artwork';
import { SourceGlyph } from './SourceGlyph';
import { EqualizerBars } from './EqualizerBars';
import { formatDuration } from '../../lib/format';
import Animated, { FadeIn, Layout, ReduceMotion } from 'react-native-reanimated';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import Icon from '../ui/Icon';

interface SongRowProps {
  track: Track;
  onPress: () => void;
  isPlaying?: boolean;
  showArtwork?: boolean;
  showIndex?: boolean;
  index?: number;
  className?: string;
}

export function SongRow({
  track,
  onPress,
  isPlaying = false,
  showArtwork = true,
  showIndex = false,
  index,
  className,
}: SongRowProps) {
  const [sheetVisible, setSheetVisible] = React.useState(false);

  return (
    <Animated.View
       entering={FadeIn.delay((index || 0) * 30).springify().damping(20).reduceMotion(ReduceMotion.System)}
       layout={Layout.springify().damping(20).reduceMotion(ReduceMotion.System)}
    >
    <Pressable
      onPress={onPress}
      onLongPress={() => setSheetVisible(true)}
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artist}`}
      className={cn('flex-row items-center px-4 py-2 min-h-[56px]', isPlaying && 'bg-s1', className)}
    >
      {showIndex && index !== undefined && (
        <View className="w-[20px] items-center justify-center">
          {isPlaying ? (
            <EqualizerBars isPlaying={true} color={track.source === 'local' ? '#FFC24D' : '#00E28A'} />
          ) : (
            <Text className="text-t3 text-bm text-right font-mono w-full">{index + 1}</Text>
          )}
        </View>
      )}
      
      {showArtwork && (
        <View className="mr-3">
          <Artwork uri={track.albumId} size={44} />
        </View>
      )}

      <View className="flex-1 justify-center mr-3 p-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className={cn("text-t1 text-tm font-medium flex-shrink", isPlaying && (track.source === 'local' ? 'text-gold' : 'text-acc'))}>
            {track.title}
          </Text>
          <SourceGlyph source={track.source} />
        </View>
        <Text numberOfLines={1} className="text-t2 text-bs">
          {track.artist}
        </Text>
      </View>

      <Text className="text-t3 text-mono-s font-mono mr-1">
        {formatDuration(track.durationMs)}
      </Text>
    </Pressable>

    <Sheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <View className="px-6 pb-6">
            <View className="flex-row items-center gap-4 mb-8">
               <Artwork uri={track.albumId} size={56} />
               <View className="flex-1">
                  <Text className="text-t1 text-h2 font-medium" numberOfLines={1}>{track.title}</Text>
                  <Text className="text-t3 text-tl" numberOfLines={1}>{track.artist}</Text>
               </View>
            </View>
            <View className="gap-2">
               <Button variant="ghost" className="justify-start px-2 py-3" onPress={() => setSheetVisible(false)}>
                  <View className="mr-3 w-[18px] items-center">
                    <Icon name="play" size={18} color="#FFFFFF" />
                  </View>
                  <Text className="text-t1 text-tm">Play next</Text>
               </Button>
               <Button variant="ghost" className="justify-start px-2 py-3" onPress={() => setSheetVisible(false)}>
                  <View className="mr-3 w-[18px] items-center">
                    <Icon name="playlist" size={18} color="#FFFFFF" />
                  </View>
                  <Text className="text-t1 text-tm">Add to queue</Text>
               </Button>
               <Button variant="ghost" className="justify-start px-2 py-3" onPress={() => setSheetVisible(false)}>
                  <View className="mr-3 w-[18px] items-center">
                    <Icon name="heart" size={18} color="#FFFFFF" />
                  </View>
                  <Text className="text-t1 text-tm">Add to favourites</Text>
               </Button>
               <Button variant="ghost" className="justify-start px-2 py-3" onPress={() => setSheetVisible(false)}>
                  <View className="mr-3 w-[18px] items-center">
                    <Icon name="plus" size={18} color="#FFFFFF" />
                  </View>
                  <Text className="text-t1 text-tm">Add to playlist</Text>
               </Button>
            </View>
        </View>
    </Sheet>
    </Animated.View>
  );
}
