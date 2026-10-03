// API shapes live in sonare-frontend/shared (also used by the desktop app); this file adds
// what only the mobile app needs.
export type * from '../../../shared/apiTypes';

export type Mode = 'online' | 'offline';

export interface Folder {
  id: string;
  name: string;
  path: string;
  trackCount: number;
  bytes: number;
  included: boolean;
  lastScanAt: number;
}
