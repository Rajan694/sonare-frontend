/**
 * Account settings (GET/PUT /me/settings) as both apps know them: the fields, their defaults
 * (the backend's too), and the equalizer presets, whose names travel between devices with the
 * account. Each app keeps its own storage and sync around these.
 */

export type AudioQuality = 'low' | 'normal' | 'high';
export type DownloadFormat = 'opus' | 'm4a';

export interface UserSettings {
  eqPreset: string;
  gapless: boolean;
  normalization: boolean;
  streamQuality: AudioQuality;
  downloadQuality: AudioQuality;
  downloadFormat: DownloadFormat;
  stayOffline: boolean;
}

/** The same defaults on both apps and the backend. */
export const DEFAULT_SETTINGS: UserSettings = {
  eqPreset: 'Sonare',
  gapless: true,
  normalization: true,
  streamQuality: 'high',
  downloadQuality: 'high',
  downloadFormat: 'opus',
  stayOffline: false,
};

export const AUDIO_QUALITIES: AudioQuality[] = ['low', 'normal', 'high'];

/** Settings quality → the backend's `quality` parameter for /tracks/:id/stream. */
export const API_QUALITY: Record<AudioQuality, 'low' | 'normal' | 'high'> = {
  low: 'low',
  normal: 'normal',
  high: 'high',
};

/** The equalizer's bands, in Hz. */
export const EQ_BANDS = [32, 64, 150, 400, 1000, 2400, 6000, 14000] as const;

/** Gains in dB for the EQ_BANDS. */
export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0],
  Sonare: [1, 4, 0, -1, 2, 5, 3, 0],
  Bass: [6, 5, 3.5, 1, 0, 0, 0, 0],
  Vocal: [-3, -2, -1, 1.5, 3.5, 3, 1, 0],
  Acoustic: [1, 2.5, 1.5, 0.5, 1, 2, 2.5, 2],
  'Late night': [-3, -2.5, -1, 0, 1, 0.5, -1.5, -3],
};

/** Bands moved by hand. The gains stay on the device; only the name can reach the account. */
export const CUSTOM_PRESET = 'Custom';

/**
 * Known fields with usable values only: the server may send ones a build retired (e.g.
 * 'lossless'), and storage may hold anything. `allowCustom` keeps a hand-made EQ, for what a
 * device saved for itself.
 */
export const sanitizeSettings = (
  s: Record<string, unknown> | null | undefined,
  { allowCustom = false } = {},
): Partial<UserSettings> => {
  if (!s || typeof s !== 'object') return {};
  const out: Partial<UserSettings> = {};
  if (typeof s.eqPreset === 'string' && (s.eqPreset in EQ_PRESETS || (allowCustom && s.eqPreset === CUSTOM_PRESET)))
    out.eqPreset = s.eqPreset;
  if (typeof s.gapless === 'boolean') out.gapless = s.gapless;
  if (typeof s.normalization === 'boolean') out.normalization = s.normalization;
  if (typeof s.stayOffline === 'boolean') out.stayOffline = s.stayOffline;
  if (AUDIO_QUALITIES.includes(s.streamQuality as AudioQuality)) out.streamQuality = s.streamQuality as AudioQuality;
  if (AUDIO_QUALITIES.includes(s.downloadQuality as AudioQuality))
    out.downloadQuality = s.downloadQuality as AudioQuality;
  if (s.downloadFormat === 'opus' || s.downloadFormat === 'm4a') out.downloadFormat = s.downloadFormat;
  return out;
};
