import React from 'react';
import { View } from 'react-native';
import { cn } from '../../lib/cn';
import { generatePeaks } from '../../lib/format';

interface WaveformProps {
  trackId: string;
  progress: number; // 0 to 1
  mode: 'online' | 'offline';
  className?: string;
}

export function Waveform({ trackId, progress, mode, className }: WaveformProps) {
  // Mobile needs ~76 bars
  const peaks = React.useMemo(() => generatePeaks(trackId, 76), [trackId]);
  const activeIndex = Math.floor(progress * peaks.length);

  return (
    <View className={cn('flex-row items-end gap-[2px] h-[32px] w-full', className)}>
      {peaks.map((height, i) => {
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
              height: Math.max(4, height),
              width: isPlayhead ? 3 : 2,
            }}
          />
        );
      })}
    </View>
  );
}
