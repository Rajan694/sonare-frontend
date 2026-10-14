import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { API, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { makeTrack, testUser } from '../helpers/fixtures';
import { clearSession, setSession } from '../../src/api/auth';
import { CANONICAL_BARS, placeholderPeaks } from '../../../shared/catalog/peaks';
import type { PlaybackStatus } from '../../src/audio/player';
import { useWaveform, _resetWaveforms, _sampleWaveform } from '../../src/audio/waveform';

/** What the player reports and what the level meter hears, set per test. */
const h = vi.hoisted(() => ({
  status: { trackId: null, playing: false, positionMs: 0, durationMs: 0 } as Partial<PlaybackStatus>,
  level: 0.5,
  /** When set, fills the meter's buffer instead of a constant level. */
  fill: null as ((buf: Float32Array) => void) | null,
}));

vi.mock('../../src/audio/player', () => ({
  getStatus: () => h.status,
  onPlaybackChange: () => () => {},
}));
vi.mock('../../src/audio/dsp', () => ({
  levelMeter: () => ({
    fftSize: 480,
    context: { sampleRate: 48_000 },
    getFloatTimeDomainData: (buf: Float32Array) => (h.fill ? h.fill(buf) : buf.fill(-h.level)),
  }),
}));

useMockServer();

const song = makeTrack({ id: 'yt:wave1', durationMs: 150_000 });

/** GET answers a placeholder (or a real waveform); PUTs are recorded. */
const peaksEndpoint = (placeholder: boolean) => {
  const puts: unknown[] = [];
  server.use(
    http.get(`${API}/tracks/:id/peaks`, ({ params }) =>
      HttpResponse.json({
        peaks: placeholder ? placeholderPeaks(String(params.id), CANONICAL_BARS) : new Array(CANONICAL_BARS).fill(0.5),
        placeholder,
      }),
    ),
    http.put(`${API}/tracks/:id/peaks`, async ({ request }) => {
      puts.push(await request.json());
      return HttpResponse.json({ stored: true }, { status: 201 });
    }),
  );
  return puts;
};

/** Play `song` at `positionMs` and take a level sample (one per second of a 150 s song is one bar). */
const hear = (positionMs: number, level = 0.5) => {
  h.status = { trackId: song.id, playing: true, positionMs, durationMs: 150_000 };
  h.level = level;
  act(() => _sampleWaveform());
};

beforeEach(() => {
  h.fill = null;
  _resetWaveforms();
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => clearSession());

describe('waveforms heard on this device', () => {
  it('WEB-WAVE-001 a placeholder is drawn dimmed, and bars turn real as the song plays past them', async () => {
    peaksEndpoint(true);
    const { result } = renderHook(() => useWaveform(song));
    await waitFor(() => expect(result.current.peaks).toHaveLength(CANONICAL_BARS));
    expect(result.current.real?.every((r) => !r)).toBe(true);

    hear(10_050, 0.5);
    await waitFor(() => expect(result.current.real?.[10]).toBe(true));
    expect(result.current.real?.filter(Boolean)).toHaveLength(1);
    // The only heard bar is the loudest so far.
    expect(result.current.peaks?.[10]).toBe(1);
  });

  it('WEB-WAVE-002 once every bar is heard the waveform is uploaded, once, and drawn without dimming', async () => {
    setSession('a', 'r', testUser);
    const puts = peaksEndpoint(true);
    const { result } = renderHook(() => useWaveform(song));
    await waitFor(() => expect(result.current.real).toBeDefined());

    for (let bar = 0; bar < CANONICAL_BARS; bar++) hear(bar * 1000 + 20, bar === 75 ? 0.8 : 0.4);
    await waitFor(() => expect(puts).toHaveLength(1));
    const { peaks } = puts[0] as { peaks: number[] };
    expect(peaks).toHaveLength(CANONICAL_BARS);
    expect(peaks[75]).toBe(1);
    expect(peaks[0]).toBe(0.5);

    await waitFor(() => expect(result.current.real).toBeUndefined());
    hear(80_000, 0.9);
    expect(puts).toHaveLength(1);
  });

  it('WEB-WAVE-003 a guest keeps the full waveform; it is uploaded the next time the song shows, signed in', async () => {
    const puts = peaksEndpoint(true);
    const first = renderHook(() => useWaveform(song));
    await waitFor(() => expect(first.result.current.real).toBeDefined());
    for (let bar = 0; bar < CANONICAL_BARS; bar++) hear(bar * 1000 + 20);
    await waitFor(() => expect(first.result.current.real).toBeUndefined());
    expect(puts).toHaveLength(0);
    first.unmount();

    setSession('a', 'r', testUser);
    renderHook(() => useWaveform(song));
    await waitFor(() => expect(puts).toHaveLength(1));
  });

  it('WEB-WAVE-004 a real waveform from the backend is drawn as it is, and nothing is sampled', async () => {
    const puts = peaksEndpoint(false);
    const { result } = renderHook(() => useWaveform(song));
    await waitFor(() => expect(result.current.peaks).toHaveLength(CANONICAL_BARS));
    expect(result.current.real).toBeUndefined();
    for (let bar = 0; bar < CANONICAL_BARS; bar++) hear(bar * 1000 + 20);
    expect(result.current.real).toBeUndefined();
    expect(puts).toHaveLength(0);
  });

  it('WEB-WAVE-005 device files keep their own waveform and never ask the backend', async () => {
    let asked = false;
    server.use(
      http.get(`${API}/tracks/:id/peaks`, () => {
        asked = true;
        return HttpResponse.json({ peaks: [], placeholder: true });
      }),
    );
    const file = makeTrack({ id: 'local:abc', peaks: [1, 2, 3] });
    const { result } = renderHook(() => useWaveform(file));
    expect(result.current).toEqual({ peaks: [1, 2, 3] });
    await new Promise((r) => setTimeout(r, 30));
    expect(asked).toBe(false);
  });

  it('WEB-WAVE-006 a bar is as tall as the music is loud, not as its loudest sample', async () => {
    peaksEndpoint(true);
    const { result } = renderHook(() => useWaveform(song));
    await waitFor(() => expect(result.current.real).toBeDefined());
    // A loud bar: every sample at 0.5. A quiet one: silence but for one full-scale click.
    hear(10_050, 0.5);
    h.fill = (buf) => {
      buf.fill(0);
      buf[0] = 1;
    };
    hear(20_050);
    await waitFor(() => expect(result.current.real?.[20]).toBe(true));
    expect(result.current.peaks?.[10]).toBe(1);
    expect(result.current.peaks?.[20]).toBeLessThan(1);
  });
});
