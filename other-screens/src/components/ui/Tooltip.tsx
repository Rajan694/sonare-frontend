import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Tooltips for icon-only controls. Mark an element with `data-tip="Label"` and, when it has a
 * keyboard shortcut, `data-tip-kbd="Space"`; IconButton does this itself. `data-tip-side="right"`
 * puts it beside the control instead (a vertical rail, where above would cover the next item). This one layer
 * (mounted in AppShell) serves every tooltip through event delegation, so controls carry no
 * tooltip state.
 *
 * Hover shows it after a short delay, and moving straight on to the next control shows that
 * one at once, as in a native toolbar. Tab focus shows it immediately; clicking, scrolling,
 * Escape or leaving the page hides it. The text follows the control live, so "Play" turns into
 * "Pause" while the pointer is still there.
 */

const SHOW_DELAY_MS = 450
const WARM_MS = 300
const GAP_PX = 8
const EDGE_PX = 8

interface Tip {
  el: HTMLElement
  text: string
  kbd?: string
  right: boolean
  rect: DOMRect
}

function tipTarget(node: EventTarget | null): HTMLElement | null {
  return node instanceof Element ? (node.closest('[data-tip]') as HTMLElement | null) : null
}

function read(el: HTMLElement): Tip | null {
  const text = el.dataset.tip?.trim()
  return text ? { el, text, kbd: el.dataset.tipKbd || undefined, right: el.dataset.tipSide === 'right', rect: el.getBoundingClientRect() } : null
}

export default function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const hideRef = useRef(() => {})
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let current: HTMLElement | null = null
    let pending: HTMLElement | null = null
    /** Pressed while showing its tooltip: stays quiet until the pointer leaves it. */
    let suppressed: HTMLElement | null = null
    let timer: number | undefined
    let hiddenAt = 0
    let frame = 0
    const watcher = new MutationObserver(() => {
      if (current) setTip(read(current))
    })

    function show(el: HTMLElement) {
      window.clearTimeout(timer)
      pending = null
      const next = read(el)
      if (!next) return
      current = el
      watcher.disconnect()
      watcher.observe(el, { attributes: true, attributeFilter: ['data-tip', 'data-tip-kbd'] })
      setTip(next)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(follow)
    }

    // While visible: drop the tooltip if its control goes away, and keep up if it moves.
    function follow() {
      if (!current) return
      if (!current.isConnected) return hide()
      const r = current.getBoundingClientRect()
      setTip(t => (t && t.el === current && (t.rect.left !== r.left || t.rect.top !== r.top || t.rect.width !== r.width) ? { ...t, rect: r } : t))
      frame = requestAnimationFrame(follow)
    }

    function hide() {
      window.clearTimeout(timer)
      pending = null
      if (current) hiddenAt = performance.now()
      current = null
      watcher.disconnect()
      cancelAnimationFrame(frame)
      setTip(null)
    }

    function onPointerOver(e: PointerEvent) {
      if (e.pointerType === 'touch') return
      const el = tipTarget(e.target)
      if (!el || el === current || el === pending || el === suppressed) return
      const warm = !!current || performance.now() - hiddenAt < WARM_MS
      window.clearTimeout(timer)
      if (warm) return show(el)
      pending = el
      timer = window.setTimeout(() => show(el), SHOW_DELAY_MS)
    }

    function onPointerOut(e: PointerEvent) {
      const el = tipTarget(e.target)
      if (!el) return
      // Moving between the control's own children is not leaving it.
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return
      if (el === suppressed) suppressed = null
      if (el === current || el === pending) hide()
    }

    function onPointerDown(e: PointerEvent) {
      const el = tipTarget(e.target)
      if (el) suppressed = el
      hide()
    }

    function onFocusIn(e: FocusEvent) {
      const el = tipTarget(e.target)
      // Only keyboard focus: a clicked button also takes focus, and that shouldn't pop a tooltip.
      if (el && el === e.target && el.matches(':focus-visible')) show(el)
    }

    function onFocusOut(e: FocusEvent) {
      if (e.target === current) hide()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') hide()
    }

    hideRef.current = hide

    const opts = { capture: true, passive: true }
    document.addEventListener('pointerover', onPointerOver, opts)
    document.addEventListener('pointerout', onPointerOut, opts)
    document.addEventListener('pointerdown', onPointerDown, opts)
    document.addEventListener('focusin', onFocusIn, opts)
    document.addEventListener('focusout', onFocusOut, opts)
    document.addEventListener('keydown', onKeyDown, opts)
    document.addEventListener('scroll', hide, opts)
    window.addEventListener('resize', hide)
    window.addEventListener('blur', hide)
    return () => {
      hide()
      document.removeEventListener('pointerover', onPointerOver, opts)
      document.removeEventListener('pointerout', onPointerOut, opts)
      document.removeEventListener('pointerdown', onPointerDown, opts)
      document.removeEventListener('focusin', onFocusIn, opts)
      document.removeEventListener('focusout', onFocusOut, opts)
      document.removeEventListener('keydown', onKeyDown, opts)
      document.removeEventListener('scroll', hide, opts)
      window.removeEventListener('resize', hide)
      window.removeEventListener('blur', hide)
    }
  }, [])

  // A new screen takes its controls (and their tooltips) with it.
  useEffect(() => hideRef.current(), [location.pathname])

  // Above the control, or below it when there's no room (the top bar), or beside it when asked;
  // kept inside the window.
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!tip || !box) return setPos(null)
    // Layout size, which the entrance scale doesn't shrink.
    const width = box.offsetWidth
    const height = box.offsetHeight
    const r = tip.rect
    if (tip.right) {
      const top = Math.min(Math.max(r.top + r.height / 2 - height / 2, EDGE_PX), window.innerHeight - height - EDGE_PX)
      const left = r.right + GAP_PX
      return setPos(prev => (prev && prev.left === left && prev.top === top ? prev : { left, top }))
    }
    const above = r.top - height - GAP_PX >= EDGE_PX
    const top = above ? r.top - height - GAP_PX : r.bottom + GAP_PX
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, EDGE_PX), window.innerWidth - width - EDGE_PX)
    setPos(prev => (prev && prev.left === left && prev.top === top ? prev : { left, top }))
  }, [tip])

  if (!tip) return null
  return createPortal(
    <motion.div
      key={tip.text + (tip.kbd ?? '')}
      ref={boxRef}
      aria-hidden
      // Placed before the first paint (above), so the fade starts where it ends up.
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="fixed z-[70] flex items-center gap-2 max-w-[260px] px-2 py-1 rounded-sm bg-s3 border border-ln2 shadow-e3 text-label-m text-t1 pointer-events-none select-none"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <span className="min-w-0">{tip.text}</span>
      {tip.kbd && <span className="kbd flex-none">{tip.kbd}</span>}
    </motion.div>,
    document.body
  )
}
