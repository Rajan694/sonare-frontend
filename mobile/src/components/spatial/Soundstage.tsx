import React, { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Polygon,
  G,
  Defs,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { Text } from '../ui/Text';
import { cn } from '../../lib/cn';
import {
  toPolar,
  directionLabel,
  distanceLabel,
  pointToPosition,
  stageGeometry,
  type SpatialCustom,
} from '../../../../shared/spatial';

interface SoundstageProps {
  custom: SpatialCustom;
  disabled?: boolean;
  variant?: 'default' | 'gold';
  onChange: (patch: Partial<SpatialCustom>, opts?: { commit?: boolean }) => void;
}

const DISC_RADIUS = 95; // SVG coordinate units (-120..120 viewBox)
const VIEW_HALF = 120;

export const Soundstage: React.FC<SoundstageProps> = ({ custom, disabled = false, variant = 'default', onChange }) => {
  const [size, setSize] = useState(240);
  const accent = variant === 'gold' ? '#FFC24D' : '#00E28A';

  const polar = toPolar(custom.x, custom.y);
  // The virtual speakers where the audio puts them.
  const stage = stageGeometry(custom);
  const azL = stage.azimuth - stage.spread;
  const azR = stage.azimuth + stage.spread;
  const dist = stage.distance * DISC_RADIUS;

  const spkLX = Math.sin(azL) * dist;
  const spkLY = -Math.cos(azL) * dist;
  const spkRX = Math.sin(azR) * dist;
  const spkRY = -Math.cos(azR) * dist;

  const sourceSvgX = custom.x * DISC_RADIUS;
  const sourceSvgY = -custom.y * DISC_RADIUS;

  const handleTouch = (locationX: number, locationY: number, commit: boolean) => {
    if (disabled || size <= 0) return;
    // The disc is smaller than the drawing (room for the labels): its edge is distance 1.
    const radius = (size / 2) * (DISC_RADIUS / VIEW_HALF);
    const { x, y } = pointToPosition(locationX - size / 2, locationY - size / 2, radius);
    onChange({ x, y }, { commit });
  };

  const pan = usePanGesture({
    runOnJS: true,
    disableReanimated: true,
    minDistance: 0,
    enabled: !disabled,
    onBegin: (e) => handleTouch(e.x, e.y, false),
    onUpdate: (e) => handleTouch(e.x, e.y, false),
    onFinalize: (e) => handleTouch(e.x, e.y, true),
  });

  return (
    <View
      className={cn(
        'items-center justify-center p-3 rounded-2xl bg-s2 border border-ln select-none',
        disabled && 'opacity-40',
      )}
    >
      <GestureDetector gesture={pan}>
        <View
          testID="soundstage-disc"
          onLayout={(e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            const minDim = Math.min(width, height);
            if (minDim > 0) setSize(minDim);
          }}
          style={{ width: 240, height: 240 }}
          accessible={true}
          accessibilityRole="adjustable"
          accessibilityLabel="Soundstage 2D position disc"
          accessibilityValue={{ text: `${directionLabel(polar.azimuth)}, ${distanceLabel(polar.distance)}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            if (disabled) return;
            const step = 0.1;
            let ny = custom.y + (e.nativeEvent.actionName === 'increment' ? step : -step);
            const r = Math.hypot(custom.x, ny);
            if (r > 1.0) {
              ny = ny / r;
            }
            onChange({ y: ny }, { commit: true });
          }}
          onStartShouldSetResponder={() => !disabled}
          onMoveShouldSetResponder={() => !disabled}
          onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX, e.nativeEvent.locationY, false)}
          onResponderMove={(e) => handleTouch(e.nativeEvent.locationX, e.nativeEvent.locationY, false)}
          onResponderRelease={(e) => handleTouch(e.nativeEvent.locationX, e.nativeEvent.locationY, true)}
        >
          <Svg viewBox="-120 -120 240 240" width="100%" height="100%">
            <Defs>
              <RadialGradient id="sourceGlow" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor={accent} stopOpacity={0.45} />
                <Stop offset="100%" stopColor={accent} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="stageBg" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor="#2A2A36" stopOpacity={0.4} />
                <Stop offset="100%" stopColor="#1C1C24" stopOpacity={0.1} />
              </RadialGradient>
            </Defs>

            {/* Outer disc boundary */}
            <Circle cx={0} cy={0} r={DISC_RADIUS} fill="url(#stageBg)" stroke="#32323E" strokeWidth={1.5} />

            {/* Range rings (Near, Mid) */}
            <Circle
              cx={0}
              cy={0}
              r={DISC_RADIUS * 0.33}
              fill="none"
              stroke="#32323E"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <Circle
              cx={0}
              cy={0}
              r={DISC_RADIUS * 0.66}
              fill="none"
              stroke="#32323E"
              strokeWidth={1}
              strokeDasharray="3 3"
            />

            {/* Crosshair axes */}
            <Line x1={-DISC_RADIUS} y1={0} x2={DISC_RADIUS} y2={0} stroke="#282832" strokeWidth={1} />
            <Line x1={0} y1={-DISC_RADIUS} x2={0} y2={DISC_RADIUS} stroke="#282832" strokeWidth={1} />

            {/* Cardinal direction labels */}
            <SvgText x={0} y={-DISC_RADIUS - 6} textAnchor="middle" fill="#7E7E8C" fontSize={8} fontWeight="bold">
              FRONT
            </SvgText>
            <SvgText x={0} y={DISC_RADIUS + 13} textAnchor="middle" fill="#7E7E8C" fontSize={8} fontWeight="bold">
              BACK
            </SvgText>
            <SvgText x={-DISC_RADIUS - 6} y={3} textAnchor="end" fill="#7E7E8C" fontSize={8} fontWeight="bold">
              L
            </SvgText>
            <SvgText x={DISC_RADIUS + 6} y={3} textAnchor="start" fill="#7E7E8C" fontSize={8} fontWeight="bold">
              R
            </SvgText>

            {/* Speaker beam triangle from center to L & R speakers */}
            <Polygon points={`0,0 ${spkLX},${spkLY} ${spkRX},${spkRY}`} fill={accent} opacity={0.12} />

            {/* Beam arc between speakers */}
            <Line
              x1={spkLX}
              y1={spkLY}
              x2={spkRX}
              y2={spkRY}
              stroke={accent}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.4}
            />

            {/* Virtual Left & Right speakers */}
            <Circle cx={spkLX} cy={spkLY} r={4} fill={accent} opacity={0.6} />
            <Circle cx={spkRX} cy={spkRY} r={4} fill={accent} opacity={0.6} />

            {/* Listener Head at Center */}
            <G>
              <Circle cx={0} cy={0} r={11} fill="#18181F" stroke="#484856" strokeWidth={1.5} />
              <Path d="M -3 -8 L 0 -14 L 3 -8 Z" fill="#9A9AA8" />
              <Rect x={-13} y={-4} width={3} height={8} rx={1.5} fill="#7E7E8C" />
              <Rect x={10} y={-4} width={3} height={8} rx={1.5} fill="#7E7E8C" />
            </G>

            {/* Sound Source Puck */}
            <G x={sourceSvgX} y={sourceSvgY}>
              <Circle cx={0} cy={0} r={24} fill="url(#sourceGlow)" />
              <Circle cx={0} cy={0} r={10} fill={accent} />
              <Circle cx={0} cy={0} r={3.5} fill="#ffffff" />
            </G>
          </Svg>
        </View>
      </GestureDetector>

      {/* Polar readout info */}
      <View className="flex-row items-center justify-between w-full px-2 mt-2 pt-2 border-t border-ln">
        <Text className="text-mono-s font-mono text-t2">
          {directionLabel(polar.azimuth)} ({Math.round(polar.azimuthDeg)}°)
        </Text>
        <Text className="text-mono-s font-mono text-t3">
          {distanceLabel(polar.distance)} ({Math.round(polar.distance * 100)}%)
        </Text>
      </View>
    </View>
  );
};
