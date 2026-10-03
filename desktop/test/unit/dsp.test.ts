import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

/** Just enough of Web Audio to see what the DSP chain sets: each param keeps its target. */
class Param {
  constructor(public value = 0) {}
  setTargetAtTime(v: number) {
    this.value = v;
  }
}
class Node {
  connections: unknown[] = [];
  connect(n: unknown) {
    this.connections.push(n);
    return n;
  }
}
class Biquad extends Node {
  type = 'peaking';
  frequency = new Param();
  Q = new Param();
  gain = new Param();
}
class Gain extends Node {
  gain = new Param(1);
  channelCount = 1;
  channelCountMode = 'max';
  channelInterpretation = 'speakers';
}
class Compressor extends Node {
  threshold = new Param(-24);
  ratio = new Param(12);
  knee = new Param();
  attack = new Param();
  release = new Param();
}
let contexts: FakeContext[] = [];
class FakeContext {
  state = 'running';
  currentTime = 0;
  destination = new Node();
  biquads: Biquad[] = [];
  gains: Gain[] = [];
  comp!: Compressor;
  constructor() {
    contexts.push(this);
  }
  createMediaElementSource() {
    return new Node();
  }
  createBiquadFilter() {
    const b = new Biquad();
    this.biquads.push(b);
    return b;
  }
  createGain() {
    const g = new Gain();
    this.gains.push(g);
    return g;
  }
  createChannelSplitter() {
    return new Node();
  }
  createChannelMerger() {
    return new Node();
  }
  createDynamicsCompressor() {
    this.comp = new Compressor();
    return this.comp;
  }
  async resume() {
    this.state = 'running';
  }
}

async function fresh() {
  vi.resetModules();
  const settings = await import('../../src/storage/settings');
  const dsp = await import('../../src/audio/dsp');
  return { ...settings, ...dsp };
}

afterEach(() => {
  vi.unstubAllGlobals();
  contexts = [];
});

const stored = () => JSON.parse(localStorage.getItem('sonare_dsp')!);

describe('equalizer state', () => {
  it('WEB-DSP-001 starts flat, and restores a saved curve', async () => {
    let d = await fresh();
    expect(d.getDsp()).toMatchObject({ enabled: true, preset: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0], speed: 1 });
    localStorage.setItem(
      'sonare_dsp',
      JSON.stringify({ preset: 'Custom', gains: [1, 2, 3, 4, 5, 6, 7, 8], bassBoost: 40 }),
    );
    d = await fresh();
    expect(d.getDsp()).toMatchObject({
      preset: 'Custom',
      gains: [1, 2, 3, 4, 5, 6, 7, 8],
      bassBoost: 40,
      enabled: true,
    });
  });

  it('WEB-DSP-002 a saved curve with the wrong number of bands, or unreadable, falls back to flat', async () => {
    localStorage.setItem('sonare_dsp', JSON.stringify({ gains: [1, 2, 3] }));
    expect((await fresh()).getDsp().gains).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    localStorage.setItem('sonare_dsp', '{oops');
    expect((await fresh()).getDsp().preset).toBe('Flat');
  });

  it('WEB-DSP-003 moving a band clamps it to ±12 dB, switches to Custom and is remembered', async () => {
    const d = await fresh();
    d.setBandGain(2, 20);
    d.setBandGain(5, -30);
    d.setBandGain(0, 3.5);
    expect(d.getDsp().gains).toEqual([3.5, 0, 12, 0, 0, -12, 0, 0]);
    expect(d.getDsp().preset).toBe(d.CUSTOM_PRESET);
    expect(stored().gains).toEqual([3.5, 0, 12, 0, 0, -12, 0, 0]);
  });

  it('WEB-DSP-004 choosing a preset loads its curve and saves the preset to the account', async () => {
    const d = await fresh();
    d.applyPreset('Bass');
    expect(d.getDsp()).toMatchObject({ preset: 'Bass', gains: d.EQ_PRESETS.Bass });
    expect(d.getSettings().eqPreset).toBe('Bass');
    // Editing the loaded curve must not change the preset table.
    d.setBandGain(0, -1);
    expect(d.EQ_PRESETS.Bass[0]).toBe(6);
  });

  it('WEB-DSP-005 an unknown preset name changes nothing', async () => {
    const d = await fresh();
    d.applyPreset('Nope');
    expect(d.getDsp().preset).toBe('Flat');
    expect(d.getSettings().eqPreset).toBe('Flat');
  });

  it('WEB-DSP-006 releasing a fader commits the current preset name', async () => {
    const d = await fresh();
    d.setBandGain(1, 2);
    d.commitPreset();
    expect(d.getSettings().eqPreset).toBe('Custom');
  });

  it("WEB-DSP-007 adopts the account's preset after sign-in, unless the user has a custom curve", async () => {
    let d = await fresh();
    d.updateSettings({ eqPreset: 'Vocal' });
    expect(d.getDsp()).toMatchObject({ preset: 'Vocal', gains: d.EQ_PRESETS.Vocal });

    d = await fresh();
    d.setBandGain(3, 5);
    d.updateSettings({ eqPreset: 'Acoustic' });
    expect(d.getDsp().preset).toBe('Custom');
    expect(d.getDsp().gains[3]).toBe(5);
  });

  it('WEB-DSP-008 useDsp re-renders on changes', async () => {
    const d = await fresh();
    const { result } = renderHook(() => d.useDsp());
    act(() => d.setDsp({ speed: 1.25 }));
    expect(result.current.speed).toBe(1.25);
  });
});

describe('audio graph', () => {
  it('WEB-DSP-009 playback speed reaches the element and keeps the pitch', async () => {
    const d = await fresh();
    const el = document.createElement('audio');
    d.bindElement(el);
    d.setDsp({ speed: 1.5 });
    expect(el.playbackRate).toBe(1.5);
    expect(el.defaultPlaybackRate).toBe(1.5);
    expect((el as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch).toBe(true);
  });

  it('WEB-DSP-010 builds 8 EQ bands (low shelf, peaks, high shelf) and applies the curve', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    d.applyPreset('Sonare');
    await d.ensureGraph();
    const ctx = contexts[0];
    const bands = ctx.biquads.slice(0, 8);
    expect(bands.map((b) => b.frequency.value)).toEqual([...d.EQ_BANDS]);
    expect(bands.map((b) => b.type)).toEqual([
      'lowshelf',
      'peaking',
      'peaking',
      'peaking',
      'peaking',
      'peaking',
      'peaking',
      'highshelf',
    ]);
    expect(bands.map((b) => b.gain.value)).toEqual(d.EQ_PRESETS.Sonare);
    // Building twice reuses the same graph.
    await d.ensureGraph();
    expect(contexts).toHaveLength(1);
  });

  it('WEB-DSP-011 turning the EQ off flattens every stage without tearing the graph down', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    d.setDsp({ gains: [5, 5, 5, 5, 5, 5, 5, 5], bassBoost: 100, virtualizer: 100 });
    await d.ensureGraph();
    const ctx = contexts[0];
    const bass = ctx.biquads[8];
    expect(bass.gain.value).toBe(12);
    d.setDsp({ enabled: false });
    expect(ctx.biquads.slice(0, 8).every((b) => b.gain.value === 0)).toBe(true);
    expect(bass.gain.value).toBe(0);
  });

  it('WEB-DSP-012 the virtualizer widens stereo: full width is 2.5x, zero is untouched', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    // gains[0] is the upmix; then ll, rl, lr, rr.
    const [, ll, rl, lr, rr] = contexts[0].gains;
    expect([ll, rl, lr, rr].map((g) => g.gain.value)).toEqual([1, 0, 0, 1]);
    d.setDsp({ virtualizer: 100 });
    expect([ll.gain.value, rr.gain.value]).toEqual([1.75, 1.75]);
    expect([rl.gain.value, lr.gain.value]).toEqual([-0.75, -0.75]);
  });

  it('WEB-DSP-013 loudness normalization is a gentle compressor; off is a pass-through', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const comp = contexts[0].comp;
    expect([comp.threshold.value, comp.ratio.value]).toEqual([-24, 4]);
    d.updateSettings({ normalization: false });
    expect([comp.threshold.value, comp.ratio.value]).toEqual([0, 1]);
  });

  it('WEB-DSP-014 without Web Audio, playback carries on unprocessed', async () => {
    vi.stubGlobal('AudioContext', function Broken() {
      throw new Error('not supported');
    });
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    await expect(d.ensureGraph()).resolves.toBeUndefined();
    await expect(d.graphInput()).resolves.toBeNull();
  });

  it('WEB-DSP-015 a suspended context is resumed on the next play', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    contexts[0].state = 'suspended';
    await d.ensureGraph();
    expect(contexts[0].state).toBe('running');
  });
});
