import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '../components/ui/Text';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Switch } from '../components/ui/Switch';
import { Chip } from '../components/ui/Chip';
import { Slider } from '../components/ui/Slider';
import { useModeStore } from '../store/mode';
import { CUSTOM_PRESET, EQ_PRESETS, useSettingsStore } from '../data/settings';
import { EQ_LABELS, EQ_MAX_DB, currentGains, useAudioStore } from '../store/audio';
import { cn } from '../lib/cn';
import Icon from '../components/ui/Icon';
import { SpatialAudioSection } from '../components/spatial/SpatialAudioSection';

const formatDb = (db: number) => (db > 0 ? `+${db}` : db < 0 ? `−${-db}` : '0');
/** 0.5×..2.0× */
const formatSpeed = (s: number) => `${s.toFixed(2).replace(/\.?0+$/, '')}×`;
/** -6..+6 semitones */
const formatPitch = (p: number) => (p > 0 ? `+${p} st` : p < 0 ? `−${-p} st` : '0');
/** 1–12 s, in half seconds */
const formatCrossfade = (ms: number) => `${ms % 1000 ? (ms / 1000).toFixed(1) : ms / 1000} s`;

/**
 * The Audio screen. Everything here reaches the native player (AudioEngine sends it): the
 * equalizer, bass boost and virtualizer run in Sonare's own audio processing, speed is
 * time-stretched with the pitch kept, and crossfade / gapless decide how tracks follow.
 */
export const EqualizerScreen = () => {
  const navigation = useNavigation<any>();
  const isGold = useModeStore((state) => state.mode) === 'offline';
  const variant = isGold ? 'gold' : 'default';
  const accent = isGold ? '#FFC24D' : '#00E28A';

  const preset = useSettingsStore((state) => state.eqPreset);
  const gapless = useSettingsStore((state) => state.gapless);
  const normalization = useSettingsStore((state) => state.normalization);
  const updateSettings = useSettingsStore((state) => state.update);

  const enabled = useAudioStore((state) => state.enabled);
  const bassBoost = useAudioStore((state) => state.bassBoost);
  const virtualizer = useAudioStore((state) => state.virtualizer);
  const speed = useAudioStore((state) => state.speed);
  const crossfade = useAudioStore((state) => state.crossfade);
  const crossfadeMs = useAudioStore((state) => state.crossfadeMs);
  const pitch = useAudioStore((state) => state.pitch);
  const fades = useAudioStore((state) => state.fades);
  // Re-render when the hand-made curve changes, then read the curve in effect.
  useAudioStore((state) => state.customGains);
  const gains = currentGains(preset);
  const { update, setBand } = useAudioStore.getState();

  const presets = preset === CUSTOM_PRESET ? [...EQ_PRESETS, CUSTOM_PRESET] : EQ_PRESETS;

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header
        titleAlign="start"
        title={<Text className="text-tl font-semibold text-t1">Audio</Text>}
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
        right={
          <Switch
            value={enabled}
            onValueChange={(value) => update({ enabled: value })}
            accessibilityLabel="Equalizer enabled"
            variant={variant}
          />
        }
      />

      <ScrollView className="flex-1 px-5 pt-2" contentContainerStyle={{ paddingBottom: 160, gap: 16 }}>
        <View className={cn('gap-4', !enabled && 'opacity-50')}>
          {/* Presets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-5"
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
          >
            {presets.map((p) => (
              <Chip
                key={p}
                label={p}
                active={preset === p}
                variant={variant}
                onPress={() => updateSettings({ eqPreset: p })}
              />
            ))}
          </ScrollView>

          {/* 8-band equalizer */}
          <View className="bg-s1 border border-ln rounded-lg px-[18px] pt-4 pb-3.5 gap-3.5">
            <View className="flex-row justify-between items-center px-1">
              <Text className="text-ll font-semibold text-t2">8-band equalizer</Text>
              <Text className="text-mono-s font-mono text-t3">+12 / −12 dB</Text>
            </View>
            <View className="flex-row justify-between items-end">
              {EQ_LABELS.map((label, i) => (
                <View key={label} className="items-center gap-2">
                  <Text className="text-mono-s font-mono text-t3">{formatDb(gains[i])}</Text>
                  <Slider
                    orientation="vertical"
                    className="h-[150px]"
                    value={gains[i]}
                    min={-EQ_MAX_DB}
                    max={EQ_MAX_DB}
                    step={0.5}
                    onChange={(db) => setBand(i, db)}
                    disabled={!enabled}
                    variant={variant}
                    accessibilityLabel={`${label} Hz band`}
                    accessibilityValueText={`${formatDb(gains[i])} dB`}
                  />
                  <Text className="text-ls font-medium text-t3">{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Effects */}
          <View className="bg-s1 border border-ln rounded-lg py-1.5 overflow-hidden">
            {(
              [
                { label: 'Bass boost', icon: 'disc', value: bassBoost, key: 'bassBoost' },
                { label: 'Virtualizer', icon: 'expand', value: virtualizer, key: 'virtualizer' },
              ] as const
            ).map((effect) => (
              <View key={effect.key} className="flex-row items-center gap-3.5 px-4 py-3 border-b border-ln">
                <View
                  className={cn('w-9 h-9 items-center justify-center rounded-sm', isGold ? 'bg-goldbg' : 'bg-accbg')}
                >
                  <Icon name={effect.icon} size={18} color={accent} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-tm font-medium text-t1">{effect.label}</Text>
                  <Slider
                    value={effect.value}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) => update({ [effect.key]: value })}
                    disabled={!enabled}
                    variant={variant}
                    accessibilityLabel={effect.label}
                    accessibilityValueText={`${effect.value}%`}
                  />
                </View>
                <Text className="text-mono-s font-mono text-t2 w-10 text-right">{effect.value}%</Text>
              </View>
            ))}

            <View className="flex-row items-center gap-3.5 px-4 py-3.5">
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="volume" size={18} color="#7E7E8C" />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-tm font-medium text-t1">Volume normalization</Text>
                <Text className="text-bs text-t3">Even loudness across the library</Text>
              </View>
              <Switch
                value={normalization}
                onValueChange={(value) => updateSettings({ normalization: value })}
                accessibilityLabel="Volume normalization"
                variant={variant}
                disabled={!enabled}
              />
            </View>
          </View>
        </View>

        {/* Playback: these work with the equalizer switched off too. */}
        <View className="bg-s1 border border-ln rounded-lg py-1.5 overflow-hidden">
          {/* Playback speed */}
          <View className="flex-row items-center gap-3.5 px-4 py-3 border-b border-ln">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="speed" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5 min-w-0">
              <View className="flex-row items-center justify-between">
                <Text className="text-tm font-medium text-t1">Playback speed</Text>
                <Text className="text-mono-s font-mono text-t2">{formatSpeed(speed)}</Text>
              </View>
              <Slider
                value={speed}
                min={0.5}
                max={2.0}
                step={0.05}
                onChange={(value) => update({ speed: value })}
                variant={variant}
                accessibilityLabel="Playback speed"
                accessibilityValueText={formatSpeed(speed)}
              />
            </View>
            <IconButton
              size={32}
              variant="bordered"
              icon={<Icon name="reset" size={14} color="#7E7E8C" />}
              onPress={() => update({ speed: 1 })}
              accessibilityLabel="Reset playback speed"
              disabled={speed === 1}
            />
          </View>

          {/* Pitch */}
          <View className="flex-row items-center gap-3.5 px-4 py-3 border-b border-ln">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="tune" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5 min-w-0">
              <View className="flex-row items-center justify-between">
                <Text className="text-tm font-medium text-t1">Pitch</Text>
                <Text className="text-mono-s font-mono text-t2">{formatPitch(pitch)}</Text>
              </View>
              <Slider
                value={pitch}
                min={-6}
                max={6}
                step={0.5}
                origin="center"
                onChange={(value) => update({ pitch: value })}
                variant={variant}
                accessibilityLabel="Pitch"
                accessibilityValueText={formatPitch(pitch)}
              />
            </View>
            <IconButton
              size={32}
              variant="bordered"
              icon={<Icon name="reset" size={14} color="#7E7E8C" />}
              onPress={() => update({ pitch: 0 })}
              accessibilityLabel="Reset pitch"
              disabled={pitch === 0}
            />
          </View>

          {/* Crossfade switch */}
          <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="refresh" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-tm font-medium text-t1">Crossfade</Text>
              <Text className="text-bs text-t3">Fade between tracks</Text>
            </View>
            <Switch
              value={crossfade}
              onValueChange={(value) => update({ crossfade: value })}
              accessibilityLabel="Crossfade"
              variant={variant}
            />
          </View>

          {/* Crossfade length slider (only when crossfade is on) */}
          {crossfade && (
            <View className="flex-row items-center gap-3.5 px-4 py-3 border-b border-ln bg-s2/30">
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="timer" size={18} color="#7E7E8C" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <View className="flex-row items-center justify-between">
                  <Text className="text-tm font-medium text-t1">Crossfade length</Text>
                  <Text className="text-mono-s font-mono text-t2">{formatCrossfade(crossfadeMs)}</Text>
                </View>
                <Slider
                  value={crossfadeMs}
                  min={1000}
                  max={12000}
                  step={500}
                  onChange={(value) => update({ crossfadeMs: value })}
                  variant={variant}
                  accessibilityLabel="Crossfade length"
                  accessibilityValueText={formatCrossfade(crossfadeMs)}
                />
              </View>
            </View>
          )}

          {/* Gapless playback switch */}
          <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="music" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-tm font-medium text-t1">Gapless playback</Text>
              <Text className="text-bs text-t3">
                {crossfade ? 'No crossfade between tracks of one album' : 'Seamless album transitions'}
              </Text>
            </View>
            <Switch
              value={gapless}
              onValueChange={(value) => updateSettings({ gapless: value })}
              accessibilityLabel="Gapless playback"
              variant={variant}
            />
          </View>

          {/* Fade on play & pause */}
          <View className="flex-row items-center gap-3.5 px-4 py-3.5">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="volume" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-tm font-medium text-t1">Fade on play & pause</Text>
              <Text className="text-bs text-t3">Smooth volume ramps on play, pause and skip</Text>
            </View>
            <Switch
              value={fades}
              onValueChange={(value) => update({ fades: value })}
              accessibilityLabel="Fade on play & pause"
              variant={variant}
            />
          </View>
        </View>

        {/* Spatial Audio & Soundstage */}
        <SpatialAudioSection variant={variant} />
      </ScrollView>
    </Screen>
  );
};
