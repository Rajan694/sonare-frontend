import { useSyncExternalStore } from 'react';
import type { Track } from '../types';

/**
 * Themed replacements for window.prompt / window.confirm. The native ones block the page
 * (WebKitGTK stops feeding the audio graph while they are open, so playback stalls) and
 * don't match the app. One dialog at a time; `<DialogHost />` renders it.
 */

export interface PromptOptions {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  maxLength?: number;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export type OpenDialog =
  | { id: number; kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }
  | { id: number; kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { id: number; kind: 'addToPlaylist'; tracks: Track[]; resolve: () => void };

let current: OpenDialog | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function set(next: OpenDialog | null) {
  current = next;
  for (const l of listeners) l();
}

/** Close whatever is open as cancelled, so its caller doesn't wait forever. */
function cancelCurrent() {
  if (!current) return;
  if (current.kind === 'prompt') current.resolve(null);
  else if (current.kind === 'confirm') current.resolve(false);
  else current.resolve();
}

/** Closes the open dialog, if any, as cancelled. */
export function cancelOpenDialog(): void {
  cancelCurrent();
}

/** Resolves with the trimmed text, or null when cancelled or left empty. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  cancelCurrent();
  return new Promise((resolve) => {
    set({
      id: nextId++,
      kind: 'prompt',
      options,
      resolve: (value) => {
        set(null);
        const text = value?.trim();
        resolve(text ? text : null);
      },
    });
  });
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  cancelCurrent();
  return new Promise((resolve) => {
    set({
      id: nextId++,
      kind: 'confirm',
      options,
      resolve: (ok) => {
        set(null);
        resolve(ok);
      },
    });
  });
}

/** The playlist picker on its own (bottom player, Now Playing, after a guest signs in). */
export function addToPlaylistDialog(tracks: Track[]): Promise<void> {
  cancelCurrent();
  return new Promise((resolve) => {
    set({
      id: nextId++,
      kind: 'addToPlaylist',
      tracks,
      resolve: () => {
        set(null);
        resolve();
      },
    });
  });
}

export function useOpenDialog(): OpenDialog | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );
}
