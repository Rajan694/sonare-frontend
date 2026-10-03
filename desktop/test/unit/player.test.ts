import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';

useMockServer();

/**
 * A real <audio> element whose playback state the test controls: jsdom has no media
 * pipeline, so paused / duration / play() are scripted here.
 */
interface ScriptedAudio extends HTMLAudioElement {
  fire(type: string): void;
  playError: Error | null;
}

let created: ScriptedAudio[] = [];

function scriptedAudio(): ScriptedAudio {
  const el = document.createElement('audio') as ScriptedAudio;
  let paused = true;
  let duration = NaN;
  let time = 0;
  el.playError = null;
  Object.defineProperties(el, {
    paused: { get: () => paused },
    ended: { get: () => false },
    duration: { get: () => duration, set: (v) => (duration = v) },
    currentTime: { get: () => time, set: (v) => (time = v) },
  });
  el.play = vi.fn(async () => {
    if (el.playError) throw el.playError;
    paused = false;
    el.dispatchEvent(new Event('play'));
  });
  el.pause = vi.fn(() => {
    paused = true;
    el.dispatchEvent(new Event('pause'));
  });
  el.load = vi.fn();
  el.fire = (type) => el.dispatchEvent(new Event(type));
  created.push(el);
  return el;
}

/** player.ts owns one element for the app's lifetime; each test loads a fresh module. */
async function freshPlayer() {
  vi.resetModules();
  return import('../../src/data/player');
}

function streamEndpoint(over: Record<string, unknown> = {}) {
  let n = 0;
  server.use(
    http.get(`${API}/tracks/:id/stream`, ({ params }) =>
      HttpResponse.json({
        url: `/api/v1/stream/${String(params.id)}-${++n}`,
        mimeType: 'audio/webm',
        codec: 'opus',
        bitrateKbps: 160,
        contentLength: 1000,
        expiresAt: Date.now() + 3_600_000,
        ...over,
      }),
    ),
  );
}

const audio = () => created[created.length - 1];

beforeEach(() => {
  created = [];
  vi.stubGlobal('Audio', vi.fn(scriptedAudio));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loading and playing a track', () => {
  it('WEB-PLAYER-001 resolves a stream at the chosen quality, points the element at it and plays', async () => {
    streamEndpoint();
    const rec = recordRequests();
    const player = await freshPlayer();
    await player.playTrackId('yt:t1');
    rec.stop();
    expect(rec.paths()).toEqual(['GET /tracks/yt%3At1/stream?quality=high']);
    // The root-relative url from the server is resolved against the API origin.
    expect(audio().src).toBe('http://api.sonare.test/api/v1/stream/yt:t1-1');
    expect(audio().crossOrigin).toBe('anonymous');
    expect(audio().play).toHaveBeenCalled();
    expect(player.getStatus()).toMatchObject({ trackId: 'yt:t1', playing: true, error: null });
  });

  it('WEB-PLAYER-002 keeps an absolute stream url as it is', async () => {
    streamEndpoint({ url: 'https://cdn.example/audio.webm' });
    const player = await freshPlayer();
    await player.load('yt:t1');
    expect(audio().src).toBe('https://cdn.example/audio.webm');
  });

  it('WEB-PLAYER-003 reuses a fresh url for the same track, and re-resolves one about to expire', async () => {
    let expiresAt = Date.now() + 3_600_000;
    let n = 0;
    server.use(http.get(`${API}/tracks/:id/stream`, () => HttpResponse.json({ url: `/s/${++n}`, expiresAt })));
    const player = await freshPlayer();
    await player.load('yt:t1');
    await player.load('yt:t1');
    expect(n).toBe(1);
    expiresAt = Date.now() + 1_000; // within the 5 s safety margin
    await player.load('yt:t1', true);
    await player.load('yt:t1');
    expect(n).toBe(3);
  });

  it('WEB-PLAYER-004 a slow answer for a track the user already skipped does not replace the new one', async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((r) => (releaseFirst = r));
    server.use(
      http.get(`${API}/tracks/:id/stream`, async ({ params }) => {
        if (params.id === 'yt:slow') await firstGate;
        return HttpResponse.json({ url: `/s/${String(params.id)}`, expiresAt: Date.now() + 3_600_000 });
      }),
    );
    const player = await freshPlayer();
    const slow = player.load('yt:slow');
    await player.load('yt:fast');
    releaseFirst();
    await slow;
    expect(audio().src).toBe('http://api.sonare.test/s/yt:fast');
    expect(player.getStatus().trackId).toBe('yt:fast');
  });

  it('WEB-PLAYER-005 a stream that cannot be resolved surfaces the server message', async () => {
    server.use(
      http.get(`${API}/tracks/:id/stream`, () => apiError(503, 'NO_AUDIO_STREAM', 'No audio stream for this video')),
    );
    const player = await freshPlayer();
    await expect(player.playTrackId('yt:t1')).rejects.toMatchObject({ code: 'NO_AUDIO_STREAM' });
    expect(player.getStatus()).toMatchObject({ loading: false, error: 'No audio stream for this video' });
  });

  it('WEB-PLAYER-006 reports buffering between waiting and playing', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    const states: boolean[] = [];
    player.onPlaybackChange((s) => states.push(s.loading));
    await player.load('yt:t1');
    audio().fire('waiting');
    expect(player.getStatus().loading).toBe(true);
    audio().fire('playing');
    expect(player.getStatus().loading).toBe(false);
    expect(states).toContain(true);
  });

  it('WEB-PLAYER-007 flags a muxed (video) fallback stream', async () => {
    streamEndpoint({ muxed: true });
    const player = await freshPlayer();
    await player.load('yt:t1');
    expect(player.getStatus().muxed).toBe(true);
  });
});

describe('recovering from errors', () => {
  it('WEB-PLAYER-008 a media error re-resolves the url once without showing an error', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    await player.playTrackId('yt:t1');
    audio().fire('error');
    await vi.waitFor(() => expect(audio().src).toMatch(/yt:t1-2$/));
    expect(player.getStatus().error).toBeNull();
  });

  it('WEB-PLAYER-009 a second media error on the same track shows "Playback failed"', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    await player.playTrackId('yt:t1');
    audio().fire('error');
    await vi.waitFor(() => expect(audio().src).toMatch(/-2$/));
    audio().fire('error');
    expect(player.getStatus()).toMatchObject({ error: 'Playback failed', loading: false });
  });

  it('WEB-PLAYER-010 retry fetches a fresh url and plays again, even after giving up', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    await player.playTrackId('yt:t1');
    audio().fire('error');
    await vi.waitFor(() => expect(audio().src).toMatch(/-2$/));
    audio().fire('error');
    await player.retry();
    expect(audio().src).toMatch(/-3$/);
    expect(audio().play).toHaveBeenCalledTimes(2);
  });

  it('WEB-PLAYER-011 a blocked autoplay asks the user to press play instead of reporting a failure', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    await player.load('yt:t1');
    audio().playError = Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
    await player.play();
    expect(player.getStatus().error).toBe('Press play to start audio');
    audio().playError = new Error('decode');
    await player.play();
    expect(player.getStatus().error).toBe('Playback failed');
  });
});

describe('transport controls', () => {
  it('WEB-PLAYER-012 toggle plays when paused and pauses when playing; does nothing with no track', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    player.toggle();
    expect(audio().play).not.toHaveBeenCalled();
    await player.load('yt:t1');
    player.toggle();
    await vi.waitFor(() => expect(audio().paused).toBe(false));
    player.toggle();
    expect(audio().paused).toBe(true);
  });

  it('WEB-PLAYER-013 seek clamps to the track and waits for a known duration', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    await player.load('yt:t1');
    player.seek(10_000);
    expect(audio().currentTime).toBe(0); // duration unknown yet
    audio().duration = 200;
    player.seek(50_000);
    expect(audio().currentTime).toBe(50);
    player.seek(999_000);
    expect(audio().currentTime).toBe(200);
    player.seek(-5_000);
    expect(audio().currentTime).toBe(0);
  });

  it('WEB-PLAYER-014 notifies ended-listeners when a track finishes', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    const ended = vi.fn();
    const off = player.onEnded(ended);
    await player.load('yt:t1');
    audio().fire('ended');
    expect(ended).toHaveBeenCalledTimes(1);
    off();
    audio().fire('ended');
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('WEB-PLAYER-015 a playback listener gets the current state at once and stops after unsubscribing', async () => {
    const player = await freshPlayer();
    const fn = vi.fn();
    const off = player.onPlaybackChange(fn);
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ trackId: null, playing: false, positionMs: 0 }));
    off();
    player.setVolume(0.5);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('volume', () => {
  it('WEB-PLAYER-016 clamps, applies and remembers the volume', async () => {
    streamEndpoint();
    const player = await freshPlayer();
    await player.load('yt:t1');
    player.setVolume(0.3);
    expect(audio().volume).toBe(0.3);
    expect(localStorage.getItem('sonare_volume')).toBe('0.3');
    player.setVolume(4);
    expect(player.getVolume()).toBe(1);
    player.setVolume(-1);
    expect(player.getVolume()).toBe(0);
  });

  it('WEB-PLAYER-017 mute goes to 0 and unmute restores the previous level', async () => {
    const player = await freshPlayer();
    player.setVolume(0.6);
    player.toggleMute();
    expect(player.getVolume()).toBe(0);
    player.toggleMute();
    expect(player.getVolume()).toBe(0.6);
  });

  it('WEB-PLAYER-018 unmuting after muting by dragging to 0 goes back to full volume', async () => {
    const player = await freshPlayer();
    player.setVolume(0);
    player.toggleMute();
    expect(player.getVolume()).toBe(1);
  });

  it('WEB-PLAYER-019 starts at the remembered volume; bad or out-of-range values fall back safely', async () => {
    localStorage.setItem('sonare_volume', '0.4');
    expect((await freshPlayer()).getVolume()).toBe(0.4);
    localStorage.setItem('sonare_volume', 'loud');
    expect((await freshPlayer()).getVolume()).toBe(1);
    localStorage.setItem('sonare_volume', '7');
    expect((await freshPlayer()).getVolume()).toBe(1);
  });
});
