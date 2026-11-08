import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DemuxedAudio } from '../../src/audio/audioDemux';
import type { StreamDecoderRequest } from '../../src/audio/streamDecoder.worker';

/**
 * StreamPlayback with the decoder worker and the AudioContext faked: what matters here is where
 * each run of the decoder starts (the `start` requests it sends), not the audio itself.
 */
const sent: StreamDecoderRequest[] = [];
vi.stubGlobal(
  'Worker',
  class {
    onmessage = null;
    postMessage(request: StreamDecoderRequest) {
      sent.push(request);
    }
  },
);

const { StreamPlayback } = await import('../../src/audio/streamPlayback');

const node = () => ({
  gain: { value: 1 },
  connect: vi.fn(),
  disconnect: vi.fn(),
});
const ctx = {
  state: 'running',
  currentTime: 0,
  sampleRate: 48_000,
  createGain: node,
  resume: vi.fn(async () => {}),
} as unknown as AudioContext;

/** The first `seconds` of a file, as the demuxer gives them. */
const media = (seconds: number): DemuxedAudio => ({
  codec: 'opus',
  sampleRate: 48_000,
  channels: 2,
  bytes: new Uint8Array(4),
  offsets: new Uint32Array(1),
  sizes: new Uint32Array(1),
  starts: new Float64Array(1),
  count: Math.round(seconds),
  duration: seconds,
});

const starts = () => sent.filter((r) => r.type === 'start').map((r) => (r.type === 'start' ? r.target : null));
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const made: { dispose(): void }[] = [];
/** A 22-minute song with its first `here` seconds downloaded. */
const downloading = (here: number) => {
  const p = new StreamPlayback(ctx, node() as unknown as AudioNode, media(here), vi.fn(), vi.fn(), {
    totalSeconds: 1320,
  });
  made.push(p);
  return p;
};

afterEach(() => {
  for (const p of made.splice(0)) p.dispose();
  sent.length = 0;
});

describe('StreamPlayback while the song downloads', () => {
  it('WEB-STREAM-001 a start position past the downloaded part waits for it, then plays from there', async () => {
    const p = downloading(5);
    p.seek(115, true);
    await p.play();
    expect(starts()).toEqual([]);
    expect(p.waiting).toBe(true);
    expect(p.paused).toBe(true);
    expect(p.currentTime).toBe(115);

    p.grow(media(60), false);
    await settle();
    expect(starts()).toEqual([]);

    p.grow(media(120), false);
    await settle();
    expect(starts()).toEqual([115]);
    expect(p.waiting).toBe(false);
    expect(p.paused).toBe(false);
  });

  it('WEB-STREAM-002 a seek by the user still lands just before the downloaded end, and cancels a waiting start', async () => {
    const p = downloading(5);
    await p.play();
    p.seek(115);
    await settle();
    expect(starts()).toEqual([0, 4]);

    p.seek(300, true);
    await settle();
    expect(p.waiting).toBe(true);
    p.seek(2);
    await settle();
    expect(p.waiting).toBe(false);
    expect(starts()).toEqual([0, 4, 2]);
  });

  it('WEB-STREAM-003 a paused wait starts nothing; the finished download releases it at the right place', async () => {
    const p = downloading(5);
    p.seek(115, true);
    expect(p.waiting).toBe(false);
    p.grow(media(1320), true);
    await settle();
    expect(starts()).toEqual([]);
    expect(p.currentTime).toBe(115);
    await p.play();
    expect(starts()).toEqual([115]);
  });

  it('WEB-STREAM-004 a whole file never waits, even for a position past its end', async () => {
    const p = new StreamPlayback(ctx, node() as unknown as AudioNode, media(1320), vi.fn(), vi.fn());
    made.push(p);
    p.seek(2000, true);
    await p.play();
    expect(p.waiting).toBe(false);
    expect(starts()).toHaveLength(1);
  });
});
