import type { PlayingFrom, Repeat } from './queue';

/**
 * The queue as both apps save it, on the device and in the account (PUT /me/player-state), so
 * a queue started on one device can carry on on another.
 */
export interface SavedQueue<T> {
  queue: T[];
  index: number;
  positionMs: number;
  shuffle: boolean;
  repeat: Repeat;
  playingFrom: PlayingFrom | null;
  /** When it was saved (epoch ms): the newer of the device's and the account's copy wins. */
  savedAt: number;
}

/** Enough for any real queue; keeps the saved blob small. */
export const MAX_SAVED_QUEUE = 300;

type Item = { id: string; title: string; source?: string };

export const isSavedTrack = (t: unknown): t is Item =>
  !!t && typeof t === 'object' && typeof (t as Item).id === 'string' && typeof (t as Item).title === 'string';

/** A very long queue keeps a window around the current entry. */
export const trimQueue = <T>(queue: T[], index: number): { queue: T[]; index: number } => {
  const start = Math.max(0, Math.min(index - 50, queue.length - MAX_SAVED_QUEUE));
  return { queue: queue.slice(start, start + MAX_SAVED_QUEUE), index: index - start };
};

const repeatOf = (r: unknown): Repeat => (r === 'all' || r === 'one' ? r : 'off');

const playingFromOf = (p: unknown): PlayingFrom | null => {
  const from = p as PlayingFrom | null | undefined;
  return from && typeof from.kind === 'string' && typeof from.name === 'string' ? from : null;
};

/** A saved queue read back from storage, or null when it's damaged or empty. */
export const readSavedQueue = <T extends Item>(raw: unknown): SavedQueue<T> | null => {
  const s = raw as Partial<SavedQueue<unknown>> | null;
  if (!s || typeof s !== 'object' || !Array.isArray(s.queue)) return null;
  const queue = s.queue.filter(isSavedTrack) as T[];
  const index = typeof s.index === 'number' && queue[s.index] ? s.index : 0;
  if (!queue.length) return null;
  return {
    queue,
    index,
    positionMs: typeof s.positionMs === 'number' && s.positionMs > 0 ? s.positionMs : 0,
    shuffle: s.shuffle === true,
    repeat: repeatOf(s.repeat),
    playingFrom: playingFromOf(s.playingFrom),
    savedAt: typeof s.savedAt === 'number' ? s.savedAt : 0,
  };
};

/** The PUT /me/player-state body: the tracks themselves go along, so another install can rebuild the queue. */
export const toAccountState = <T extends Item>(s: SavedQueue<T>) => {
  const current = s.queue[s.index];
  return {
    trackRef: current?.source === 'server' ? { kind: 'server' as const, id: current.id } : null,
    positionMs: Math.round(s.positionMs),
    queue: [{ v: 1, playingFrom: s.playingFrom }, ...s.queue] as unknown[],
    index: s.index,
    shuffle: s.shuffle,
    repeat: s.repeat,
  };
};

/** GET /me/player-state back into a saved queue (older saves have no header entry). */
export const fromAccountState = <T extends Item>(state: {
  queue?: unknown[];
  index?: number;
  positionMs?: number;
  shuffle?: boolean;
  repeat?: string;
  updatedAt?: number;
}): SavedQueue<T> | null => {
  const [head, ...rest] = Array.isArray(state.queue) ? state.queue : [];
  const headIsTrack = isSavedTrack(head);
  return readSavedQueue<T>({
    queue: headIsTrack ? [head, ...rest] : rest,
    index: state.index,
    positionMs: state.positionMs,
    shuffle: state.shuffle,
    repeat: state.repeat,
    playingFrom: headIsTrack ? null : (head as { playingFrom?: unknown } | undefined)?.playingFrom,
    savedAt: state.updatedAt ?? 0,
  });
};
