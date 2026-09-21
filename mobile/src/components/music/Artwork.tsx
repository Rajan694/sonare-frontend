import React from 'react';
import { cn } from '../../lib/cn';
import Animated from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { artGradients } from '../../data/gradients';

interface ArtworkProps {
  uri?: string;
  size: 40 | 42 | 44 | 48 | 56 | 64 | 96 | 132 | 160 | 200 | 240;
  gradient?: [string, string];
  className?: string;
  sharedTransitionTag?: string;
  rings?: boolean;
}

export function Artwork({ uri, size, gradient, className, sharedTransitionTag, rings }: ArtworkProps) {
  const AnimatedImageComponent = Animated.Image as any;
  const AnimatedViewComponent = Animated.View as any;

  const isHttp = uri?.startsWith('http') || uri?.startsWith('file://');
  const gradKey = uri && artGradients[uri] ? uri : null;
  const hasRings = rings || className?.includes('art-rings');

  if (isHttp && uri) {
    return (
      <AnimatedImageComponent
        source={{ uri }}
        className={cn('rounded-md overflow-hidden bg-s3', className)}
        style={{ width: size, height: size }}
        sharedTransitionTag={sharedTransitionTag}
        accessibilityIgnoresInvertColors
      />
    );
  }

  // Draw gradient matching the specific variant or a valid gradient
  if (gradKey || gradient) {
    const stops = gradKey ? artGradients[gradKey] : gradient!;
    
    return (
      <AnimatedViewComponent
        className={cn('rounded-md overflow-hidden', className)}
        style={{ width: size, height: size }}
        sharedTransitionTag={sharedTransitionTag}
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="82%" y2="100%">
               <Stop offset="0%" stopColor={stops[0]} />
               <Stop offset={stops.length > 2 ? "45%" : "100%"} stopColor={stops[1]} />
               {stops.length > 2 && <Stop offset="100%" stopColor={stops[2]} />}
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grad)" />
          
          {hasRings && (
            <>
              <Circle cx={size/2} cy={size/2} r={size * 0.3} stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />
              <Circle cx={size/2} cy={size/2} r={size * 0.55} stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
              <Circle cx={size/2} cy={size/2} r={size * 0.8} stroke="rgba(255,255,255,0.02)" strokeWidth="1" fill="none" />
            </>
          )}
        </Svg>
      </AnimatedViewComponent>
    );
  }

  return (
    <AnimatedViewComponent
      className={cn('rounded-md bg-s3', className)}
      style={{ width: size, height: size }}
      sharedTransitionTag={sharedTransitionTag}
    />
  );
}
