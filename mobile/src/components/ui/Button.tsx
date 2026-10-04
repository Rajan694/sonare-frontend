import React from 'react';
import { Pressable } from 'react-native';
import { Text } from './Text';
import { cn } from '../../lib/cn';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs } from '../../lib/motion';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  variant?: 'accent' | 'gold' | 'outline' | 'solid' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as any;

export function Button({
  onPress,
  children,
  icon,
  accessibilityLabel,
  variant = 'accent',
  size = 'md',
  disabled = false,
  className,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.98, springs.press))}
      onPressOut={() => (scale.value = withSpring(1, springs.press))}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        // cn() only joins classes, so a caller's justify-* can't override a default one.
        'flex-row items-center rounded-full',
        !/\bjustify-/.test(className ?? '') && 'justify-center',
        size === 'sm' && 'h-[32px] px-3.5 gap-1.5',
        size === 'md' && 'h-[40px] px-[18px] gap-2',
        size === 'lg' && 'h-[48px] px-6 gap-2.5',
        variant === 'accent' && 'bg-acc shadow-glow-acc',
        variant === 'gold' && 'bg-gold shadow-glow-gold',
        variant === 'outline' && 'border border-ln2 bg-transparent',
        variant === 'solid' && 'bg-s3 border border-ln2',
        variant === 'ghost' && 'bg-transparent',
        disabled && 'opacity-40',
        className,
      )}
      style={style}
    >
      {icon}
      {typeof children === 'string' ? (
        <Text
          className={cn(
            'font-semibold tracking-tight',
            size === 'sm' ? 'text-bs' : size === 'md' ? 'text-bm' : 'text-tm',
            variant === 'accent' && 'text-black',
            variant === 'gold' && 'text-black',
            (variant === 'outline' || variant === 'solid' || variant === 'ghost') && 'text-t1',
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}
