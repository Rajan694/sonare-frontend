import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { SonarePlayer, type OutputDevice } from '../native/SonarePlayer';

/**
 * Where music plays (design M09 output card, Settings → Audio output). Android picks the
 * newest connection by itself; choosing one here keeps music on it while it stays
 * connected. The choice is saved on the phone.
 */

const STORAGE_KEY = 'sonare.outputDevice';

interface OutputStore {
  /** The output in use now. */
  current: OutputDevice | null;
  /** Everything connected, from the last refresh. */
  devices: OutputDevice[];
  /** The one picked in the app; -1 leaves it to Android. */
  preferredId: number;
  refresh: () => Promise<void>;
  select: (id: number) => void;
}

export const useOutputStore = create<OutputStore>((set) => ({
  current: null,
  devices: [],
  preferredId: -1,
  refresh: async () => {
    try {
      const [devices, current] = await Promise.all([SonarePlayer.getOutputDevices(), SonarePlayer.getOutputDevice()]);
      set({ devices, current });
    } catch {
      // Keeps the last known list.
    }
  },
  select: (id) => {
    set({ preferredId: id });
    SonarePlayer.setOutputDevice(id);
    AsyncStorage.setItem(STORAGE_KEY, String(id)).catch(() => {});
  },
}));

const DETAIL: Record<OutputDevice['type'], string> = {
  speaker: 'Playing on this phone',
  wired: 'Wired · playing locally',
  usb: 'USB audio',
  bluetooth: 'Bluetooth',
};

export function outputDetail(device: OutputDevice | null): string {
  return device ? DETAIL[device.type] : 'Playing on this phone';
}

let wired = false;

/** Called once by the audio engine: restores the saved pick and follows device changes. */
export function watchOutput(): void {
  if (wired) return;
  wired = true;
  SonarePlayer.onOutput((current) => {
    useOutputStore.setState({ current });
    useOutputStore.getState().refresh();
  });
  AsyncStorage.getItem(STORAGE_KEY)
    .then((saved) => {
      const id = saved === null ? -1 : Number(saved);
      if (Number.isInteger(id) && id >= 0) {
        useOutputStore.setState({ preferredId: id });
        SonarePlayer.setOutputDevice(id);
      }
    })
    .catch(() => {})
    .finally(() => useOutputStore.getState().refresh());
}
