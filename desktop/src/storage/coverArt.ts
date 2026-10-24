import { jpegImageUrl } from '../../../shared/catalog/images';
import { resolveArtworkUrl, trackArtwork } from '../components/music/Artwork';

/** A cover to embed in a downloaded file (oggOpus.ts, mp4Cover.ts). */
export interface Cover {
  data: Uint8Array;
  mime: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
}

const be16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

/**
 * Type and size of a JPEG or PNG from its header (JPEG: the first start-of-frame marker; PNG:
 * IHDR). Null for anything else, e.g. a WebP, which players don't take as cover art.
 */
export const imageInfo = (b: Uint8Array): Omit<Cover, 'data'> | null => {
  if (b.length > 24 && be32(b, 0) === 0x89504e47 && be32(b, 12) === 0x49484452) {
    return { mime: 'image/png', width: be32(b, 16), height: be32(b, 20) };
  }
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    // Fill bytes, and markers that carry no length.
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    // SOF0..SOF15, leaving out DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { mime: 'image/jpeg', height: be16(b, i + 5), width: be16(b, i + 7) };
    }
    i += 2 + be16(b, i + 2);
  }
  return null;
};

/**
 * The song's cover, about 640 px, as JPEG where the CDN offers it. Null when it can't be fetched
 * in 10 s or isn't a JPEG or PNG: the file is then tagged without one.
 */
export const fetchCover = async (track: { id: string; source: string; thumbnail?: string }): Promise<Cover | null> => {
  const url = resolveArtworkUrl(trackArtwork(track, 640), 640);
  if (!url) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10_000);
  try {
    const res = await fetch(jpegImageUrl(url), { signal: abort.signal });
    if (!res.ok) return null;
    const data = new Uint8Array(await res.arrayBuffer());
    const info = imageInfo(data);
    return info && { data, ...info };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
