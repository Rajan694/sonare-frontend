export type SpatialMode = 'presets' | 'custom';
export type SpatialPresetId = 'concert' | 'cafe' | 'hall';
export type RoomId = 'stage' | 'cafe' | 'hall' | 'studio';

export interface SpatialCustom {
  x: number; // [-1, 1], +y = front, +x = right
  y: number;
  intensity: number; // 0..100
  ambience: number; // 0..100
  width: number; // 0..100
}

export interface SpatialSettings {
  enabled: boolean;
  mode: SpatialMode;
  preset: SpatialPresetId;
  custom: SpatialCustom;
}

export interface EarlyReflection {
  delayMs: number;
  gain: number;
  channel: 'L' | 'R';
}

export interface ToneSetting {
  type: 'highshelf' | 'lowpass';
  frequency: number;
  gainDb?: number;
}

export interface RoomDefinition {
  id: RoomId;
  name: string;
  rt60Low: number;
  rt60High: number;
  preDelayMs: number;
  dampingHz: number;
  sendLowCutHz: number;
  earlyReflections: EarlyReflection[];
  sendLevelDb: number;
  sizeScale: number;
  Re: number;
  Eer: number;
}

export interface SpatialPreset {
  id: SpatialPresetId;
  label: string;
  description: string;
  distance: number;
  width: number;
  intensity: number;
  ambience: number;
  room: RoomId;
  tone?: ToneSetting;
}

export interface SpatialParams {
  active: boolean;
  azimuth: number; // radians (-pi..pi)
  distance: number; // 0.1..1.0
  spread: number; // radians
  rearShelfDb: number; // dB (negative or 0)
  airHz: number; // 8000..20000 Hz
  tone?: ToneSetting;
  gDir: number; // linear
  gRev: number; // linear
  gEr: number; // linear
  trimDb: number; // dB, applied at the end of the wet path; makes up for preGainDb too
  preGainDb: number; // dB, applied at the start of the wet path only (headroom), -3
  room: RoomDefinition;
  roomId: RoomId;
  earlyReflections: EarlyReflection[];

  // Flat fields for cross-platform bridge (Kotlin / AudioTrack / JNI)
  toneType: 'none' | 'highshelf' | 'lowpass';
  toneFrequency: number;
  toneGainDb: number;
  rt60Low: number;
  rt60High: number;
  preDelayMs: number;
  dampingHz: number;
  sendLowCutHz: number;
  sizeScale: number;
}

export const DEFAULT_SPATIAL: SpatialSettings = {
  enabled: false,
  mode: 'presets',
  preset: 'concert',
  custom: {
    x: 0,
    y: 0.4,
    intensity: 70,
    ambience: 30,
    width: 60,
  },
};

const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

export function sanitizeSpatial(raw: unknown): SpatialSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SPATIAL, custom: { ...DEFAULT_SPATIAL.custom } };
  }

  const obj = raw as Record<string, unknown>;

  const enabled = Boolean(obj.enabled);
  const mode: SpatialMode = obj.mode === 'custom' ? 'custom' : 'presets';
  const preset: SpatialPresetId =
    obj.preset === 'cafe' || obj.preset === 'hall' || obj.preset === 'concert' ? obj.preset : 'concert';

  const rawCustom = (typeof obj.custom === 'object' && obj.custom !== null ? obj.custom : {}) as Record<
    string,
    unknown
  >;

  let x = typeof rawCustom.x === 'number' && Number.isFinite(rawCustom.x) ? rawCustom.x : 0;
  let y = typeof rawCustom.y === 'number' && Number.isFinite(rawCustom.y) ? rawCustom.y : 0.4;
  let r = Math.hypot(x, y);

  if (r < 0.1) {
    if (r === 0) {
      x = 0;
      y = 0.1;
    } else {
      const scale = 0.1 / r;
      x *= scale;
      y *= scale;
    }
  } else if (r > 1.0) {
    const scale = 1.0 / r;
    x *= scale;
    y *= scale;
  }

  const intensity = clamp(
    typeof rawCustom.intensity === 'number' && Number.isFinite(rawCustom.intensity)
      ? rawCustom.intensity
      : DEFAULT_SPATIAL.custom.intensity,
    0,
    100,
  );

  const ambience = clamp(
    typeof rawCustom.ambience === 'number' && Number.isFinite(rawCustom.ambience)
      ? rawCustom.ambience
      : DEFAULT_SPATIAL.custom.ambience,
    0,
    100,
  );

  const width = clamp(
    typeof rawCustom.width === 'number' && Number.isFinite(rawCustom.width)
      ? rawCustom.width
      : DEFAULT_SPATIAL.custom.width,
    0,
    100,
  );

  return {
    enabled,
    mode,
    preset,
    custom: { x, y, intensity, ambience, width },
  };
}

export const ROOMS: Record<RoomId, RoomDefinition> = {
  cafe: {
    id: 'cafe',
    name: 'Café',
    rt60Low: 0.55,
    rt60High: 0.35,
    preDelayMs: 6,
    dampingHz: 3500,
    sendLowCutHz: 220,
    earlyReflections: [
      { delayMs: 7, gain: 0.5, channel: 'L' },
      { delayMs: 11, gain: 0.45, channel: 'R' },
      { delayMs: 17, gain: 0.35, channel: 'L' },
      { delayMs: 23, gain: 0.3, channel: 'R' },
      { delayMs: 31, gain: 0.22, channel: 'L' },
    ],
    sendLevelDb: -16,
    sizeScale: 0.5,
    Re: 1.0,
    Eer: 0.5 ** 2 + 0.45 ** 2 + 0.35 ** 2 + 0.3 ** 2 + 0.22 ** 2,
  },
  stage: {
    id: 'stage',
    name: 'Concert',
    rt60Low: 1.5,
    rt60High: 0.9,
    preDelayMs: 18,
    dampingHz: 6000,
    sendLowCutHz: 150,
    earlyReflections: [
      { delayMs: 12, gain: 0.55, channel: 'L' },
      { delayMs: 15, gain: 0.5, channel: 'R' },
      { delayMs: 22, gain: 0.45, channel: 'L' },
      { delayMs: 27, gain: 0.4, channel: 'R' },
      { delayMs: 36, gain: 0.35, channel: 'L' },
      { delayMs: 44, gain: 0.3, channel: 'R' },
      { delayMs: 58, gain: 0.25, channel: 'L' },
      { delayMs: 66, gain: 0.2, channel: 'R' },
    ],
    sendLevelDb: -11,
    sizeScale: 0.8,
    Re: 1.0,
    Eer: 0.55 ** 2 + 0.5 ** 2 + 0.45 ** 2 + 0.4 ** 2 + 0.35 ** 2 + 0.3 ** 2 + 0.25 ** 2 + 0.2 ** 2,
  },
  hall: {
    id: 'hall',
    name: 'Hall',
    rt60Low: 2.2,
    rt60High: 1.1,
    preDelayMs: 32,
    dampingHz: 4500,
    sendLowCutHz: 250,
    earlyReflections: [
      { delayMs: 21, gain: 0.4, channel: 'L' },
      { delayMs: 27, gain: 0.36, channel: 'R' },
      { delayMs: 39, gain: 0.32, channel: 'L' },
      { delayMs: 48, gain: 0.28, channel: 'R' },
      { delayMs: 63, gain: 0.23, channel: 'L' },
      { delayMs: 77, gain: 0.18, channel: 'R' },
    ],
    sendLevelDb: -13,
    sizeScale: 1.0,
    Re: 1.0,
    Eer: 0.4 ** 2 + 0.36 ** 2 + 0.32 ** 2 + 0.28 ** 2 + 0.23 ** 2 + 0.18 ** 2,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    rt60Low: 1.0,
    rt60High: 0.6,
    preDelayMs: 12,
    dampingHz: 5000,
    sendLowCutHz: 180,
    earlyReflections: [
      { delayMs: 9, gain: 0.5, channel: 'L' },
      { delayMs: 14, gain: 0.42, channel: 'R' },
      { delayMs: 20, gain: 0.35, channel: 'L' },
      { delayMs: 28, gain: 0.28, channel: 'R' },
      { delayMs: 38, gain: 0.22, channel: 'L' },
    ],
    sendLevelDb: -14,
    sizeScale: 0.7,
    Re: 1.0,
    Eer: 0.5 ** 2 + 0.42 ** 2 + 0.35 ** 2 + 0.28 ** 2 + 0.22 ** 2,
  },
};

export const SPATIAL_PRESETS: Record<SpatialPresetId, SpatialPreset> = {
  concert: {
    id: 'concert',
    label: 'Concert',
    description: 'Wide live stage with natural presence and centred vocals',
    distance: 0.5,
    width: 75,
    intensity: 85,
    ambience: 55,
    room: 'stage',
  },
  cafe: {
    id: 'cafe',
    label: 'Café',
    description: 'Cosy acoustic space with intimate warm reflections',
    distance: 0.45,
    width: 95,
    intensity: 70,
    ambience: 40,
    room: 'cafe',
    tone: {
      type: 'highshelf',
      frequency: 6000,
      gainDb: -1.5,
    },
  },
  hall: {
    id: 'hall',
    label: 'Hall',
    description: 'Expansive concert hall with long decay and deep soundstage',
    distance: 0.7,
    width: 55,
    intensity: 90,
    ambience: 70,
    room: 'hall',
    tone: {
      type: 'lowpass',
      frequency: 12000,
    },
  },
};

export function toPolar(x: number, y: number): { azimuth: number; distance: number; azimuthDeg: number } {
  const distance = Math.hypot(x, y);
  const azimuth = Math.atan2(x, y); // 0 at front (+y), +pi/2 at right (+x), pi/-pi at back (-y)
  const deg = (azimuth * 180) / Math.PI;
  const azimuthDeg = (deg + 360) % 360;
  return { azimuth, distance, azimuthDeg };
}

export function fromPolar(azimuthRad: number, distance: number): { x: number; y: number } {
  return {
    x: distance * Math.sin(azimuthRad),
    y: distance * Math.cos(azimuthRad),
  };
}

export function withDistance(custom: SpatialCustom, d: number): SpatialCustom {
  const targetD = clamp(d, 0.1, 1.0);
  const r = Math.hypot(custom.x, custom.y);
  if (r < 1e-6) {
    return { ...custom, x: 0, y: targetD };
  }
  const scale = targetD / r;
  return {
    ...custom,
    x: custom.x * scale,
    y: custom.y * scale,
  };
}

/**
 * A point on the soundstage disc, relative to its centre and in the same units as its radius
 * (screen coordinates, so +dy is down), as a source position: +y front, kept 0.1..1 from the
 * listener.
 */
export function pointToPosition(dx: number, dy: number, radius: number): { x: number; y: number } {
  if (!(radius > 0)) return { x: 0, y: 0.1 };
  const x = dx / radius;
  const y = -dy / radius;
  const r = Math.hypot(x, y);
  if (r < 1e-6) return { x: 0, y: 0.1 };
  const scale = clamp(r, 0.1, 1) / r;
  return { x: x * scale, y: y * scale };
}

export function shortestArc(fromRad: number, toRad: number): number {
  let diff = (toRad - fromRad) % (2 * Math.PI);
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

export function directionLabel(azimuthRad: number): string {
  let deg = (azimuthRad * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360; // 0..360
  if (deg >= 337.5 || deg < 22.5) return 'Front';
  if (deg < 67.5) return 'Front-right';
  if (deg < 112.5) return 'Right';
  if (deg < 157.5) return 'Back-right';
  if (deg < 202.5) return 'Back';
  if (deg < 247.5) return 'Back-left';
  if (deg < 292.5) return 'Left';
  return 'Front-left';
}

export function distanceLabel(distance: number): 'Close' | 'Near' | 'Mid' | 'Far' {
  if (distance < 0.3) return 'Close';
  if (distance < 0.55) return 'Near';
  if (distance < 0.8) return 'Mid';
  return 'Far';
}

// Power of the direct path (two virtual speakers, both ears) relative to the input, every 15°
// from front (0°) to back (180°). Measured in Chromium with pink noise at 50% L/R correlation
// (music-like); fully decorrelated or mono input lands within about ±1.2 dB of it.
const HRTF_POWER_TABLE = [1.59, 1.63, 1.62, 1.67, 1.69, 1.68, 1.71, 1.57, 1.47, 1.3, 1.18, 1.14, 1.11];
const HEADMODEL_POWER_TABLE = [2.15, 2.19, 2.28, 2.3, 2.3, 2.45, 2.47, 2.4, 2.23, 2.06, 2.06, 2.03, 2.05];

export function getDirectPower(azimuthRad: number, renderer: 'hrtf' | 'headModel' | 'none'): number {
  if (renderer === 'none') return 1.0;
  const table = renderer === 'hrtf' ? HRTF_POWER_TABLE : HEADMODEL_POWER_TABLE;
  const deg = (Math.abs(azimuthRad) * 180) / Math.PI;
  const clampedDeg = Math.min(180, deg);
  const step = clampedDeg / 15;
  const idx = Math.floor(step);
  const frac = step - idx;
  if (idx >= table.length - 1) return table[table.length - 1];
  return table[idx] * (1 - frac) + table[idx + 1] * frac;
}

export interface ResolveOptions {
  bypass?: boolean;
  renderer?: 'hrtf' | 'headModel' | 'none';
}

export function resolveSpatial(settings: SpatialSettings, options: ResolveOptions = {}): SpatialParams {
  const { bypass = false, renderer = 'hrtf' } = options;
  const active = Boolean(settings.enabled && !bypass);

  let distance: number;
  let azimuth: number;
  let width: number;
  let intensity: number;
  let ambience: number;
  let room: RoomDefinition;
  let tone: ToneSetting | undefined;

  if (settings.mode === 'presets') {
    const preset = SPATIAL_PRESETS[settings.preset] || SPATIAL_PRESETS.concert;
    distance = preset.distance;
    azimuth = 0; // facing soundstage
    width = preset.width;
    intensity = preset.intensity;
    ambience = preset.ambience;
    room = ROOMS[preset.room] || ROOMS.stage;
    tone = preset.tone;
  } else {
    const c = settings.custom;
    const polar = toPolar(c.x, c.y);
    distance = clamp(polar.distance, 0.1, 1.0);
    azimuth = polar.azimuth;
    width = c.width;
    intensity = c.intensity;
    ambience = c.ambience;
    room = ROOMS.studio;
    tone = undefined;
  }

  const intensityFactor = intensity / 100;
  const ambienceFactor = ambience / 100;

  // Spread: clamp(30°·(0.6+0.8·w)·(1−0.4·d), 12°, 55°), blended toward 30° as intensity falls.
  // w = width / 50 (at width 50 w=1.0)
  const wNorm = width / 50;
  const spreadDegRaw = 30 * (0.6 + 0.8 * wNorm) * (1 - 0.4 * distance);
  const spreadDegClamped = clamp(spreadDegRaw, 12, 55);
  const spreadDeg = 30 + (spreadDegClamped - 30) * intensityFactor;
  const spread = (spreadDeg * Math.PI) / 180;

  // Rear shelf: up to -4 * max(0, -cos az) dB. Capped at -2 dB for HRTF.
  let rearShelfDb = -4 * Math.max(0, -Math.cos(azimuth)) * intensityFactor;
  if (renderer === 'hrtf') {
    rearShelfDb = Math.max(-2, rearShelfDb);
  }

  // Air low-pass: 20 kHz near (d=0.1), ~8 kHz far (d=1.0)
  const dNorm = (distance - 0.1) / 0.9;
  const airHz = 20000 - 12000 * dNorm;

  // Direct path gain: intentional -1.5·d dB
  const gDirDb = -1.5 * distance;
  const gDir = Math.pow(10, gDirDb / 20);

  // Send level: from -30 dB up to (room.sendLevelDb + 3 dB)
  const sendDb = -30 + (room.sendLevelDb + 3 - -30) * ambienceFactor;
  const sendGain = Math.pow(10, sendDb / 20);
  const gRev = sendGain * intensityFactor;
  const gEr = sendGain * intensityFactor;

  // The wet path is turned down by preGainDb on its way in (headroom for the HRTF's near-ear
  // boost) and back up by trimDb on its way out, which also evens out its power P against the
  // dry signal: preGainDb + trimDb ≈ −10·log10(P), clamped to −6..+1.5 dB. So Compare and
  // switching spatial audio on or off don't change the loudness.
  const H_az = getDirectPower(azimuth, renderer);
  const P = gDir ** 2 * H_az + gRev ** 2 * room.Re + gEr ** 2 * room.Eer;
  const effectiveP = Math.max(1e-4, P);
  const preGainDb = -3;
  const trimDb = clamp(-10 * Math.log10(effectiveP), -6, 1.5) - preGainDb;

  return {
    active,
    azimuth,
    distance,
    spread,
    rearShelfDb,
    airHz,
    tone,
    gDir,
    gRev,
    gEr,
    trimDb,
    preGainDb,
    room,
    roomId: room.id,
    earlyReflections: room.earlyReflections,

    // Flat bridge fields
    toneType: tone ? tone.type : 'none',
    toneFrequency: tone ? tone.frequency : 0,
    toneGainDb: tone?.gainDb ?? 0,
    rt60Low: room.rt60Low,
    rt60High: room.rt60High,
    preDelayMs: room.preDelayMs,
    dampingHz: room.dampingHz,
    sendLowCutHz: room.sendLowCutHz,
    sizeScale: room.sizeScale,
  };
}

/** Where the Custom soundstage puts its two virtual speakers, as the audio does, for drawing it. */
export function stageGeometry(custom: SpatialCustom): { azimuth: number; distance: number; spread: number } {
  const p = resolveSpatial({ ...DEFAULT_SPATIAL, enabled: true, mode: 'custom', custom });
  return { azimuth: p.azimuth, distance: p.distance, spread: p.spread };
}
