import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/cn';

interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
  size?: 'md' | 'sm';
  variant?: 'default' | 'gold';
  className?: string;
}

export function Chip({ label, icon, onPress, active = false, size = 'md', variant = 'default', className }: ChipProps) {
  const Component = onPress ? Pressable : View;
  
  return (
    <Component
      {...(onPress && {
        onPress,
        accessibilityRole: 'button',
        accessibilityLabel: label,
      })}
      className={cn(
        'flex-row items-center rounded-full bg-s2 border border-ln2 flex-none',
        size === 'sm' ? 'h-[26px] px-2.5 gap-1.5' : 'h-[32px] px-3.5 gap-1.5',
        active && (
          variant === 'gold' 
            ? 'bg-[rgba(255,194,77,0.22)] border-[rgba(255,194,77,0.45)]' 
            : 'bg-[rgba(0,226,138,0.20)] border-[rgba(0,226,138,0.45)]'
        ),
        className
      )}
    >
      {icon}
      <Text
        className={cn(
          'font-medium',
          size === 'sm' ? 'text-[12px]' : 'text-[13px]',
          active 
            ? (variant === 'gold' ? 'text-gold' : 'text-acc') 
            : 'text-t2'
        )}
      >
        {label}
      </Text>
    </Component>
  );
}
