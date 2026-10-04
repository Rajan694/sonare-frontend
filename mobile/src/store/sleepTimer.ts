import { create } from 'zustand';
import { SonarePlayer } from '../native/SonarePlayer';
import { usePlayerStore } from './player';

/**
 * The sleep timer (Now Playing's clock, Settings → Sleep timer). The countdown itself runs
 * in the native player, so it still fires with the app in the background; this store only
 * remembers what was asked for, for the screens.
 */
export type SleepTimer =
  { kind: 'off' } | { kind: 'minutes'; minutes: number; endsAt: number } | { kind: 'endOfTrack' };

export const SLEEP_MINUTES = [15, 30, 45, 60, 90] as const;

interface SleepTimerStore {
  timer: SleepTimer;
  /** Minutes from now, 'endOfTrack', or null to turn it off. */
  set: (value: number | 'endOfTrack' | null) => void;
}

export const useSleepTimerStore = create<SleepTimerStore>((set, get) => ({
  timer: { kind: 'off' },
  set: (value) => {
    const wasEndOfTrack = get().timer.kind === 'endOfTrack';
    if (typeof value === 'number') {
      SonarePlayer.setSleepTimer(value * 60_000);
      set({ timer: { kind: 'minutes', minutes: value, endsAt: Date.now() + value * 60_000 } });
    } else {
      SonarePlayer.setSleepTimer(0);
      set({ timer: value === 'endOfTrack' ? { kind: 'endOfTrack' } : { kind: 'off' } });
    }
    const endOfTrack = value === 'endOfTrack';
    if (endOfTrack !== wasEndOfTrack) SonarePlayer.setPauseAtEndOfTrack(endOfTrack);
  },
}));

/** "Off", "Ends in 23 min", "End of track". */
export function sleepTimerLabel(timer: SleepTimer, now = Date.now()): string {
  if (timer.kind === 'off') return 'Off';
  if (timer.kind === 'endOfTrack') return 'At the end of this track';
  const left = Math.max(1, Math.ceil((timer.endsAt - now) / 60_000));
  return `Stops in ${left} min`;
}

/**
 * The current track played to its end: true when "End of track" means stop here (the timer
 * is then done). Without gapless the player holds one item, so it reports ended rather than
 * pausing, and the queue would otherwise move on.
 */
export function sleepAtTrackEnd(): boolean {
  if (useSleepTimerStore.getState().timer.kind !== 'endOfTrack') return false;
  useSleepTimerStore.getState().set(null);
  return true;
}

let wired = false;

/** Called once by the audio engine: the native timer firing, and the track it was waiting for ending. */
export function watchSleepTimer(): void {
  if (wired) return;
  wired = true;
  SonarePlayer.onSleep(() => {
    useSleepTimerStore.setState({ timer: { kind: 'off' } });
    usePlayerStore.getState().setIsPlaying(false);
  });
  // "End of track": the player stops by itself at the end; that pause ends the timer.
  usePlayerStore.subscribe((state, prev) => {
    const { timer } = useSleepTimerStore.getState();
    if (timer.kind !== 'endOfTrack' || state.isPlaying || !prev.isPlaying) return;
    const atEnd = state.durationMs > 0 && state.positionMs >= state.durationMs - 2000;
    if (atEnd) useSleepTimerStore.getState().set(null);
  });
}
