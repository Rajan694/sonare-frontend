import { useSyncExternalStore } from 'react'
import { getSettings, subscribeSettings, updateSettings } from './settings'

/**
 * Web Audio DSP chain for the single <audio> element (contract §1: on web the equalizer
 * is a BiquadFilter chain).
 *
 *   element → 7 × EQ band → bass low-shelf → stereo upmix → mid/side widener → compressor → out
 *
 * The graph is built on the first user-initiated play, because an AudioContext created
 * outside a gesture starts suspended — and once an element is routed through a context,
 * a suspended context means silence.
 */

export const EQ_BANDS = [60, 150, 400, 1000, 2400, 6000, 14000] as const
export const EQ_LABELS = ['60', '150', '400', '1K', '2.4K', '6K', '14K'] as const
export const EQ_MIN_DB = -12
export const EQ_MAX_DB = 12

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0],
  Sonare: [3, 1.5, 0, -0.5, 1, 2.5, 3],
  Bass: [6, 4.5, 1.5, 0, 0, 0, 0],
  Vocal: [-2, -1, 1.5, 3.5, 3, 1, 0],
  Acoustic: [2.5, 1.5, 0.5, 1, 2, 2.5, 2],
  'Late night': [-3, -1.5, 0, 1, 0.5, -1.5, -3],
}
export const CUSTOM_PRESET = 'Custom'

export interface DspState {
  /** Master bypass — off leaves the signal flat without tearing down the graph. */
  enabled: boolean
  preset: string
  gains: number[]
  /** 0..100 → 0..+12 dB low-shelf at 80 Hz. */
  bassBoost: number
  /** 0..100 → stereo width 1× .. 2.5×. */
  virtualizer: number
  speed: number
}

const STORAGE_KEY = 'sonare_dsp'

const DEFAULT_STATE: DspState = {
  enabled: true,
  preset: 'Flat',
  gains: [...EQ_PRESETS.Flat],
  bassBoost: 0,
  virtualizer: 0,
  speed: 1,
}

function loadState(): DspState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const s = { ...DEFAULT_STATE, ...JSON.parse(raw) } as DspState
    if (!Array.isArray(s.gains) || s.gains.length !== EQ_BANDS.length) s.gains = [...DEFAULT_STATE.gains]
    return s
  } catch {
    return DEFAULT_STATE
  }
}

let state = loadState()
const listeners = new Set<() => void>()

interface Graph {
  ctx: AudioContext
  bands: BiquadFilterNode[]
  bass: BiquadFilterNode
  // Output L = ll·L + rl·R, output R = rr·R + lr·L.
  ll: GainNode
  rl: GainNode
  lr: GainNode
  rr: GainNode
  comp: DynamicsCompressorNode
}

let graph: Graph | null = null
let element: HTMLAudioElement | null = null

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable — settings still apply for this session.
  }
}

function apply() {
  if (element) {
    element.defaultPlaybackRate = state.speed
    element.playbackRate = state.speed
    element.preservesPitch = true
  }
  if (!graph) return
  const t = graph.ctx.currentTime
  const on = state.enabled
  graph.bands.forEach((f, i) => f.gain.setTargetAtTime(on ? state.gains[i] : 0, t, 0.02))
  graph.bass.gain.setTargetAtTime(on ? (state.bassBoost / 100) * 12 : 0, t, 0.02)

  // Mid/side widening: k = 1 is the untouched signal.
  const k = on ? 1 + (state.virtualizer / 100) * 1.5 : 1
  const same = (1 + k) / 2
  const cross = (1 - k) / 2
  graph.ll.gain.setTargetAtTime(same, t, 0.02)
  graph.rr.gain.setTargetAtTime(same, t, 0.02)
  graph.rl.gain.setTargetAtTime(cross, t, 0.02)
  graph.lr.gain.setTargetAtTime(cross, t, 0.02)

  // Normalization approximated by gentle compression; ratio 1 is a pass-through.
  const norm = getSettings().normalization
  graph.comp.threshold.setTargetAtTime(norm ? -24 : 0, t, 0.02)
  graph.comp.ratio.setTargetAtTime(norm ? 4 : 1, t, 0.02)
}

function emit() {
  persist()
  apply()
  for (const l of listeners) l()
}

/** Remember the element so playback-rate settings apply before the graph exists. */
export function bindElement(a: HTMLAudioElement): void {
  element = a
  apply()
}

/** Route the element through the DSP graph. Safe to call on every play. */
export async function ensureGraph(): Promise<void> {
  if (!element) return
  if (graph) {
    if (graph.ctx.state === 'suspended') await graph.ctx.resume()
    return
  }
  try {
    const ctx = new AudioContext()
    const source = ctx.createMediaElementSource(element)
    const bands = EQ_BANDS.map((hz, i) => {
      const f = ctx.createBiquadFilter()
      f.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking'
      f.frequency.value = hz
      f.Q.value = 1.1
      return f
    })
    const bass = ctx.createBiquadFilter()
    bass.type = 'lowshelf'
    bass.frequency.value = 80

    // A splitter treats its input as discrete channels, so a mono stream would leave the
    // right channel silent. Upmix to stereo first.
    const upmix = ctx.createGain()
    upmix.channelCount = 2
    upmix.channelCountMode = 'explicit'
    upmix.channelInterpretation = 'speakers'

    const split = ctx.createChannelSplitter(2)
    const merge = ctx.createChannelMerger(2)
    const ll = ctx.createGain()
    const rl = ctx.createGain()
    const lr = ctx.createGain()
    const rr = ctx.createGain()
    const comp = ctx.createDynamicsCompressor()
    comp.knee.value = 12
    comp.attack.value = 0.01
    comp.release.value = 0.25

    let node: AudioNode = source
    for (const f of bands) {
      node.connect(f)
      node = f
    }
    node.connect(bass)
    bass.connect(upmix)
    upmix.connect(split)
    split.connect(ll, 0)
    split.connect(lr, 0)
    split.connect(rr, 1)
    split.connect(rl, 1)
    ll.connect(merge, 0, 0)
    rl.connect(merge, 0, 0)
    rr.connect(merge, 0, 1)
    lr.connect(merge, 0, 1)
    merge.connect(comp)
    comp.connect(ctx.destination)

    graph = { ctx, bands, bass, ll, rl, lr, rr, comp }
    apply()
    if (ctx.state === 'suspended') await ctx.resume()
  } catch {
    // Web Audio unavailable: playback continues unprocessed.
    graph = null
  }
}

export function getDsp(): DspState {
  return state
}

export function subscribeDsp(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useDsp(): DspState {
  return useSyncExternalStore(subscribeDsp, getDsp)
}

export function setDsp(patch: Partial<DspState>): void {
  state = { ...state, ...patch }
  emit()
}

export function setBandGain(index: number, db: number): void {
  const gains = [...state.gains]
  gains[index] = Math.max(EQ_MIN_DB, Math.min(EQ_MAX_DB, db))
  state = { ...state, gains, preset: CUSTOM_PRESET }
  emit()
}

export function applyPreset(name: string): void {
  const gains = EQ_PRESETS[name]
  if (!gains) return
  state = { ...state, preset: name, gains: [...gains] }
  emit()
  updateSettings({ eqPreset: name })
}

/** Commit the current curve to the account once a fader is released. */
export function commitPreset(): void {
  updateSettings({ eqPreset: state.preset })
}

// Server settings arrive after sign-in; adopt the saved preset unless the user has a
// custom curve locally (the server only stores the preset name).
let lastServerPreset = getSettings().eqPreset
subscribeSettings(() => {
  const s = getSettings()
  if (s.eqPreset !== lastServerPreset) {
    lastServerPreset = s.eqPreset
    if (EQ_PRESETS[s.eqPreset] && state.preset !== s.eqPreset && state.preset !== CUSTOM_PRESET) {
      state = { ...state, preset: s.eqPreset, gains: [...EQ_PRESETS[s.eqPreset]] }
    }
  }
  emit()
})
