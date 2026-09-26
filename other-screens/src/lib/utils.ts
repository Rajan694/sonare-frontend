import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The type scale in styles.css (`text-body-m`, `text-display-m`, …). Unregistered, tailwind-merge
// reads them as text colours, so cn('text-body-m', 'text-acc') silently dropped the size.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display', 'display-m', 'h1', 'h2', 'title-l', 'title-m', 'body-l', 'body-m', 'body-s',
            'label-l', 'label-m', 'label-s', 'overline', 'mono-m', 'mono-s',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === undefined || ms === null || isNaN(ms) || ms < 0) return '0:00'
  const totalSecs = Math.floor(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
  return `${(bytes / 1e3).toFixed(0)} KB`
}

export function generatePeaks(count: number, seed = 0): number[] {
  const peaks: number[] = []
  let prev = 12
  for (let i = 0; i < count; i++) {
    const t = (i + seed) / count
    const envelope = Math.sin(Math.PI * t) * 0.7 + 0.3
    const noise = Math.sin((i + seed) * 2.399) * 0.4 + Math.cos((i + seed * 1.3) * 3.71) * 0.3
    const raw = Math.round((envelope + noise) * 14 + 6)
    const clamped = Math.max(4, Math.min(24, raw))
    const smoothed = Math.round(prev * 0.4 + clamped * 0.6)
    prev = smoothed
    peaks.push(smoothed)
  }
  return peaks
}
