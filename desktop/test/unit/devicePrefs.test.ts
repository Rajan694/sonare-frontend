import { describe, expect, it, vi } from 'vitest';

const fresh = async () => {
  vi.resetModules();
  return import('../../src/storage/devicePrefs');
};

describe('device preferences', () => {
  it('WEB-PREFS-001 start at the original lyrics and the system output, and restore what was saved', async () => {
    let p = await fresh();
    expect(p.getDevicePrefs()).toEqual({ lyricsScript: 'original', audioOutputId: '' });
    p.updateDevicePrefs({ lyricsScript: 'devanagari', audioOutputId: 'bt' });
    p = await fresh();
    expect(p.getDevicePrefs()).toEqual({ lyricsScript: 'devanagari', audioOutputId: 'bt' });
  });

  it('WEB-PREFS-002 an unknown script or unreadable storage falls back to the defaults', async () => {
    localStorage.setItem('sonare_device_prefs', JSON.stringify({ lyricsScript: 'klingon', audioOutputId: 'x' }));
    expect((await fresh()).getDevicePrefs()).toEqual({ lyricsScript: 'original', audioOutputId: 'x' });
    localStorage.setItem('sonare_device_prefs', '{broken');
    expect((await fresh()).getDevicePrefs()).toEqual({ lyricsScript: 'original', audioOutputId: '' });
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
