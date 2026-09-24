import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/cn';
import { Track } from '../../data/types';
import { artworkUrl } from '../../data/config';
import { Artwork } from './Artwork';
import { SourceGlyph } from './SourceGlyph';
import { EqualizerBars } from './EqualizerBars';
import { formatDuration } from '../../lib/format';
import Animated, { FadeIn, Layout, ReduceMotion } from 'react-native-reanimated';
import Icon from '../ui/Icon';
import { useLibraryStore } from '../../store/library';
import { useTrackMenuStore, type TrackMenuAction } from '../../store/trackMenu';
import { usePlayerStore } from '../../store/player';

interface SongRowProps {
  track: Track;
  onPress: () => void;
  /** This row is the current track. Its bars only move while audio is actually playing. */
  isActive?: boolean;
  showArtwork?: boolean;
  showIndex?: boolean;
  index?: number;
  className?: string;
  /** Extra action shown in the long-press menu, e.g. "Remove from playlist". */
  extraAction?: TrackMenuAction;
}

export function SongRow({
  track,
  onPress,
  isActive = false,
  showArtwork = true,
  showIndex = false,
  index,
  className,
  extraAction,
}: SongRowProps) {
  const favourite = useLibraryStore(s => !!s.favouriteIds[track.id]);
  // Only the active row cares, so the others never re-render on play/pause.
  const playing = usePlayerStore(s => isActive && s.isPlaying);
  const accent = track.source === 'local' ? '#FFC24D' : '#00E28A';

  return (
    <Animated.View
       entering={FadeIn.delay(Math.min(index || 0, 12) * 30).springify().damping(20).reduceMotion(ReduceMotion.System)}
       layout={Layout.springify().damping(20).reduceMotion(ReduceMotion.System)}
    >
    <Pressable
      onPress={onPress}
      onLongPress={() => useTrackMenuStore.getState().open(track, { extraAction })}
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artist}`}
      accessibilityHint="Long press for more options"
      className={cn('flex-row items-center px-4 py-2 min-h-[56px]', isActive && 'bg-s1', className)}
    >
      {showIndex && index !== undefined && (
        <View className="w-[20px] mr-2 items-center justify-center">
          {isActive ? (
            <EqualizerBars isPlaying={playing} color={accent} />
          ) : (
            <Text className="text-t3 text-bm text-right font-mono w-full">{index + 1}</Text>
          )}
        </View>
      )}

      {showArtwork && (
        <View className="mr-3">
          <Artwork uri={artworkUrl(track, 64)} size={44} />
        </View>
      )}

      <View className="flex-1 justify-center mr-3 p-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className={cn("text-t1 text-tm font-medium flex-shrink", isActive && (track.source === 'local' ? 'text-gold' : 'text-acc'))}>
            {track.title}
          </Text>
          <SourceGlyph source={track.source} />
          {favourite && <Icon name="heart" size={12} color={accent} />}
        </View>
        <Text numberOfLines={1} className="text-t2 text-bs">
          {track.artist}
        </Text>
      </View>

      {track.durationMs ? (
        <Text className="text-t3 text-mono-s font-mono mr-1">
          {formatDuration(track.durationMs)}
        </Text>
      ) : null}
    </Pressable>
    </Animated.View>
  );
}
