import React, { useId } from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

// Bar geometry from design-system/sonare-logo: five bars for display sizes, three for
// 32px and below, where the five-bar drawing thins out.
const DISPLAY = [
  { x: 41, y: 98, width: 22, height: 60 },
  { x: 79, y: 70, width: 22, height: 116 },
  { x: 117, y: 44, width: 22, height: 168 },
  { x: 155, y: 76, width: 22, height: 104 },
  { x: 193, y: 92, width: 22, height: 72 },
];
const SMALL = [
  { x: 42, y: 80, width: 40, height: 96 },
  { x: 108, y: 40, width: 40, height: 176 },
  { x: 174, y: 68, width: 40, height: 120 },
];

/** The Sonare logo tile: black waveform on the green gradient. */
export function BrandMark({ size = 56 }: { size?: number }) {
  const gradient = `sonare-${useId().replace(/[^\w-]/g, '')}`;
  const bars = size > 32 ? DISPLAY : SMALL;
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        <LinearGradient id={gradient} x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00E28A" />
          <Stop offset="1" stopColor="#00C074" />
        </LinearGradient>
      </Defs>
      <Rect width={256} height={256} rx={58} fill={`url(#${gradient})`} />
      {bars.map(b => (
        <Rect key={b.x} {...b} rx={b.width / 2} fill="#000000" />
      ))}
    </Svg>
  );
}
