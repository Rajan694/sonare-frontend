import { createContext, useContext } from 'react'
import type { Mode } from '../data/types'

export interface ModeStore {
  mode: Mode
  setMode: (m: Mode) => void
}

export const ModeContext = createContext<ModeStore>({
  mode: 'online',
  setMode: () => void 0,
})

export function useModeStore() {
  return useContext(ModeContext)
}
