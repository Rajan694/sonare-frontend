import { app } from '@neutralinojs/lib';
import { CAPS } from '../lib/caps';

/**
 * Which Sonare backend the app talks to. The build picks the default (VITE_API_BASE, see
 * vite.config.ts); in the desktop app, Settings → Connection → Server address can point an
 * installed build somewhere else, e.g. a computer on the LAN. It is read once at startup
 * (every module takes API_BASE as a constant), so changing it restarts the app.
 */

const STORAGE_KEY = 'sonare_server_origin';

export const DEFAULT_API_BASE: string = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3010/api/v1';
export const DEFAULT_API_ORIGIN = new URL(DEFAULT_API_BASE).origin;

/** Plain http is for development: prod builds only connect over HTTPS. */
export const ALLOWS_HTTP = import.meta.env.VITE_SONARE_ENV !== 'prod';

/**
 * `192.168.1.20:3010` → `http://192.168.1.20:3010`; trailing slashes and `/api/v1` are
 * dropped. Null when it isn't a usable http(s) address.
 */
export const normalizeServerOrigin = (input: string): string | null => {
  let text = input.trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`;
  text = text.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
  const match = /^(https?):\/\/([^/\s:]+)(:\d{1,5})?$/i.exec(text);
  return match ? `${match[1].toLowerCase()}://${match[2]}${match[3] ?? ''}` : null;
};

const savedOrigin = (): string | null => {
  if (!CAPS.serverAddress) return null;
  try {
    const origin = normalizeServerOrigin(localStorage.getItem(STORAGE_KEY) ?? '');
    if (!origin || (!ALLOWS_HTTP && !origin.startsWith('https://'))) return null;
    return origin;
  } catch {
    return null;
  }
};

/** The address picked in Settings, or null when the build's default is used. */
export const customServerOrigin = savedOrigin();

export const API_BASE = customServerOrigin ? `${customServerOrigin}/api/v1` : DEFAULT_API_BASE;

/** Saves the address (null: back to the default) and restarts the app to use it. */
export const switchServer = async (origin: string | null): Promise<void> => {
  if (origin && origin !== DEFAULT_API_ORIGIN) localStorage.setItem(STORAGE_KEY, origin);
  else localStorage.removeItem(STORAGE_KEY);
  await app.restartProcess();
};
