import { useSyncExternalStore } from 'react';
import { getSettings, subscribeSettings, updateSettings } from '../storage/settings';

/**
 * Web Audio DSP chain for the player's <audio> elements (contract §1: on web the equalizer
 * is a BiquadFilter chain).
 *
 *   element → fader → 8 × EQ band → bass low-shelf → stereo upmix → mid/side widener → compressor
 *     → limiter → out
 *
 * The graph is built on the first user-initiated play, because an AudioContext created
 * outside a gesture starts suspended — and once an element is routed through a context,
 * a suspended context means silence.
 */

import { CUSTOM_PRESET, EQ_BANDS, EQ_PRESETS } from '../../../shared/settings';

export { CUSTOM_PRESET, EQ_BANDS, EQ_PRESETS };
export const EQ_LABELS = ['32', '64', '150', '400', '1k', '2.4k', '6k', '14k'] as const;
export const EQ_MIN_DB = -12;
export const EQ_MAX_DB = 12;

export interface DspState {
  /** Master bypass — off leaves the signal flat without tearing down the graph. */
  enabled: boolean;
  preset: string;
  gains: number[];
  /** 0..100 → 0..+12 dB low-shelf at 80 Hz. */
  bassBoost: number;
  /** 0..100 → stereo width 1× .. 2.5×. */
  virtualizer: number;
  speed: number;
  /** Fade songs into each other over the last CROSSFADE_MS (Android has the same switch). */
  crossfade: boolean;
}

/** Fixed, like the Android app's. */
export const CROSSFADE_MS = 6000;

const STORAGE_KEY = 'sonare_dsp';

// The default preset is the settings' default (Sonare on both apps).
const DEFAULT_STATE: DspState = {
  enabled: true,
  preset: 'Sonare',
  gains: [...EQ_PRESETS.Sonare],
  bassBoost: 0,
  virtualizer: 0,
  speed: 1,
  crossfade: false,
};

const loadState = (): DspState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const s = { ...DEFAULT_STATE, ...JSON.parse(raw) } as DspState;
    if (!Array.isArray(s.gains) || s.gains.length !== EQ_BANDS.length) s.gains = [...DEFAULT_STATE.gains];
    return s;
  } catch {
    return DEFAULT_STATE;
  }
};

let state = loadState();
const listeners = new Set<() => void>();

interface Graph {
  ctx: AudioContext;
  /** Where sources join the chain: the element's source node, and decoded tracks (player.ts). */
  input: AudioNode;
  /** Reads the level of what plays, before the EQ, for the waveform (audio/waveform.ts). */
  level: AnalyserNode;
  bands: BiquadFilterNode[];
  bass: BiquadFilterNode;
  // Output L = ll·L + rl·R, output R = rr·R + lr·L.
  ll: GainNode;
  rl: GainNode;
  lr: GainNode;
  rr: GainNode;
  comp: DynamicsCompressorNode;
  /** Last in the chain: keeps EQ and bass boost from clipping, like Android's −1 dBFS limiter. */
  limiter: DynamicsCompressorNode;
}

let graph: Graph | null = null;
/** The player's elements: two, so the next song can be ready (gapless) or fade in (crossfade). */
const elements = new Set<HTMLAudioElement>();
/** Each element's level in the chain, which crossfades ramp; volume stays on the element. */
const faders = new Map<HTMLAudioElement, GainNode>();

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — settings still apply for this session.
  }
};

const apply = () => {
  for (const element of elements) {
    element.defaultPlaybackRate = state.speed;
    element.playbackRate = state.speed;
    element.preservesPitch = true;
  }
  if (!graph) return;
  const t = graph.ctx.currentTime;
  const on = state.enabled;
  graph.bands.forEach((f, i) => f.gain.setTargetAtTime(on ? state.gains[i] : 0, t, 0.02));
  graph.bass.gain.setTargetAtTime(on ? (state.bassBoost / 100) * 12 : 0, t, 0.02);

  // Mid/side widening: k = 1 is the untouched signal.
  const k = on ? 1 + (state.virtualizer / 100) * 1.5 : 1;
  const same = (1 + k) / 2;
  const cross = (1 - k) / 2;
  graph.ll.gain.setTargetAtTime(same, t, 0.02);
  graph.rr.gain.setTargetAtTime(same, t, 0.02);
  graph.rl.gain.setTargetAtTime(cross, t, 0.02);
  graph.lr.gain.setTargetAtTime(cross, t, 0.02);

  // Normalization approximated by gentle compression; ratio 1 is a pass-through.
  const norm = getSettings().normalization;
  graph.comp.threshold.setTargetAtTime(norm ? -24 : 0, t, 0.02);
  graph.comp.ratio.setTargetAtTime(norm ? 4 : 1, t, 0.02);
};

const emit = () => {
  persist();
  apply();
  for (const l of listeners) l();
};

/** Remember an element so playback-rate settings apply before the graph exists. */
export const bindElement = (a: HTMLAudioElement): void => {
  elements.add(a);
  apply();
  if (graph) routeElement(graph, a);
};

/** An element can be routed into one context only, once: do it the first time the graph exists. */
const routeElement = (g: Graph, a: HTMLAudioElement) => {
  if (faders.has(a)) return;
  const fader = g.ctx.createGain();
  g.ctx.createMediaElementSource(a).connect(fader);
  fader.connect(g.input);
  faders.set(a, fader);
};

/** The element's crossfade level in the chain; null without Web Audio. */
export const faderFor = (a: HTMLAudioElement): GainNode | null => faders.get(a) ?? null;

/** Route the elements through the DSP graph. Safe to call on every play. */
export const ensureGraph = async (): Promise<void> => {
  if (!elements.size) return;
  if (graph) {
    if (graph.ctx.state === 'suspended') await graph.ctx.resume();
    return;
  }
  try {
    const ctx = new AudioContext();
    const bands = EQ_BANDS.map((hz, i) => {
      const f = ctx.createBiquadFilter();
      f.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
      f.frequency.value = hz;
      f.Q.value = 1.1;
      return f;
    });
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 80;

    // A splitter treats its input as discrete channels, so a mono stream would leave the
    // right channel silent. Upmix to stereo first.
    const upmix = ctx.createGain();
    upmix.channelCount = 2;
    upmix.channelCountMode = 'explicit';
    upmix.channelInterpretation = 'speakers';

    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    const ll = ctx.createGain();
    const rl = ctx.createGain();
    const lr = ctx.createGain();
    const rr = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.knee.value = 12;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    // The browser's compressor looks ahead a few ms; hard and fast, it works as a peak limiter.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;

    // Every source joins here; the analyser hears the song as it is, whatever the EQ does.
    const input = ctx.createGain();
    const level = ctx.createAnalyser();
    level.fftSize = 8192;
    input.connect(level);

    let node: AudioNode = input;
    for (const f of bands) {
      node.connect(f);
      node = f;
    }
    node.connect(bass);
    bass.connect(upmix);
    upmix.connect(split);
    split.connect(ll, 0);
    split.connect(lr, 0);
    split.connect(rr, 1);
    split.connect(rl, 1);
    ll.connect(merge, 0, 0);
    rl.connect(merge, 0, 0);
    rr.connect(merge, 0, 1);
    lr.connect(merge, 0, 1);
    merge.connect(comp);
    comp.connect(limiter);
    limiter.connect(ctx.destination);

    graph = { ctx, input, level, bands, bass, ll, rl, lr, rr, comp, limiter };
    for (const a of elements) routeElement(graph, a);
    apply();
    if (ctx.state === 'suspended') await ctx.resume();
  } catch {
    // Web Audio unavailable: playback continues unprocessed.
    graph = null;
  }
};

/** The graph's context and input node, building the graph if needed; null without Web Audio. */
export const graphInput = async (): Promise<{ ctx: AudioContext; input: AudioNode } | null> => {
  await ensureGraph();
  return graph && { ctx: graph.ctx, input: graph.input };
};

/** The pre-EQ level meter, once the graph exists. */
export const levelMeter = (): AnalyserNode | null => graph?.level ?? null;

export const getDsp = (): DspState => {
  return state;
};

export const subscribeDsp = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useDsp = (): DspState => {
  return useSyncExternalStore(subscribeDsp, getDsp);
};

export const setDsp = (patch: Partial<DspState>): void => {
  state = { ...state, ...patch };
  emit();
};

export const setBandGain = (index: number, db: number): void => {
  const gains = [...state.gains];
  gains[index] = Math.max(EQ_MIN_DB, Math.min(EQ_MAX_DB, db));
  state = { ...state, gains, preset: CUSTOM_PRESET };
  emit();
};

export const applyPreset = (name: string): void => {
  const gains = EQ_PRESETS[name];
  if (!gains) return;
  state = { ...state, preset: name, gains: [...gains] };
  emit();
  updateSettings({ eqPreset: name });
};

/** Commit the current curve to the account once a fader is released. */
export const commitPreset = (): void => {
  updateSettings({ eqPreset: state.preset });
};

// Server settings arrive after sign-in; adopt the saved preset unless the user has a
// custom curve locally (the server only stores the preset name).
let lastServerPreset = getSettings().eqPreset;
subscribeSettings(() => {
  const s = getSettings();
  if (s.eqPreset !== lastServerPreset) {
    lastServerPreset = s.eqPreset;
    if (EQ_PRESETS[s.eqPreset] && state.preset !== s.eqPreset && state.preset !== CUSTOM_PRESET) {
      state = { ...state, preset: s.eqPreset, gains: [...EQ_PRESETS[s.eqPreset]] };
    }
  }
  emit();
});
