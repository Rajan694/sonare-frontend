import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../ui/Text';
import { Switch } from '../ui/Switch';
import { SegmentedControl } from '../ui/Segmented';
import Icon from '../ui/Icon';
import { cn } from '../../lib/cn';
import { useSpatialStore } from '../../store/spatial';
import { SpatialPresetCard } from './SpatialPresetCard';
import { Soundstage } from './Soundstage';
import { SpatialControls } from './SpatialControls';
import type { SpatialMode } from '../../../../shared/spatial';

interface SpatialAudioSectionProps {
  variant?: 'default' | 'gold';
  className?: string;
}

export const SpatialAudioSection: React.FC<SpatialAudioSectionProps> = ({ variant = 'default', className }) => {
  const enabled = useSpatialStore((s) => s.enabled);
  const mode = useSpatialStore((s) => s.mode);
  const preset = useSpatialStore((s) => s.preset);
  const custom = useSpatialStore((s) => s.custom);
  const bypass = useSpatialStore((s) => s.bypass);

  const { setEnabled, setMode, setPreset, setCustom, setBypass } = useSpatialStore.getState();

  // Compare is a momentary check: leaving the screen ends it, so nobody stays on the original.
  useEffect(() => () => useSpatialStore.getState().setBypass(false), []);

  return (
    <View className={cn('bg-s1 border border-ln rounded-xl p-4 gap-4', className)}>
      {/* Header */}
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-ll font-semibold text-t1">Spatial audio</Text>
            {/* Renderer badge */}
            <View
              className={cn(
                'flex-row items-center gap-1 px-2 py-0.5 rounded-full border',
                enabled
                  ? variant === 'gold'
                    ? 'bg-goldbg border-[rgba(255,194,77,0.3)]'
                    : 'bg-accbg border-[rgba(0,226,138,0.3)]'
                  : 'bg-s3 border-ln',
              )}
            >
              <View
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  enabled ? (variant === 'gold' ? 'bg-gold' : 'bg-acc') : 'bg-t3',
                )}
              />
              <Text
                className={cn(
                  'text-mono-s font-mono',
                  enabled ? (variant === 'gold' ? 'text-gold' : 'text-acc') : 'text-t3',
                )}
              >
                Stereo Stage
              </Text>
            </View>

            {/* Headphones badge */}
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-s3 border border-ln">
              <Icon name="headphones" size={11} color="#9A9AA8" />
              <Text className="text-mono-s text-t3">Headphones</Text>
            </View>
          </View>
          <Text className="text-bs text-t3">Binaural 3D stage and acoustic modeling</Text>
        </View>

        <View className="flex-row items-center gap-2.5">
          {enabled && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compare spatial audio bypass"
              onPress={() => setBypass(!bypass)}
              className={cn(
                'px-2.5 py-1 rounded-full border',
                bypass ? 'bg-[rgba(245,158,11,0.2)] border-amber-500' : 'bg-s3 border-ln',
              )}
            >
              <Text className={cn('text-mono-s font-medium', bypass ? 'text-amber-400' : 'text-t2')}>
                {bypass ? 'Bypassed' : 'Compare'}
              </Text>
            </Pressable>
          )}

          <Switch
            value={enabled}
            onValueChange={setEnabled}
            accessibilityLabel="Spatial audio enabled"
            variant={variant}
          />
        </View>
      </View>

      {/* Mode Segmented Switcher */}
      <View className="gap-2">
        <SegmentedControl
          options={[
            { value: 'presets', label: 'Presets' },
            { value: 'custom', label: 'Custom Stage' },
          ]}
          value={mode}
          onChange={(val) => setMode(val as SpatialMode)}
          variant="default"
        />

        {enabled && bypass && (
          <Text className="text-bs text-amber-400 text-center font-medium">
            Spatial processing bypassed for A/B comparison
          </Text>
        )}
      </View>

      {/* Mode Content */}
      <View className={cn(!enabled && 'opacity-50')}>
        {mode === 'presets' ? (
          <View className="gap-1" accessibilityRole="radiogroup" accessibilityLabel="Spatial preset">
            <SpatialPresetCard
              preset="concert"
              active={preset === 'concert'}
              disabled={!enabled}
              variant={variant}
              onSelect={setPreset}
            />
            <SpatialPresetCard
              preset="cafe"
              active={preset === 'cafe'}
              disabled={!enabled}
              variant={variant}
              onSelect={setPreset}
            />
            <SpatialPresetCard
              preset="hall"
              active={preset === 'hall'}
              disabled={!enabled}
              variant={variant}
              onSelect={setPreset}
            />
          </View>
        ) : (
          <View className="gap-4">
            <Soundstage custom={custom} disabled={!enabled} variant={variant} onChange={setCustom} />
            <SpatialControls custom={custom} disabled={!enabled} variant={variant} onChange={setCustom} />
          </View>
        )}
      </View>
    </View>
  );
};
