import React from 'react';
import { KeyboardAvoidingView, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../../lib/cn';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
  contentContainerClassName?: string;
}

// Edge-to-edge (Android 15+) ignores adjustResize, so the window no longer shrinks for the
// keyboard: pad the screen instead. A ScrollView that shrinks keeps its focused field in view;
// the offset leaves a gap so the field's rounded border clears the keyboard too.
export const KEYBOARD_GAP = 12;

const KeyboardSafe = ({ children }: { children: React.ReactNode }) => (
  <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={KEYBOARD_GAP} style={{ flex: 1 }}>
    {children}
  </KeyboardAvoidingView>
);

export const Screen = ({ children, scrollable = true, className, contentContainerClassName }: ScreenProps) => {
  // Sideways, the camera cutout is on the left or the right: keep content clear of it.
  const { left, right } = useSafeAreaInsets();
  const sides = { paddingLeft: left, paddingRight: right };
  if (scrollable) {
    return (
      <View className="flex-1 bg-bg" style={sides}>
        {/* @ts-ignore */}
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <KeyboardSafe>
          <ScrollView
            className={cn('flex-1', className)}
            contentContainerClassName={cn('flex-grow', contentContainerClassName)}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardSafe>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg" style={sides}>
      {/* @ts-ignore */}
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <KeyboardSafe>
        <View className={cn('flex-1', className)}>{children}</View>
      </KeyboardSafe>
    </View>
  );
};
