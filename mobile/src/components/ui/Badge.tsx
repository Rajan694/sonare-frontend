import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/cn';

interface BadgeProps {
  label: string;
  icon?: React.ReactNode;
  variant: 'local' | 'cloud' | 'download' | 'neutral';
  className?: string;
}

export function Badge({ label, icon, variant, className }: BadgeProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-1 h-[20px] px-[7px] rounded-xs flex-none',
        variant === 'local' && 'bg-[rgba(255,194,77,0.22)]',
        variant === 'cloud' && 'bg-[rgba(0,226,138,0.20)]',
        variant === 'download' && 'bg-[rgba(77,163,255,0.18)]',
        variant === 'neutral' && 'bg-s3',
        className
      )}
    >
      {icon}
      <Text className={cn(
        'text-[10px] font-semibold tracking-[0.4px] uppercase',
        variant === 'local' && 'text-gold',
        variant === 'cloud' && 'text-acc',
        variant === 'download' && 'text-blue',
        variant === 'neutral' && 'text-t2'
      )}>
        {label}
      </Text>
    </View>
  );
}
