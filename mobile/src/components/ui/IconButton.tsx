import React from 'react';
import { Pressable } from 'react-native';
import { cn } from '../../lib/cn';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: 28 | 32 | 40 | 44;
  variant?: 'default' | 'active' | 'bordered';
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as any;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 40,
  variant = 'default',
  className,
}: IconButtonProps) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => scale.value = withSpring(0.9, { damping: 20 })}
      onPressOut={() => scale.value = withSpring(1, { damping: 20 })}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        'items-center justify-center rounded-full',
        variant === 'active' && 'bg-s3',
        variant === 'bordered' && 'border border-ln2',
        className
      )}
      style={[{ width: size, height: size }, style]}
    >
      {icon}
    </AnimatedPressable>
  );
}
