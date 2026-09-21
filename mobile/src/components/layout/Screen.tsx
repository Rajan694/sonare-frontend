import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, View } from 'react-native';
import { cn } from '../../lib/cn';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
  contentContainerClassName?: string;
}

export function Screen({ children, scrollable = true, className, contentContainerClassName }: ScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        {/* @ts-ignore */}
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ScrollView 
          className={cn('flex-1', className)} 
          contentContainerClassName={cn('flex-grow', contentContainerClassName)}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* @ts-ignore */}
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View className={cn('flex-1', className)}>
        {children}
      </View>
    </SafeAreaView>
  );
}
