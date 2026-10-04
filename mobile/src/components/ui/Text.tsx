import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

/**
 * react-native's Text, set in Geist (the design's UI face). NativeWind only applies a font
 * family when a class asks for one, and React 19 dropped Text.defaultProps, so every screen
 * imports this instead. `font-mono` classes keep JetBrains Mono.
 */
export const Text = React.forwardRef<React.ComponentRef<typeof RNText>, TextProps>(function GeistText(
  { className, ...props },
  ref,
) {
  const family = className && /\bfont-mono\b/.test(className) ? '' : 'font-sans ';
  return <RNText ref={ref} className={`${family}${className ?? ''}`} {...props} />;
});
