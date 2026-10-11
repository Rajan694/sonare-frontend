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
  damping: 28,
  stiffness: 280,
  overshootClamping: true,
} as const;

/**
 * Springs for everything that moves. They keep the spring's ease-out but clamp the
 * overshoot, so sheets, swipes and presses settle without bouncing past their stop.
 */
export const springs = {
  /** Bottom sheets opening, closing and snapping back after a drag. */
  sheet: { damping: 30, stiffness: 260, overshootClamping: true },
  /** Something dragged and let go short of its threshold returning to rest. */
  snapBack: { damping: 28, stiffness: 300, overshootClamping: true },
  /** Flinging an item off screen (swipe to skip, swipe up to open). */
  fling: { damping: 26, stiffness: 220, overshootClamping: true },
  /** Press feedback on buttons. */
  press: { damping: 30, stiffness: 500, overshootClamping: true },
  /** Selection indicators sliding between options. */
  slide: { damping: 30, stiffness: 320, overshootClamping: true },
} as const;

let reduceMotionEnabled = false;
AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
  reduceMotionEnabled = enabled ?? false;
});

export const AnimatedView = ({
  children,
  delay = 0,
  ...props
}: React.ComponentProps<typeof MotiView> & { delay?: number }) => {
  if (reduceMotionEnabled) {
    return <>{children}</>;
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={
        {
          type: 'timing',
          duration: durations.base,
          delay,
        } as MotiTransitionProp
      }
      {...props}
    >
      {children}
    </MotiView>
  );
};

export const FadeView = ({
  visible,
  children,
  ...props
}: React.ComponentProps<typeof MotiView> & { visible: boolean }) => {
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
};
