// API shapes live in sonare-frontend/shared (also used by mobile); this file adds what only
// the desktop/web app needs.
import type { Track as ApiTrack } from '../../shared/apiTypes';

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
  index: number;
  positionMs: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  output: {
    id: string;
    name: string;
    kind: 'wired' | 'bluetooth' | 'cast' | 'speaker';
    available: boolean;
  };
}
