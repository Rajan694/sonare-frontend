import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Switch } from '../components/ui/Switch';
import { Chip } from '../components/ui/Chip';
import { Slider } from '../components/ui/Slider';
import { useModeStore } from '../store/mode';
import { CUSTOM_PRESET, EQ_PRESETS, useSettingsStore } from '../data/settings';
import { EQ_LABELS, EQ_MAX_DB, SPEEDS, currentGains, useAudioStore } from '../store/audio';
import { SonarePlayer, type OutputDevice } from '../native/SonarePlayer';
import { cn } from '../lib/cn';
import Icon, { type IconName } from '../components/ui/Icon';
import { usePlayerSheets } from '../components/music/PlayerSheets';

const formatDb = (db: number) => (db > 0 ? `+${db}` : db < 0 ? `−${-db}` : '0');
/** 0.75×, 1.0×, 1.25×, 1.5× */
const formatSpeed = (s: number) => `${Number.isInteger(s) ? s.toFixed(1) : s}×`;

const OUTPUT_ICON: Record<OutputDevice['type'], IconName> = {
  speaker: 'volume',
  wired: 'headphones',
  usb: 'headphones',
  bluetooth: 'headphones',
};

/** The audio output in use, kept current as headphones and Bluetooth come and go. */
function useOutputDevice() {
  const [device, setDevice] = useState<OutputDevice | null>(null);
  useEffect(() => {
    let live = true;
    SonarePlayer.getOutputDevice()
      .then((d) => live && setDevice(d))
      .catch(() => {});
    const sub = SonarePlayer.onOutput(setDevice);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return device;
}

/**
 * The Audio screen. Everything here reaches the native player (AudioEngine sends it): the
 * equalizer, bass boost and virtualizer run in Sonare's own audio processing, speed is
 * time-stretched with the pitch kept, and crossfade / gapless decide how tracks follow.
 */
export function EqualizerScreen() {
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
  // Re-render when the hand-made curve changes, then read the curve in effect.
  useAudioStore((state) => state.customGains);
  const gains = currentGains(preset);
  const { update, setBand } = useAudioStore.getState();

  const output = useOutputDevice();
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
            className="overflow-visible -mx-5 px-5"
            contentContainerStyle={{ gap: 8 }}
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
          <View className="bg-s1 border border-ln rounded-xl p-4.5 pt-4 pb-3.5 gap-3.5">
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
                    origin="center"
                    className="h-28"
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
          <View className="bg-s1 border border-ln rounded-xl py-1.5 overflow-hidden">
            {(
              [
                { label: 'Bass boost', icon: 'volume', value: bassBoost, key: 'bassBoost' },
                { label: 'Virtualizer', icon: 'visualizer', value: virtualizer, key: 'virtualizer' },
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
        <View className="bg-s1 border border-ln rounded-xl py-1.5 overflow-hidden">
          <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="timer" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5 min-w-0">
              <Text className="text-tm font-medium text-t1 truncate">Playback speed</Text>
              <Text className="text-bs text-t3">Pitch preserved</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              {SPEEDS.map((s) => (
                <Chip
                  key={s}
                  size="sm"
                  label={formatSpeed(s)}
                  active={speed === s}
                  variant={variant}
                  onPress={() => update({ speed: s })}
                />
              ))}
            </View>
          </View>

          <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="refresh" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-tm font-medium text-t1">Crossfade</Text>
              <Text className="text-bs text-t3">6 seconds between tracks</Text>
            </View>
            <Switch
              value={crossfade}
              onValueChange={(value) => update({ crossfade: value })}
              accessibilityLabel="Crossfade"
              variant={variant}
            />
          </View>

          <View className="flex-row items-center gap-3.5 px-4 py-3.5">
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
        </View>

        {/* Output device */}
        {output && (
          <Pressable
            onPress={() => usePlayerSheets.getState().show('output')}
            className="bg-s1 border border-ln rounded-xl p-3.5 flex-row items-center gap-3"
            accessibilityRole="button"
            accessibilityLabel={`Audio output: ${output.name}`}
          >
            <View className={cn('w-9 h-9 items-center justify-center rounded-sm', isGold ? 'bg-goldbg' : 'bg-accbg')}>
              <Icon name={OUTPUT_ICON[output.type]} size={18} color={accent} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-tm font-medium text-t1">{output.name}</Text>
              <Text className="text-bs text-t3">Output device · effects apply here</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#7E7E8C" />
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}
