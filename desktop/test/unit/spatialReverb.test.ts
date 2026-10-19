import { describe, expect, it } from 'vitest';
import { ROOMS } from '../../../shared/spatial';
import { FdnReverb, renderImpulse } from '../../../shared/spatialReverb';

describe('spatial reverb FDN engine', () => {
  it('WEB-SPATIAL-011 renderImpulse produces deterministic output across runs', () => {
    const ir1 = renderImpulse(ROOMS.stage, 48000);
    const ir2 = renderImpulse(ROOMS.stage, 48000);

    expect(ir1.left.length).toBe(ir2.left.length);
    expect(ir1.right.length).toBe(ir2.right.length);

    let maxDiff = 0;
    for (let i = 0; i < ir1.left.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(ir1.left[i] - ir2.left[i]));
      maxDiff = Math.max(maxDiff, Math.abs(ir1.right[i] - ir2.right[i]));
    }
    expect(maxDiff).toBe(0);
  });

  it('WEB-SPATIAL-012 energy is normalized to sum(h^2) = 1 per channel', () => {
    const ir = renderImpulse(ROOMS.cafe, 48000);

    let sumSqL = 0;
    let sumSqR = 0;
    for (let i = 0; i < ir.left.length; i++) {
      sumSqL += ir.left[i] * ir.left[i];
      sumSqR += ir.right[i] * ir.right[i];
    }

    expect(sumSqL).toBeCloseTo(1.0, 3);
    expect(sumSqR).toBeCloseTo(1.0, 3);
  });

  it('WEB-SPATIAL-013 energy decay curve gives RT60 within ±20%', () => {
    const fs = 48000;
    const room = ROOMS.stage; // rt60Low = 1.5s
    const fdn = new FdnReverb(room, fs);

    // Run FDN without early reflections to measure pure tail decay
    const tailSamples = Math.round(room.rt60Low * 1.5 * fs);
    const tailEnergy = new Float64Array(tailSamples);

    for (let n = 0; n < tailSamples; n++) {
      const [l, r] = fdn.processSample(n === 0 ? 1.0 : 0.0);
      tailEnergy[n] = 0.5 * (l * l + r * r);
    }

    // Schroeder reverse integration: E(n) = sum_{k=n}^N tailEnergy[k]
    const schroeder = new Float64Array(tailSamples);
    let running = 0;
    for (let n = tailSamples - 1; n >= 0; n--) {
      running += tailEnergy[n];
      schroeder[n] = running;
    }

    const e0 = schroeder[0];
    expect(e0).toBeGreaterThan(0);

    // Find sample indices where energy reaches -5 dB and -25 dB (a 20 dB drop)
    const db5 = e0 * Math.pow(10, -5 / 10);
    const db25 = e0 * Math.pow(10, -25 / 10);

    let idx5 = 0;
    let idx25 = 0;
    for (let n = 0; n < tailSamples; n++) {
      if (schroeder[n] <= db5 && idx5 === 0) idx5 = n;
      if (schroeder[n] <= db25 && idx25 === 0) {
        idx25 = n;
        break;
      }
    }

    expect(idx5).toBeGreaterThan(0);
    expect(idx25).toBeGreaterThan(idx5);

    // Time for 20 dB decay: dt20 = (idx25 - idx5) / fs
    // Extrapolated RT60 = dt20 * (60 / 20) = dt20 * 3
    const dt20 = (idx25 - idx5) / fs;
    const estimatedRt60 = dt20 * 3;

    // Expected RT60 for broadband is between rt60High (0.9s) and rt60Low (1.5s)
    // Within ±20% of range [0.9s, 1.5s], say 0.75s to 1.8s
    expect(estimatedRt60).toBeGreaterThanOrEqual(room.rt60High * 0.8);
    expect(estimatedRt60).toBeLessThanOrEqual(room.rt60Low * 1.25);
  });

  it('WEB-SPATIAL-014 early reflection taps land at the right sample offsets', () => {
    const fs = 48000;
    const room = ROOMS.cafe;
    const ir = renderImpulse(room, fs);

    for (const er of room.earlyReflections) {
      const sampleIdx = Math.round((er.delayMs / 1000) * fs);
      const ch = er.channel === 'L' ? ir.left : ir.right;
      // Energy around sampleIdx should have a spike
      expect(Math.abs(ch[sampleIdx])).toBeGreaterThan(0);
    }
  });

  it('WEB-SPATIAL-015 impulse response lengths follow Cafe < Concert < Hall', () => {
    const cafeIr = renderImpulse(ROOMS.cafe, 48000);
    const stageIr = renderImpulse(ROOMS.stage, 48000);
    const hallIr = renderImpulse(ROOMS.hall, 48000);

    expect(cafeIr.left.length).toBeLessThan(stageIr.left.length);
    expect(stageIr.left.length).toBeLessThan(hallIr.left.length);
  });
});
