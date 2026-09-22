import { create } from 'zustand';
import { Mode } from '../data/types';

interface ModeStore {
  mode: Mode;
  toastVisible: boolean;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  hideToast: () => void;
}

export const useModeStore = create<ModeStore>((set) => ({
  mode: 'online',
  toastVisible: false,
  setMode: (mode) => set({ mode, toastVisible: true }),
  toggleMode: () => set((state) => ({ mode: state.mode === 'online' ? 'offline' : 'online', toastVisible: true })),
  hideToast: () => set({ toastVisible: false }),
}));
