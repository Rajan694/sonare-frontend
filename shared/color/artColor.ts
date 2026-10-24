/**
 * The Now Playing glow's colour, picked from a cover's pixels. Both apps shrink the art to a
 * few pixels first (desktop with a canvas, Android natively) and pass the RGBA bytes here.
 *
 * Vivid colours win over large areas, so a mostly grey cover with a red logo glows red. A cover
 * with hardly any colour (black and white, greyscale) gives null and the app keeps its fixed
 * colours. The result is clamped to a saturation and lightness that read on the dark UI.
 */

const HUE_BUCKETS = 12;
/** Below this share of colour-weighted pixels the cover counts as colourless. */
const MIN_COLOURFUL = 0.04;

const toHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rf) h = ((gf - bf) / d) % 6;
  else if (max === gf) h = (bf - rf) / d + 2;
  else h = (rf - gf) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
};

const toHex = (h: number, s: number, l: number): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const byte = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Bucket {
  weight: number;
  // Hue is averaged as a vector, so 350° and 10° average to 0°, not 180°.
  x: number;
  y: number;
  s: number;
  l: number;
}

/** `rgba` is 4 bytes per pixel. Returns `#rrggbb`, or null for a colourless cover. */
export const pickArtColor = (rgba: ArrayLike<number>): string | null => {
  const buckets: Bucket[] = Array.from({ length: HUE_BUCKETS }, () => ({ weight: 0, x: 0, y: 0, s: 0, l: 0 }));
  let pixels = 0;
  let total = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue; // transparent
    pixels++;
    const [h, s, l] = toHsl(rgba[i], rgba[i + 1], rgba[i + 2]);
    // Near-black, near-white and grey pixels carry no colour worth glowing.
    if (s < 0.2 || l < 0.08 || l > 0.92) continue;
    // Chroma-like weight: saturated mid-tones count most.
    const weight = s * (1 - Math.abs(2 * l - 1));
    const b = buckets[Math.floor(h / (360 / HUE_BUCKETS)) % HUE_BUCKETS];
    const rad = (h * Math.PI) / 180;
    b.weight += weight;
    b.x += Math.cos(rad) * weight;
    b.y += Math.sin(rad) * weight;
    b.s += s * weight;
    b.l += l * weight;
    total += weight;
  }
  if (pixels === 0 || total / pixels < MIN_COLOURFUL) return null;

  const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
  const hue = ((Math.atan2(best.y, best.x) * 180) / Math.PI + 360) % 360;
  return toHex(hue, clamp(best.s / best.weight, 0.45, 0.85), clamp(best.l / best.weight, 0.35, 0.6));
};

/** Base64 RGBA (what Android's SonareLibrary.artworkPixels returns) to bytes for pickArtColor. */
export const base64ToBytes = (b64: string): Uint8Array => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let o = 0;
  for (const ch of clean) {
    value = (value << 6) | alphabet.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (value >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
};
