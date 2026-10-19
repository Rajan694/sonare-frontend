import type { RoomDefinition } from './spatial';

const NOMINAL_DELAYS = [1031, 1327, 1523, 1801, 2053, 2311, 2633, 2939];

export interface ImpulseResponse {
  left: Float32Array;
  right: Float32Array;
  Re: number;
  Eer: number;
}

const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

/**
 * Pure 8-line Feedback Delay Network reverb engine.
 * Can run sample-by-sample for real-time processing or render impulse responses.
 */
export class FdnReverb {
  private readonly sampleRate: number;
  private readonly delays: number[];
  private readonly lineBuffers: Float32Array[];
  private readonly lineIndices: Int32Array;
  private readonly lineGains: Float32Array;
  private readonly dampPrev: Float32Array;
  private readonly dampCoeff: number;

  private readonly preDelayBuffer: Float32Array;
  private preDelayIndex = 0;
  private readonly preDelayLength: number;

  private hpXPrev = 0;
  private hpYPrev = 0;
  private readonly hpAlpha: number;

  constructor(room: RoomDefinition, sampleRate: number) {
    this.sampleRate = sampleRate;

    // Delay lengths scaled by room sizeScale and sample rate
    this.delays = NOMINAL_DELAYS.map((d) => {
      const len = Math.round(d * room.sizeScale * (sampleRate / 48000));
      return Math.max(2, len);
    });

    this.lineBuffers = this.delays.map((len) => new Float32Array(len));
    this.lineIndices = new Int32Array(8);
    this.dampPrev = new Float32Array(8);

    // Per-line decay gain: g = 10^(-3 * L / (rt60Low * fs))
    this.lineGains = new Float32Array(8);
    for (let i = 0; i < 8; i++) {
      this.lineGains[i] = Math.pow(10, (-3 * this.delays[i]) / (room.rt60Low * sampleRate));
    }

    // Damping one-pole low-pass: y[n] = (1 - d)*x[n] + d*y[n-1]
    const wc = (2 * Math.PI * room.dampingHz) / sampleRate;
    this.dampCoeff = clamp(Math.exp(-wc), 0.05, 0.75);

    // Pre-delay buffer
    this.preDelayLength = Math.max(1, Math.round((room.preDelayMs / 1000) * sampleRate));
    this.preDelayBuffer = new Float32Array(this.preDelayLength);

    // Send low-cut 1-pole high-pass: y[n] = alpha * (y[n-1] + x[n] - x[n-1])
    const hpW = (2 * Math.PI * room.sendLowCutHz) / sampleRate;
    this.hpAlpha = Math.exp(-hpW);
  }

  processSample(input: number): [number, number] {
    // 1. Send low-cut high-pass
    const hpY = this.hpAlpha * (this.hpYPrev + input - this.hpXPrev);
    this.hpXPrev = input;
    this.hpYPrev = hpY;

    // 2. Pre-delay
    const delayedInput = this.preDelayBuffer[this.preDelayIndex];
    this.preDelayBuffer[this.preDelayIndex] = hpY;
    this.preDelayIndex = (this.preDelayIndex + 1) % this.preDelayLength;

    // 3. Read output from each delay line
    const out0 = this.lineBuffers[0][this.lineIndices[0]];
    const out1 = this.lineBuffers[1][this.lineIndices[1]];
    const out2 = this.lineBuffers[2][this.lineIndices[2]];
    const out3 = this.lineBuffers[3][this.lineIndices[3]];
    const out4 = this.lineBuffers[4][this.lineIndices[4]];
    const out5 = this.lineBuffers[5][this.lineIndices[5]];
    const out6 = this.lineBuffers[6][this.lineIndices[6]];
    const out7 = this.lineBuffers[7][this.lineIndices[7]];

    // 4. Decorrelated output taps (scaled)
    const outL = (out0 - out2 + out4 - out6) * 0.5;
    const outR = (out1 + out3 - out5 - out7) * 0.5;

    // 5. Householder feedback matrix: y_i = out_i - 0.25 * sum(out)
    const sum = out0 + out1 + out2 + out3 + out4 + out5 + out6 + out7;
    const quarterSum = 0.25 * sum;

    const fb0 = out0 - quarterSum;
    const fb1 = out1 - quarterSum;
    const fb2 = out2 - quarterSum;
    const fb3 = out3 - quarterSum;
    const fb4 = out4 - quarterSum;
    const fb5 = out5 - quarterSum;
    const fb6 = out6 - quarterSum;
    const fb7 = out7 - quarterSum;

    // 6. Line damping & feedback injection
    const d = this.dampCoeff;
    const oneMinusD = 1 - d;

    const in0 = delayedInput + fb0 * this.lineGains[0];
    const d0 = oneMinusD * in0 + d * this.dampPrev[0];
    this.dampPrev[0] = d0;
    this.lineBuffers[0][this.lineIndices[0]] = d0;
    this.lineIndices[0] = (this.lineIndices[0] + 1) % this.delays[0];

    const in1 = delayedInput + fb1 * this.lineGains[1];
    const d1 = oneMinusD * in1 + d * this.dampPrev[1];
    this.dampPrev[1] = d1;
    this.lineBuffers[1][this.lineIndices[1]] = d1;
    this.lineIndices[1] = (this.lineIndices[1] + 1) % this.delays[1];

    const in2 = delayedInput + fb2 * this.lineGains[2];
    const d2 = oneMinusD * in2 + d * this.dampPrev[2];
    this.dampPrev[2] = d2;
    this.lineBuffers[2][this.lineIndices[2]] = d2;
    this.lineIndices[2] = (this.lineIndices[2] + 1) % this.delays[2];

    const in3 = delayedInput + fb3 * this.lineGains[3];
    const d3 = oneMinusD * in3 + d * this.dampPrev[3];
    this.dampPrev[3] = d3;
    this.lineBuffers[3][this.lineIndices[3]] = d3;
    this.lineIndices[3] = (this.lineIndices[3] + 1) % this.delays[3];

    const in4 = delayedInput + fb4 * this.lineGains[4];
    const d4 = oneMinusD * in4 + d * this.dampPrev[4];
    this.dampPrev[4] = d4;
    this.lineBuffers[4][this.lineIndices[4]] = d4;
    this.lineIndices[4] = (this.lineIndices[4] + 1) % this.delays[4];

    const in5 = delayedInput + fb5 * this.lineGains[5];
    const d5 = oneMinusD * in5 + d * this.dampPrev[5];
    this.dampPrev[5] = d5;
    this.lineBuffers[5][this.lineIndices[5]] = d5;
    this.lineIndices[5] = (this.lineIndices[5] + 1) % this.delays[5];

    const in6 = delayedInput + fb6 * this.lineGains[6];
    const d6 = oneMinusD * in6 + d * this.dampPrev[6];
    this.dampPrev[6] = d6;
    this.lineBuffers[6][this.lineIndices[6]] = d6;
    this.lineIndices[6] = (this.lineIndices[6] + 1) % this.delays[6];

    const in7 = delayedInput + fb7 * this.lineGains[7];
    const d7 = oneMinusD * in7 + d * this.dampPrev[7];
    this.dampPrev[7] = d7;
    this.lineBuffers[7][this.lineIndices[7]] = d7;
    this.lineIndices[7] = (this.lineIndices[7] + 1) % this.delays[7];

    return [outL, outR];
  }
}

/**
 * Renders an energy-normalized impulse response for the given room and sample rate.
 * Impulse length is min(1.1 * rt60Low + preDelay, 3.0s), with a 20 ms fade-out.
 * Normalized so that sum(h^2) = 1 per channel.
 */
export function renderImpulse(room: RoomDefinition, sampleRate: number): ImpulseResponse {
  const lengthSec = Math.min(1.1 * room.rt60Low + room.preDelayMs / 1000, 3.0);
  const totalSamples = Math.round(lengthSec * sampleRate);

  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // 1. Add early reflections
  for (const er of room.earlyReflections) {
    const sampleIdx = Math.round((er.delayMs / 1000) * sampleRate);
    if (sampleIdx < totalSamples) {
      if (er.channel === 'L') {
        left[sampleIdx] += er.gain;
      } else {
        right[sampleIdx] += er.gain;
      }
    }
  }

  // 2. Run FDN for the full duration with unit impulse at sample 0
  const fdn = new FdnReverb(room, sampleRate);
  for (let n = 0; n < totalSamples; n++) {
    const input = n === 0 ? 1.0 : 0.0;
    const [revL, revR] = fdn.processSample(input);
    left[n] += revL;
    right[n] += revR;
  }

  // 3. 20 ms linear/cosine fade out at the tail
  const fadeSamples = Math.min(totalSamples, Math.round(0.02 * sampleRate));
  const fadeStart = totalSamples - fadeSamples;
  for (let i = 0; i < fadeSamples; i++) {
    const idx = fadeStart + i;
    const fade = 0.5 * (1 + Math.cos((Math.PI * i) / fadeSamples));
    left[idx] *= fade;
    right[idx] *= fade;
  }

  // 4. Energy normalization: sum(h^2) = 1 per channel
  let energyL = 0;
  let energyR = 0;
  for (let i = 0; i < totalSamples; i++) {
    energyL += left[i] * left[i];
    energyR += right[i] * right[i];
  }

  const normL = energyL > 0 ? 1 / Math.sqrt(energyL) : 1;
  const normR = energyR > 0 ? 1 / Math.sqrt(energyR) : 1;

  for (let i = 0; i < totalSamples; i++) {
    left[i] *= normL;
    right[i] *= normR;
  }

  return {
    left,
    right,
    Re: 1.0,
    Eer: room.Eer,
  };
}
