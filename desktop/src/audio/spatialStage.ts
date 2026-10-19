import { renderImpulse, type ImpulseResponse } from '../../../shared/spatialReverb';
import { shortestArc, type SpatialParams } from '../../../shared/spatial';

export type SpatialRendererKind = 'hrtf' | 'headModel';

export interface SpatialStage {
  input: GainNode;
  output: GainNode;
  apply: (params: SpatialParams) => void;
  setRenderer: (kind: SpatialRendererKind) => void;
  _internal?: {
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

export async function probeSpatialRenderer(sampleRate = 48000, timeoutMs = 2000): Promise<SpatialRendererKind> {
  if (customProbeFn) return customProbeFn();
  if (cachedRendererProbe) return cachedRendererProbe;

  if (typeof OfflineAudioContext === 'undefined') {
    cachedRendererProbe = 'headModel';
    return 'headModel';
  }

  try {
    const probePromise = new Promise<SpatialRendererKind>((resolve) => {
      const length = Math.round(0.01 * sampleRate); // 10 ms
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

      const buf = oCtx.createBuffer(1, 1, sampleRate);
      buf.getChannelData(0)[0] = 1.0;
      const src = oCtx.createBufferSource();
      src.buffer = buf;
      src.connect(panner);
      panner.connect(oCtx.destination);
      src.start(0);

      oCtx
        .startRendering()
        .then((rendered) => {
          const left = rendered.getChannelData(0);
          const right = rendered.getChannelData(1);

          let maxL = 0;
          let maxR = 0;
          let onsetL = -1;
          let onsetR = -1;

          for (let i = 0; i < rendered.length; i++) {
            const al = Math.abs(left[i]);
            const ar = Math.abs(right[i]);
            if (al > maxL) maxL = al;
            if (ar > maxR) maxR = ar;
            if (al > 0.01 && onsetL < 0) onsetL = i;
            if (ar > 0.01 && onsetR < 0) onsetR = i;
          }

          const minLag = Math.max(1, Math.floor(15 * (sampleRate / 48000)));
          const maxLag = Math.ceil(45 * (sampleRate / 48000));
          const lag = onsetL - onsetR;

          const isHrtf = maxL > 1e-4 && maxR > 1e-4 && maxR / maxL >= 1.95 && lag >= minLag && lag <= maxLag;

          resolve(isHrtf ? 'hrtf' : 'headModel');
        })
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

  // 1. Headroom pre-gain (-3 dB)
  const preGain = ctx.createGain();
  preGain.gain.value = Math.pow(10, -3 / 20);
  input.connect(preGain);

  // 2. Dry path for crossfade / bypass
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1.0; // starts dry until active
  preGain.connect(dryGain);
  dryGain.connect(output);

  // 3. Wet send node
  const wetSend = ctx.createGain();
  preGain.connect(wetSend);
  let wetConnected = true;

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
  wetSend.connect(split);

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

      pannerL.connect(rearShelf);
      pannerR.connect(rearShelf);
    } catch {
      hasPanner = false;
      pannerL = null;
      pannerR = null;
    }
  }

  // Head-model fallback path (DelayNode + Biquad head shadow per ear)
  const headModelSplit = ctx.createChannelSplitter(2);
  const headModelMerge = ctx.createChannelMerger(2);
  const delayLL = ctx.createDelay();
  const delayLR = ctx.createDelay();
  const delayRL = ctx.createDelay();
  const delayRR = ctx.createDelay();
  const shadowLR = ctx.createBiquadFilter();
  const shadowRL = ctx.createBiquadFilter();
  shadowLR.type = 'highshelf';
  shadowRL.type = 'highshelf';
  shadowLR.frequency.value = 2500;
  shadowRL.frequency.value = 2500;

  // L input -> delayLL -> merge ch 0 (L)
  // L input -> shadowLR -> delayLR -> merge ch 1 (R)
  headModelSplit.connect(delayLL, 0);
  headModelSplit.connect(shadowLR, 0);
  shadowLR.connect(delayLR);
  delayLL.connect(headModelMerge, 0, 0);
  delayLR.connect(headModelMerge, 0, 1);

  // R input -> delayRR -> merge ch 1 (R)
  // R input -> shadowRL -> delayRL -> merge ch 0 (L)
  headModelSplit.connect(delayRR, 1);
  headModelSplit.connect(shadowRL, 1);
  shadowRL.connect(delayRL);
  delayRR.connect(headModelMerge, 0, 1);
  delayRL.connect(headModelMerge, 0, 0);

  // Select between HRTF and Head Model via gains if both exist
  const hrtfSelect = ctx.createGain();
  const headModelSelect = ctx.createGain();
  hrtfSelect.gain.value = hasPanner ? 1.0 : 0.0;
  headModelSelect.gain.value = hasPanner ? 0.0 : 1.0;

  if (pannerL && pannerR) {
    // If panners exist, they connect through hrtfSelect
    pannerL.disconnect();
    pannerR.disconnect();
    pannerL.connect(hrtfSelect);
    pannerR.connect(hrtfSelect);
    hrtfSelect.connect(rearShelf);
  }

  wetSend.connect(headModelSplit);
  headModelMerge.connect(headModelSelect);
  headModelSelect.connect(rearShelf);

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

    // Head model ITD / shadow updates
    // Woodworth max ITD ≈ 0.66 ms (0.00066 s)
    const MAX_ITD = 0.00066;
    // For Spk L:
    const sinL = Math.sin(azL);
    const itdFactorL = Math.max(0, sinL); // when > 0, source is on the right, so left ear lags
    const itdFactorLContra = Math.max(0, -sinL); // when < 0, source is on the left, right ear lags
    delayLL.delayTime.setValueAtTime(itdFactorL * MAX_ITD, t);
    delayLR.delayTime.setValueAtTime(itdFactorLContra * MAX_ITD, t);
    shadowLR.gain.setValueAtTime(-6.0 * itdFactorLContra, t);

    // For Spk R:
    const sinR = Math.sin(azR);
    const itdFactorR = Math.max(0, sinR);
    const itdFactorRContra = Math.max(0, -sinR);
    delayRL.delayTime.setValueAtTime(itdFactorR * MAX_ITD, t);
    delayRR.delayTime.setValueAtTime(itdFactorRContra * MAX_ITD, t);
    shadowRL.gain.setValueAtTime(-6.0 * itdFactorR, t);
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

    // Room switch (cached IR)
    switchRoom(params.room);

    // Crossfade dry <-> wet (100 ms linear)
    if (params.active) {
      if (disconnectTimer !== null) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
      if (!wetConnected) {
        try {
          preGain.connect(wetSend);
          wetConnected = true;
        } catch {
          // Ignore
        }
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

      if (disconnectTimer === null) {
        disconnectTimer = setTimeout(() => {
          if (!params.active && wetConnected) {
            try {
              wetSend.disconnect();
              wetConnected = false;
            } catch {
              // Ignore
            }
          }
          disconnectTimer = null;
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
    const t = ctx.currentTime;
    if (kind === 'hrtf' && hasPanner) {
      hrtfSelect.gain.setValueAtTime(1.0, t);
      headModelSelect.gain.setValueAtTime(0.0, t);
    } else {
      hrtfSelect.gain.setValueAtTime(0.0, t);
      headModelSelect.gain.setValueAtTime(1.0, t);
    }
  }

  return {
    input,
    output,
    apply,
    setRenderer,
    _internal: {
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
