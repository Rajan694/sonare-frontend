import { create } from 'zustand';
import { Mode } from '../data/types';

export interface ModeToastInfo {
  mode: Mode;
  title?: string;
  description?: string;
}

interface ModeStore {
  mode: Mode;
  toastVisible: boolean;
  toastInfo: ModeToastInfo | null;
  userChangedMode: boolean;
  setMode: (mode: Mode, reason?: { title: string; description: string }) => void;
  toggleMode: () => void;
  hideToast: () => void;
}

export const useModeStore = create<ModeStore>((set) => ({
  mode: 'online',
  toastVisible: false,
  toastInfo: null,
  userChangedMode: false,
  setMode: (mode, reason) =>
    set((state) => {
      // If called with no reason, it is considered a manual user change
      const isUserAction = !reason;
      return {
        mode,
        toastVisible: true,
        toastInfo: { mode, title: reason?.title, description: reason?.description },
        userChangedMode: isUserAction ? true : state.userChangedMode,
      };
    }),
  toggleMode: () =>
    set((state) => ({
      mode: state.mode === 'online' ? 'offline' : 'online',
      toastVisible: true,
      toastInfo: null,
      userChangedMode: true,
    })),
  hideToast: () => set({ toastVisible: false }),
}));
