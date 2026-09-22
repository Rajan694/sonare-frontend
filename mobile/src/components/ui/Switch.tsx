import React from 'react';
import { View, Pressable } from 'react-native';
import { cn } from '../../lib/cn';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  variant?: 'default' | 'gold';
  disabled?: boolean;
}

export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
  variant = 'default',
  disabled = false,
}: SwitchProps) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      disabled={disabled}
      className={cn(
        'w-[44px] h-[26px] rounded-full p-[2px] justify-center',
        value && variant === 'default' && 'bg-acc',
        value && variant === 'gold' && 'bg-gold',
        !value && 'bg-ln3',
        disabled && 'opacity-40'
      )}
    >
      <View
        className={cn(
          'w-[22px] h-[22px] rounded-full bg-white',
          value ? 'ml-auto' : 'mr-auto'
        )}
      />
    </Pressable>
  );
}
