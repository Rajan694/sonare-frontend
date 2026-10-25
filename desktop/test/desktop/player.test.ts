import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetFs, writeFile } from '../helpers/fakeNeutralino';
import { mp3Frames } from '../helpers/audioFixtures';
import { useMockServer } from '../helpers/server';

/**
 * The Linux window plays local files through Web Audio instead of <audio>, whose WebKitGTK
 * build drops out every ~64 KB: short files are decoded whole (BufferPlayback), long ones
 * streamed with WebCodecs (StreamPlayback), anything else falls back to the element. The
 * Web Audio classes are replaced by recorders so these tests check player.ts's choices.
 */
vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);

const h = vi.hoisted(() => {
  class FakePlayback {
    static made: FakePlayback[] = [];
    paused = true;
    ended = false;
    currentTime = 0;
    volume = 1;
    rate = 1;
    disposed = false;
    playError: Error | null = null;
    constructor(
      public kind: 'buffer' | 'stream',
      public source: unknown,
      public duration: number,
      public onEnded: () => void,
      public onFail?: () => void,
    ) {
      FakePlayback.made.push(this);
    }
    async play() {
      if (this.playError) throw this.playError;
      this.paused = false;
    }
    pause() {
      this.paused = true;
    }
    seek(s: number) {
      this.currentTime = s;
    }
    setVolume(v: number) {
      this.volume = v;
    }
    setRate(r: number) {
      this.rate = r;
    }
    fades: [number, number][] = [];
    fadeTo(level: number, seconds: number) {
      this.fades.push([level, seconds]);
    }
    dispose() {
      this.disposed = true;
    }
  }
  const ctx = {
    decodedSeconds: 180,
    decodeFails: false,
    decodeAudioData: vi.fn(async function (this: void) {
      if (ctx.decodeFails) throw new Error('EncodingError');
      return { duration: ctx.decodedSeconds };
    }),
  };
  return {
    FakePlayback,
    ctx,
    canStream: true,
    dsp: { speed: 1, crossfade: false, crossfadeMs: 6000, fades: false },
  };
});

vi.mock('../../src/audio/bufferPlayback', () => ({
  BufferPlayback: class extends h.FakePlayback {
    constructor(_ctx: unknown, _input: unknown, buffer: { duration: number }, onEnded: () => void) {
      super('buffer', buffer, buffer.duration, onEnded);
    }
  },
}));
vi.mock('../../src/audio/streamPlayback', () => ({
  canStream: vi.fn(async () => h.canStream),
  StreamPlayback: class extends h.FakePlayback {
    constructor(_ctx: unknown, _input: unknown, media: { duration: number }, onEnded: () => void, onFail: () => void) {
      super('stream', media, media.duration, onEnded, onFail);
    }
  },
}));
vi.mock('../../src/audio/dsp', () => ({
  bindElement: () => {},
  ensureGraph: async () => {},
  graphInput: async () => ({ ctx: h.ctx, input: {} }),
  getDsp: () => h.dsp,
  subscribeDsp: () => () => {},
  faderFor: () => null,
}));

// Any request to the server fails the test: local files must never be streamed.
useMockServer();

const MUSIC = '/home/me/Music';

const launch = async () => {
  vi.resetModules();
  const player = await import('../../src/audio/player');
  const { localLibrary, getLocalSnapshot } = await import('../../src/storage/local');
  await localLibrary.addFolder(MUSIC);
  const byTitle = (t: string) => getLocalSnapshot().tracks.find((x) => x.title === t)!;
  return { player, localLibrary, getLocalSnapshot, byTitle };
};

let elements: HTMLAudioElement[] = [];

beforeEach(() => {
  resetFs();
  h.FakePlayback.made = [];
  h.ctx.decodedSeconds = 180;
  h.ctx.decodeFails = false;
  h.canStream = true;
  h.dsp = { speed: 1, crossfade: false, crossfadeMs: 6000, fades: false };
  elements = [];
  vi.stubGlobal(
    'Audio',
    vi.fn(function () {
      const el = document.createElement('audio');
      el.play = vi.fn(async () => {});
      el.load = vi.fn();
      elements.push(el);
      return el;
    }),
  );
  URL.createObjectURL = vi.fn(() => 'blob:sonare/local');
  URL.revokeObjectURL = vi.fn();
});

describe('local files on Linux', () => {
  it('DSK-036 a short file is decoded and played through Web Audio, leaving the element empty', async () => {
    writeFile(`${MUSIC}/short.mp3`, mp3Frames(20));
    const { player, byTitle, getLocalSnapshot } = await launch();
    await player.playTrackId(byTitle('short').id);
    const [pb] = h.FakePlayback.made;
    expect(pb.kind).toBe('buffer');
    expect(pb.paused).toBe(false);
    expect(elements[0].getAttribute('src')).toBeNull();
    expect(player.getStatus()).toMatchObject({ playing: true, loading: false, durationMs: 180_000, error: null });
    // The decoder's length replaces the scan's estimate.
    expect(getLocalSnapshot().tracks[0].durationMs).toBe(180_000);
  });

  it('DSK-037 pause, play, seek and volume act on the decoded track', async () => {
    writeFile(`${MUSIC}/short.mp3`, mp3Frames(20));
    const { player, byTitle } = await launch();
    await player.playTrackId(byTitle('short').id);
    const [pb] = h.FakePlayback.made;
    player.toggle();
    expect(pb.paused).toBe(true);
    player.toggle();
    await vi.waitFor(() => expect(pb.paused).toBe(false));
    player.seek(42_500);
    expect(pb.currentTime).toBe(42.5);
    expect(player.getStatus().positionMs).toBe(42_500);
    player.setVolume(0.3);
    expect(pb.volume).toBe(0.3);
  });

  it('DSK-038 the end of a decoded track tells the queue to move on', async () => {
    writeFile(`${MUSIC}/short.mp3`, mp3Frames(20));
    const { player, byTitle } = await launch();
    const ended = vi.fn();
    player.onEnded(ended);
    await player.playTrackId(byTitle('short').id);
    h.FakePlayback.made[0].onEnded();
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('DSK-039 a file too long to decode whole is streamed; a stream failure is reported', async () => {
    writeFile(`${MUSIC}/mix.mp3`, mp3Frames(20));
    h.ctx.decodedSeconds = 16 * 60;
    const { player, byTitle } = await launch();
    await player.playTrackId(byTitle('mix').id);
    const stream = h.FakePlayback.made.find((p) => p.kind === 'stream')!;
    expect(stream).toBeDefined();
    expect(stream.paused).toBe(false);
    stream.onFail!();
    expect(player.getStatus().error).toBe('Playback failed');
  });

  it('DSK-040 a format neither path can read plays through the audio element from a blob url', async () => {
    writeFile(`${MUSIC}/aac.m4a`, new Uint8Array(64));
    h.ctx.decodeFails = true;
    const { player, byTitle } = await launch();
    await player.playTrackId(byTitle('aac').id);
    expect(h.FakePlayback.made).toHaveLength(0);
    expect(elements[0].getAttribute('src')).toBe('blob:sonare/local');
    expect(elements[0].play).toHaveBeenCalled();
  });

  it('DSK-041 choosing another song stops and releases the previous decoded one', async () => {
    writeFile(`${MUSIC}/one.mp3`, mp3Frames(20));
    writeFile(`${MUSIC}/two.mp3`, mp3Frames(20));
    const { player, byTitle } = await launch();
    await player.playTrackId(byTitle('one').id);
    await player.playTrackId(byTitle('two').id);
    const [first, second] = h.FakePlayback.made;
    expect(first.disposed).toBe(true);
    expect(second.disposed).toBe(false);
    expect(player.getStatus().trackId).toBe(byTitle('two').id);
  });

  it('DSK-042 a downloaded song plays from disk, never from the server', async () => {
    writeFile(`${MUSIC}/Sonare/dl.mp3`, mp3Frames(20));
    const { player, localLibrary } = await launch();
    await localLibrary.addDownload({
      serverId: 'yt:song',
      path: `${MUSIC}/Sonare/dl.mp3`,
      dir: `${MUSIC}/Sonare`,
      title: 'Song',
      artist: 'A',
      album: null,
      durationMs: null,
    });
    await player.playTrackId('yt:song');
    expect(h.FakePlayback.made[0].kind).toBe('buffer');
    expect(player.getStatus()).toMatchObject({ trackId: 'yt:song', playing: true });
  });

  it('DSK-043 a blocked start asks the user to press play', async () => {
    writeFile(`${MUSIC}/short.mp3`, mp3Frames(20));
    const { player, byTitle } = await launch();
    await player.load(byTitle('short').id);
    h.FakePlayback.made[0].playError = Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
    await player.play();
    expect(player.getStatus().error).toBe('Press play to start audio');
  });
});

describe('crossfade on Linux', () => {
  it('DSK-076 the next song fades in over the last 6 seconds while this one fades out', async () => {
    writeFile(`${MUSIC}/one.mp3`, mp3Frames(20));
    writeFile(`${MUSIC}/two.mp3`, mp3Frames(20));
    h.dsp = { speed: 1, crossfade: true, crossfadeMs: 6000, fades: false };
    const { player, byTitle } = await launch();
    const advanced = vi.fn();
    player.onAdvance(advanced);
    await player.playTrackId(byTitle('one').id);
    player.setNext({ id: byTitle('two').id, album: 'B' }, 'A');
    const [first] = h.FakePlayback.made;
    first.currentTime = 168;
    // The ticker prepares the next song in the standby slot 15 s before the end...
    await vi.waitFor(() => expect(h.FakePlayback.made).toHaveLength(2), { timeout: 2000 });
    const second = h.FakePlayback.made[1];
    expect(second.paused).toBe(true);
    // ...and starts it 6 s before the end.
    first.currentTime = 175;
    await vi.waitFor(() => expect(advanced).toHaveBeenCalledWith(byTitle('two').id), { timeout: 2000 });
    expect(second.paused).toBe(false);
    expect(first.fades.at(-1)).toEqual([0, 5]);
    expect(second.fades.at(-1)).toEqual([1, 5]);
    expect(player.getStatus().trackId).toBe(byTitle('two').id);
    // A pause during the fade ends it: the old song stops, the new one is at full level.
    player.toggle();
    expect(first.disposed).toBe(true);
    expect(second.fades.at(-1)).toEqual([1, 0.01]);
  });

  it('DSK-077 songs of one album join without a crossfade while gapless is on', async () => {
    writeFile(`${MUSIC}/one.mp3`, mp3Frames(20));
    writeFile(`${MUSIC}/two.mp3`, mp3Frames(20));
    h.dsp = { speed: 1, crossfade: true, crossfadeMs: 6000, fades: false };
    const { player, byTitle } = await launch();
    const advanced = vi.fn();
    player.onAdvance(advanced);
    await player.playTrackId(byTitle('one').id);
    player.setNext({ id: byTitle('two').id, album: 'Same' }, 'Same');
    const [first] = h.FakePlayback.made;
    first.currentTime = 175;
    await vi.waitFor(() => expect(h.FakePlayback.made).toHaveLength(2), { timeout: 2000 });
    await new Promise((r) => setTimeout(r, 300));
    expect(advanced).not.toHaveBeenCalled();
    first.onEnded();
    expect(advanced).toHaveBeenCalledWith(byTitle('two').id);
    expect(h.FakePlayback.made[1].paused).toBe(false);
  });

  it('DSK-093 crossfade starts at custom crossfadeMs before the end', async () => {
    writeFile(`${MUSIC}/c1.mp3`, mp3Frames(20));
    writeFile(`${MUSIC}/c2.mp3`, mp3Frames(20));
    // 10 second crossfade
    h.dsp = { speed: 1, crossfade: true, crossfadeMs: 10000, fades: false };
    const { player, byTitle } = await launch();
    const advanced = vi.fn();
    player.onAdvance(advanced);
    await player.playTrackId(byTitle('c1').id);
    player.setNext({ id: byTitle('c2').id, album: 'AlbumB' }, 'AlbumA');
    const [first] = h.FakePlayback.made;
    first.currentTime = 168; // 12s remaining
    await vi.waitFor(() => expect(h.FakePlayback.made).toHaveLength(2), { timeout: 2000 });
    const second = h.FakePlayback.made[1];
    expect(second.paused).toBe(true);
    // At 171s (9s remaining, <= 10s), crossfade triggers
    first.currentTime = 171;
    await vi.waitFor(() => expect(advanced).toHaveBeenCalledWith(byTitle('c2').id), { timeout: 2000 });
    expect(second.paused).toBe(false);
    expect(first.fades.at(-1)).toEqual([0, 9]);
    expect(second.fades.at(-1)).toEqual([1, 9]);
  });

  it('DSK-094 fades on play and pause ramp volume and cancel cleanly on rapid toggle', async () => {
    writeFile(`${MUSIC}/f1.mp3`, mp3Frames(20));
    h.dsp = { speed: 1, crossfade: false, crossfadeMs: 6000, fades: true };
    const { player, byTitle } = await launch();
    await player.playTrackId(byTitle('f1').id);
    const [first] = h.FakePlayback.made;
    // Track started from paused with fades: setLevel 0, play, fadeTo 1
    expect(first.fades.some(([lvl, sec]) => lvl === 1 && Math.abs(sec - 0.3) < 0.05)).toBe(true);

    // Pause triggers fade out to 0 over ~0.3s
    player.pause();
    expect(first.fades.at(-1)?.[0]).toBe(0);
    expect(first.fades.at(-1)?.[1]).toBeCloseTo(0.3, 1);
    expect(first.paused).toBe(false); // Still playing during fade

    // Pressing play during the pause fade cancels pending pause and restores level 1
    await player.play();
    expect(first.paused).toBe(false);
    expect(first.fades.at(-1)?.[0]).toBe(1);
  });

  it('DSK-095 skipping to another song while playing fades out the old one before starting the new one', async () => {
    writeFile(`${MUSIC}/s1.mp3`, mp3Frames(20));
    writeFile(`${MUSIC}/s2.mp3`, mp3Frames(20));
    h.dsp = { speed: 1, crossfade: false, crossfadeMs: 6000, fades: true };
    const { player, byTitle } = await launch();
    await player.playTrackId(byTitle('s1').id);
    const [first] = h.FakePlayback.made;
    expect(first.paused).toBe(false);

    // Play next track while first is playing
    await player.playTrackId(byTitle('s2').id);
    expect(first.fades.at(-1)?.[0]).toBe(0);
    expect(first.disposed).toBe(true);
    const second = h.FakePlayback.made[1];
    expect(second.paused).toBe(false);
    expect(second.fades.at(-1)?.[0]).toBe(1);
  });

  it('DSK-096 a seek during the pause fade still pauses, and a skip during the skip fade still loads', async () => {
    writeFile(`${MUSIC}/s1.mp3`, mp3Frames(20));
    writeFile(`${MUSIC}/s2.mp3`, mp3Frames(20));
    writeFile(`${MUSIC}/s3.mp3`, mp3Frames(20));
    h.dsp = { speed: 1, crossfade: false, crossfadeMs: 6000, fades: true };
    const { player, byTitle } = await launch();
    await player.playTrackId(byTitle('s1').id);
    const [first] = h.FakePlayback.made;

    player.pause();
    expect(first.paused).toBe(false); // still fading out
    player.seek(1000);
    expect(first.paused).toBe(true); // the seek finished the pause instead of dropping it

    await player.play();
    // Two skips inside one fade: the first one's wait ends at once, the last song wins.
    const skipping = player.playTrackId(byTitle('s2').id);
    await player.playTrackId(byTitle('s3').id);
    await skipping;
    expect(player.getStatus().trackId).toBe(byTitle('s3').id);
  });
});
