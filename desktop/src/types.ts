// API shapes live in sonare-frontend/shared (also used by mobile); this file adds what only
// the desktop/web app needs.
import type { Track as ApiTrack } from '../../shared/apiTypes';
import type { PlayingFrom } from '../../shared/player/queue';

export type { PlayingFrom };

export type * from '../../shared/apiTypes';

export type Mode = 'online' | 'offline';

/** Local files can carry their own waveform and lyrics (read from tags); the API never sends these. */
export interface Track extends ApiTrack {
  peaks?: number[];
  lyrics?: {
    synced: boolean;
    lines: { atMs: number; text: string }[];
    offsetMs: number;
  };
}

export interface Folder {
  id: string;
  name: string;
  path: string;
  trackCount: number;
  bytes: number;
  included: boolean;
  lastScanAt: number;
}

export interface PlayerState {
  mode: Mode;
  queue: Track[];
  /** The current entry: a song can be in the queue twice, so it's a position, never an id. */
  index: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  /** Bumped whenever an entry becomes the current one (the same song again too); the player loads on it. */
  playId: number;
  playingFrom: PlayingFrom | null;
}
