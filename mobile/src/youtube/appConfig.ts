import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiOrigin } from '../data/config';
import { httpRequest } from '../data/http';
import type { AppConfig } from '../../../shared/apiTypes';

// What the admin set for the apps (GET /app-config): whether they may fetch YouTube themselves,
// and which youtubei.js clients to try. The last one fetched is kept for the next start.

export type { AppConfig };

export const DEFAULT_APP_CONFIG: AppConfig = {
  inAppYoutube: true,
  youtubeClients: ['VISIONOS'],
  updatedAt: 0,
  // Off until the backend says a provider is answering.
  ai: false,
};

const STORAGE_KEY = 'sonare.appConfig';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let currentConfig: AppConfig = { ...DEFAULT_APP_CONFIG };
let lastFetchTime = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let configListeners: Array<(cfg: AppConfig) => void> = [];

export function getAppConfig(): AppConfig {
  return currentConfig;
}

export function setAppConfig(patch: Partial<AppConfig>): AppConfig {
  currentConfig = {
    ...currentConfig,
    ...patch,
  };
  notifyConfigChanged();
  return currentConfig;
}

export function isInAppYoutubeEnabled(): boolean {
  return currentConfig.inAppYoutube;
}

export function getYoutubeClients(): string[] {
  return currentConfig.youtubeClients.length > 0 ? currentConfig.youtubeClients : DEFAULT_APP_CONFIG.youtubeClients;
}

export function subscribeAppConfig(listener: (cfg: AppConfig) => void): () => void {
  configListeners.push(listener);
  return () => {
    configListeners = configListeners.filter((l) => l !== listener);
  };
}

function notifyConfigChanged(): void {
  for (const listener of configListeners) {
    try {
      listener(currentConfig);
    } catch (e) {
      console.warn('[AppConfig] Listener error:', e);
    }
  }
}

/** Load cached config from AsyncStorage. */
export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        currentConfig = {
          inAppYoutube:
            typeof parsed.inAppYoutube === 'boolean' ? parsed.inAppYoutube : DEFAULT_APP_CONFIG.inAppYoutube,
          youtubeClients: Array.isArray(parsed.youtubeClients)
            ? parsed.youtubeClients
            : DEFAULT_APP_CONFIG.youtubeClients,
          updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
          ai: parsed.ai === true,
        };
        notifyConfigChanged();
      }
    }
  } catch {
    currentConfig = { ...DEFAULT_APP_CONFIG };
  }
  return currentConfig;
}

/** Fetch public app-config from server with 404 tolerance. */
export async function fetchAppConfig(): Promise<AppConfig> {
  const url = `${apiOrigin()}/api/v1/app-config`;
  try {
    const res = await httpRequest(url, { timeoutMs: 10_000 });
    lastFetchTime = Date.now();

    if (res.status === 200 && res.json && typeof res.json === 'object') {
      const fresh: AppConfig = {
        inAppYoutube:
          typeof res.json.inAppYoutube === 'boolean' ? res.json.inAppYoutube : DEFAULT_APP_CONFIG.inAppYoutube,
        youtubeClients:
          Array.isArray(res.json.youtubeClients) && res.json.youtubeClients.length > 0
            ? res.json.youtubeClients
            : DEFAULT_APP_CONFIG.youtubeClients,
        updatedAt: typeof res.json.updatedAt === 'number' ? res.json.updatedAt : 0,
        ai: res.json.ai === true,
      };

      currentConfig = fresh;
      notifyConfigChanged();
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => {});
      return currentConfig;
    }

    // 404 tolerance: older backend without app-config route, keep current
    if (res.status === 404) {
      return currentConfig;
    }
  } catch {
    // Network errors: keep current configuration
  }
  return currentConfig;
}

/** Start polling app-config on 5-minute interval and on AppState active transitions. */
export function startAppConfigPolling(): () => void {
  stopAppConfigPolling();

  loadAppConfig().then(() => {
    fetchAppConfig().catch(() => {});
  });

  pollTimer = setInterval(() => {
    fetchAppConfig().catch(() => {});
  }, POLL_INTERVAL_MS);

  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active' && Date.now() - lastFetchTime >= POLL_INTERVAL_MS) {
      fetchAppConfig().catch(() => {});
    }
  };

  const sub = AppState.addEventListener('change', handleAppStateChange);
  appStateSubscription = sub;

  return stopAppConfigPolling;
}

export function stopAppConfigPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

/** Reset configuration state for unit tests (listeners stay: inApp.ts subscribes once, on import). */
export function resetAppConfigForTesting(custom?: Partial<AppConfig>): void {
  stopAppConfigPolling();
  currentConfig = { ...DEFAULT_APP_CONFIG, ...custom };
  lastFetchTime = 0;
}
