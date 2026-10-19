import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../ui/Text';
import Icon from '../ui/Icon';
import { cn } from '../../lib/cn';
import type { SpatialPresetId } from '../../../../shared/spatial';

interface PresetInfo {
  name: string;
  tagline: string;
  rt60: string;
  icon: 'music' | 'radio' | 'sparkles';
}

const PRESET_INFO: Record<SpatialPresetId, PresetInfo> = {
  concert: {
    name: 'Concert',
    tagline: 'Natural stage width with balanced early reflections',
    rt60: '1.2s RT60',
    icon: 'music',
  },
  cafe: {
    name: 'Cafe',
    tagline: 'Intimate near-field presence with warm, dampened highs',
    rt60: '0.6s RT60',
    icon: 'sparkles',
  },
  hall: {
    name: 'Cathedral Hall',
    tagline: 'Expansive architecture with long, diffuse reverberance',
    rt60: '2.1s RT60',
    icon: 'radio',
  },
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
  const info = PRESET_INFO[preset];

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={`${info.name} spatial preset`}
      disabled={disabled}
      onPress={() => onSelect(preset)}
      className={cn(
        'p-3.5 rounded-xl border bg-s2 border-ln mb-2',
        active &&
          (variant === 'gold' ? 'border-gold bg-[rgba(255,194,77,0.08)]' : 'border-acc bg-[rgba(0,226,138,0.08)]'),
        disabled && 'opacity-40',
      )}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center gap-2">
          <View
            className={cn(
              'w-7 h-7 rounded-lg items-center justify-center',
              active ? (variant === 'gold' ? 'bg-gold' : 'bg-acc') : 'bg-s3',
            )}
          >
            <Icon name={active ? 'check' : 'sparkles'} size={14} color={active ? '#000000' : '#9A9AA8'} />
          </View>
          <Text className="text-tm font-semibold text-t1">{info.name}</Text>
        </View>
        <View className="px-2 py-0.5 rounded bg-s3 border border-ln">
          <Text className="text-mono-s font-mono text-t3">{info.rt60}</Text>
        </View>
      </View>
      <Text className="text-bs text-t3 leading-tight">{info.tagline}</Text>
    </Pressable>
  );
};
