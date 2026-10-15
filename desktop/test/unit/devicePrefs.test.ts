import { describe, expect, it, vi } from 'vitest';

const fresh = async () => {
  vi.resetModules();
  return import('../../src/storage/devicePrefs');
};

describe('device preferences', () => {
  it('WEB-PREFS-001 start at the original lyrics with Autoplay on, and restore what was saved', async () => {
    let p = await fresh();
    expect(p.getDevicePrefs()).toEqual({ lyricsScript: 'original', autoplaySimilar: true });
    p.updateDevicePrefs({ lyricsScript: 'devanagari', autoplaySimilar: false });
    p = await fresh();
    expect(p.getDevicePrefs()).toEqual({ lyricsScript: 'devanagari', autoplaySimilar: false });
  });

  it('WEB-PREFS-002 an unknown script or unreadable storage falls back to the defaults', async () => {
    // An output device saved by an older version is dropped too.
    localStorage.setItem('sonare_device_prefs', JSON.stringify({ lyricsScript: 'klingon', audioOutputId: 'x' }));
    expect((await fresh()).getDevicePrefs()).toEqual({ lyricsScript: 'original', autoplaySimilar: true });
    localStorage.setItem('sonare_device_prefs', '{broken');
    expect((await fresh()).getDevicePrefs()).toEqual({ lyricsScript: 'original', autoplaySimilar: true });
  });

  it('WEB-PREFS-003 every script offered is one the server accepts', async () => {
    const { LYRICS_SCRIPTS } = await fresh();
    expect(LYRICS_SCRIPTS.map((s) => s.value)).toEqual([
      'original',
      'latin',
      'devanagari',
      'gurmukhi',
      'arabic',
      'bengali',
      'gujarati',
      'tamil',
      'telugu',
    ]);
  });
});
