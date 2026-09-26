import React from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '../../lib/cn';
import { generatePeaks } from '../../lib/format';

const BARS = 76;
const MIN_H = 4;
const MAX_H = 26;

interface WaveformProps {
  trackId: string;
  progress: number; // 0 to 1
  mode: 'online' | 'offline';
  /** Real amplitudes from the server, any scale; a stand-in shape is drawn until they arrive. */
  peaks?: number[] | null;
  /** Tap-to-seek; receives the tapped position as a 0..1 fraction. */
  onSeek?: (fraction: number) => void;
  className?: string;
}

export function Waveform({ trackId, progress, mode, peaks, onSeek, className }: WaveformProps) {
  const heights = React.useMemo(() => {
    if (!peaks?.length) return generatePeaks(trackId, BARS);
    const max = Math.max(...peaks) || 1;
    return peaks.map(p => MIN_H + (p / max) * (MAX_H - MIN_H));
  }, [trackId, peaks]);
  const activeIndex = Math.floor(progress * heights.length);
  const [width, setWidth] = React.useState(0);

  return (
    <Pressable
      disabled={!onSeek}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      onPress={e => width && onSeek?.(Math.min(1, Math.max(0, e.nativeEvent.locationX / width)))}
      accessibilityRole="adjustable"
      accessibilityLabel="Seek"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <View className={cn('flex-row items-end gap-[2px] h-[32px] w-full', className)} pointerEvents="none">
        {heights.map((height, i) => {
          const isPlayed = i < activeIndex;
          const isPlayhead = i === activeIndex;

          let bgColor = 'bg-ln3';
          if (isPlayed) {
            bgColor = mode === 'online' ? 'bg-acc' : 'bg-gold';
          } else if (isPlayhead) {
            bgColor = 'bg-white';
          }

          return (
            <View
              key={i}
              className={cn('flex-1 rounded-full', bgColor)}
              style={{
                height: Math.max(MIN_H, height),
                width: isPlayhead ? 3 : 2,
              }}
            />
          );
        })}
      </View>
    </Pressable>
  );
}
