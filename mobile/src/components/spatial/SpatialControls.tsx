import React from 'react';
import { View, Pressable } from 'react-native';
import { Slider } from '../ui/Slider';
import { Text } from '../ui/Text';
import Icon from '../ui/Icon';
import { cn } from '../../lib/cn';
import { DEFAULT_SPATIAL, toPolar, withDistance, type SpatialCustom } from '../../../../shared/spatial';

interface SpatialControlsProps {
  custom: SpatialCustom;
  disabled?: boolean;
  variant?: 'default' | 'gold';
  onChange: (patch: Partial<SpatialCustom>, opts?: { commit?: boolean }) => void;
}

export const SpatialControls: React.FC<SpatialControlsProps> = ({
  custom,
  disabled = false,
  variant = 'default',
  onChange,
}) => {
  const polar = toPolar(custom.x, custom.y);
  const distancePct = Math.round(polar.distance * 100);

  const handleDistanceChange = (pct: number, commit = false) => {
    const d = pct / 100;
    const updated = withDistance(custom, d);
    onChange({ x: updated.x, y: updated.y }, { commit });
  };

  const setCardinal = (x: number, y: number) => {
    onChange({ x, y }, { commit: true });
  };

  // Back to the starting position; the sliders stay as they are.
  const handleReset = () => {
    onChange({ x: DEFAULT_SPATIAL.custom.x, y: DEFAULT_SPATIAL.custom.y }, { commit: true });
  };

  return (
    <View className="gap-4 w-full">
      {/* Quick placement buttons */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-ls font-medium text-t2">Quick placement</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset position"
            disabled={disabled}
            onPress={handleReset}
            className="flex-row items-center gap-1 opacity-80"
          >
            <Icon name="reset" size={12} color="#9A9AA8" />
            <Text className="text-bs font-medium text-t3">Reset position</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 flex-wrap">
          {[
            { label: 'Front', x: 0, y: 0.5 },
            { label: 'Left', x: -0.5, y: 0 },
            { label: 'Right', x: 0.5, y: 0 },
            { label: 'Behind', x: 0, y: -0.6 },
            { label: 'Near Field', x: 0, y: 0.2 },
          ].map((pos) => (
            <Pressable
              key={pos.label}
              accessibilityRole="button"
              accessibilityLabel={`Place soundstage ${pos.label}`}
              disabled={disabled}
              onPress={() => setCardinal(pos.x, pos.y)}
              className={cn('px-2.5 py-1 rounded-full bg-s3 border border-ln', disabled && 'opacity-40')}
            >
              <Text className="text-bs text-t2 font-medium">{pos.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Sliders */}
      <View className="gap-3.5 bg-s2 border border-ln rounded-xl p-3.5">
        {/* Distance */}
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-ls font-medium text-t2">Distance</Text>
            <Text className="text-mono-s font-mono text-t1">{distancePct}%</Text>
          </View>
          <Slider
            value={distancePct}
            min={10}
            max={100}
            step={1}
            variant={variant}
            disabled={disabled}
            accessibilityLabel="Soundstage distance"
            accessibilityValueText={`${distancePct}%`}
            onChange={(val) => handleDistanceChange(val, false)}
            onCommit={(val) => handleDistanceChange(val, true)}
          />
        </View>

        {/* Width */}
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-ls font-medium text-t2">Soundstage width</Text>
            <Text className="text-mono-s font-mono text-t1">{Math.round(custom.width)}%</Text>
          </View>
          <Slider
            value={custom.width}
            min={0}
            max={100}
            step={1}
            variant={variant}
            disabled={disabled}
            accessibilityLabel="Soundstage width"
            accessibilityValueText={`${Math.round(custom.width)}%`}
            onChange={(width) => onChange({ width }, { commit: false })}
            onCommit={(width) => onChange({ width }, { commit: true })}
          />
        </View>

        {/* Intensity */}
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-ls font-medium text-t2">Intensity</Text>
            <Text className="text-mono-s font-mono text-t1">{Math.round(custom.intensity)}%</Text>
          </View>
          <Slider
            value={custom.intensity}
            min={0}
            max={100}
            step={1}
            variant={variant}
            disabled={disabled}
            accessibilityLabel="Spatial intensity"
            accessibilityValueText={`${Math.round(custom.intensity)}%`}
            onChange={(intensity) => onChange({ intensity }, { commit: false })}
            onCommit={(intensity) => onChange({ intensity }, { commit: true })}
          />
        </View>

        {/* Ambience */}
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-ls font-medium text-t2">Ambience</Text>
            <Text className="text-mono-s font-mono text-t1">{Math.round(custom.ambience)}%</Text>
          </View>
          <Slider
            value={custom.ambience}
            min={0}
            max={100}
            step={1}
            variant={variant}
            disabled={disabled}
            accessibilityLabel="Room ambience"
            accessibilityValueText={`${Math.round(custom.ambience)}%`}
            onChange={(ambience) => onChange({ ambience }, { commit: false })}
            onCommit={(ambience) => onChange({ ambience }, { commit: true })}
          />
        </View>
      </View>
    </View>
  );
};
