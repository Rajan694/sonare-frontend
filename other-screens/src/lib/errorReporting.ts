import { API_BASE } from '../data/auth'
import { CLIENT } from './caps'

// Sends uncaught errors and unhandled rejections to the backend, where they show on the admin
// page's Errors section. React 19 reports uncaught render errors through window.reportError,
// so the 'error' listener covers those too.

const MAX_PER_PAGE = 20
const REPEAT_MS = 60_000

let budget = MAX_PER_PAGE
const lastSent = new Map<string, number>()

/** Browser noise and network failures: not bugs, and offline mode makes the latter routine. */
function ignored(err: Error): boolean {
  return err.name === 'AbortError'
    || /ResizeObserver loop|^Script error\.?$/.test(err.message)
    || (err.name === 'TypeError' && /fetch|NetworkError|Load failed|network/i.test(err.message))
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}

export function reportError(value: unknown, level: 'error' | 'warning' = 'error'): void {
  const err = toError(value)
  if (ignored(err) || !navigator.onLine) return
  const now = Date.now()
  if (now - (lastSent.get(err.message) ?? 0) < REPEAT_MS || budget <= 0) return
  lastSent.set(err.message, now)
  budget--

  const context: Record<string, string> = {}
  if (window.NL_OS) context.os = String(window.NL_OS)
  void fetch(`${API_BASE}/client-errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sonare-Client': CLIENT },
    body: JSON.stringify({
      source: CLIENT,
      level,
      message: `${err.name && err.name !== 'Error' ? `${err.name}: ` : ''}${err.message || '(no message)'}`.slice(0, 2000),
      stack: err.stack?.slice(0, 16_000),
      page: location.pathname,
      appVersion: import.meta.env.VITE_APP_VERSION || undefined,
      context,
    }),
    keepalive: true,
  }).catch(() => {})
}

let installed = false

export function installErrorReporting(): void {
  if (installed) return
  installed = true
  window.addEventListener('error', e => {
    // Failed <img>/<audio> loads also fire 'error', but not as an ErrorEvent with a message.
    if (e instanceof ErrorEvent && e.message) reportError(e.error ?? e.message)
  })
  window.addEventListener('unhandledrejection', e => reportError(e.reason))
}
