import { isNeutralino } from '../neutralino';

// Native features need the Neutralino *window*. `./runFE.sh web` also runs Neutralino
// (`neu run -- --mode=browser`), which injects NL_* globals but blocks filesystem.* —
// that is the web build, so it gets the web capability set.
const native = isNeutralino() && window.NL_MODE === 'window';

export const CAPS = {
  localLibrary: native,
  offlineMode: native,
  /** The Downloads screen: native saves into a folder, web saves through the browser. */
  downloads: true,
  /** Downloads join the local library, so they play from disk and in Offline mode. */
  offlineDownloads: native,
  nativeEq: native,
  /** The /admin page is part of the web build only. */
  admin: !native,
  /** Settings → Server address; the web build talks to the server it is served with. */
  serverAddress: native,
} as const;

/** Which app this is, sent as X-Sonare-Client for the admin analytics. */
export const CLIENT: 'web' | 'linux' = native ? 'linux' : 'web';
