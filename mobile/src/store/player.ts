import { create } from 'zustand';
import { Track } from '../data/types';

interface PlayerStore {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  positionMs: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  setCurrentTrack: (track: Track | null) => void;
  setQueue: (queue: Track[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPositionMs: (positionMs: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  positionMs: 0,
  shuffle: false,
  repeat: 'off',
  
  setCurrentTrack: (currentTrack) => set({ currentTrack }),
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPositionMs: (positionMs) => set({ positionMs }),
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  cycleRepeat: () => set((state) => ({
    repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
  })),
  
  playNext: () => {
    const { queue, currentTrack, repeat } = get();
    if (!currentTrack || queue.length === 0) return;
    
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= queue.length) {
      if (repeat === 'all') nextIndex = 0;
      else return;
    }
    
    set({ currentTrack: queue[nextIndex], positionMs: 0 });
  },
  
  playPrevious: () => {
    const { queue, currentTrack, positionMs } = get();
    if (!currentTrack || queue.length === 0) return;
    
    if (positionMs > 3000) {
      set({ positionMs: 0 });
      return;
    }
    
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) return;
    
    set({ currentTrack: queue[prevIndex], positionMs: 0 });
  },
}));
