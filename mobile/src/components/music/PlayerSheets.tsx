import React from 'react';
import { create } from 'zustand';
import { OptionSheet } from '../ui/OptionSheet';
import { useModeStore } from '../../store/mode';
import { LYRICS_SCRIPTS, useDevicePrefsStore } from '../../store/devicePrefs';

/**
 * Sheets opened from the player and Settings: lyrics language. One host near the root
 * (RootNavigator) renders them. Sonare plays on the phone's audio output.
 */
type SheetName = 'lyrics';

export const usePlayerSheets = create<{
  open: SheetName | null;
  show: (name: SheetName) => void;
  close: () => void;
}>((set) => ({
  open: null,
  show: (open) => set({ open }),
  close: () => set({ open: null }),
}));

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
  return <LyricsSheet visible={open === 'lyrics'} onClose={close} gold={gold} />;
};
