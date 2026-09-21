import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../../lib/cn';

interface HeaderProps {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function Header({ title, left, right, className }: HeaderProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className={cn('flex-row items-center justify-between px-4 border-b border-ln', className)}
      style={{ paddingTop: insets.top, minHeight: 64 + insets.top }}
    >
      <View className="flex-1 flex-row justify-start">{left}</View>
      {title && (
        <View className="absolute inset-x-0 items-center pointer-events-none" style={{ top: insets.top, height: 64, justifyContent: 'center' }}>
          <Text className="text-h2 font-semibold text-t1 text-center px-4" numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
      <View className="flex-1 flex-row justify-end">{right}</View>
    </View>
  );
}
