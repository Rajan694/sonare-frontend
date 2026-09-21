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
        'badge',
        variant === 'local' && 'bg-goldbg',
        variant === 'cloud' && 'bg-accbg',
        variant === 'download' && 'bg-[rgba(77,163,255,0.12)]',
        variant === 'neutral' && 'bg-s3',
        className
      )}
    >
      {icon}
      <Text className={cn(
        'text-ls font-medium',
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
