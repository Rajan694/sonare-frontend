import React from 'react';
import { View, Text } from 'react-native';
import { MotiView, MotiTransitionProp } from 'moti';
import { cn } from '../../lib/cn';

interface ToastProps {
  visible: boolean;
  message: string;
  subtext?: string;
  icon?: React.ReactNode;
  mode?: 'online' | 'offline';
}

export function Toast({ visible, message, subtext, icon, mode = 'online' }: ToastProps) {
  return (
    <View className="absolute bottom-20 left-0 right-0 items-center pointer-events-none z-50">
      <MotiView
        animate={{
          opacity: visible ? 1 : 0,
          translateY: visible ? 0 : 20,
        }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 300,
        } as MotiTransitionProp}
      >
        <View className="bg-s2 border border-ln rounded-lg p-3 flex-row items-center gap-3 w-80 shadow-e3">
          {icon && (
            <View className={cn('w-8 h-8 rounded-full items-center justify-center', mode === 'online' ? 'bg-accbg2 text-acc' : 'bg-goldbg2 text-gold')}>
              {icon}
            </View>
          )}
          <View className="flex-1 gap-0.5">
            <Text className="text-t1 text-tm font-medium">{message}</Text>
            {subtext && <Text className="text-t2 text-bs">{subtext}</Text>}
          </View>
        </View>
      </MotiView>
    </View>
  );
}
