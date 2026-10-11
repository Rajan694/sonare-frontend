import { createContext, useContext } from 'react';
import type { Mode } from '../types';

export interface ModeStore {
  mode: Mode;
  setMode: (m: Mode) => void;
}

export const ModeContext = createContext<ModeStore>({
  mode: 'online',
  setMode: () => void 0,
});

export const useModeStore = () => {
  return useContext(ModeContext);
};
