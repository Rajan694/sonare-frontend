import React from 'react';
import { View, TextInput, TextInputProps, Pressable } from 'react-native';
import { cn } from '../../lib/cn';
import Icon from './Icon';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  icon?: React.ReactNode;
  clearButton?: boolean;
  onClear?: () => void;
  className?: string;
}

export function Field({ icon, clearButton, onClear, className, ...props }: FieldProps) {
  return (
    <View className={cn('flex-row items-center h-[44px] px-3.5 bg-s2 border border-ln2 rounded-full gap-2.5', className)}>
      {icon}
      <TextInput
        {...props}
        className="flex-1 text-t1 text-bm font-sans p-0"
        placeholderTextColor="#7E7E8C"
      />
      {clearButton && onClear ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          className="w-7 h-7 rounded-full items-center justify-center"
        >
          <Icon name="close" size={14} color="#9A9AA8" />
        </Pressable>
      ) : null}
    </View>
  );
}
