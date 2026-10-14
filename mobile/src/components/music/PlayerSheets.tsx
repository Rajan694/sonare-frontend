import React, { useEffect } from 'react';
import { create } from 'zustand';
import { OptionSheet } from '../ui/OptionSheet';
import { type IconName } from '../ui/Icon';
import { useModeStore } from '../../store/mode';
import { useOutputStore, outputDetail } from '../../store/output';
import { SLEEP_MINUTES, useSleepTimerStore } from '../../store/sleepTimer';
import { LYRICS_SCRIPTS, useDevicePrefsStore } from '../../store/devicePrefs';
import type { OutputDevice } from '../../native/SonarePlayer';

/**
 * Sheets opened from Now Playing and Settings: audio output, sleep timer and lyrics
 * language. One host near the root (RootNavigator) renders them.
 */
type SheetName = 'output' | 'sleep' | 'lyrics';

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

export const PlayerSheetsHost = () => {
  const open = usePlayerSheets((s) => s.open);
  const close = usePlayerSheets((s) => s.close);
  const gold = useModeStore((s) => s.mode) === 'offline';
  return (
    <>
      <OutputSheet visible={open === 'output'} onClose={close} gold={gold} />
      <SleepSheet visible={open === 'sleep'} onClose={close} gold={gold} />
      <LyricsSheet visible={open === 'lyrics'} onClose={close} gold={gold} />
    </>
  );
};
