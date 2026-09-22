import { MotiView, MotiTransitionProp } from 'moti';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

export const durations = {
  fast: 150,
  base: 250,
  slow: 350,
} as const;

export const easings = {
  standard: [0.4, 0.0, 0.2, 1] as const,
  decelerate: [0.0, 0.0, 0.2, 1] as const,
  accelerate: [0.4, 0.0, 1, 1] as const,
} as const;

export const springConfig = {
  damping: 20,
  stiffness: 300,
} as const;

let reduceMotionEnabled = false;
AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
  reduceMotionEnabled = enabled ?? false;
});

export function AnimatedView({
  children,
  delay = 0,
  ...props
}: React.ComponentProps<typeof MotiView> & { delay?: number }) {
  if (reduceMotionEnabled) {
    return <>{children}</>;
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: durations.base,
        delay,
      } as MotiTransitionProp}
      {...props}
    >
      {children}
    </MotiView>
  );
}

export function FadeView({
  visible,
  children,
  ...props
}: React.ComponentProps<typeof MotiView> & { visible: boolean }) {
  if (reduceMotionEnabled) {
    return visible ? <>{children}</> : null;
  }

  return (
    <MotiView
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ type: 'timing', duration: durations.fast } as MotiTransitionProp}
      {...props}
    >
      {children}
    </MotiView>
  );
}
