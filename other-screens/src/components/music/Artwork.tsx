import React, { useState } from 'react'
import { cn } from '../../lib/utils'
import { API_BASE } from '../../data/auth'

type ArtVariant = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9' | 'a10' | 'a11' | 'a12'

export interface ArtworkProps {
  src?: string | null
  alt?: string
  variant?: ArtVariant
  size?: number
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'circ'
  rings?: boolean
  className?: string
}

const radiusClass = {
  xs: 'art-r-xs',
  sm: 'art-r-sm',
  md: '',
  lg: 'art-r-lg',
  xl: 'art-r-xl',
  circ: 'art-circ',
}

export function resolveArtworkUrl(url?: string | null, targetSize?: number): string | undefined {
  if (!url) return undefined
  let resolved = url
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const origin = API_BASE.replace(/\/api\/v1\/?$/, '')
    resolved = `${origin}${url.startsWith('/') ? '' : '/'}${url}`
  }

  if (targetSize && resolved.includes('/artwork')) {
    const sizeParam = targetSize <= 64 ? 64 : targetSize <= 140 ? 140 : targetSize <= 300 ? 300 : 640
    const separator = resolved.includes('?') ? '&' : '?'
    if (!resolved.includes('size=')) {
      resolved = `${resolved}${separator}size=${sizeParam}`
    }
  }

  return resolved
}

export default function Artwork({
  src,
  alt = '',
  variant = 'a1',
  size,
  radius = 'md',
  rings = false,
  className
}: ArtworkProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const resolvedSrc = resolveArtworkUrl(src, size)

  return (
    <span
      className={cn(
        'art relative overflow-hidden flex items-center justify-center flex-none select-none',
        variant,
        radiusClass[radius],
        rings && 'art-rings',
        className
      )}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
      aria-hidden={!alt}
    >
      {resolvedSrc && !error && (
        <img
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </span>
  )
}
