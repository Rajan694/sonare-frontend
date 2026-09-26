import { useSyncExternalStore } from 'react'
import { api } from './api'
import { isAuthenticated, onAuthChange, onAuthReady } from './auth'

/**
 * Account-level preferences from GET/PUT /me/settings (contract §9).
 *
 * The backend PUT overwrites every column, so the whole object is always sent — patching
 * one field must not reset the others to their defaults.
 */
export interface UserSettings {
  eqPreset: string
  gapless: boolean
  normalization: boolean
  downloadQuality: 'low' | 'normal' | 'high' | 'lossless'
  stayOffline: boolean
}

let settings: UserSettings = {
  eqPreset: 'Flat',
  gapless: false,
  normalization: true,
  downloadQuality: 'high',
  stayOffline: false,
}

const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined
let loaded = false

function emit() {
  for (const l of listeners) l()
}

export function getSettings(): UserSettings {
  return settings
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function updateSettings(patch: Partial<UserSettings>): void {
  settings = { ...settings, ...patch }
  emit()
  clearTimeout(saveTimer)
  // Guests keep settings on this device only; there's no account to save them to.
  if (!isAuthenticated()) return
  saveTimer = setTimeout(() => {
    void api.saveSettings(settings).catch(() => {
      // Offline — the local value still applies for this session.
    })
  }, 400)
}

let watchingAuth = false

export function loadSettings(): void {
  if (!watchingAuth) {
    watchingAuth = true
    // Signing in (again) brings that account's settings back.
    onAuthChange(user => {
      if (!user) return
      loaded = false
      loadSettings()
    })
  }
  if (loaded) return
  loaded = true
  onAuthReady(() => {
    if (!isAuthenticated()) {
      loaded = false
      return
    }
    void api
      .getSettings()
      .then((s: Partial<UserSettings>) => {
        settings = { ...settings, ...s }
        emit()
      })
      .catch(() => {
        loaded = false
      })
  })
}

export function useSettings(): UserSettings {
  return useSyncExternalStore(subscribeSettings, getSettings)
}
