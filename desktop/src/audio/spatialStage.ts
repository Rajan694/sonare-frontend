import { renderImpulse, type ImpulseResponse } from '../../../shared/spatialReverb';
import { HEAD_MODEL, shortestArc, type SpatialParams } from '../../../shared/spatial';

export type SpatialRendererKind = 'hrtf' | 'headModel';

export interface SpatialStage {
  input: GainNode;
  output: GainNode;
  apply: (params: SpatialParams) => void;
  setRenderer: (kind: SpatialRendererKind) => void;
  _internal?: {
    preGain: GainNode;
    wetSend: GainNode;
    hrtfSplit: ChannelSplitterNode;
    headModelSplit: ChannelSplitterNode;
    /** Speaker L at the left and right ear, speaker R at the left and right ear. */
    headShadows: BiquadFilterNode[];
    /** The far ear's level drop, in the same order. */
    headFarGains: GainNode[];
    dryGain: GainNode;
    wetGain: GainNode;
    trimGain: GainNode;
    gDirGain: GainNode;
    gRevGain: GainNode;
    rearShelf: BiquadFilterNode;
    toneFilter: BiquadFilterNode;
    airLPF: BiquadFilterNode;
    hrtfSelect: GainNode;
    headModelSelect: GainNode;
    getCurrentConvolver: () => ConvolverNode | null;
    getCurrentAzimuth: () => number;
    getCurrentSpread: () => number;
  };
}

let cachedRendererProbe: SpatialRendererKind | null = null;
let customProbeFn: (() => Promise<SpatialRendererKind>) | null = null;

export function setProbeSpatialRendererForTesting(fn: (() => Promise<SpatialRendererKind>) | null) {
  customProbeFn = fn;
}

/**
 * What an HRTF panner placed at the right ear made of an impulse. HRTF data gives a quieter,
 * later left ear (Chromium: ~12 dB, ~0.75 ms); without it the left ear is silent (equal-power
 * panning) or everything is (WebKit missing its HRTF database).
 */
export function classifyProbeResponse(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): SpatialRendererKind {
  let peakL = 0;
  let peakR = 0;
  let peakAtL = 0;
  let peakAtR = 0;
  let energyL = 0;
  let energyR = 0;
  for (let i = 0; i < left.length; i++) {
    const al = Math.abs(left[i]);
    const ar = Math.abs(right[i]);
    if (al > peakL) [peakL, peakAtL] = [al, i];
    if (ar > peakR) [peakR, peakAtR] = [ar, i];
    energyL += left[i] * left[i];
    energyR += right[i] * right[i];
  }
  const lagMs = ((peakAtL - peakAtR) / sampleRate) * 1000;
  const ildDb = 10 * Math.log10(energyR / Math.max(energyL, 1e-20));
  const isHrtf = peakL > 1e-4 && peakR > 1e-4 && ildDb >= 6 && lagMs >= 0.2 && lagMs <= 1.5;
  return isHrtf ? 'hrtf' : 'headModel';
}

export async function probeSpatialRenderer(sampleRate = 48000, timeoutMs = 2000): Promise<SpatialRendererKind> {
  if (customProbeFn) return customProbeFn();
  if (cachedRendererProbe) return cachedRendererProbe;

  if (typeof OfflineAudioContext === 'undefined') {
    cachedRendererProbe = 'headModel';
    return 'headModel';
  }

  try {
    const probePromise = new Promise<SpatialRendererKind>((resolve) => {
      // WebKitGTK's HRTF panner convolves in 512-frame blocks and goes silent as soon as its
      // source ends, so a one-frame impulse never comes out and HRTF looks missing: keep the
      // source playing (silence) well past the impulse. The response peaks ~7 ms after it.
      const at = 512;
      const length = at + Math.round(0.03 * sampleRate);
      const oCtx = new OfflineAudioContext(2, length, sampleRate);
      if (typeof oCtx.createPanner !== 'function') {
        return resolve('headModel');
      }

      const panner = oCtx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'linear';
      panner.rolloffFactor = 0;

      if (panner.positionX) {
        panner.positionX.value = 1;
        panner.positionY.value = 0;
        panner.positionZ.value = 0;
      } else if (typeof panner.setPosition === 'function') {
        panner.setPosition(1, 0, 0);
      }

      const buf = oCtx.createBuffer(1, length, sampleRate);
      buf.getChannelData(0)[at] = 1.0;
      const src = oCtx.createBufferSource();
      src.buffer = buf;
      src.connect(panner);
      panner.connect(oCtx.destination);
      src.start(0);

      oCtx
        .startRendering()
        .then((rendered) =>
          resolve(classifyProbeResponse(rendered.getChannelData(0), rendered.getChannelData(1), sampleRate)),
        )
        .catch(() => resolve('headModel'));
    });

    const timeoutPromise = new Promise<SpatialRendererKind>((resolve) => {
      setTimeout(() => resolve('headModel'), timeoutMs);
    });

    const result = await Promise.race([probePromise, timeoutPromise]);
    cachedRendererProbe = result;
    return result;
  } catch {
    cachedRendererProbe = 'headModel';
    return 'headModel';
  }
}

// Cache of rendered AudioBuffers per room & sample rate
const irCache = new Map<string, AudioBuffer>();

function getOrCreateIrBuffer(ctx: AudioContext, room: SpatialParams['room']): AudioBuffer {
  const key = `${room.id}:${ctx.sampleRate}`;
  let buf = irCache.get(key);
  if (buf) return buf;

  const ir: ImpulseResponse = renderImpulse(room, ctx.sampleRate);
  buf = ctx.createBuffer(2, ir.left.length, ctx.sampleRate);
  buf.getChannelData(0).set(ir.left);
  buf.getChannelData(1).set(ir.right);
  irCache.set(key, buf);
  return buf;
}

export function createSpatialStage(ctx: AudioContext): SpatialStage {
  const input = ctx.createGain();
  const output = ctx.createGain();

  // 1. Dry path for crossfade / bypass: untouched, so the stage is transparent while off.
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1.0; // starts dry until active
  input.connect(dryGain);
  dryGain.connect(output);

  // 2. Wet path: headroom pre-gain (trim makes up for it), then the send to the renderers and
  // the reverb. Only input -> preGain is ever cut (when idle), so the wet chain stays wired.
  const preGain = ctx.createGain();
  preGain.gain.value = Math.pow(10, -3 / 20);
  const wetSend = ctx.createGain();
  preGain.connect(wetSend);
  let wetConnected = false;

  // Wet return and trim
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.0;
  const trimGain = ctx.createGain();
  trimGain.gain.value = 1.0;
  trimGain.connect(wetGain);
  wetGain.connect(output);

  // Direct path filters
  const rearShelf = ctx.createBiquadFilter();
  rearShelf.type = 'highshelf';
  rearShelf.frequency.value = 3500;
  rearShelf.gain.value = 0;

  const toneFilter = ctx.createBiquadFilter();
  toneFilter.type = 'peaking';
  toneFilter.gain.value = 0;

  const airLPF = ctx.createBiquadFilter();
  airLPF.type = 'lowpass';
  airLPF.frequency.value = 20000;

  const gDirGain = ctx.createGain();
  gDirGain.gain.value = 1.0;

  rearShelf.connect(toneFilter);
  toneFilter.connect(airLPF);
  airLPF.connect(gDirGain);
  gDirGain.connect(trimGain);

  // Split wetSend into L and R for speakers
  const split = ctx.createChannelSplitter(2);

  // HRTF Panner path
  let hasPanner = typeof ctx.createPanner === 'function';
  let pannerL: PannerNode | null = null;
  let pannerR: PannerNode | null = null;

  if (hasPanner) {
    try {
      pannerL = ctx.createPanner();
      pannerL.channelCount = 1;
      pannerL.channelCountMode = 'explicit';
      pannerL.panningModel = 'HRTF';
      pannerL.distanceModel = 'linear';
      pannerL.rolloffFactor = 0;

      pannerR = ctx.createPanner();
      pannerR.channelCount = 1;
      pannerR.channelCountMode = 'explicit';
      pannerR.panningModel = 'HRTF';
      pannerR.distanceModel = 'linear';
      pannerR.rolloffFactor = 0;

      split.connect(pannerL, 0);
      split.connect(pannerR, 1);
    } catch {
      hasPanner = false;
      pannerL = null;
      pannerR = null;
    }
  }

  // Head-model fallback path: each virtual speaker reaches each ear through a head-shadow shelf,
  // a level drop and a delay; whichever ear is on the far side of the head gets all three.
  const headModelSplit = ctx.createChannelSplitter(2);
  const headModelMerge = ctx.createChannelMerger(2);
  const delayLL = ctx.createDelay();
  const delayLR = ctx.createDelay();
  const delayRL = ctx.createDelay();
  const delayRR = ctx.createDelay();
  const shadow = () => {
    const f = ctx.createBiquadFilter();
    f.type = 'highshelf';
    f.frequency.value = HEAD_MODEL.shadowHz;
    f.gain.value = 0;
    return f;
  };
  // shadowXY / farXY: speaker X heard at ear Y.
  const shadowLL = shadow();
  const shadowLR = shadow();
  const shadowRL = shadow();
  const shadowRR = shadow();
  const farLL = ctx.createGain();
  const farLR = ctx.createGain();
  const farRL = ctx.createGain();
  const farRR = ctx.createGain();

  // Speaker L (input ch 0) -> left ear (merge ch 0) and right ear (merge ch 1)
  headModelSplit.connect(shadowLL, 0);
  headModelSplit.connect(shadowLR, 0);
  shadowLL.connect(farLL).connect(delayLL);
  shadowLR.connect(farLR).connect(delayLR);
  delayLL.connect(headModelMerge, 0, 0);
  delayLR.connect(headModelMerge, 0, 1);

  // Speaker R (input ch 1) -> right ear (merge ch 1) and left ear (merge ch 0)
  headModelSplit.connect(shadowRR, 1);
  headModelSplit.connect(shadowRL, 1);
  shadowRR.connect(farRR).connect(delayRR);
  shadowRL.connect(farRL).connect(delayRL);
  delayRR.connect(headModelMerge, 0, 1);
  delayRL.connect(headModelMerge, 0, 0);

  // Select between HRTF and Head Model. Only the selected renderer is fed, so the other one
  // costs nothing; the select gains keep its output silent while it rings out.
  const hrtfSelect = ctx.createGain();
  const headModelSelect = ctx.createGain();
  hrtfSelect.gain.value = 0.0;
  headModelSelect.gain.value = 0.0;

  if (pannerL && pannerR) {
    pannerL.connect(hrtfSelect);
    pannerR.connect(hrtfSelect);
    hrtfSelect.connect(rearShelf);
  }

  headModelMerge.connect(headModelSelect);
  headModelSelect.connect(rearShelf);

  let renderer: SpatialRendererKind | null = null;

  // Reverb path: mono sum -> convolver -> gRevGain -> trimGain
  const monoSum = ctx.createGain();
  monoSum.channelCount = 1;
  monoSum.channelCountMode = 'explicit';
  monoSum.channelInterpretation = 'speakers';
  wetSend.connect(monoSum);

  const gRevGain = ctx.createGain();
  gRevGain.gain.value = 0.0;
  gRevGain.connect(trimGain);

  let currentConvolver: ConvolverNode | null = null;
  let currentConvolverFader: GainNode | null = null;
  let currentRoomId: string | null = null;

  function switchRoom(room: SpatialParams['room']) {
    if (currentRoomId === room.id && currentConvolver) return;

    const t = ctx.currentTime;
    const buf = getOrCreateIrBuffer(ctx, room);
    const newConvolver = ctx.createConvolver();
    newConvolver.normalize = false;
    newConvolver.buffer = buf;

    const newFader = ctx.createGain();
    monoSum.connect(newConvolver);
    newConvolver.connect(newFader);
    newFader.connect(gRevGain);

    if (currentConvolver && currentConvolverFader) {
      // Crossfade 150 ms between convolvers
      newFader.gain.setValueAtTime(0, t);
      newFader.gain.linearRampToValueAtTime(1, t + 0.15);

      const oldC = currentConvolver;
      const oldF = currentConvolverFader;
      oldF.gain.setValueAtTime(oldF.gain.value, t);
      oldF.gain.linearRampToValueAtTime(0, t + 0.15);

      setTimeout(() => {
        try {
          oldC.disconnect();
          oldF.disconnect();
        } catch {
          // Ignore
        }
      }, 200);
    } else {
      newFader.gain.setValueAtTime(1, t);
    }

    currentConvolver = newConvolver;
    currentConvolverFader = newFader;
    currentRoomId = room.id;
  }

  // Smooth position tracking
  let currentAzimuth = 0;
  let currentSpread = (30 * Math.PI) / 180;
  let targetAzimuth = 0;
  let targetSpread = (30 * Math.PI) / 180;
  let rafId: number | null = null;
  let lastRafTime = 0;

  function setPannerPosition(panner: PannerNode, x: number, y: number, z: number, t: number) {
    if (panner.positionX && typeof panner.positionX.linearRampToValueAtTime === 'function') {
      panner.positionX.linearRampToValueAtTime(x, t + 0.02);
      panner.positionY.linearRampToValueAtTime(y, t + 0.02);
      panner.positionZ.linearRampToValueAtTime(z, t + 0.02);
    } else if (typeof panner.setPosition === 'function') {
      panner.setPosition(x, y, z);
    }
  }

  function updateSpeakerPositions(azimuth: number, spread: number) {
    const t = ctx.currentTime;

    // Speaker L at azimuth - spread
    const azL = azimuth - spread;
    const xL = Math.sin(azL);
    const zL = -Math.cos(azL);

    // Speaker R at azimuth + spread
    const azR = azimuth + spread;
    const xR = Math.sin(azR);
    const zR = -Math.cos(azR);

    if (pannerL && pannerR) {
      setPannerPosition(pannerL, xL, 0, zL, t);
      setPannerPosition(pannerR, xR, 0, zR, t);
    }

    if (renderer !== 'headModel') return;
    // Head model: a speaker on the right (sin > 0) reaches the left ear late, quieter and
    // shadowed, and the other way round.
    const { maxItdSec, shadowDb, farEarDb } = HEAD_MODEL;
    const right = (az: number) => Math.max(0, Math.sin(az));
    const left = (az: number) => Math.max(0, -Math.sin(az));
    const ramp = (param: AudioParam, value: number) => param.setTargetAtTime(value, t, 0.015);
    const db = (v: number) => Math.pow(10, v / 20);
    ramp(delayLL.delayTime, right(azL) * maxItdSec);
    ramp(delayLR.delayTime, left(azL) * maxItdSec);
    ramp(delayRL.delayTime, right(azR) * maxItdSec);
    ramp(delayRR.delayTime, left(azR) * maxItdSec);
    ramp(shadowLL.gain, shadowDb * right(azL));
    ramp(shadowLR.gain, shadowDb * left(azL));
    ramp(shadowRL.gain, shadowDb * right(azR));
    ramp(shadowRR.gain, shadowDb * left(azR));
    ramp(farLL.gain, db(farEarDb * right(azL)));
    ramp(farLR.gain, db(farEarDb * left(azL)));
    ramp(farRL.gain, db(farEarDb * right(azR)));
    ramp(farRR.gain, db(farEarDb * left(azR)));
  }

  function startSmoothMotion() {
    if (rafId !== null) return;
    lastRafTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = Math.max(0.001, Math.min(0.1, (now - lastRafTime) / 1000));
      lastRafTime = now;

      const diffAz = shortestArc(currentAzimuth, targetAzimuth);
      const diffSpread = targetSpread - currentSpread;

      // Exponential smoothing with tau = 60 ms
      const alpha = 1 - Math.exp(-dt / 0.06);
      currentAzimuth += diffAz * alpha;
      currentSpread += diffSpread * alpha;

      updateSpeakerPositions(currentAzimuth, currentSpread);

      if (Math.abs(diffAz) < 1e-4 && Math.abs(diffSpread) < 1e-4) {
        currentAzimuth = targetAzimuth;
        currentSpread = targetSpread;
        updateSpeakerPositions(currentAzimuth, currentSpread);
        rafId = null;
      } else {
        rafId =
          typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame(tick)
            : (setTimeout(tick, 16) as unknown as number);
      }
    };

    rafId =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(tick)
        : (setTimeout(tick, 16) as unknown as number);
  }

  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function apply(params: SpatialParams) {
    const t = ctx.currentTime;

    // Crossfade dry <-> wet (100 ms linear)
    if (params.active) {
      // Room switch (cached IR); while off the reverb isn't built or changed.
      switchRoom(params.room);
      if (disconnectTimer !== null) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
      if (!wetConnected) {
        input.connect(preGain);
        wetConnected = true;
      }

      wetGain.gain.cancelScheduledValues(t);
      dryGain.gain.cancelScheduledValues(t);
      wetGain.gain.setValueAtTime(wetGain.gain.value, t);
      dryGain.gain.setValueAtTime(dryGain.gain.value, t);
      wetGain.gain.linearRampToValueAtTime(1.0, t + 0.1);
      dryGain.gain.linearRampToValueAtTime(0.0, t + 0.1);
    } else {
      wetGain.gain.cancelScheduledValues(t);
      dryGain.gain.cancelScheduledValues(t);
      wetGain.gain.setValueAtTime(wetGain.gain.value, t);
      dryGain.gain.setValueAtTime(dryGain.gain.value, t);
      wetGain.gain.linearRampToValueAtTime(0.0, t + 0.1);
      dryGain.gain.linearRampToValueAtTime(1.0, t + 0.1);

      // Once faded out, stop feeding the wet path so the renderers and reverb go idle.
      if (disconnectTimer === null && wetConnected) {
        disconnectTimer = setTimeout(() => {
          disconnectTimer = null;
          if (!wetConnected) return;
          input.disconnect(preGain);
          wetConnected = false;
        }, 110);
      }
    }

    // Direct path filters
    rearShelf.gain.setTargetAtTime(params.rearShelfDb, t, 0.02);

    if (params.tone?.type === 'highshelf') {
      toneFilter.type = 'highshelf';
      toneFilter.frequency.setTargetAtTime(params.tone.frequency, t, 0.02);
      toneFilter.gain.setTargetAtTime(params.tone.gainDb ?? 0, t, 0.02);
    } else if (params.tone?.type === 'lowpass') {
      toneFilter.type = 'lowpass';
      toneFilter.frequency.setTargetAtTime(params.tone.frequency, t, 0.02);
      toneFilter.gain.setTargetAtTime(0, t, 0.02);
    } else {
      toneFilter.type = 'peaking';
      toneFilter.gain.setTargetAtTime(0, t, 0.02);
    }

    airLPF.frequency.setTargetAtTime(params.airHz, t, 0.02);
    gDirGain.gain.setTargetAtTime(params.gDir, t, 0.02);
    gRevGain.gain.setTargetAtTime(params.gRev, t, 0.02);

    // Trim gain
    const trimLinear = Math.pow(10, params.trimDb / 20);
    trimGain.gain.setTargetAtTime(trimLinear, t, 0.02);

    // Spatial position targets
    targetAzimuth = params.azimuth;
    targetSpread = params.spread;
    startSmoothMotion();
  }

  function setRenderer(kind: SpatialRendererKind) {
    const next: SpatialRendererKind = kind === 'hrtf' && hasPanner ? 'hrtf' : 'headModel';
    if (next === renderer) return;
    const t = ctx.currentTime;
    if (renderer === 'hrtf') wetSend.disconnect(split);
    if (renderer === 'headModel') wetSend.disconnect(headModelSplit);
    renderer = next;
    if (next === 'hrtf') {
      wetSend.connect(split);
      hrtfSelect.gain.setValueAtTime(1.0, t);
      headModelSelect.gain.setValueAtTime(0.0, t);
    } else {
      wetSend.connect(headModelSplit);
      hrtfSelect.gain.setValueAtTime(0.0, t);
      headModelSelect.gain.setValueAtTime(1.0, t);
      updateSpeakerPositions(currentAzimuth, currentSpread);
    }
  }

  // HRTF until the probe says otherwise: the panners must exist (and load their HRTF data)
  // from the start.
  setRenderer('hrtf');

  return {
    input,
    output,
    apply,
    setRenderer,
    _internal: {
      preGain,
      wetSend,
      hrtfSplit: split,
      headModelSplit,
      headShadows: [shadowLL, shadowLR, shadowRL, shadowRR],
      headFarGains: [farLL, farLR, farRL, farRR],
      dryGain,
      wetGain,
      trimGain,
      gDirGain,
      gRevGain,
      rearShelf,
      toneFilter,
      airLPF,
      hrtfSelect,
      headModelSelect,
      getCurrentConvolver: () => currentConvolver,
      getCurrentAzimuth: () => currentAzimuth,
      getCurrentSpread: () => currentSpread,
    },
  };
}
