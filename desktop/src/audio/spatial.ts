import { useSyncExternalStore } from 'react';
import { DEFAULT_SPATIAL, sanitizeSpatial, type SpatialCustom, type SpatialSettings } from '../../../shared/spatial';

export type SpatialSupport = 'pending' | 'hrtf' | 'headModel' | 'none';

const STORAGE_KEY = 'sonare_spatial';

const loadState = (): SpatialSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SPATIAL;
    return sanitizeSpatial(JSON.parse(raw));
  } catch {
    return DEFAULT_SPATIAL;
  }
};

let state: SpatialSettings = loadState();
let bypass = false;
let support: SpatialSupport = 'pending';

const listeners = new Set<() => void>();
const bypassListeners = new Set<() => void>();
const supportListeners = new Set<() => void>();

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable
  }
};

const emit = (shouldPersist = false) => {
  if (shouldPersist) {
    persist();
  }
  for (const l of listeners) l();
};

export const getSpatial = (): SpatialSettings => state;

export const subscribeSpatial = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useSpatial = (): SpatialSettings => {
  return useSyncExternalStore(subscribeSpatial, getSpatial);
};

/**
 * Discrete changes (mode, preset, enabled toggle) commit immediately.
 */
export const setSpatial = (patch: Partial<SpatialSettings>): void => {
  state = sanitizeSpatial({ ...state, ...patch });
  emit(true);
};

/**
 * Continuous changes (marker drag, sliders) update memory/audio immediately,
 * but only commit to localStorage when opts.commit is true (pointer-up / commit).
 */
export const setSpatialCustom = (
  patch: Partial<SpatialCustom>,
  opts: { commit?: boolean } = { commit: true },
): void => {
  const mergedCustom = { ...state.custom, ...patch };
  state = sanitizeSpatial({ ...state, custom: mergedCustom });
  emit(Boolean(opts.commit));
};

export const getSpatialBypass = (): boolean => bypass;

export const setSpatialBypass = (nextBypass: boolean): void => {
  if (bypass === nextBypass) return;
  bypass = nextBypass;
  for (const l of bypassListeners) l();
  // Notify audio graph of bypass change
  for (const l of listeners) l();
};

export const subscribeSpatialBypass = (fn: () => void): (() => void) => {
  bypassListeners.add(fn);
  return () => bypassListeners.delete(fn);
};

export const useSpatialBypass = (): boolean => {
  return useSyncExternalStore(subscribeSpatialBypass, getSpatialBypass);
};

export const getSpatialSupport = (): SpatialSupport => support;

export const setSpatialSupport = (nextSupport: SpatialSupport): void => {
  if (support === nextSupport) return;
  support = nextSupport;
  for (const l of supportListeners) l();
};

export const subscribeSpatialSupport = (fn: () => void): (() => void) => {
  supportListeners.add(fn);
  return () => supportListeners.delete(fn);
};

export const useSpatialSupport = (): SpatialSupport => {
  return useSyncExternalStore(subscribeSpatialSupport, getSpatialSupport);
};
