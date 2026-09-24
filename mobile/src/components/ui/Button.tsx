import React from 'react';
import { Text, Pressable } from 'react-native';
import { cn } from '../../lib/cn';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
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
      onPressIn={() => scale.value = withSpring(0.97, { damping: 20 })}
      onPressOut={() => scale.value = withSpring(1, { damping: 20 })}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        // cn() only joins classes, so a caller's justify-* can't override a default one.
        'flex-row items-center rounded-lg',
        !/\bjustify-/.test(className ?? '') && 'justify-center',
        size === 'sm' && 'h-[32px] px-3 gap-1.5',
        size === 'md' && 'h-[40px] px-4 gap-2',
        size === 'lg' && 'h-[48px] px-5 gap-2.5',
        variant === 'accent' && 'bg-acc',
        variant === 'gold' && 'bg-gold',
        variant === 'outline' && 'border border-ln2 bg-transparent',
        variant === 'solid' && 'bg-s2',
        variant === 'ghost' && 'bg-transparent',
        disabled && 'opacity-40',
        className
      )}
      style={style}
    >
      {typeof children === 'string' ? (
        <Text className={cn(
          'font-medium',
          size === 'sm' && 'text-lm',
          size === 'md' && 'text-tm',
          size === 'lg' && 'text-tl',
          variant === 'accent' && 'text-black',
          variant === 'gold' && 'text-black',
          (variant === 'outline' || variant === 'solid' || variant === 'ghost') && 'text-t1'
        )}>
          {children}
        </Text>
      ) : children}
    </AnimatedPressable>
  );
}
