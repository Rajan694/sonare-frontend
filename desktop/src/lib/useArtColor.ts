import { useEffect, useState } from 'react';
import { pickArtColor } from '../../../shared/color/artColor';
import { resolveArtworkUrl } from '../components/music/Artwork';
import { localArtUrl } from '../storage/local';

/** Picked colours by artwork url; null for a cover with no colour to glow (or one that can't be read). */
export const artColorCache = new Map<string, string | null>();

/** Draws `src` at 16 x 16 and picks its colour; null when it won't load or the canvas is tainted. */
const sample = (src: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    // The cover CDNs send Access-Control-Allow-Origin, so the canvas stays readable.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 16, 16);
        resolve(pickArtColor(ctx.getImageData(0, 0, 16, 16).data));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

/**
 * The Now Playing glow's colour, from the cover (shared/color/artColor.ts). Null while it is worked
 * out, for a colourless cover and on any error: the screen then keeps its fixed colours. A local
 * file's own cover (file://) is read through the same blob URL the Artwork shows.
 */
export const useArtColor = (src?: string | null): string | null => {
  const [picked, setPicked] = useState<{ src: string; color: string | null } | null>(null);

  useEffect(() => {
    if (!src || artColorCache.has(src)) return;
    let live = true;
    void (async () => {
      const url = src.startsWith('file://') ? await localArtUrl(src) : resolveArtworkUrl(src, 140);
      const color = url ? await sample(url) : null;
      artColorCache.set(src, color);
      if (live) setPicked({ src, color });
    })();
    return () => {
      live = false;
    };
  }, [src]);

  if (!src) return null;
  if (artColorCache.has(src)) return artColorCache.get(src) ?? null;
  return picked?.src === src ? picked.color : null;
};
