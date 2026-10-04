import React from 'react';
import { cn } from '../../lib/cn';
import Animated from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { artGradients } from '../../data/gradients';

// cn() only joins classes, so a caller's rounded-* can't override a default one.
const radius = (className?: string) => (/\brounded-/.test(className ?? '') ? '' : 'rounded-md');

interface ArtworkProps {
  uri?: string;
  /** Tried when `uri` fails to load, e.g. a smaller size that always exists. */
  fallbackUri?: string;
  size: 30 | 40 | 42 | 44 | 48 | 52 | 56 | 64 | 68 | 76 | 84 | 96 | 124 | 132 | 160 | 200 | 240 | 306 | 314;
  gradient?: [string, string];
  className?: string;
  sharedTransitionTag?: string;
  rings?: boolean;
}

export function Artwork({
  uri: primaryUri,
  fallbackUri,
  size,
  gradient,
  className,
  sharedTransitionTag,
  rings,
}: ArtworkProps) {
  const AnimatedImageComponent = Animated.Image as any;
  const AnimatedViewComponent = Animated.View as any;
  const [failed, setFailed] = React.useState<Record<string, true>>({});
  const uri =
    primaryUri && !failed[primaryUri] ? primaryUri : fallbackUri && !failed[fallbackUri] ? fallbackUri : undefined;

  const isHttp = uri?.startsWith('http') || uri?.startsWith('file://');
  const gradKey = uri && artGradients[uri] ? uri : null;
  const hasRings = rings || className?.includes('art-rings');

  if (isHttp && uri) {
    return (
      <AnimatedImageComponent
        source={{ uri }}
        onError={() => setFailed((f) => ({ ...f, [uri]: true }))}
        className={cn(radius(className), 'overflow-hidden bg-s3', className)}
        style={{ width: size, height: size }}
        sharedTransitionTag={sharedTransitionTag}
        accessibilityIgnoresInvertColors
      />
    );
  }

  // Draw gradient matching the specific variant or a valid gradient; a cover that is missing or
  // can't load (offline, say) gets the design's generated artwork, the same one every time.
  const stops = gradKey ? artGradients[gradKey] : (gradient ?? generatedArt(primaryUri ?? fallbackUri ?? ''));
  if (stops) {
    // Two colours run corner to corner; a third adds a stop in the middle.
    const offsets = stops.length > 2 ? ['0%', '45%', '100%'] : ['0%', '100%'];

    return (
      <AnimatedViewComponent
        className={cn(radius(className), 'overflow-hidden', className)}
        style={{ width: size, height: size }}
        sharedTransitionTag={sharedTransitionTag}
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="82%" y2="100%">
              {offsets.map((offset, i) => (
                <Stop key={offset} offset={offset} stopColor={stops[i]} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grad)" />

          {hasRings && (
            <>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={size * 0.3}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
                fill="none"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={size * 0.55}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
                fill="none"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={size * 0.8}
                stroke="rgba(255,255,255,0.02)"
                strokeWidth="1"
                fill="none"
              />
            </>
          )}
        </Svg>
      </AnimatedViewComponent>
    );
  }

  return (
    <AnimatedViewComponent
      className={cn(radius(className), 'bg-s3', className)}
      style={{ width: size, height: size }}
      sharedTransitionTag={sharedTransitionTag}
    />
  );
}

const GENERATED = Object.values(artGradients);

/** One of the design's a1-a12 gradients, chosen by the cover's address so it doesn't change. */
function generatedArt(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GENERATED[Math.abs(h) % GENERATED.length];
}
