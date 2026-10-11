import { describe, expect, it } from 'vitest';
import {
  placeholderPeaks,
  resamplePeaks,
  CANONICAL_BARS,
  emptyHeardPeaks,
  finishedPeaks,
  heardCount,
  mergeHeardPeaks,
  recordPeak,
} from '../../../../shared/catalog/peaks';

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

  it("WEB-CAT-081: recordPeak fills the bars a stretch of the song touches, keeping each bar's loudest level", () => {
    const heard = emptyHeardPeaks();
    expect(heard).toHaveLength(CANONICAL_BARS);
    // A 150 s song: one bar per second.
    expect(recordPeak(heard, 150_000, 1_500, 2_500, 0.4)).toBe(true);
    expect(heard.slice(0, 4)).toEqual([null, 0.4, 0.4, null]);
    // Quieter adds nothing; louder raises the bar.
    expect(recordPeak(heard, 150_000, 1_600, 1_700, 0.2)).toBe(false);
    expect(recordPeak(heard, 150_000, 1_600, 1_700, 0.9)).toBe(true);
    expect(heard[1]).toBe(0.9);
    // Before the start and past the end are clamped; levels too.
    recordPeak(heard, 150_000, -170, 50, 1.5);
    recordPeak(heard, 150_000, 149_900, 151_000, 0.3);
    expect(heard[0]).toBe(1);
    expect(heard[149]).toBe(0.3);
    expect(heardCount(heard)).toBe(4);
    // Nothing to place without a length or a level.
    expect(recordPeak(heard, 0, 0, 100, 0.5)).toBe(false);
    expect(recordPeak(heard, 150_000, 0, 100, Number.NaN)).toBe(false);
  });

  it('WEB-CAT-082: a waveform is finished only when every bar is heard, scaled so the loudest is 1', () => {
    const heard = emptyHeardPeaks();
    for (let i = 0; i < CANONICAL_BARS - 1; i++) heard[i] = 0.25;
    expect(finishedPeaks(heard)).toBeNull();
    heard[CANONICAL_BARS - 1] = 0.5;
    const done = finishedPeaks(heard)!;
    expect(done).toHaveLength(CANONICAL_BARS);
    expect(done[0]).toBe(0.5);
    expect(done[CANONICAL_BARS - 1]).toBe(1);
    // A silent song has nothing worth uploading.
    expect(finishedPeaks(emptyHeardPeaks().map(() => 0))).toBeNull();
  });

  it('WEB-CAT-083: mergeHeardPeaks draws heard bars scaled to the loudest, the placeholder elsewhere', () => {
    const heard = emptyHeardPeaks();
    heard[0] = 0.2;
    heard[1] = 0.8;
    heard[2] = 0;
    const fallback = placeholderPeaks('yt:abc', CANONICAL_BARS);
    const { peaks, real } = mergeHeardPeaks(heard, fallback);
    expect(peaks.slice(0, 4)).toEqual([0.25, 1, 0.05, fallback[3]]);
    expect(real.slice(0, 4)).toEqual([true, true, true, false]);
    // A placeholder at another bar count is resampled to the canonical one.
    expect(mergeHeardPeaks(heard, placeholderPeaks('yt:abc', 80)).peaks).toHaveLength(CANONICAL_BARS);
    // Nothing heard yet (or only silence): all placeholder.
    expect(mergeHeardPeaks(emptyHeardPeaks(), fallback).real.every((r) => !r)).toBe(true);
  });
});
