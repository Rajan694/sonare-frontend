import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Track } from '../../src/types';
import { commands, emitNativeEvent, lib, resetFs } from '../helpers/fakeNeutralino';

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);

const track = (id: string, extra: Partial<Track> = {}): Track => ({
  id,
  title: 'Naina',
  artistId: 'a1',
  artist: 'Arijit Singh',
  albumId: null,
  album: 'Dangal',
  durationMs: 200_000,
  source: 'server',
  playCount: 0,
  favourite: false,
  addedAt: 0,
  thumbnail: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
  ...extra,
});

const controls = () => ({ play: vi.fn(), pause: vi.fn(), next: vi.fn(), previous: vi.fn(), seekTo: vi.fn() });

// A fresh copy of the module per test, and the fake's mocks that copy sees.
let native: typeof lib;

/** A fresh copy of the module, its helper kept running (or not) by the fake. */
const load = async (helperRuns = true) => {
  commands.answer = helperRuns ? () => new Promise(() => {}) : null;
  vi.resetModules();
  native = (await import('@neutralinojs/lib')) as unknown as typeof lib;
  return import('../../src/audio/mpris');
};

/** The id of the last process spawned, once spawnProcess has answered. */
const helperId = async () => (await vi.mocked(native.os.spawnProcess).mock.results.at(-1)!.value).id as number;

const written = () =>
  vi
    .mocked(native.os.updateSpawnedProcess)
    .mock.calls.filter(([, action]) => action === 'stdIn')
    .map(([, , data]) => JSON.parse(String(data)));

const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => resetFs());
afterEach(() => {
  vi.useRealTimers();
  window.NL_OS = 'Linux';
});

describe('MPRIS (Linux media keys)', () => {
  it('DSK-085 starts one Python helper on Linux and hands its commands to the player until unbound', async () => {
    const mpris = await load();
    const actions = controls();
    const unbind = mpris.bindMpris(actions);
    mpris.bindMpris(actions); // StrictMode binds twice: still one helper
    await settle();
    expect(commands.ran).toHaveLength(1);
    expect(commands.ran[0]).toMatch(
      /^python3 -c "import base64,sys;exec\(base64\.b64decode\(sys\.argv\[1\]\)\)" [A-Za-z0-9+/=]+$/,
    );
    const source = atob(commands.ran[0].split(' ').at(-1)!);
    expect(source).toContain('org.mpris.MediaPlayer2.sonare');

    const id = await helperId();
    const out = (data: string) => emitNativeEvent('spawnedProcess', { id, action: 'stdOut', data });
    out('{"cmd": "pause"}\n{"cmd": "play"}\n{"cmd": "ne');
    out('xt"}\n{"cmd": "previous"}\n{"cmd": "seek", "positionMs": 30000}\nnot json\n');
    // Another process's output isn't the helper's.
    emitNativeEvent('spawnedProcess', { id: id + 100, action: 'stdOut', data: '{"cmd": "next"}\n' });
    expect(actions.pause).toHaveBeenCalledTimes(1);
    expect(actions.play).toHaveBeenCalledTimes(1);
    expect(actions.next).toHaveBeenCalledTimes(1);
    expect(actions.previous).toHaveBeenCalledTimes(1);
    expect(actions.seekTo).toHaveBeenCalledWith(30000);

    unbind();
    out('{"cmd": "play"}\n');
    expect(actions.play).toHaveBeenCalledTimes(1);
  });

  it('DSK-086 tells the helper what is playing, once per change, including what played before it started', async () => {
    const mpris = await load();
    mpris.showInMpris(track('yt:abc'), true);
    mpris.bindMpris(controls());
    await settle();
    expect(written()).toEqual([
      {
        type: 'state',
        status: 'Playing',
        track: {
          id: 'yt:abc',
          title: 'Naina',
          artist: 'Arijit Singh',
          album: 'Dangal',
          artUrl: expect.stringMatching(/^https:\/\/i\.ytimg\.com\//),
          lengthMs: 200_000,
        },
      },
    ]);

    mpris.showInMpris(track('yt:abc'), true); // a re-render
    mpris.showInMpris(track('yt:abc'), false);
    mpris.showInMpris(track('local:1', { source: 'local', thumbnail: undefined, album: null, durationMs: null }), true);
    mpris.showInMpris(null, false);
    expect(written().slice(1)).toEqual([
      expect.objectContaining({ status: 'Paused' }),
      {
        type: 'state',
        status: 'Playing',
        track: expect.objectContaining({ id: 'local:1', album: '', artUrl: '', lengthMs: 0 }),
      },
      { type: 'state', status: 'Stopped', track: null },
    ]);
  });

  it('DSK-087 sends the position on a jump or every 5 s, as the helper keeps time by itself', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const mpris = await load();
    mpris.bindMpris(controls());
    await settle();
    mpris.showInMpris(track('yt:abc'), true);
    const positions = () => written().filter((m) => m.type === 'position');

    mpris.showPositionInMpris(0, 200_000);
    for (let t = 250; t < 5000; t += 250) {
      vi.setSystemTime(Date.now() + 250);
      mpris.showPositionInMpris(t, 200_000);
    }
    expect(positions()).toEqual([{ type: 'position', positionMs: 0, durationMs: 200_000 }]);

    vi.setSystemTime(Date.now() + 250);
    mpris.showPositionInMpris(90_000, 200_000); // a seek
    vi.setSystemTime(Date.now() + 5000);
    mpris.showPositionInMpris(95_000, 200_000); // drift check
    expect(
      positions()
        .slice(1)
        .map((m) => m.positionMs),
    ).toEqual([90_000, 95_000]);

    // Paused, the position stands still: nothing to send.
    mpris.showInMpris(track('yt:abc'), false);
    vi.setSystemTime(Date.now() + 1000);
    mpris.showPositionInMpris(95_000, 200_000);
    expect(positions()).toHaveLength(3);
  });

  it('DSK-088 a helper that cannot run (no Python, no session bus) is left alone', async () => {
    const mpris = await load(false);
    mpris.bindMpris(controls());
    await settle();
    await settle();
    expect(commands.ran).toHaveLength(1);
    mpris.showInMpris(track('yt:abc'), true);
    mpris.showPositionInMpris(1000, 200_000);
    expect(written()).toEqual([]);
    expect(vi.mocked(native.events.off)).toHaveBeenCalledWith('spawnedProcess', expect.any(Function));
  });

  it('DSK-089 does nothing outside the Linux window', async () => {
    window.NL_OS = 'Windows';
    const mpris = await load();
    mpris.bindMpris(controls());
    mpris.showInMpris(track('yt:abc'), true);
    await settle();
    expect(commands.ran).toEqual([]);
    expect(written()).toEqual([]);
  });

  it('DSK-090 the page pings its helper while it runs and stops it as the page goes', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const mpris = await load();
    mpris.bindMpris(controls());
    await settle();
    const id = await helperId();

    vi.advanceTimersByTime(25_000);
    expect(written().filter((m) => m.type === 'ping')).toHaveLength(2);

    window.dispatchEvent(new Event('pagehide'));
    expect(vi.mocked(native.os.updateSpawnedProcess)).toHaveBeenCalledWith(id, 'exit');

    // Gone: no more pings.
    emitNativeEvent('spawnedProcess', { id, action: 'exit', data: 0 });
    vi.advanceTimersByTime(30_000);
    expect(written().filter((m) => m.type === 'ping')).toHaveLength(2);
  });
});
