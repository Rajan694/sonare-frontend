// Anonymous, per-device install id — a UUID v4 that lets the backend count distinct devices
// without linking requests to a person. Created once, kept in localStorage forever.

const STORAGE_KEY = 'sonare_install_id';

/** Build a v4 UUID from crypto.getRandomValues when randomUUID isn't available. */
const randomUUIDFallback = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version 4 and variant bits (RFC 4122).
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const makeUUID = (): string => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : randomUUIDFallback());

/** Cached in-memory once read or generated, avoiding repeated localStorage reads. */
let cachedInstallId: string | null = null;

/**
 * Returns a stable anonymous id for this install. Created once with crypto.randomUUID (or a
 * getRandomValues fallback) and kept in localStorage. Cached in memory after the first read.
 * If storage is blocked a per-session id is returned instead — still unique for the session.
 */
export const getInstallId = (): string => {
  if (cachedInstallId) return cachedInstallId;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedInstallId = stored;
      return stored;
    }
    const id = makeUUID();
    localStorage.setItem(STORAGE_KEY, id);
    cachedInstallId = id;
    return id;
  } catch {
    // localStorage blocked (private browsing restriction, sandboxed iframe, etc.)
    cachedInstallId ??= makeUUID();
    return cachedInstallId;
  }
};
