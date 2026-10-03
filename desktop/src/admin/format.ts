// Number, time and date formatting for the admin pages.

const intFmt = new Intl.NumberFormat('en');
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtInt = (n: number) => intFmt.format(n);
export const fmtCompact = (n: number) => (Math.abs(n) < 10_000 ? intFmt.format(n) : compactFmt.format(n));
export const fmtMs = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s` : `${Math.round(ms)} ms`;
export const fmtPct = (part: number, whole: number) => {
  if (!whole) return '0%';
  const p = (part / whole) * 100;
  return `${p < 10 && p > 0 ? p.toFixed(1) : Math.round(p)}%`;
};

export function fmtDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86_400)} d ago`;
}

export function fmtDuration(sec: number): string {
  if (sec < 3600) return `${Math.floor(sec / 60)} min`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)} h ${Math.floor((sec % 3600) / 60)} min`;
  return `${Math.floor(sec / 86_400)} d ${Math.floor((sec % 86_400) / 3600)} h`;
}

/** 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' (already in the viewer's zone) -> labels. */
export function bucketLabels(at: string, unit: 'hour' | 'day') {
  const [date, time] = at.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  if (unit === 'day') return { label: day, tip: day };
  return { label: time, tip: `${day}, ${time}` };
}
