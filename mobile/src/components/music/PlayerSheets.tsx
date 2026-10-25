import React from 'react';
import { View, Pressable } from 'react-native';
import { create } from 'zustand';
import { Text } from '../ui/Text';
import { Sheet } from '../ui/Sheet';
import Icon from '../ui/Icon';
import { OptionSheet } from '../ui/OptionSheet';
import { useModeStore } from '../../store/mode';
import { HEADSET_ACTIONS, headsetActionLabel, LYRICS_SCRIPTS, useDevicePrefsStore } from '../../store/devicePrefs';
import type { HeadsetActions } from '../../native/SonarePlayer';

/**
 * Sheets opened from the player and Settings: lyrics language and headset button configuration.
 * One host near the root (RootNavigator) renders them. Sonare plays on the phone's audio output.
 */
type SheetName = 'lyrics' | 'headset';

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

const HEADSET_PRESSES: { slot: keyof HeadsetActions; label: string }[] = [
  { slot: 'single', label: 'Press once' },
  { slot: 'double', label: 'Press twice' },
  { slot: 'triple', label: 'Press three times' },
];

/** The three press counts; picking one opens the actions for it, and picking an action comes back here. */
const HeadsetSheet = ({ visible, onClose, gold }: { visible: boolean; onClose: () => void; gold: boolean }) => {
  const actions = useDevicePrefsStore((s) => s.headsetActions);
  const [slot, setSlot] = React.useState<keyof HeadsetActions | null>(null);
  const picking = HEADSET_PRESSES.find((p) => p.slot === slot);

  React.useEffect(() => {
    if (!visible) setSlot(null);
  }, [visible]);

  return (
    <>
      <Sheet visible={visible && !picking} onClose={onClose}>
        <View className="px-5 pb-4 gap-3">
          <View className="gap-1 px-1">
            <Text className="text-h2 font-semibold text-t1">Headset buttons</Text>
            <Text className="text-bs text-t3">What quick presses of your headset's button do.</Text>
          </View>
          {HEADSET_PRESSES.map(({ slot: s, label }) => (
            <Pressable
              key={s}
              onPress={() => setSlot(s)}
              className="flex-row items-center justify-between px-3 py-3 rounded-lg active:bg-s2"
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${headsetActionLabel(actions[s])}`}
            >
              <View className="gap-0.5">
                <Text className="text-bm text-t1">{label}</Text>
                <Text className="text-bs text-t3">{headsetActionLabel(actions[s])}</Text>
              </View>
              <Icon name="chevron-right" size={18} color="#9A9AA8" />
            </Pressable>
          ))}
        </View>
      </Sheet>
      <OptionSheet
        visible={visible && !!picking}
        onClose={() => setSlot(null)}
        gold={gold}
        title={picking?.label ?? ''}
        value={picking ? actions[picking.slot] : null}
        onSelect={(action) => picking && useDevicePrefsStore.getState().setHeadsetAction(picking.slot, action)}
        options={HEADSET_ACTIONS}
      />
    </>
  );
};

export const PlayerSheetsHost = () => {
  const open = usePlayerSheets((s) => s.open);
  const close = usePlayerSheets((s) => s.close);
  const gold = useModeStore((s) => s.mode) === 'offline';
  return (
    <>
      <LyricsSheet visible={open === 'lyrics'} onClose={close} gold={gold} />
      <HeadsetSheet visible={open === 'headset'} onClose={close} gold={gold} />
    </>
  );
};
