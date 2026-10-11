import { describe, expect, it } from 'vitest';
import { placeholderPeaks, resamplePeaks, CANONICAL_BARS } from '../../../../shared/catalog/peaks';

describe('sharedCatalog: peaks', () => {
  const PINNED_8_BARS = [
    0.3, 0.3764484801310155, 0.7973107469500973, 0.5106853423154952, 1, 0.6851863099242606, 0.8997021298622712,
    0.7015426778913516,
  ];

  it('WEB-CAT-061: placeholderPeaks produces deterministic waveform matching pinned literal array for yt:NJAv_7lHUIU', () => {
    const peaks = placeholderPeaks('yt:NJAv_7lHUIU', 8);
    expect(peaks).toEqual(PINNED_8_BARS);
    expect(peaks.every((p) => p >= 0.3 && p <= 1)).toBe(true);

    const full = placeholderPeaks('yt:NJAv_7lHUIU', CANONICAL_BARS);
    expect(full).toHaveLength(CANONICAL_BARS);
    expect(full.every((p) => p >= 0.3 && p <= 1)).toBe(true);
    expect(placeholderPeaks('yt:NJAv_7lHUIU', CANONICAL_BARS)).toEqual(full);
  });

  it('WEB-CAT-062: resamplePeaks downsamples with max-pooling when shrinking', () => {
    const input = [0.1, 0.9, 0.4, 0.2];
    const resampled = resamplePeaks(input, 2);
    expect(resampled).toEqual([0.9, 0.4]);

    const input150 = Array.from({ length: 150 }, (_, i) => i / 150);
    const resampled76 = resamplePeaks(input150, 76);
    expect(resampled76).toHaveLength(76);
    expect(resampled76[0]).toBe(input150[0]);
    expect(resampled76[1]).toBe(Math.max(input150[1], input150[2]));
  });

  it('WEB-CAT-063: resamplePeaks upsamples with linear interpolation when growing and handles edge cases', () => {
    const input2 = [0.2, 0.8];
    expect(resamplePeaks(input2, 3)).toEqual([0.2, 0.5, 0.8]);

    const input3 = [0, 0.5, 1];
    expect(resamplePeaks(input3, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);

    // Edge cases
    expect(resamplePeaks([], 10)).toEqual([]);
    expect(resamplePeaks([0.5, 0.8], 0)).toEqual([]);
    expect(resamplePeaks([0.5, 0.8], -5)).toEqual([]);
    expect(resamplePeaks([0.5, 0.8], 2)).toEqual([0.5, 0.8]);
    expect(resamplePeaks([0.6], 4)).toEqual([0.6, 0.6, 0.6, 0.6]);
  });
});
