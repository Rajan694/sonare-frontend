import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

/**
 * Favourite state that survives across screens.
 *
 * Track lists come from many independent hooks, so a heart toggled in one place would
 * otherwise stay stale everywhere else until that list refetched. This keeps a small
 * overlay of user-made changes that every heart reads on top of the fetched value.
 */

const overrides = new Map<string, boolean>()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** The effective favourite state: a local toggle wins over whatever the server last returned. */
export function isFavourite(trackId: string, serverValue: boolean): boolean {
  const o = overrides.get(trackId)
  return o === undefined ? serverValue : o
}

export async function setFavourite(trackId: string, next: boolean): Promise<void> {
  const previous = overrides.get(trackId)
  // Optimistic: flip immediately so the heart feels instant.
  overrides.set(trackId, next)
  emit()
  try {
    await api.setTrackFavourite(trackId, next)
  } catch (e) {
    // Roll back to whatever we knew before rather than leaving a lie on screen.
    if (previous === undefined) overrides.delete(trackId)
    else overrides.set(trackId, previous)
    emit()
    throw e
  }
}

/**
 * Binds one track's heart. `serverValue` is the value from the fetched track object;
 * the returned state folds in any local toggle.
 */
export function useFavourite(trackId: string | undefined, serverValue: boolean | undefined) {
  const [, force] = useState(0)

  useEffect(() => subscribe(() => force(n => n + 1)), [])

  const favourite = trackId ? isFavourite(trackId, !!serverValue) : false

  const toggle = useCallback(() => {
    if (!trackId) return
    void setFavourite(trackId, !isFavourite(trackId, !!serverValue)).catch(() => {
      // setFavourite already rolled the UI back; nothing useful to show here.
    })
  }, [trackId, serverValue])

  return { favourite, toggle }
}
