import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { create } from 'zustand';
import { OptionSheet } from '../ui/OptionSheet';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import Icon, { type IconName } from '../ui/Icon';
import { useModeStore } from '../../store/mode';
import { useOutputStore, outputDetail } from '../../store/output';
import { SLEEP_MINUTES, useSleepTimerStore } from '../../store/sleepTimer';
import { LYRICS_SCRIPTS, useDevicePrefsStore } from '../../store/devicePrefs';
import {
  ALLOWS_HTTP,
  DEFAULT_API_ORIGIN,
  customServerOrigin,
  normalizeServerOrigin,
  setServerOrigin,
} from '../../data/config';
import type { OutputDevice } from '../../native/SonarePlayer';
import { isDevApk } from '../../native/SonareBuild';

/**
 * Sheets opened from Now Playing and Settings: audio output, sleep timer, lyrics language
 * and the server address. One host near the root (RootNavigator) renders them.
 */
type SheetName = 'output' | 'sleep' | 'lyrics' | 'server';

export const usePlayerSheets = create<{
  open: SheetName | null;
  show: (name: SheetName) => void;
  close: () => void;
}>((set) => ({
  open: null,
  show: (open) => set({ open }),
  close: () => set({ open: null }),
}));

export const OUTPUT_ICON: Record<OutputDevice['type'], IconName> = {
  speaker: 'speaker',
  wired: 'headphones',
  usb: 'usb',
  bluetooth: 'bluetooth',
};

const AUTOMATIC = -1;

const OutputSheet = ({ visible, onClose, gold }: { visible: boolean; onClose: () => void; gold: boolean }) => {
  const devices = useOutputStore((s) => s.devices);
  const current = useOutputStore((s) => s.current);
  const preferredId = useOutputStore((s) => s.preferredId);
  useEffect(() => {
    if (visible) useOutputStore.getState().refresh();
  }, [visible]);

  return (
    <OptionSheet
      visible={visible}
      onClose={onClose}
      gold={gold}
      title="Audio output"
      description="Music stays on the one you pick while it's connected."
      value={preferredId >= 0 && devices.some((d) => d.id === preferredId) ? preferredId : AUTOMATIC}
      onSelect={(id) => useOutputStore.getState().select(id)}
      options={[
        {
          value: AUTOMATIC,
          label: 'Automatic',
          detail: current ? `Now: ${current.name}` : 'The newest connected device',
          icon: 'output',
        },
        ...devices.map((d) => ({ value: d.id, label: d.name, detail: outputDetail(d), icon: OUTPUT_ICON[d.type] })),
      ]}
    />
  );
};

const SleepSheet = ({ visible, onClose, gold }: { visible: boolean; onClose: () => void; gold: boolean }) => {
  const timer = useSleepTimerStore((s) => s.timer);
  const value = timer.kind === 'off' ? 'off' : timer.kind === 'endOfTrack' ? 'end' : `m${timer.minutes}`;
  return (
    <OptionSheet
      visible={visible}
      onClose={onClose}
      gold={gold}
      title="Sleep timer"
      description="Playback pauses when it runs out."
      value={value}
      onSelect={(v) => {
        const set = useSleepTimerStore.getState().set;
        if (v === 'off') set(null);
        else if (v === 'end') set('endOfTrack');
        else set(Number(v.slice(1)));
      }}
      options={[
        { value: 'off', label: 'Off', icon: 'close' },
        ...SLEEP_MINUTES.map((m) => ({ value: `m${m}`, label: `${m} minutes`, icon: 'clock' as const })),
        { value: 'end', label: 'End of track', icon: 'music' },
      ]}
    />
  );
};

const LyricsSheet = ({ visible, onClose, gold }: { visible: boolean; onClose: () => void; gold: boolean }) => {
  const script = useDevicePrefsStore((s) => s.lyricsScript);
  return (
    <OptionSheet
      visible={visible}
      onClose={onClose}
      gold={gold}
      title="Lyrics language"
      description="When a song's lyrics exist in this script they're shown; otherwise the song's own."
      value={script}
      onSelect={(v) => useDevicePrefsStore.getState().setLyricsScript(v)}
      options={LYRICS_SCRIPTS.map((s) => ({ value: s.value, label: s.label }))}
    />
  );
};

const ServerSheet = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const [text, setText] = useState(customServerOrigin() ?? '');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    setText(customServerOrigin() ?? '');
    setError(null);
  }, [visible]);

  const save = async (value: string = text) => {
    const origin = normalizeServerOrigin(value);
    if (!origin) return setError('Enter an address like 192.168.1.20:3010');
    if (!ALLOWS_HTTP && !origin.startsWith('https://')) return setError('Release builds only connect over HTTPS');
    await setServerOrigin(origin === DEFAULT_API_ORIGIN ? null : origin);
    onClose();
  };

  const reset = async () => {
    await setServerOrigin(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="px-6 pb-6 gap-4">
        <View className="gap-1">
          <Text className="text-h2 font-semibold text-t1">Server address</Text>
          <Text className="text-bs text-t3">
            The Sonare backend this phone talks to. Default: {DEFAULT_API_ORIGIN}
            {__DEV__ ? ' (forwarded over USB by adb reverse). On Wi-Fi, use the computer’s LAN address.' : ''}
            {isDevApk ? '. For a computer on Wi-Fi, use its LAN address.' : ''}
          </Text>
        </View>
        <Field
          icon={<Icon name="server" size={18} color="#7E7E8C" />}
          placeholder={ALLOWS_HTTP ? '192.168.1.20:3010' : 'https://api.example.com'}
          value={text}
          onChangeText={(t) => {
            setText(t);
            setError(null);
          }}
          onSubmitEditing={(e) => save(e.nativeEvent.text)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          accessibilityLabel="Server address"
        />
        {error && <Text className="text-red text-bs">{error}</Text>}
        <View className="flex-row gap-2.5">
          <Button variant="outline" className="flex-1" onPress={reset} disabled={!customServerOrigin()}>
            Use default
          </Button>
          <Button variant="accent" className="flex-1" onPress={() => save()} disabled={!text.trim()}>
            Save
          </Button>
        </View>
      </View>
    </Sheet>
  );
};

export const PlayerSheetsHost = () => {
  const open = usePlayerSheets((s) => s.open);
  const close = usePlayerSheets((s) => s.close);
  const gold = useModeStore((s) => s.mode) === 'offline';
  return (
    <>
      <OutputSheet visible={open === 'output'} onClose={close} gold={gold} />
      <SleepSheet visible={open === 'sleep'} onClose={close} gold={gold} />
      <LyricsSheet visible={open === 'lyrics'} onClose={close} gold={gold} />
      <ServerSheet visible={open === 'server'} onClose={close} />
    </>
  );
};
