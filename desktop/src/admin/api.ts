import { API_BASE } from '../api/auth';
import type { AppRelease, ReleasePlatform } from '../types';

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

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let token: string | null = readToken();
const sessionListeners = new Set<(signedIn: boolean) => void>();

export function isSignedIn(): boolean {
  return !!token;
}

function setToken(next: string | null) {
  token = next;
  try {
    if (next) sessionStorage.setItem(TOKEN_KEY, next);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode: the session lasts until the page reloads.
  }
  sessionListeners.forEach((fn) => fn(!!next));
}

export function onSessionChange(fn: (signedIn: boolean) => void): () => void {
  sessionListeners.add(fn);
  return () => {
    sessionListeners.delete(fn);
  };
}

export function signOut() {
  setToken(null);
}

/** The viewer's time zone, so daily and hourly buckets line up with their clock. */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

async function call<T>(
  path: string,
  {
    method = 'GET',
    body,
    params,
  }: { method?: string; body?: unknown; params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
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
}

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
  /** Without ffmpeg the backend serves placeholder waveforms. */
  ffmpeg: boolean;
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
    requests: number;
    plays: number;
    listeningHours: number;
    playlists: number;
    favouriteTracks: number;
    errorGroups: number;
  };
  daily: { day: string; requests: number; serverErrors: number; activeUsers: number; signups: number; plays: number }[];
  clients: { client: string; requests: number; users: number }[];
  health: Health;
}

export interface RouteStats {
  method: string;
  route: string;
  count: number;
  serverErrors: number;
  clientErrors: number;
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
  statuses: { status: number; count: number }[];
}

export type ErrorSource = 'backend' | 'web' | 'linux' | 'mobile';

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

export interface AdminRelease extends AppRelease {
  downloads: number;
}

export interface ReleaseList {
  items: AdminRelease[];
  /** The file extensions each platform takes. */
  accepts: Record<ReleasePlatform, string[]>;
}

export interface ReleaseUpload {
  platform: ReleasePlatform;
  version: string;
  notes?: string;
  file: File;
}

/**
 * The file goes up as the raw request body. XHR rather than fetch, because fetch can't
 * report upload progress and an installer takes a while.
 */
function uploadRelease(
  { platform, version, notes, file }: ReleaseUpload,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<AdminRelease> {
  const url = new URL(`${API_BASE}/admin/releases`);
  url.searchParams.set('platform', platform);
  url.searchParams.set('version', version);
  url.searchParams.set('fileName', file.name);
  if (notes) url.searchParams.set('notes', notes);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data: { error?: { message?: string; code?: string } } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // A proxy's HTML error page.
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as unknown as AdminRelease);
      if (xhr.status === 401) setToken(null);
      const message =
        data?.error?.message ??
        (xhr.status === 413 ? 'The file is larger than the server accepts' : `Upload failed (${xhr.status})`);
      reject(new AdminApiError(message, xhr.status, data?.error?.code));
    };
    xhr.onerror = () => reject(new AdminApiError("Can't reach the Sonare server.", 0));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
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

  releases() {
    return call<ReleaseList>('/releases');
  },

  uploadRelease,

  deleteRelease(id: string) {
    return call<void>(`/releases/${id}`, { method: 'DELETE' });
  },
};

/** Where a build downloads from; public, so the admin page links to it directly. */
export const releaseDownloadUrl = (id: string) => `${API_BASE}/releases/${id}/download`;
