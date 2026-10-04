import React from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '../../lib/cn';
import { generatePeaks } from '../../lib/format';

const BARS = 76;
const MIN_H = 4;
// The design's .wave (34px tall in Now Playing) and .wave-sm (22px in the Lyrics bar).
const HEIGHT = { md: 34, sm: 22 } as const;

interface WaveformProps {
  trackId: string;
  progress: number; // 0 to 1
  mode: 'online' | 'offline';
  /** Real amplitudes from the server, any scale; a stand-in shape is drawn until they arrive. */
  peaks?: number[] | null;
  /** Tap-to-seek; receives the tapped position as a 0..1 fraction. */
  onSeek?: (fraction: number) => void;
  size?: keyof typeof HEIGHT;
  className?: string;
}

export function Waveform({ trackId, progress, mode, peaks, onSeek, size = 'md', className }: WaveformProps) {
  const maxH = HEIGHT[size] - 4;
  const heights = React.useMemo(() => {
    // The stand-in shape is drawn for the 26px rail; scale it to this one.
    if (!peaks?.length) return generatePeaks(trackId, BARS).map((h) => (h * maxH) / 26);
    const max = Math.max(...peaks) || 1;
    return peaks.map((p) => MIN_H + (p / max) * (maxH - MIN_H));
  }, [trackId, peaks, maxH]);
  const activeIndex = Math.floor(progress * heights.length);
  const [width, setWidth] = React.useState(0);

  return (
    <Pressable
      disabled={!onSeek}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={(e) => width && onSeek?.(Math.min(1, Math.max(0, e.nativeEvent.locationX / width)))}
      accessibilityRole="adjustable"
      accessibilityLabel="Seek"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      {/* Thin 2px bars centred on the line (3px white playhead), spread across the rail. */}
      <View
        className={cn('flex-row items-center justify-between w-full', className)}
        style={{ height: HEIGHT[size] }}
        pointerEvents="none"
      >
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
              className={cn('rounded-full', bgColor)}
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
