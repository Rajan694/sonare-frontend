/**
 * The play queue, as plain functions both apps use (desktop App.tsx, mobile store/player.ts).
 *
 * The current song is tracked by its position: a song can be in a queue more than once (a
 * playlist may hold it twice). Shuffle reorders the queue itself, the playing song first;
 * turning it off keeps that order.
 */

export type Repeat = 'off' | 'all' | 'one';

/** Where the queue came from, for Now Playing's "Playing from …". */
export interface PlayingFrom {
  /** "Album", "Playlist", "Artist", "Search", "Library"… */
  kind: string;
  name: string;
}

export interface QueueState<T> {
  queue: T[];
  index: number;
  shuffle: boolean;
  repeat: Repeat;
}

type Item = { id: string };

/** Fisher–Yates: every order equally likely. */
export const shuffleItems = <T>(items: readonly T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** The entry at `at` first, then every other entry in random order. */
export const shuffledFrom = <T>(items: readonly T[], at: number): T[] => [
  items[at],
  ...shuffleItems(items.filter((_, i) => i !== at)),
];

/** Where `item` is in `queue`: the same object first, else the copy nearest `near`; -1 if absent. */
export const positionOf = <T extends Item>(queue: readonly T[], item: T, near = 0): number => {
  const same = queue.indexOf(item);
  if (same >= 0) return same;
  let best = -1;
  queue.forEach((t, i) => {
    if (t.id === item.id && (best < 0 || Math.abs(i - near) < Math.abs(best - near))) best = i;
  });
  return best;
};

/** A new queue from `list`, starting at `item` (added in front when the list lacks it). */
export const startQueue = <T extends Item, S extends QueueState<T>>(state: S, list: readonly T[], item: T): S => {
  let queue = list.length ? [...list] : [item];
  let at = positionOf(queue, item);
  if (at < 0) {
    queue = [item, ...queue];
    at = 0;
  }
  return state.shuffle ? { ...state, queue: shuffledFrom(queue, at), index: 0 } : { ...state, queue, index: at };
};

/** Switching shuffle on reorders the queue around the playing entry; off keeps the order. */
export const toggleShuffle = <T, S extends QueueState<T>>(state: S): S => {
  if (state.shuffle || !state.queue[state.index]) return { ...state, shuffle: !state.shuffle };
  return { ...state, shuffle: true, queue: shuffledFrom(state.queue, state.index), index: 0 };
};

/** The position one step forward or back (Next / Previous); -1 at either end unless repeat all wraps. */
export const stepIndex = <T>(state: QueueState<T>, delta: 1 | -1): number => {
  const { queue, index, repeat } = state;
  if (!queue.length) return -1;
  const to = index + delta;
  if (to >= 0 && to < queue.length) return to;
  if (repeat !== 'all' || queue.length < 2) return -1;
  return to < 0 ? queue.length - 1 : 0;
};

/** What plays by itself when the current song ends: none on repeat one or at the end. */
export const upcomingIndex = <T>(state: QueueState<T>): number => {
  return state.repeat === 'one' ? -1 : stepIndex(state, 1);
};

/**
 * Lines `items` up right after the playing entry. A song already queued is moved there rather
 * than added twice; the playing song itself is left where it is.
 */
export const insertNext = <T extends Item, S extends QueueState<T>>(state: S, items: readonly T[]): S => {
  if (!state.queue.length) return { ...state, queue: [...items], index: 0 };
  const playing = state.queue[state.index];
  const adding = items.filter((t) => t.id !== playing.id);
  const moved = new Set(adding.map((t) => t.id));
  const kept = state.queue.filter((t, i) => i === state.index || !moved.has(t.id));
  const index = state.queue.slice(0, state.index).filter((t) => !moved.has(t.id)).length;
  return { ...state, queue: [...kept.slice(0, index + 1), ...adding, ...kept.slice(index + 1)], index };
};

/** Adds `items` at the end, skipping songs the queue already has. */
export const append = <T extends Item, S extends QueueState<T>>(state: S, items: readonly T[]): S => {
  const known = new Set(state.queue.map((t) => t.id));
  const adding = items.filter((t) => !known.has(t.id) && known.add(t.id));
  return { ...state, queue: [...state.queue, ...adding] };
};

/** Removing the playing entry hands over to whatever now sits at its position. */
export const removeAt = <T, S extends QueueState<T>>(state: S, at: number): S => {
  if (at < 0 || at >= state.queue.length) return state;
  const queue = state.queue.filter((_, i) => i !== at);
  const index = at < state.index ? state.index - 1 : Math.min(state.index, Math.max(0, queue.length - 1));
  return { ...state, queue, index };
};

/** Moves one entry; the playing entry stays current wherever it ends up. */
export const move = <T, S extends QueueState<T>>(state: S, from: number, to: number): S => {
  const n = state.queue.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return state;
  const queue = [...state.queue];
  const [moved] = queue.splice(from, 1);
  queue.splice(to, 0, moved);
  let index = state.index;
  if (from === state.index) index = to;
  else if (from < state.index && to >= state.index) index -= 1;
  else if (from > state.index && to <= state.index) index += 1;
  return { ...state, queue, index };
};

export const clearUpcoming = <T, S extends QueueState<T>>(state: S): S => {
  return { ...state, queue: state.queue.slice(0, state.index + 1) };
};
