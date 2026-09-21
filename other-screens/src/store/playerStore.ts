import { createContext, useContext } from 'react'
import type { PlayerState, Track } from '../data/types'
import { MOCK_TRACKS, MOCK_PEAKS } from '../data/mock'

const defaultTrack: Track = { ...MOCK_TRACKS[0], peaks: MOCK_PEAKS }

export const defaultPlayerState: PlayerState = {
  mode: 'online',
  queue: MOCK_TRACKS.map((t, i) => (i === 0 ? { ...t, peaks: MOCK_PEAKS } : t)),
  index: 0,
  positionMs: 84000,
  shuffle: false,
  repeat: 'off',
  output: { id: 'default', name: 'Built-in Speakers', kind: 'speaker', available: true },
}

export interface PlayerStore {
  state: PlayerState
  setState: (s: Partial<PlayerState>) => void
  currentTrack: Track
}

export const PlayerContext = createContext<PlayerStore>({
  state: defaultPlayerState,
  setState: () => void 0,
  currentTrack: defaultTrack,
})

export function usePlayerStore() {
  return useContext(PlayerContext)
}
