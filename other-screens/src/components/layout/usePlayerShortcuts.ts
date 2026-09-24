import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import * as player from '../../data/player'

const SEEK_STEP_MS = 5000
const VOLUME_STEP = 0.05
/** A second press of the same arrow within this window skips the track instead of seeking. */
const DOUBLE_PRESS_MS = 300

/** Controls that press on Space, and the ones that move on the arrow keys. */
const SPACE_CONTROLS = 'button, summary, [role="button"], [role="switch"], [role="checkbox"], [role="menuitem"], [role="tab"]'
const ARROW_CONTROLS = '[role="slider"], [role="menu"], [role="tablist"], [role="listbox"], [role="radiogroup"]'

function isTextEntry(el: HTMLElement) {
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
}

/**
 * Player keys, anywhere in the app:
 *   Space        play / pause
 *   ← / →        seek 5s back / forward; press twice quickly for the previous / next track
 *   ↑ / ↓        volume up / down
 *
 * Typing always wins. A control reached with Tab also keeps the keys it uses itself (Space
 * presses a button, arrows move a slider) — but a button or slider that was clicked keeps
 * focus afterwards, and that must not swallow the shortcuts, so after a click they win.
 */
export function usePlayerShortcuts() {
  const store = usePlayerStore()
  // App rebuilds next / skipToPrevious on every render; read the latest without re-binding.
  const latest = useRef(store)
  latest.current = store

  useEffect(() => {
    let lastInput: 'keyboard' | 'pointer' = 'pointer'
    let focusFromKeyboard = false
    let lastArrow: { key: string; at: number } | null = null

    const onPointerDown = () => {
      lastInput = 'pointer'
      // Also when pressing the control that already has focus, which fires no focusin.
      focusFromKeyboard = false
    }
    const onFocusIn = () => {
      focusFromKeyboard = lastInput === 'keyboard'
    }

    function focusKeeps(target: EventTarget | null, key: string): boolean {
      if (!(target instanceof HTMLElement)) return false
      if (isTextEntry(target)) return true
      if (!focusFromKeyboard) return false
      return key === ' ' ? !!target.closest(SPACE_CONTROLS) : !!target.closest(ARROW_CONTROLS)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Tab') lastInput = 'keyboard'
      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (![' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      if (focusKeeps(e.target, e.key)) return

      // Ours now: keep a clicked button from pressing itself and the page from scrolling.
      e.preventDefault()
      e.stopPropagation()
      // And let go of the clicked control, which would otherwise light up its focus ring now
      // that a key was pressed. Focus reached with Tab stays put.
      if (!focusFromKeyboard && e.target instanceof HTMLElement && e.target !== document.body) e.target.blur()

      if (e.key === ' ') {
        if (!e.repeat) player.toggle()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const step = e.key === 'ArrowUp' ? VOLUME_STEP : -VOLUME_STEP
        player.setVolume(Math.round((player.getVolume() + step) * 100) / 100)
      } else {
        const { currentTrack, next, skipToPrevious } = latest.current
        if (!currentTrack) return
        const forward = e.key === 'ArrowRight'
        // Holding the key repeats the seek; only two separate presses count as a double press.
        const now = performance.now()
        const double = !e.repeat && lastArrow?.key === e.key && now - lastArrow.at < DOUBLE_PRESS_MS
        if (!e.repeat) lastArrow = double ? null : { key: e.key, at: now }
        if (double) {
          if (forward) next()
          else skipToPrevious()
        } else {
          player.seek(player.getStatus().positionMs + (forward ? SEEK_STEP_MS : -SEEK_STEP_MS))
        }
      }
    }

    // Capture phase, so this runs before a focused slider or button handles the key itself.
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('focusin', onFocusIn, true)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('focusin', onFocusIn, true)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])
}
