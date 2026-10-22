import { API_BASE } from '../api/auth';

// The admin page's own client. Admin sessions are separate from app sign-in: a different
// token, kept in sessionStorage so closing the tab signs out.

const TOKEN_KEY = 'sonare_admin_token';

export class AdminApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const readToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

let token: string | null = readToken();
const sessionListeners = new Set<(signedIn: boolean) => void>();

export const isSignedIn = (): boolean => {
  return !!token;
};

const setToken = (next: string | null) => {
  token = next;
  try {
    if (next) sessionStorage.setItem(TOKEN_KEY, next);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode: the session lasts until the page reloads.
  }
  sessionListeners.forEach((fn) => fn(!!next));
};

export const onSessionChange = (fn: (signedIn: boolean) => void): (() => void) => {
  sessionListeners.add(fn);
  return () => {
    sessionListeners.delete(fn);
  };
};

export const signOut = () => {
  setToken(null);
};

/** The viewer's time zone, so daily and hourly buckets line up with their clock. */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const call = async <T>(
  path: string,
  {
    method = 'GET',
    body,
    params,
  }: { method?: string; body?: unknown; params?: Record<string, string | number | undefined> } = {},
): Promise<T> => {
  const url = new URL(`${API_BASE}/admin${path}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new AdminApiError("Can't reach the Sonare server.", 0);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    // Expired, or the password changed in another session: back to the sign-in form.
    if (res.status === 401 && path !== '/login') setToken(null);
    throw new AdminApiError(data?.error?.message ?? `Request failed (${res.status})`, res.status, data?.error?.code);
  }
  return data as T;
};

// ---- Types (mirror sonare-backend/src/routes/admin.routes.ts) ----

export interface AdminAccount {
  email: string;
  lastLoginAt: string | null;
  /** null until the password is changed from this page. */
  passwordChangedAt: string | null;
}

export interface Health {
  piped: { up: boolean; url: string };
  database: boolean;
  redis: boolean;
  uptimeSec: number;
  node: string;
  memoryMb: number;
}

export interface Overview {
  days: number;
  totals: {
    users: number;
    newUsers: number;
    activeUsers: number;
    activeGuests: number;
    requests: number;
    plays: number;
    listeningHours: number;
    playlists: number;
    favouriteTracks: number;
    errorGroups: number;
  };
  active: {
    dau: { users: number; guests: number };
    wau: { users: number; guests: number };
    mau: { users: number; guests: number };
  };
  daily: {
    day: string;
    users?: number;
    activeUsers: number;
    guests: number;
    signups: number;
    plays: number;
    requests: number;
    serverErrors: number;
  }[];
  clients: { client: string; users: number; guests: number }[];
  signupsByClient: { client: 'web' | 'linux' | 'windows' | 'mobile' | 'unknown'; count: number }[];
  health: Health;
}

export interface RouteStats {
  method: string;
  route: string;
  count: number;
  serverErrors: number;
  clientErrors: number;
  avg: number;
  p50: number;
  p95: number;
  max: number;
}

export interface RequestMetrics {
  hours: number;
  unit: 'hour' | 'day';
  summary: { total: number; serverErrors: number; clientErrors: number; p50: number; p95: number };
  series: { at: string; requests: number; serverErrors: number; p95: number }[];
  routes: RouteStats[];
  statusClasses: { class: '2xx' | '3xx' | '4xx' | '5xx' | string; count: number }[];
}

export type ErrorSource = 'backend' | 'web' | 'linux' | 'windows' | 'mobile';

export interface ErrorLog {
  id: number;
  source: ErrorSource;
  level: string;
  code: string | null;
  message: string;
  stack: string | null;
  method: string | null;
  route: string | null;
  status: number | null;
  userId: string | null;
  userAgent: string | null;
  context: Record<string, unknown> | null;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface ErrorPage {
  items: ErrorLog[];
  total: number;
  bySource: { source: ErrorSource; groups: number; events: number }[];
}

export interface ErrorFilter {
  source?: ErrorSource;
  q?: string;
}

export interface AdminSettings {
  pipedApiUrl: {
    saved: string | null;
    effective: string;
    envDefault: string;
  };
  youtubeClients: {
    saved: string[] | null;
    effective: string[];
    default: string[];
    allowed: string[];
  };
  inAppYoutube: {
    saved: boolean | null;
    effective: boolean;
  };
}

export interface AdminSettingsUpdate {
  pipedApiUrl?: string | null;
  youtubeClients?: string[] | null;
  inAppYoutube?: boolean | null;
}

export interface PipedHealthTestResult {
  ok: boolean;
  ms: number;
  error?: string;
}

/** An AI provider as the admin page sees it: never its key, only the last four characters. */
export interface AdminAiProvider {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  keyHint: string;
  enabled: boolean;
  position: number;
  status: 'ok' | 'down' | 'unknown';
  lastCheckedAt: number | null;
  lastOkAt: number | null;
  lastError: string | null;
  retryAt: number | null;
  latencyMs: number | null;
}

export interface AdminAiProviders {
  providers: AdminAiProvider[];
  /** Some enabled provider is answering: the apps show their AI features. */
  available: boolean;
}

export interface AiProviderInput {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AiCheckResult {
  ok: boolean;
  ms: number;
  error?: string;
  provider: AdminAiProvider;
}

export type AiFeature = 'you-may-like' | 'search' | 'playlist' | 'titles' | 'health';

export interface AiUsageTotals {
  calls: number;
  failures: number;
  promptTokens: number;
  completionTokens: number;
}

/** GET /admin/analytics/ai: by UTC day. */
export interface AiUsage {
  days: number;
  totals: AiUsageTotals;
  byProvider: (AiUsageTotals & { providerId: string; name: string })[];
  byFeature: (AiUsageTotals & { feature: AiFeature })[];
  series: (AiUsageTotals & { day: string })[];
}

// ---- Calls ----

export const adminApi = {
  async login(email: string, password: string): Promise<AdminAccount> {
    const r = await call<{ token: string; admin: AdminAccount }>('/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(r.token);
    return r.admin;
  },

  me() {
    return call<AdminAccount>('/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<AdminAccount> {
    const r = await call<{ token: string; admin: AdminAccount }>('/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
    setToken(r.token);
    return r.admin;
  },

  overview(days: number) {
    return call<Overview>('/analytics/overview', { params: { days, tz } });
  },

  requests(hours: number) {
    return call<RequestMetrics>('/analytics/requests', { params: { hours, tz } });
  },

  errors(filter: ErrorFilter, offset = 0, limit = 50) {
    return call<ErrorPage>('/errors', { params: { ...filter, offset, limit } });
  },

  deleteError(id: number) {
    return call<void>(`/errors/${id}`, { method: 'DELETE' });
  },

  clearErrors(filter: ErrorFilter) {
    return call<{ deleted: number }>('/errors', { method: 'DELETE', params: { ...filter } });
  },

  getSettings() {
    return call<AdminSettings>('/settings');
  },

  saveSettings(update: AdminSettingsUpdate) {
    return call<AdminSettings>('/settings', { method: 'PUT', body: update });
  },

  testPipedUrl(url: string) {
    return call<PipedHealthTestResult>('/settings/piped-test', { method: 'POST', body: { url } });
  },

  aiProviders() {
    return call<AdminAiProviders>('/ai/providers');
  },

  addAiProvider(input: AiProviderInput) {
    return call<AdminAiProvider>('/ai/providers', { method: 'POST', body: input });
  },

  /** Leave `apiKey` out to keep the current key. */
  updateAiProvider(id: string, update: Partial<AiProviderInput> & { enabled?: boolean }) {
    return call<AdminAiProvider>(`/ai/providers/${encodeURIComponent(id)}`, { method: 'PATCH', body: update });
  },

  deleteAiProvider(id: string) {
    return call<{ ok: boolean }>(`/ai/providers/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  checkAiProvider(id: string) {
    return call<AiCheckResult>(`/ai/providers/${encodeURIComponent(id)}/check`, { method: 'POST' });
  },

  /** Every provider id, in the new failover order. */
  orderAiProviders(ids: string[]) {
    return call<AdminAiProviders>('/ai/providers/order', { method: 'PUT', body: { ids } });
  },

  aiUsage(days: number) {
    return call<AiUsage>('/analytics/ai', { params: { days } });
  },
};
