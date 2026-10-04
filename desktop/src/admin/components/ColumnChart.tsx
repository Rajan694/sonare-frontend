import { useLayoutEffect, useRef, useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { fmtInt } from '../format';
import { Panel } from './Panel';

export interface ChartPoint {
  key: string;
  /** Axis label. */
  label: string;
  /** Fuller label for the tooltip and table. */
  tip: string;
  value: number;
}

/** Clean 0-based ticks (steps of 1, 2 or 5 x 10^n), about three of them. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step * 0.001; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

const PLOT_H = 150;
const TOP = 18;
const BOTTOM = 24;

/**
 * One series as columns: accent fill, 4px rounded tops, hairline grid, the peak labelled.
 * Hover or arrow keys show one column's value; the table button shows them all.
 */
export function ColumnChart({
  title,
  subtitle,
  points,
  format = fmtInt,
  empty,
}: {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  format?: (n: number) => string;
  empty?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [asTable]);

  const max = Math.max(0, ...points.map((p) => p.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const left = Math.max(...ticks.map((t) => format(t).length)) * 7 + 10;
  const plotW = Math.max(0, width - left);
  const slot = points.length ? plotW / points.length : 0;
  const barW = Math.min(24, Math.max(1.5, slot * 0.66));
  const y = (v: number) => TOP + PLOT_H - (v / top) * PLOT_H;
  const peak = max > 0 ? points.findIndex((p) => p.value === max) : -1;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotW / 64))));
  const allZero = max === 0;

  const toggle = (
    <button
      type="button"
      className="chip chip-sm"
      onClick={() => setAsTable((t) => !t)}
      aria-pressed={asTable}
      aria-label={asTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
    >
      {asTable ? <BarChart3 size={14} aria-hidden /> : <Table2 size={14} aria-hidden />}
      {asTable ? 'Chart' : 'Table'}
    </button>
  );

  return (
    <Panel title={title} subtitle={subtitle} action={toggle}>
      {asTable ? (
        <div className="max-h-[192px] overflow-y-auto">
          <table className="w-full text-body-s">
            <tbody>
              {points.map((p) => (
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
          onFocus={() => setActive((a) => a ?? points.length - 1)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const step = e.key === 'ArrowLeft' ? -1 : 1;
            setActive((a) => Math.min(points.length - 1, Math.max(0, (a ?? points.length - 1) + step)));
          }}
        >
          <svg width={width} height={TOP + PLOT_H + BOTTOM} className="block" aria-hidden>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={width} y1={y(t)} y2={y(t)} stroke="var(--color-ln)" strokeWidth={1} />
                <text
                  x={left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-t3 text-mono-s"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {format(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const h = (p.value / top) * PLOT_H;
              const x = left + i * slot + (slot - barW) / 2;
              const base = TOP + PLOT_H;
              const r = Math.min(4, barW / 2, h);
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
                  {(i % labelEvery === 0 || i === points.length - 1) &&
                    (points.length - 1 - i >= labelEvery || i === points.length - 1) && (
                      <text
                        // Half of the widest label ("Sep 26" in mono-s), so an end label isn't cut off.
                        x={Math.min(Math.max(x + barW / 2, left + 24), width - 24)}
                        y={base + 16}
                        textAnchor="middle"
                        className="fill-t3 text-mono-s"
                      >
                        {p.label}
                      </text>
                    )}
                  {/* Hit area: the whole slot, full height - bigger than the column itself. */}
                  <rect
                    x={left + i * slot}
                    y={TOP}
                    width={slot}
                    height={PLOT_H}
                    fill="transparent"
                    onPointerEnter={() => setActive(i)}
                  />
                </g>
              );
            })}
          </svg>
          {allZero && empty && (
            <div className="absolute inset-x-0 top-[70px] text-center text-body-s text-t3 pointer-events-none">
              {empty}
            </div>
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
  );
}
