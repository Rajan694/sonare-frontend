import { createContext, useContext } from 'react'
import type { PlayerState, Track } from '../data/types'

export const defaultPlayerState: PlayerState = {
  mode: 'online',
  queue: [],
  index: 0,
  positionMs: 0,
  shuffle: false,
  repeat: 'off',
  output: { id: 'default', name: 'Built-in Speakers', kind: 'speaker', available: true },
}

export interface PlayerStore {
  state: PlayerState
  setState: (s: Partial<PlayerState>) => void
  currentTrack: Track | null
  playTrack: (track: Track, newQueue?: Track[]) => void
  /** Live audio state, driven by the HTMLAudioElement in data/player.ts. */
  isPlaying: boolean
  isLoading: boolean
  durationMs: number
  playbackError: string | null
  togglePlay: () => void
  seek: (positionMs: number) => void
  /** Seek by fraction of the track (0..1) — what the waveform and progress bar hand back. */
  seekRatio: (ratio: number) => void
  next: () => void
  /** The previous track — or back to the start of this one once it has played for 3s. */
  previous: () => void
  /** Always the previous track, however far into this one we are. */
  skipToPrevious: () => void
  /** 0..1 */
  volume: number
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  /** Insert right after the current track. */
  playNext: (track: Track) => void
  /** Append to the end of the queue. */
  enqueue: (tracks: Track[]) => void
  removeFromQueue: (index: number) => void
  moveInQueue: (from: number, to: number) => void
  /** Drop everything after the current track. */
  clearUpcoming: () => void
}

export const PlayerContext = createContext<PlayerStore>({
  state: defaultPlayerState,
  setState: () => void 0,
  currentTrack: null,
  playTrack: () => void 0,
  isPlaying: false,
  isLoading: false,
  durationMs: 0,
  playbackError: null,
  togglePlay: () => void 0,
  seek: () => void 0,
  seekRatio: () => void 0,
  next: () => void 0,
  previous: () => void 0,
  skipToPrevious: () => void 0,
  volume: 1,
  setVolume: () => void 0,
  toggleMute: () => void 0,
  toggleShuffle: () => void 0,
  cycleRepeat: () => void 0,
  playNext: () => void 0,
  enqueue: () => void 0,
  removeFromQueue: () => void 0,
  moveInQueue: () => void 0,
  clearUpcoming: () => void 0,
})

export function usePlayerStore() {
  return useContext(PlayerContext)
}
