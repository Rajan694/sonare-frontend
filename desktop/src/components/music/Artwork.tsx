import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { API_BASE } from '../../api/auth';
import { isInAppYoutubeAllowed } from '../../youtube/inApp';
import { localArtUrl } from '../../storage/local';
import { sizedImageUrl, trackThumbUrl } from '../../../../shared/catalog/images';

type ArtVariant = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9' | 'a10' | 'a11' | 'a12';

export interface ArtworkProps {
  src?: string | null;
  alt?: string;
  variant?: ArtVariant;
  size?: number;
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'circ';
  rings?: boolean;
  className?: string;
}

const radiusClass = {
  xs: 'art-r-xs',
  sm: 'art-r-sm',
  md: '',
  lg: 'art-r-lg',
  xl: 'art-r-xl',
  circ: 'art-circ',
};

/** Artwork for a track: its own thumbnail, else the server's — local files have none. */
export const trackArtwork = (
  track: { id: string; source: string; thumbnail?: string },
  size?: 64 | 140 | 300 | 640,
): string | undefined => {
  if (track.thumbnail) return track.thumbnail;
  if (track.source === 'local') return undefined;
  // In the desktop window, straight from YouTube's image CDN rather than the backend's redirect.
  if (isInAppYoutubeAllowed() && track.id.startsWith('yt:')) return trackThumbUrl(track.id.slice(3));
  return `/api/v1/tracks/${track.id}/artwork${size ? `?size=${size}` : ''}`;
};

export const resolveArtworkUrl = (url?: string | null, targetSize?: number): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('file://')) return url;
  let resolved = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
    resolved = `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  const sizeParam = targetSize && (targetSize <= 64 ? 64 : targetSize <= 140 ? 140 : targetSize <= 300 ? 300 : 640);
  // In-app items carry YouTube CDN urls, which take their size in the url itself.
  if (sizeParam && /^https:\/\/[^/]*(ytimg\.com|googleusercontent\.com|ggpht\.com)\//.test(resolved)) {
    return sizedImageUrl(resolved, sizeParam);
  }
  if (sizeParam && resolved.includes('/artwork')) {
    const separator = resolved.includes('?') ? '&' : '?';
    if (!resolved.includes('size=')) {
      resolved = `${resolved}${separator}size=${sizeParam}`;
    }
  }

  return resolved;
};

const Artwork = ({ src, alt = '', variant = 'a1', size, radius = 'md', rings = false, className }: ArtworkProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // A local file's own cover (desktop window) is read from disk into a blob URL first.
  const fileSrc = src?.startsWith('file://') ? src : undefined;
  const [blobSrc, setBlobSrc] = useState<{ file: string; url?: string }>();
  useEffect(() => {
    if (!fileSrc) return;
    let live = true;
    void localArtUrl(fileSrc).then((url) => live && setBlobSrc({ file: fileSrc, url }));
    return () => {
      live = false;
    };
  }, [fileSrc]);

  const resolvedSrc = fileSrc ? (blobSrc?.file === fileSrc ? blobSrc.url : undefined) : resolveArtworkUrl(src, size);

  return (
    <span
      className={cn(
        'art relative overflow-hidden flex items-center justify-center flex-none select-none',
        variant,
        radiusClass[radius],
        rings && 'art-rings',
        className,
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
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  );
};
export default Artwork;
