import { storage } from '@neutralinojs/lib';
import { isNeutralino } from '../neutralino';
import { curlFetch } from './curlFetch';
import { createYoutubeiSource, probeRange, type YoutubeiSource } from '../../../shared/youtube/youtubeiSource';
import { createCatalog } from '../../../shared/catalog/catalog';
import { memoizeCatalog } from '../../../shared/catalog/memo';
import type { InnertubeLike } from '../../../shared/youtube/innertubeLike';
import type { AppConfig } from '../../../shared/apiTypes';

// The desktop window fetches YouTube itself (from the user's own IP) through youtubei.js, with
// curl as the transport: the webview can't call youtube.com or googlevideo.com (no CORS). The
// web build and Neutralino's browser mode never do; they use the backend as before.

export type { AppConfig };

export const DEFAULT_APP_CONFIG: AppConfig = { inAppYoutube: true, youtubeClients: ['VISIONOS'], updatedAt: 0 };

const STORAGE_KEY = 'sonare_app_config';

type Catalog = ReturnType<typeof createCatalog>;

let activeConfig: AppConfig = { ...DEFAULT_APP_CONFIG };
let configLoaded = false;
let source: YoutubeiSource | null = null;
let catalog: Catalog | null = null;
let initPromise: Promise<void> | null = null;

const isWindowMode = (): boolean => isNeutralino() && window.NL_MODE === 'window';

/** Whether this app may fetch YouTube itself right now: the desktop window, with the admin switch on. */
export const isInAppYoutubeAllowed = (): boolean => isWindowMode() && activeConfig.inAppYoutube;

/** The last config the backend sent, kept across restarts. Defaults until the first fetch. */
export const loadCachedConfig = async (): Promise<AppConfig> => {
  if (configLoaded) return activeConfig;
  configLoaded = true;
  if (!isWindowMode()) {
    activeConfig = { ...DEFAULT_APP_CONFIG, inAppYoutube: false };
    return activeConfig;
  }
  try {
    const parsed = JSON.parse(await storage.getData(STORAGE_KEY)) as Partial<AppConfig>;
    activeConfig = {
      inAppYoutube: typeof parsed.inAppYoutube === 'boolean' ? parsed.inAppYoutube : DEFAULT_APP_CONFIG.inAppYoutube,
      youtubeClients:
        Array.isArray(parsed.youtubeClients) && parsed.youtubeClients.length > 0
          ? parsed.youtubeClients
          : DEFAULT_APP_CONFIG.youtubeClients,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    // Nothing stored yet (or unreadable): keep the defaults.
  }
  return activeConfig;
};

/** Apply a config from GET /app-config and remember it. A new client order takes effect at once. */
export const setAppConfig = async (config: AppConfig): Promise<void> => {
  const clientsChanged = config.youtubeClients.join(',') !== activeConfig.youtubeClients.join(',');
  activeConfig = { ...config };
  configLoaded = true;
  if (isWindowMode()) {
    try {
      await storage.setData(STORAGE_KEY, JSON.stringify(activeConfig));
    } catch {
      // Storage unavailable: the config still applies for this session.
    }
  }
  if (clientsChanged) resetSession();
};

export const getAppConfig = (): AppConfig => activeConfig;

/**
 * youtubei.js (with its JS parser and protobuf) is about 40% of the app's code and only the
 * desktop window uses it, so it loads on first use instead of with the web app.
 */
let youtubeiPromise: Promise<typeof import('youtubei.js')> | null = null;
const loadYoutubei = () => {
  youtubeiPromise ??= import('youtubei.js').then((mod) => {
    // youtubei.js logs a parser warning for every unknown node; keep only errors.
    mod.Log.setLevel(mod.Log.Level.ERROR);
    return mod;
  });
  return youtubeiPromise;
};

const newInnertube = async (): Promise<InnertubeLike> => {
  const { Innertube } = await loadYoutubei();
  // VISIONOS urls need no deciphering, so the player script isn't downloaded or parsed.
  return (await Innertube.create({ retrieve_player: false, fetch: curlFetch })) as unknown as InnertubeLike;
};

/** HTTP status of a 1 KB ranged GET on a stream url (through curl, like the download itself). */
const probeStream = async (url: string, contentLength: number): Promise<number> => {
  const { start, end } = probeRange(contentLength);
  const res = await curlFetch(url, { headers: { Range: `bytes=${start}-${end}` } });
  return res.status;
};

const buildCatalog = (yt: InnertubeLike) => {
  source = createYoutubeiSource(yt, {
    clients: activeConfig.youtubeClients,
    probe: probeStream,
    newSession: newInnertube,
  });
  catalog = memoizeCatalog(createCatalog(source));
};

/** Drop the session so the next call starts a new one (new client order, or a failed start). */
const resetSession = () => {
  source = null;
  catalog = null;
  initPromise = null;
};

const ensureInitialized = async (): Promise<void> => {
  await loadCachedConfig();
  if (!isInAppYoutubeAllowed()) throw new Error('In-app YouTube is off here');
  if (catalog) return;
  initPromise ??= newInnertube()
    .then(buildCatalog)
    .catch((err: unknown) => {
      // Let the next call try again rather than keeping in-app off for the whole session.
      initPromise = null;
      throw err;
    });
  await initPromise;
};

export const inAppYoutube = {
  isEnabled: isInAppYoutubeAllowed,

  getCatalog: async (): Promise<Catalog> => {
    await ensureInitialized();
    return catalog!;
  },

  getSource: async (): Promise<YoutubeiSource> => {
    await ensureInitialized();
    return source!;
  },

  /** Testing: use a fake youtubei.js instance (null drops it), optionally with a config. */
  _setMockInnertube: (yt: InnertubeLike | null, config?: Partial<AppConfig>) => {
    if (config) {
      activeConfig = { ...DEFAULT_APP_CONFIG, ...config };
      configLoaded = true;
    }
    resetSession();
    if (yt) buildCatalog(yt);
  },

  /** Testing: forget the session and the config. */
  _reset: () => {
    activeConfig = { ...DEFAULT_APP_CONFIG };
    configLoaded = false;
    resetSession();
  },
};
