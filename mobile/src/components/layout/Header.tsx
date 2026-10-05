import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../../lib/cn';

interface HeaderProps {
  title?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  /**
   * 'start' puts the title right after `left` ("← Settings", M03 / M13 / M15 / M16);
   * 'center' (default) is for detail screens (M06-M08).
   */
  titleAlign?: 'center' | 'start';
  className?: string;
}

export const Header = ({ title, left, right, titleAlign = 'center', className }: HeaderProps) => {
  const insets = useSafeAreaInsets();

  if (title && titleAlign === 'start') {
    return (
      <View
        className={cn('flex-row items-center justify-between px-5', className)}
        style={{ paddingTop: insets.top, minHeight: 64 + insets.top }}
      >
        <View className="flex-1 flex-row items-center gap-2 min-w-0">
          {left}
          {typeof title === 'string' ? (
            <Text className="text-tl font-semibold text-t1 flex-shrink" numberOfLines={1}>
              {title}
            </Text>
          ) : (
            title
          )}
        </View>
        {right && <View className="flex-row items-center">{right}</View>}
      </View>
    );
  }

  return (
    <View
      className={cn('flex-row items-center justify-between px-5', className)}
      style={{ paddingTop: insets.top, minHeight: 64 + insets.top }}
    >
      <View className="flex-1 flex-row justify-start items-center">{left}</View>
      {title && (
        <View
          className="absolute inset-x-0 items-center pointer-events-none"
          style={{ top: insets.top, height: 64, justifyContent: 'center' }}
        >
          {typeof title === 'string' ? (
            <Text className="text-tl font-semibold text-t1 text-center px-4" numberOfLines={1}>
              {title}
            </Text>
          ) : (
            title
          )}
        </View>
      )}
      <View className="flex-1 flex-row justify-end items-center">{right}</View>
    </View>
  );
};
