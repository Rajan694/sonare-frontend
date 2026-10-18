import { version } from '../../neutralino.config.json';

/**
 * The app's version. desktop/neutralino.config.json is the one source for the desktop window
 * and the web build; ../release.sh writes it (and Android's) before a release is tagged, so a
 * local run, sonare.vip and the GitHub release builds all say the same.
 */
export const APP_VERSION: string = version;

/** A local run (Vite's dev server), not a built release. Updates aren't offered to it. */
export const DEV_BUILD = import.meta.env.DEV && import.meta.env.MODE !== 'test';
