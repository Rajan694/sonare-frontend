import { fmtInt, fmtPct } from '../format';

/** Horizontal share bars for a short ranked list, one hue. */
export const ShareBars = ({
  rows,
  format = fmtInt,
}: {
  rows: { key: string; label: string; value: number; detail?: string }[];
  format?: (n: number) => string;
}) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
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
  );
};
