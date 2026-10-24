import { describe, expect, it } from 'vitest';
import { base64ToBytes, pickArtColor } from '../../../../shared/color/artColor';

/** `count` pixels of one colour, as RGBA bytes. */
const fill = (count: number, [r, g, b, a = 255]: number[]): number[] =>
  Array.from({ length: count }, () => [r, g, b, a]).flat();

const hueOf = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

describe('shared artColor: the Now Playing glow colour', () => {
  it('ART-COLOR-001 a mostly grey cover with a red logo glows red', () => {
    const rgba = [...fill(200, [120, 120, 120]), ...fill(56, [220, 30, 40])];
    const hex = pickArtColor(rgba);
    expect(hex).not.toBeNull();
    const hue = hueOf(hex!);
    expect(hue < 15 || hue > 345).toBe(true);
  });

  it('ART-COLOR-002 a black-and-white cover gives null so the fixed colours stay', () => {
    const rgba = [...fill(128, [0, 0, 0]), ...fill(64, [255, 255, 255]), ...fill(64, [128, 128, 128])];
    expect(pickArtColor(rgba)).toBeNull();
    expect(pickArtColor([])).toBeNull();
  });

  it('ART-COLOR-003 clamps a very dark or very light colour to one that reads on the dark UI', () => {
    const darkBlue = pickArtColor(fill(64, [10, 10, 60]))!;
    const paleBlue = pickArtColor(fill(64, [200, 210, 250]))!;
    for (const hex of [darkBlue, paleBlue]) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
      expect(l).toBeGreaterThanOrEqual(0.34);
      expect(l).toBeLessThanOrEqual(0.61);
      expect(hueOf(hex)).toBeGreaterThan(200);
      expect(hueOf(hex)).toBeLessThan(260);
    }
  });

  it('ART-COLOR-004 averages hues across 0°, and ignores transparent pixels', () => {
    const rgba = [...fill(32, [230, 20, 60]), ...fill(32, [230, 60, 20]), ...fill(200, [0, 200, 0, 0])];
    const hue = hueOf(pickArtColor(rgba)!);
    expect(hue < 20 || hue > 340).toBe(true);
  });

  it('ART-COLOR-005 decodes the base64 RGBA Android sends', () => {
    expect(Array.from(base64ToBytes('3h4o/w=='))).toEqual([222, 30, 40, 255]);
    expect(Array.from(base64ToBytes(''))).toEqual([]);
  });
});
