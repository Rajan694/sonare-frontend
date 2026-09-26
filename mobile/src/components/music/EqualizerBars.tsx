import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
} from 'react-native-reanimated';
import { cn } from '../../lib/cn';

interface EqualizerBarsProps {
  isPlaying: boolean;
  color?: string;
  className?: string;
}

const BASE_HEIGHT = 4;
const MAX_HEIGHT = 16;

function EqBar({
  isPlaying,
  index,
  color = '#00E28A',
}: {
  isPlaying: boolean;
  index: number;
  color?: string;
}) {
  const height = useSharedValue(BASE_HEIGHT);

  useEffect(() => {
    if (isPlaying) {
      height.value = withDelay(
        index * 150,
        withRepeat(
          withTiming(Math.random() * (MAX_HEIGHT - BASE_HEIGHT) + BASE_HEIGHT, {
            duration: 350 + Math.random() * 200,
          }),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(BASE_HEIGHT, { duration: 300 });
    }
  }, [isPlaying, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  // Plain style, not className: NativeWind's interop reads the style array during render,
  // which touches the shared value and trips Reanimated's strict-mode warning.

  const Component = Animated.View as any;

  return (
    <Component
      style={[animatedStyle, { backgroundColor: color, width: 3, borderRadius: 999 }]}
    />
  );
}

export function EqualizerBars({ isPlaying, color, className }: EqualizerBarsProps) {
  return (
    <View className={cn('flex-row items-end justify-center gap-1 h-[16px] w-[20px]', className)}>
      {[0, 1, 2].map((i) => (
        <EqBar key={i} index={i} isPlaying={isPlaying} color={color} />
      ))}
    </View>
  );
}
