import React from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Text } from './Text';
import { MotiView, MotiTransitionProp } from 'moti';
import { springs } from '../../lib/motion';
import { cn } from '../../lib/cn';

export interface ToastProps {
  visible: boolean;
  message: string;
  subtext?: string;
  icon?: React.ReactNode;
  mode?: 'online' | 'offline';
  bottom?: number;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  /** A button on the right ("Undo", "Start over"). */
  action?: { label: string; onPress: () => void };
}

export const Toast = ({
  visible,
  message,
  subtext,
  icon,
  mode = 'online',
  bottom,
  accessibilityLiveRegion,
  action,
}: ToastProps) => {
  // A button takes room from the text: such a toast uses more of the screen width.
  const { width: screenWidth } = useWindowDimensions();
  const actionWidth = action ? { width: Math.min(368, screenWidth - 32) } : undefined;
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center z-50"
      style={{ bottom: bottom ?? 80 }}
      accessibilityLiveRegion={accessibilityLiveRegion}
    >
      <MotiView
        // The faded-out toast stays mounted: its box must not catch taps either, or the row
        // above the mini player can't be tapped after any snackbar.
        pointerEvents="box-none"
        animate={{
          opacity: visible ? 1 : 0,
          translateY: visible ? 0 : 20,
        }}
        transition={
          {
            type: 'spring',
            ...springs.sheet,
          } as MotiTransitionProp
        }
      >
        <View
          // Faded out, it must not catch taps meant for what's underneath.
          pointerEvents={visible ? 'auto' : 'none'}
          className={cn(
            'bg-s2 border border-ln rounded-lg p-3 flex-row items-center gap-3 shadow-e3',
            !action && 'w-80',
          )}
          style={actionWidth}
        >
          {icon && (
            <View
              className={cn(
                'w-8 h-8 rounded-full items-center justify-center',
                mode === 'online' ? 'bg-accbg2 text-acc' : 'bg-goldbg2 text-gold',
              )}
            >
              {icon}
            </View>
          )}
          <View className="flex-1 gap-0.5">
            <Text className="text-t1 text-tm font-medium">{message}</Text>
            {subtext && <Text className="text-t2 text-bs">{subtext}</Text>}
          </View>
          {action && (
            <Pressable
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={12}
              className="pl-1"
            >
              <Text className={cn('text-ll font-semibold', mode === 'online' ? 'text-acc' : 'text-gold')}>
                {action.label}
              </Text>
            </Pressable>
          )}
        </View>
      </MotiView>
    </View>
  );
};
