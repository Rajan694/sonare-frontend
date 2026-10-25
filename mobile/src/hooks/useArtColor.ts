import { useEffect, useState } from 'react';
import { SonareLibrary } from '../native/SonareLibrary';
import { base64ToBytes, pickArtColor } from '../../../shared/color/artColor';

/** Picked colours by cover url; null for a cover with no colour to glow (or that can't be read). */
export const artColorCache = new Map<string, string | null>();

export const clearArtColorCache = () => {
  artColorCache.clear();
};

/**
 * The Now Playing glow's colour, from the cover shrunk to 16 x 16 (shared/color/artColor.ts).
 * Null while it is worked out, for a colourless cover and on any error: the player then keeps
 * today's look (the blurred cover alone).
 */
export const useArtColor = (uri?: string | null): string | null => {
  const [picked, setPicked] = useState<{ uri: string; color: string | null } | null>(null);

  useEffect(() => {
    if (!uri || artColorCache.has(uri)) return;
    let active = true;
    const done = (color: string | null) => {
      artColorCache.set(uri, color);
      if (active) setPicked({ uri, color });
    };
    SonareLibrary.artworkPixels(uri, 16)
      .then((pixels) => done(pixels ? pickArtColor(base64ToBytes(pixels)) : null))
      .catch(() => done(null));
    return () => {
      active = false;
    };
  }, [uri]);

  if (!uri) return null;
  if (artColorCache.has(uri)) return artColorCache.get(uri) ?? null;
  return picked?.uri === uri ? picked.color : null;
};
