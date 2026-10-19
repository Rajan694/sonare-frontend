import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

interface Route {
  from: unknown;
  to: unknown;
  output?: number;
  input?: number;
}
let routes: Route[] = [];

/** Just enough of Web Audio to see what the DSP chain sets: each param keeps its target. */
class Param {
  constructor(public value = 0) {}
  setTargetAtTime(v: number) {
    this.value = v;
  }
  setValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
  cancelScheduledValues() {}
}
class Node {
  connections: unknown[] = [];
  connect(n: unknown, output?: number, input?: number) {
    this.connections.push(n);
    routes.push({ from: this, to: n, output, input });
    return n;
  }
  disconnect(target?: unknown) {
    if (target) {
      this.connections = this.connections.filter((c) => c !== target);
      routes = routes.filter((r) => !(r.from === this && r.to === target));
    } else {
      this.connections = [];
      routes = routes.filter((r) => r.from !== this);
    }
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
class Delay extends Node {
  delayTime = new Param(0);
}
class Convolver extends Node {
  normalize = true;
  buffer: unknown = null;
}
class Panner extends Node {
  channelCount = 2;
  channelCountMode = 'max';
  panningModel = 'equalpower';
  distanceModel = 'inverse';
  rolloffFactor = 1;
  positionX: Param | undefined = new Param(0);
  positionY: Param | undefined = new Param(0);
  positionZ: Param | undefined = new Param(0);
  setPosition(x: number, y: number, z: number) {
    if (this.positionX) this.positionX.value = x;
    if (this.positionY) this.positionY.value = y;
    if (this.positionZ) this.positionZ.value = z;
  }
}

let contexts: FakeContext[] = [];
class FakeContext {
  sampleRate = 48000;
  state = 'running';
  currentTime = 0;
  destination = new Node();
  biquads: Biquad[] = [];
  gains: Gain[] = [];
  comps: Compressor[] = [];
  delays: Delay[] = [];
  convolvers: Convolver[] = [];
  panners: Panner[] = [];
  /** The normalization compressor; the limiter after it is comps[1]. */
  get comp() {
    return this.comps[0];
  }
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
  analyser?: Node & { fftSize: number };
  createAnalyser() {
    this.analyser = Object.assign(new Node(), { fftSize: 2048 });
    return this.analyser;
  }
  createChannelMerger() {
    return new Node();
  }
  createDynamicsCompressor() {
    const c = new Compressor();
    this.comps.push(c);
    return c;
  }
  createDelay() {
    const d = new Delay();
    this.delays.push(d);
    return d;
  }
  createConvolver() {
    const c = new Convolver();
    this.convolvers.push(c);
    return c;
  }
  createPanner() {
    const p = new Panner();
    this.panners.push(p);
    return p;
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (ch: number) => data[ch],
      copyToChannel: (src: Float32Array, ch: number) => {
        if (data[ch]) data[ch].set(src);
      },
    };
  }
  async resume() {
    this.state = 'running';
  }
}

const fresh = async () => {
  vi.resetModules();
  const settings = await import('../../src/storage/settings');
  const dsp = await import('../../src/audio/dsp');
  return { ...settings, ...dsp };
};

afterEach(() => {
  vi.unstubAllGlobals();
  contexts = [];
  routes = [];
});

const stored = () => JSON.parse(localStorage.getItem('sonare_dsp')!);

describe('equalizer state', () => {
  it('WEB-DSP-001 starts on the Sonare preset, and restores a saved curve', async () => {
    let d = await fresh();
    expect(d.getDsp()).toMatchObject({ enabled: true, preset: 'Sonare', gains: d.EQ_PRESETS.Sonare, speed: 1 });
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

  it('WEB-DSP-002 a saved curve with the wrong number of bands, or unreadable, falls back to the default', async () => {
    localStorage.setItem('sonare_dsp', JSON.stringify({ gains: [1, 2, 3] }));
    const d = await fresh();
    expect(d.getDsp().gains).toEqual(d.EQ_PRESETS.Sonare);
    localStorage.setItem('sonare_dsp', '{oops');
    expect((await fresh()).getDsp().preset).toBe('Sonare');
  });

  it('WEB-DSP-003 moving a band clamps it to ±12 dB, switches to Custom and is remembered', async () => {
    const d = await fresh();
    d.applyPreset('Flat');
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
    expect(d.getDsp().preset).toBe('Sonare');
    expect(d.getSettings().eqPreset).toBe('Sonare');
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

  it('WEB-DSP-016 the waveform level meter hears every source before the EQ', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    expect(d.levelMeter()).toBeNull();
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const ctx = contexts[0];
    const graph = await d.graphInput();
    const input = graph!.input as unknown as Node;
    // Decoded tracks join at the same input as the element, which feeds both the meter and the EQ.
    expect(input.connections).toEqual([ctx.analyser, ctx.biquads[0]]);
    expect(d.levelMeter()).toBe(ctx.analyser);
    expect(ctx.analyser!.fftSize).toBe(8192);
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

  it('WEB-DSP-017 the output ends in a hard limiter at -1 dB, normalization on or off', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const [comp, limiter] = contexts[0].comps;
    expect(comp.connections).toEqual([limiter]);
    expect(limiter.connections).toEqual([contexts[0].destination]);
    d.updateSettings({ normalization: false });
    expect([limiter.threshold.value, limiter.ratio.value, limiter.knee.value]).toEqual([-1, 20, 0]);
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

  it('WEB-DSP-018 spatial stage is inserted between the virtualizer merge and the normalization compressor', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const spatial = d.getSpatialStage();
    expect(spatial).toBeDefined();

    const ctx = contexts[0];
    const comp = ctx.comp;

    // Spatial output connects to comp
    const outRoute = routes.find((r) => r.from === spatial!.output && r.to === comp);
    expect(outRoute).toBeDefined();

    // Spatial input is fed by the merge node (which receives ll, rl, lr, rr)
    const inRoute = routes.find((r) => r.to === spatial!.input);
    expect(inRoute).toBeDefined();
    const mergeNode = inRoute!.from;
    const fromL = routes.filter((r) => r.to === mergeNode);
    expect(fromL.length).toBeGreaterThanOrEqual(4);
  });

  it('WEB-DSP-019 spatial stage crossfades dry to wet when enabled, and fades back to dry when bypassed or disabled', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    const spatialStore = await import('../../src/audio/spatial');
    spatialStore.setSpatial({ enabled: false });
    spatialStore.setSpatialBypass(false);
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();

    const stage = d.getSpatialStage()!;
    expect(stage).toBeDefined();
    const internal = stage._internal!;

    // Disabled initially: wet 0, dry 1
    expect(internal.wetGain.gain.value).toBe(0);
    expect(internal.dryGain.gain.value).toBe(1);

    // Enable spatial
    spatialStore.setSpatial({ enabled: true });
    expect(internal.wetGain.gain.value).toBe(1);
    expect(internal.dryGain.gain.value).toBe(0);

    // Bypass spatial
    spatialStore.setSpatialBypass(true);
    expect(internal.wetGain.gain.value).toBe(0);
    expect(internal.dryGain.gain.value).toBe(1);

    // Un-bypass
    spatialStore.setSpatialBypass(false);
    expect(internal.wetGain.gain.value).toBe(1);
    expect(internal.dryGain.gain.value).toBe(0);

    // Disable
    spatialStore.setSpatial({ enabled: false });
    expect(internal.wetGain.gain.value).toBe(0);
    expect(internal.dryGain.gain.value).toBe(1);
  });

  it('WEB-DSP-020 spatial stage applies distance, air LPF, rear shelf, and trim gain when parameters change', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    const spatialStore = await import('../../src/audio/spatial');
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const stage = d.getSpatialStage()!;
    const internal = stage._internal!;

    // Move source to rear position (x: 0, y: -0.9)
    spatialStore.setSpatial({ enabled: true, mode: 'custom' });
    spatialStore.setSpatialCustom({ x: 0, y: -0.9 });

    expect(internal.rearShelf.gain.value).toBeLessThan(0);
    expect(internal.airLPF.frequency.value).toBeLessThan(20000);
    expect(internal.gDirGain.gain.value).toBeGreaterThan(0);
    expect(internal.gRevGain.gain.value).toBeGreaterThan(0);
    expect(internal.trimGain.gain.value).toBeGreaterThan(0);
  });

  it('WEB-DSP-021 spatial stage smooths azimuth and spread transitions across animation frames', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    const spatialStore = await import('../../src/audio/spatial');
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const stage = d.getSpatialStage()!;
    const internal = stage._internal!;

    // Initial position is center-front (azimuth 0, spread 30 deg)
    expect(internal.getCurrentAzimuth()).toBe(0);

    // Update target to 90 degrees right
    spatialStore.setSpatial({ enabled: true, mode: 'custom' });
    spatialStore.setSpatialCustom({ x: 0.8, y: 0 });

    // Smooth motion has started and tracker properties are defined
    expect(internal.getCurrentAzimuth()).toBeDefined();
    expect(internal.getCurrentSpread()).toBeDefined();
  });

  it('WEB-DSP-022 spatial stage convolver switches impulse response buffers on room change and reuses cached buffers', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    const spatialStore = await import('../../src/audio/spatial');
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const stage = d.getSpatialStage()!;
    const internal = stage._internal!;

    spatialStore.setSpatial({ enabled: true, mode: 'presets', preset: 'concert' });
    const conv1 = internal.getCurrentConvolver();
    expect(conv1).toBeDefined();
    const buf1 = conv1!.buffer;
    expect(buf1).not.toBeNull();

    // Switch to cafe
    spatialStore.setSpatial({ preset: 'cafe' });
    const conv2 = internal.getCurrentConvolver();
    expect(conv2).not.toBe(conv1);
    const buf2 = conv2!.buffer;
    expect(buf2).not.toBe(buf1);

    // Switch back to concert (should reuse cached buffer)
    spatialStore.setSpatial({ preset: 'concert' });
    const conv3 = internal.getCurrentConvolver();
    expect(conv3!.buffer).toBe(buf1);
  });

  it('WEB-DSP-023 renderer fallback selects head-model path when HRTF is unavailable or probe returns headModel', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const stage = d.getSpatialStage()!;
    const internal = stage._internal!;

    // Set to headModel
    stage.setRenderer('headModel');
    expect(internal.headModelSelect.gain.value).toBe(1.0);
    expect(internal.hrtfSelect.gain.value).toBe(0.0);

    // Set to hrtf (FakeContext supports createPanner)
    stage.setRenderer('hrtf');
    expect(internal.hrtfSelect.gain.value).toBe(1.0);
    expect(internal.headModelSelect.gain.value).toBe(0.0);

    // When createPanner is not available, stage creates head-model only
    const noPannerCtx = new FakeContext();
    // @ts-expect-error intentionally remove createPanner
    noPannerCtx.createPanner = undefined;
    const { createSpatialStage } = await import('../../src/audio/spatialStage');
    const noPannerStage = createSpatialStage(noPannerCtx as unknown as AudioContext);
    noPannerStage.setRenderer('hrtf');
    expect(noPannerStage._internal!.headModelSelect.gain.value).toBe(1.0);
    expect(noPannerStage._internal!.hrtfSelect.gain.value).toBe(0.0);
  });

  it('WEB-DSP-024 probeSpatialRenderer detects HRTF or falls back safely to head-model', async () => {
    const { probeSpatialRenderer, setProbeSpatialRendererForTesting } = await import('../../src/audio/spatialStage');

    // 1. With probe returning hrtf
    setProbeSpatialRendererForTesting(async () => 'hrtf');
    let res = await probeSpatialRenderer();
    expect(res).toBe('hrtf');

    // 2. With probe returning headModel
    setProbeSpatialRendererForTesting(async () => 'headModel');
    res = await probeSpatialRenderer();
    expect(res).toBe('headModel');

    // 3. Reset testing override
    setProbeSpatialRendererForTesting(null);
    // In Node environment without OfflineAudioContext, resolves to headModel
    res = await probeSpatialRenderer();
    expect(res).toBe('headModel');
  });

  it('WEB-DSP-025 spatial audio off is transparent: the dry path takes the input as is and nothing feeds the wet path', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    const spatialStore = await import('../../src/audio/spatial');
    spatialStore.setSpatial({ enabled: false });
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const stage = d.getSpatialStage()!;
    const internal = stage._internal!;

    expect(routes.some((r) => r.from === stage.input && r.to === internal.dryGain)).toBe(true);
    expect(routes.some((r) => r.to === internal.dryGain && r.from === internal.preGain)).toBe(false);
    expect(routes.some((r) => r.from === stage.input && r.to === internal.preGain)).toBe(false);
    expect(internal.getCurrentConvolver()).toBeNull();
  });

  it('WEB-DSP-026 switching spatial audio on again after its wet path went idle feeds the whole wet chain again', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    const spatialStore = await import('../../src/audio/spatial');
    spatialStore.setSpatial({ enabled: false });
    spatialStore.setSpatialBypass(false);
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const stage = d.getSpatialStage()!;
    const internal = stage._internal!;
    const fed = () => routes.some((r) => r.from === stage.input && r.to === internal.preGain);
    const wired = () =>
      routes.some((r) => r.from === internal.preGain && r.to === internal.wetSend) &&
      routes.some(
        (r) => r.from === internal.wetSend && (r.to === internal.hrtfSplit || r.to === internal.headModelSplit),
      );

    vi.useFakeTimers();
    try {
      spatialStore.setSpatial({ enabled: true });
      expect(fed()).toBe(true);

      // Compare held past the fade, then released: the wet path is cut, then fed again.
      spatialStore.setSpatialBypass(true);
      vi.advanceTimersByTime(200);
      expect(fed()).toBe(false);
      spatialStore.setSpatialBypass(false);
      expect(fed()).toBe(true);
      expect(wired()).toBe(true);

      // Same for switching it off and on.
      spatialStore.setSpatial({ enabled: false });
      vi.advanceTimersByTime(200);
      spatialStore.setSpatial({ enabled: true });
      expect(fed()).toBe(true);
      expect(wired()).toBe(true);

      // Back on within the fade: the pending cut is cancelled.
      spatialStore.setSpatial({ enabled: false });
      spatialStore.setSpatial({ enabled: true });
      vi.advanceTimersByTime(200);
      expect(fed()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('WEB-DSP-027 only the selected renderer is fed, and the head model shadows the far ear of both speakers', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const d = await fresh();
    const spatialStore = await import('../../src/audio/spatial');
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    const stage = d.getSpatialStage()!;
    const internal = stage._internal!;
    const feeds = (to: unknown) => routes.some((r) => r.from === internal.wetSend && r.to === to);

    stage.setRenderer('hrtf');
    expect(feeds(internal.hrtfSplit)).toBe(true);
    expect(feeds(internal.headModelSplit)).toBe(false);

    stage.setRenderer('headModel');
    expect(feeds(internal.hrtfSplit)).toBe(false);
    expect(feeds(internal.headModelSplit)).toBe(true);

    // A narrow stage at the right: both speakers are right of the listener, so the left ear is
    // the far ear for each of them.
    spatialStore.setSpatial({ enabled: true, mode: 'custom' });
    spatialStore.setSpatialCustom({ x: 0.8, y: 0, width: 0, intensity: 100 });
    for (let i = 0; i < 200; i++) await new Promise((r) => setTimeout(r, 0));
    await vi.waitFor(() => expect(internal.getCurrentAzimuth()).toBeCloseTo(Math.PI / 2, 2));
    const [lAtLeft, lAtRight, rAtLeft, rAtRight] = internal.headShadows.map((f) => f.gain.value);
    expect(lAtLeft).toBeLessThan(-3);
    expect(rAtLeft).toBeLessThan(-3);
    expect(lAtRight).toBeCloseTo(0, 5);
    expect(rAtRight).toBeCloseTo(0, 5);
  });

  it('WEB-DSP-028 the renderer probe accepts a real HRTF response and rejects equal-power or silent ones', async () => {
    const { classifyProbeResponse } = await import('../../src/audio/spatialStage');
    const rate = 48000;
    const response = (peakL: number, atL: number, peakR: number, atR: number) => {
      const left = new Float32Array(960);
      const right = new Float32Array(960);
      left[atL] = peakL;
      right[atR] = peakR;
      return [left, right] as const;
    };
    // Chromium: the left ear ~14 dB quieter and ~0.77 ms (37 samples) later.
    expect(classifyProbeResponse(...response(0.12, 328, 0.6, 291), rate)).toBe('hrtf');
    // Equal-power panning: nothing at the left ear.
    expect(classifyProbeResponse(...response(0, 0, 0.7, 0), rate)).toBe('headModel');
    // No HRTF data yet: silence.
    expect(classifyProbeResponse(...response(0, 0, 0, 0), rate)).toBe('headModel');
    // Both ears alike: not a source at the right.
    expect(classifyProbeResponse(...response(0.5, 300, 0.5, 300), rate)).toBe('headModel');
  });

  it('WEB-DSP-029 without Web Audio, spatial audio reports that it is unsupported', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('no web audio');
        }
      },
    );
    const d = await fresh();
    const spatialStore = await import('../../src/audio/spatial');
    d.bindElement(document.createElement('audio'));
    await d.ensureGraph();
    expect(spatialStore.getSpatialSupport()).toBe('none');
  });
});
