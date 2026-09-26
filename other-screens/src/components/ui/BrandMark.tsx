import { useId } from 'react'

/**
 * The Sonare logo tile (design-system/sonare-logo, green tile). Header sizes are under
 * 32px, so it draws the logo's small three-bar version - the five-bar one thins out there.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  const gradient = `sonare-${useId().replace(/[^\w-]/g, '')}`
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00E28A" />
          <stop offset="1" stopColor="#00C074" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="58" fill={`url(#${gradient})`} />
      <rect x="42" y="80" width="40" height="96" rx="20" fill="#000" />
      <rect x="108" y="40" width="40" height="176" rx="20" fill="#000" />
      <rect x="174" y="68" width="40" height="120" rx="20" fill="#000" />
    </svg>
  )
}
