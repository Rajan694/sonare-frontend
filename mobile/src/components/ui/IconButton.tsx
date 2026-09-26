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
  disabled?: boolean;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as any;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 40,
  variant = 'default',
  disabled = false,
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
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        'items-center justify-center rounded-full',
        variant === 'active' && 'bg-s3',
        variant === 'bordered' && 'border border-ln2',
        disabled && 'opacity-40',
        className
      )}
      style={[{ width: size, height: size }, style]}
    >
      {icon}
    </AnimatedPressable>
  );
}
