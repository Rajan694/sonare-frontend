import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Table2, BarChart3, XCircle } from 'lucide-react'
import { cn } from '../lib/utils'

// ---- Data loading ----

/**
 * Loads on mount and whenever deps change. While a reload runs, `data` keeps the previous
 * result so the page holds its layout (callers dim it with `loading`).
 */
export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let live = true
    setLoading(true)
    load().then(
      d => {
        if (!live) return
        setData(d)
        setError(null)
      },
      (e: Error) => live && setError(e.message),
    ).finally(() => live && setLoading(false))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, setData, error, loading, reload: () => setNonce(n => n + 1) }
}

// ---- Formatting ----

const intFmt = new Intl.NumberFormat('en')
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export const fmtInt = (n: number) => intFmt.format(n)
export const fmtCompact = (n: number) => (Math.abs(n) < 10_000 ? intFmt.format(n) : compactFmt.format(n))
export const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s` : `${Math.round(ms)} ms`)
export const fmtPct = (part: number, whole: number) => {
  if (!whole) return '0%'
  const p = (part / whole) * 100
  return `${p < 10 && p > 0 ? p.toFixed(1) : Math.round(p)}%`
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86_400)} d ago`
}

export function fmtDuration(sec: number): string {
  if (sec < 3600) return `${Math.floor(sec / 60)} min`
  if (sec < 86_400) return `${Math.floor(sec / 3600)} h ${Math.floor((sec % 3600) / 60)} min`
  return `${Math.floor(sec / 86_400)} d ${Math.floor((sec % 86_400) / 3600)} h`
}

/** 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' (already in the viewer's zone) -> labels. */
export function bucketLabels(at: string, unit: 'hour' | 'day') {
  const [date, time] = at.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(y, m - 1, d).toLocaleDateString('en', { month: 'short', day: 'numeric' })
  if (unit === 'day') return { label: day, tip: day }
  return { label: time, tip: `${day}, ${time}` }
}

// ---- Layout pieces ----

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-h1 text-t1">{title}</h1>
        {subtitle && <p className="text-body-s text-t3 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  )
}

export function Panel({ title, subtitle, action, children, className }: {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('bg-s1 border border-ln rounded-lg p-5 min-w-0', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h2 className="text-title-m text-t1">{title}</h2>}
            {subtitle && <p className="text-label-m text-t3 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-s1 border border-ln rounded-lg px-5 py-4 min-w-0">
      <div className="text-label-m text-t3">{label}</div>
      <div className="text-display-m text-t1 mt-1 truncate">{value}</div>
      {note && <div className="text-label-s text-t3 mt-1 truncate">{note}</div>}
    </div>
  )
}

export function StatusLine({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  const Glyph = ok ? CheckCircle2 : XCircle
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Glyph size={16} className={cn('flex-none', ok ? 'text-acc' : 'text-red')} aria-hidden />
      <span className="text-label-l text-t1 flex-none">{label}</span>
      <span className={cn('text-label-m flex-none', ok ? 'text-t2' : 'text-red')}>{ok ? 'Up' : 'Down'}</span>
      {detail && <span className="text-mono-s text-t3 truncate">{detail}</span>}
    </div>
  )
}

export function Notice({ tone = 'error', children }: { tone?: 'error' | 'warn'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md px-3 py-2.5 text-body-s',
        tone === 'error' ? 'bg-red/10 text-red' : 'bg-goldbg text-gold',
      )}
    >
      <AlertTriangle size={16} className="flex-none mt-0.5" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function TextInput({ label, hint, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: React.ReactNode
}) {
  const id = React.useId()
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      <label htmlFor={id} className="text-label-l text-t2">{label}</label>
      <input
        id={id}
        className="h-11 px-4 bg-s2 border border-ln2 rounded-md text-t1 text-body-m outline-none focus:border-acc placeholder:text-t4 disabled:opacity-60"
        {...props}
      />
      {hint && <div className="text-label-m text-t3">{hint}</div>}
    </div>
  )
}

// ---- Column chart ----

export interface ChartPoint {
  key: string
  /** Axis label. */
  label: string
  /** Fuller label for the tooltip and table. */
  tip: string
  value: number
}

/** Clean 0-based ticks (steps of 1, 2 or 5 x 10^n), about three of them. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / 3
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map(f => f * mag).find(s => s >= raw) ?? 10 * mag
  const ticks: number[] = []
  for (let t = 0; t <= max + step * 0.001; t += step) ticks.push(Math.round(t * 1e6) / 1e6)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

const PLOT_H = 150
const TOP = 18
const BOTTOM = 24

/**
 * One series as columns: accent fill, 4px rounded tops, hairline grid, the peak labelled.
 * Hover or arrow keys show one column's value; the table button shows them all.
 */
export function ColumnChart({ title, subtitle, points, format = fmtInt, empty }: {
  title: string
  subtitle?: string
  points: ChartPoint[]
  format?: (n: number) => string
  empty?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [asTable])

  const max = Math.max(0, ...points.map(p => p.value))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const left = Math.max(...ticks.map(t => format(t).length)) * 7 + 10
  const plotW = Math.max(0, width - left)
  const slot = points.length ? plotW / points.length : 0
  const barW = Math.min(24, Math.max(1.5, slot * 0.66))
  const y = (v: number) => TOP + PLOT_H - (v / top) * PLOT_H
  const peak = max > 0 ? points.findIndex(p => p.value === max) : -1
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotW / 64))))
  const allZero = max === 0

  const toggle = (
    <button
      type="button"
      className="chip chip-sm"
      onClick={() => setAsTable(t => !t)}
      aria-pressed={asTable}
      aria-label={asTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
    >
      {asTable ? <BarChart3 size={14} aria-hidden /> : <Table2 size={14} aria-hidden />}
      {asTable ? 'Chart' : 'Table'}
    </button>
  )

  return (
    <Panel title={title} subtitle={subtitle} action={toggle}>
      {asTable ? (
        <div className="max-h-[192px] overflow-y-auto">
          <table className="w-full text-body-s">
            <tbody>
              {points.map(p => (
                <tr key={p.key} className="border-b border-ln last:border-0">
                  <td className="py-1.5 text-t2">{p.tip}</td>
                  <td className="py-1.5 text-right text-t1 tabular-nums">{format(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={box}
          className="relative outline-none focus-visible:ring-2 focus-visible:ring-acc/60 rounded-sm"
          tabIndex={0}
          role="img"
          aria-label={`${title}. ${points.length} values, highest ${format(max)}. Use the arrow keys to read each value, or the Table button for all of them.`}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onFocus={() => setActive(a => a ?? points.length - 1)}
          onKeyDown={e => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const step = e.key === 'ArrowLeft' ? -1 : 1
            setActive(a => Math.min(points.length - 1, Math.max(0, (a ?? points.length - 1) + step)))
          }}
        >
          <svg width={width} height={TOP + PLOT_H + BOTTOM} className="block" aria-hidden>
            {ticks.map(t => (
              <g key={t}>
                <line x1={left} x2={width} y1={y(t)} y2={y(t)} stroke="var(--color-ln)" strokeWidth={1} />
                <text
                  x={left - 8} y={y(t)} dy="0.32em" textAnchor="end"
                  className="fill-t3 text-mono-s" style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {format(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const h = (p.value / top) * PLOT_H
              const x = left + i * slot + (slot - barW) / 2
              const base = TOP + PLOT_H
              const r = Math.min(4, barW / 2, h)
              return (
                <g key={p.key}>
                  {h > 0 && (
                    <path
                      d={`M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barW - r} Q${x + barW},${base - h} ${x + barW},${base - h + r} V${base} Z`}
                      fill={active === i ? 'var(--color-acc2)' : 'var(--color-acc)'}
                      opacity={active === null || active === i ? 1 : 0.55}
                    />
                  )}
                  {i === peak && active === null && (
                    <text x={x + barW / 2} y={base - h - 6} textAnchor="middle" className="fill-t2 text-mono-s">
                      {format(p.value)}
                    </text>
                  )}
                  {(i % labelEvery === 0 || i === points.length - 1) && (points.length - 1 - i >= labelEvery || i === points.length - 1) && (
                    <text
                      x={Math.min(Math.max(x + barW / 2, left + 16), width - 16)}
                      y={base + 16} textAnchor="middle" className="fill-t3 text-mono-s"
                    >
                      {p.label}
                    </text>
                  )}
                  {/* Hit area: the whole slot, full height - bigger than the column itself. */}
                  <rect
                    x={left + i * slot} y={TOP} width={slot} height={PLOT_H} fill="transparent"
                    onPointerEnter={() => setActive(i)}
                  />
                </g>
              )
            })}
          </svg>
          {allZero && empty && (
            <div className="absolute inset-x-0 top-[70px] text-center text-body-s text-t3 pointer-events-none">{empty}</div>
          )}
          {active !== null && points[active] && (
            <div
              className="absolute pointer-events-none bg-s3 border border-ln2 rounded-md px-2.5 py-1.5 shadow-e2 whitespace-nowrap"
              style={{
                left: Math.min(Math.max(left + active * slot + slot / 2, 60), width - 60),
                top: Math.max(0, y(points[active].value) - 52),
                transform: 'translateX(-50%)',
              }}
            >
              <div className="text-label-l text-t1 tabular-nums">{format(points[active].value)}</div>
              <div className="text-label-s text-t3">{points[active].tip}</div>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

/** Horizontal share bars for a short ranked list, one hue. */
export function ShareBars({ rows, format = fmtInt }: {
  rows: { key: string; label: string; value: number; detail?: string }[]
  format?: (n: number) => string
}) {
  const max = Math.max(1, ...rows.map(r => r.value))
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <ul className="flex flex-col gap-3">
      {rows.map(r => (
        <li key={r.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-body-s">
            <span className="text-t1">{r.label}</span>
            <span className="text-t2 tabular-nums">
              {format(r.value)} <span className="text-t3">· {fmtPct(r.value, total)}</span>
              {r.detail && <span className="text-t3"> · {r.detail}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-s3 overflow-hidden">
            <div className="h-full rounded-full bg-acc" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
