import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/cn';

interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
  size?: 'md' | 'sm';
  className?: string;
}

export function Chip({ label, icon, onPress, active = false, size = 'md', className }: ChipProps) {
  const Component = onPress ? Pressable : View;
  
  return (
    <Component
      {...(onPress && {
        onPress,
        accessibilityRole: 'button',
        accessibilityLabel: label,
      })}
      className={cn(
        'chip',
        active && 'bg-s4',
        size === 'sm' && 'py-[2px] px-2',
        className
      )}
    >
      {icon}
      <Text className={cn('text-t2', size === 'sm' ? 'text-ls' : 'text-ll')}>{label}</Text>
    </Component>
  );
}
