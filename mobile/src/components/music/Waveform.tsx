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
  /** Which of `peaks` are real; the rest (a placeholder not yet heard) are drawn dimmed. All when absent. */
  real?: boolean[];
  /** Tap-to-seek; receives the tapped position as a 0..1 fraction. */
  onSeek?: (fraction: number) => void;
  size?: keyof typeof HEIGHT;
  className?: string;
}

// Plain colours, not classNames: a className goes through NativeWind on every render, and the
// rail re-renders twice a second while a song plays.
const COLOR = { played: { online: '#00E28A', offline: '#FFC24D' }, playhead: '#FFFFFF', rest: '#33333B' } as const;

type BarState = 'played' | 'playhead' | 'rest';

/** One bar; memoised, so a position tick only redraws the one or two bars that change colour. */
const Bar = React.memo(
  ({ height, state, color, dim }: { height: number; state: BarState; color: string; dim: boolean }) => (
    <View
      style={{
        height: Math.max(MIN_H, height),
        width: state === 'playhead' ? 3 : 2,
        borderRadius: 999,
        backgroundColor: color,
        // A placeholder bar: the real level shows once the song has played past it.
        opacity: dim ? 0.45 : 1,
      }}
    />
  ),
);

export const Waveform = ({ trackId, progress, mode, peaks, real, onSeek, size = 'md', className }: WaveformProps) => {
  const maxH = HEIGHT[size] - 4;
  const heights = React.useMemo(() => {
    // The stand-in shape is drawn for the 26px rail; scale it to this one.
    if (!peaks?.length) return generatePeaks(trackId, BARS).map((h) => (h * maxH) / 26);
    const max = Math.max(...peaks) || 1;
    return peaks.map((p) => MIN_H + (p / max) * (maxH - MIN_H));
  }, [trackId, peaks, maxH]);
  const activeIndex = Math.floor(progress * heights.length);
  const [width, setWidth] = React.useState(0);
  const dimmable = !!real && peaks?.length === heights.length;

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
          const state: BarState = i < activeIndex ? 'played' : i === activeIndex ? 'playhead' : 'rest';
          const color = state === 'played' ? COLOR.played[mode] : state === 'playhead' ? COLOR.playhead : COLOR.rest;
          return <Bar key={i} height={height} state={state} color={color} dim={dimmable && !real![i]} />;
        })}
      </View>
    </Pressable>
  );
};
