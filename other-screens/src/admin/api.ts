import { API_BASE } from '../data/auth'

// The admin page's own client. Admin sessions are separate from app sign-in: a different
// token, kept in sessionStorage so closing the tab signs out.

const TOKEN_KEY = 'sonare_admin_token'

export class AdminApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

let token: string | null = readToken()
const sessionListeners = new Set<(signedIn: boolean) => void>()

export function isSignedIn(): boolean {
  return !!token
}

function setToken(next: string | null) {
  token = next
  try {
    if (next) sessionStorage.setItem(TOKEN_KEY, next)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode: the session lasts until the page reloads.
  }
  sessionListeners.forEach(fn => fn(!!next))
}

export function onSessionChange(fn: (signedIn: boolean) => void): () => void {
  sessionListeners.add(fn)
  return () => {
    sessionListeners.delete(fn)
  }
}

export function signOut() {
  setToken(null)
}

/** The viewer's time zone, so daily and hourly buckets line up with their clock. */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

async function call<T>(
  path: string,
  { method = 'GET', body, params }: { method?: string; body?: unknown; params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const url = new URL(`${API_BASE}/admin${path}`)
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new AdminApiError("Can't reach the Sonare server.", 0)
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    // Expired, or the password changed in another session: back to the sign-in form.
    if (res.status === 401 && path !== '/login') setToken(null)
    throw new AdminApiError(data?.error?.message ?? `Request failed (${res.status})`, res.status, data?.error?.code)
  }
  return data as T
}

// ---- Types (mirror sonare-backend/src/routes/admin.routes.ts) ----

export interface AdminAccount {
  username: string
  lastLoginAt: string | null
  /** null until the password is changed from this page. */
  passwordChangedAt: string | null
}

export interface Setting {
  key: string
  label: string
  description: string | null
  applies: 'live' | 'deploy'
  /** Saved value; null means not set here. */
  value: string | null
  fallback: string | null
  fallbackSource: string
  /** Live: what the backend uses now. Deploy: what the Piped files hold now. */
  effective: string | null
  /** Deploy settings saved but not in the Piped files yet. */
  pending: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export interface Health {
  piped: { up: boolean; url: string }
  database: boolean
  redis: boolean
  uptimeSec: number
  node: string
  memoryMb: number
}

export interface Overview {
  days: number
  totals: {
    users: number
    newUsers: number
    activeUsers: number
    requests: number
    plays: number
    listeningHours: number
    playlists: number
    favouriteTracks: number
    errorGroups: number
  }
  daily: { day: string; requests: number; serverErrors: number; activeUsers: number; signups: number; plays: number }[]
  clients: { client: string; requests: number; users: number }[]
  health: Health
}

export interface RouteStats {
  method: string
  route: string
  count: number
  serverErrors: number
  clientErrors: number
  p50: number
  p95: number
  max: number
}

export interface RequestMetrics {
  hours: number
  unit: 'hour' | 'day'
  summary: { total: number; serverErrors: number; clientErrors: number; p50: number; p95: number }
  series: { at: string; requests: number; serverErrors: number; p95: number }[]
  routes: RouteStats[]
  statuses: { status: number; count: number }[]
}

export type ErrorSource = 'backend' | 'web' | 'linux' | 'mobile'

export interface ErrorLog {
  id: number
  source: ErrorSource
  level: string
  code: string | null
  message: string
  stack: string | null
  method: string | null
  route: string | null
  status: number | null
  userId: string | null
  userAgent: string | null
  context: Record<string, unknown> | null
  count: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface ErrorPage {
  items: ErrorLog[]
  total: number
  bySource: { source: ErrorSource; groups: number; events: number }[]
}

export interface ErrorFilter {
  source?: ErrorSource
  q?: string
}

// ---- Calls ----

export const adminApi = {
  async login(username: string, password: string): Promise<AdminAccount> {
    const r = await call<{ token: string; admin: AdminAccount }>('/login', { method: 'POST', body: { username, password } })
    setToken(r.token)
    return r.admin
  },

  me() {
    return call<AdminAccount>('/me')
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<AdminAccount> {
    const r = await call<{ token: string; admin: AdminAccount }>('/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    })
    setToken(r.token)
    return r.admin
  },

  config() {
    return call<{ settings: Setting[] }>('/config')
  },

  async saveSetting(key: string, value: string | null, force = false): Promise<Setting> {
    const r = await call<{ setting: Setting }>(`/config/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value, force },
    })
    return r.setting
  },

  overview(days: number) {
    return call<Overview>('/analytics/overview', { params: { days, tz } })
  },

  requests(hours: number) {
    return call<RequestMetrics>('/analytics/requests', { params: { hours, tz } })
  },

  errors(filter: ErrorFilter, offset = 0, limit = 50) {
    return call<ErrorPage>('/errors', { params: { ...filter, offset, limit } })
  },

  deleteError(id: number) {
    return call<void>(`/errors/${id}`, { method: 'DELETE' })
  },

  clearErrors(filter: ErrorFilter) {
    return call<{ deleted: number }>('/errors', { method: 'DELETE', params: { ...filter } })
  },
}
