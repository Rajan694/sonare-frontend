import type { User } from './types'

// TODO(design): A full Login/Signup screen is a separate design task.
// For now, auth is managed programmatically and boots via VITE_DEV_EMAIL / VITE_DEV_PASSWORD in dev.

const ACCESS_TOKEN_KEY = 'sonare_access_token'
const REFRESH_TOKEN_KEY = 'sonare_refresh_token'
const USER_KEY = 'sonare_user'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3999/api/v1'

let currentAccessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY)
let currentRefreshToken: string | null = localStorage.getItem(REFRESH_TOKEN_KEY)
let currentUser: User | null = (() => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
})()

let isAuthSettled = !import.meta.env.VITE_DEV_EMAIL || !!currentAccessToken
let authSettlePromise: Promise<void> | null = null

type AuthListener = (user: User | null) => void
const listeners = new Set<AuthListener>()
const authSettleListeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach(fn => fn(currentUser))
}

export function isAuthReady(): boolean {
  return isAuthSettled
}

export function onAuthReady(fn: () => void): () => void {
  if (isAuthSettled) {
    fn()
    return () => {}
  }
  authSettleListeners.add(fn)
  return () => {
    authSettleListeners.delete(fn)
  }
}

function markAuthSettled() {
  isAuthSettled = true
  authSettleListeners.forEach(fn => fn())
  authSettleListeners.clear()
}

export function onAuthChange(fn: AuthListener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getAccessToken(): string | null {
  return currentAccessToken
}

export function getRefreshToken(): string | null {
  return currentRefreshToken
}

export function getCurrentUser(): User | null {
  return currentUser
}

export function isAuthenticated(): boolean {
  return !!currentAccessToken
}

export function setSession(accessToken: string, refreshToken: string, user: User) {
  currentAccessToken = accessToken
  currentRefreshToken = refreshToken
  currentUser = user

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))

  notifyListeners()
}

export function clearSession() {
  currentAccessToken = null
  currentRefreshToken = null
  currentUser = null

  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)

  notifyListeners()
}

export async function signIn(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message || `Login failed with status ${res.status}`)
  }

  setSession(json.accessToken, json.refreshToken, json.user)
  return json.user
}

export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message || `Registration failed with status ${res.status}`)
  }

  setSession(json.accessToken, json.refreshToken, json.user)
  return json.user
}

export async function signOut(): Promise<void> {
  try {
    if (currentAccessToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
      })
    }
  } catch {
    // Ignore network error on logout
  } finally {
    clearSession()
  }
}

let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  if (!currentRefreshToken) {
    clearSession()
    return null
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      })

      if (!res.ok) {
        clearSession()
        return null
      }

      const json = await res.json()
      currentAccessToken = json.accessToken
      currentRefreshToken = json.refreshToken || currentRefreshToken

      localStorage.setItem(ACCESS_TOKEN_KEY, currentAccessToken!)
      if (json.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, currentRefreshToken!)
      }

      return currentAccessToken
    } catch {
      clearSession()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function initDevAuth(): Promise<void> {
  if (currentAccessToken) {
    markAuthSettled()
    return
  }

  const devEmail = import.meta.env.VITE_DEV_EMAIL
  const devPassword = import.meta.env.VITE_DEV_PASSWORD

  if (!devEmail || !devPassword) {
    markAuthSettled()
    return
  }

  if (authSettlePromise) return authSettlePromise

  authSettlePromise = (async () => {
    try {
      // 1. Attempt signIn first
      await signIn(devEmail, devPassword)
    } catch {
      // 2. If signIn fails, attempt signUp
      try {
        await signUp(devEmail, devPassword, 'Rajan')
      } catch {
        // 3. If signUp returned 409 / conflict, retry signIn once more
        try {
          await signIn(devEmail, devPassword)
        } catch (finalErr) {
          console.warn('[Auth] Dev auto-login failed:', finalErr)
        }
      }
    } finally {
      markAuthSettled()
      authSettlePromise = null
    }
  })()

  return authSettlePromise
}
