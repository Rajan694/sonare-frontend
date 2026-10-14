import React from 'react';
import { create } from 'zustand';
import { OptionSheet } from '../ui/OptionSheet';
import { useModeStore } from '../../store/mode';
import { SLEEP_MINUTES, useSleepTimerStore } from '../../store/sleepTimer';
import { LYRICS_SCRIPTS, useDevicePrefsStore } from '../../store/devicePrefs';

/**
 * Sheets opened from Now Playing and Settings: sleep timer and lyrics language. One host
 * near the root (RootNavigator) renders them. Sonare plays on the phone's audio output.
 */
type SheetName = 'sleep' | 'lyrics';

export const usePlayerSheets = create<{
  open: SheetName | null;
  show: (name: SheetName) => void;
  close: () => void;
}>((set) => ({
  open: null,
  show: (open) => set({ open }),
  close: () => set({ open: null }),
}));

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
      <SleepSheet visible={open === 'sleep'} onClose={close} gold={gold} />
      <LyricsSheet visible={open === 'lyrics'} onClose={close} gold={gold} />
    </>
  );
};
