import React from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from '../ui/Text';
import Icon from '../ui/Icon';
import { cn } from '../../lib/cn';
import { ROOMS, SPATIAL_PRESETS, type SpatialPresetId } from '../../../../shared/spatial';

const LINE = '#5A5A66';

/** A small top-down sketch of each space: the listener is the accent dot near the bottom. */
const Preview = ({ preset, accent }: { preset: SpatialPresetId; accent: string }) => {
  const line = { fill: 'none', stroke: LINE, strokeWidth: 1.2, strokeLinecap: 'round' as const };
  return (
    <Svg width={64} height={40} viewBox="0 0 64 40">
      {preset === 'concert' && (
        <>
          <Path d="M10 10 Q32 2 54 10" {...line} />
          <Path d="M22 6 L18 16 M32 4 L32 15 M42 6 L46 16" {...line} strokeOpacity={0.5} />
          {[14, 22, 42, 50].map((x) => (
            <Circle key={x} cx={x} cy={26} r={1.2} fill={LINE} />
          ))}
          <Circle cx={32} cy={30} r={2.6} fill={accent} />
        </>
      )}
      {preset === 'cafe' && (
        <>
          <Rect x={12} y={4} width={40} height={32} rx={4} {...line} />
          {[
            [16, 8],
            [48, 8],
            [16, 32],
            [48, 32],
          ].map(([x, y]) => (
            <Rect key={`${x}${y}`} x={x - 1.5} y={y - 1.5} width={3} height={3} rx={0.8} fill={LINE} />
          ))}
          <Circle cx={24} cy={18} r={3} {...line} strokeOpacity={0.5} />
          <Circle cx={36} cy={24} r={2.6} fill={accent} />
        </>
      )}
      {preset === 'hall' && (
        <>
          <Path d="M14 36 L8 4 L56 4 L50 36 Z" {...line} />
          <Path d="M20 28 Q32 10 44 28" {...line} strokeOpacity={0.5} />
          <Path d="M16 30 Q32 2 48 30" {...line} strokeOpacity={0.3} />
          <Circle cx={32} cy={31} r={2.6} fill={accent} />
        </>
      )}
    </Svg>
  );
};

interface SpatialPresetCardProps {
  preset: SpatialPresetId;
  active: boolean;
  disabled?: boolean;
  variant?: 'default' | 'gold';
  onSelect: (preset: SpatialPresetId) => void;
}

export const SpatialPresetCard: React.FC<SpatialPresetCardProps> = ({
  preset,
  active,
  disabled = false,
  variant = 'default',
  onSelect,
}) => {
  const info = SPATIAL_PRESETS[preset];
  const room = ROOMS[info.room];
  const gold = variant === 'gold';
  const accent = gold ? '#FFC24D' : '#00E28A';

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active, disabled }}
      accessibilityLabel={`${info.label} spatial preset`}
      disabled={disabled}
      onPress={() => onSelect(preset)}
      className={cn(
        'p-3.5 rounded-xl border bg-s2 border-ln mb-2',
        active && (gold ? 'border-gold bg-goldbg' : 'border-acc bg-accbg'),
        disabled && 'opacity-40',
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-tm font-semibold text-t1">{info.label}</Text>
            {active && <Icon name="check" size={14} color={accent} />}
          </View>
          <Text className="text-mono-s font-mono text-t3">{room.rt60Low.toFixed(1)} s decay</Text>
        </View>
        <Preview preset={preset} accent={accent} />
      </View>
      <Text className="text-bs text-t3 leading-tight mt-1.5">{info.description}</Text>
    </Pressable>
  );
};
