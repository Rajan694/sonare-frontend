import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commands, files, lib, resetFs, store, writeFile } from '../helpers/fakeNeutralino';
import { mp3Frames } from '../helpers/audioFixtures';
import { makeTrack } from '../helpers/fixtures';
import { API, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { curlFetch, escapeCurlConfigValue } from '../../src/youtube/curlFetch';
import {
  inAppYoutube,
  isInAppYoutubeAllowed,
  loadCachedConfig,
  setAppConfig,
  type AppConfig,
} from '../../src/youtube/inApp';
import { getStreamCacheDir, streamCache } from '../../src/youtube/streamCache';
import { api } from '../../src/api/api';
import * as player from '../../src/audio/player';
import { downloads, getDownloadsSnapshot } from '../../src/storage/downloads';

/** What curl leaves behind when a request finishes: the status line in its dump-header file. */
const fakeCurlDone = (cmd: string, status: number) => {
  const cfgPath = /-K "([^"]+)"/.exec(cmd)![1];
  const cfg = new TextDecoder().decode(files.get(cfgPath)?.bytes ?? new Uint8Array());
  const hdr = /dump-header = "([^"\r\n]+)"/.exec(cfg)?.[1];
  // A test that wrote its own headers (redirects, content types) keeps them.
  if (hdr && !files.has(hdr)) writeFile(hdr, `HTTP/1.1 ${status} OK\r\ncontent-type: application/octet-stream\r\n\r\n`);
  return { exitCode: 0, stdOut: '' };
};

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
    constructor(
      public kind: 'buffer' | 'stream',
      public source: unknown,
      public duration: number,
      public onEnded: () => void,
    ) {
      FakePlayback.made.push(this);
    }
    async play() {
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
    dispose() {
      this.disposed = true;
    }
  }
  const ctx = {
    decodedSeconds: 180,
    decodeAudioData: vi.fn(async () => ({ duration: 180 })),
  };
  return { FakePlayback, ctx };
});

vi.mock('../../src/audio/bufferPlayback', () => ({
  BufferPlayback: class extends h.FakePlayback {
    constructor(_ctx: unknown, _input: unknown, buffer: { duration: number }, onEnded: () => void) {
      super('buffer', buffer, buffer.duration, onEnded);
    }
  },
}));

vi.mock('../../src/audio/streamPlayback', () => ({
  canStream: vi.fn(async () => true),
  StreamPlayback: class extends h.FakePlayback {
    constructor(_ctx: unknown, _input: unknown, media: { duration: number }, onEnded: () => void) {
      super('stream', media, media.duration, onEnded);
    }
  },
}));

vi.mock('../../src/audio/dsp', () => ({
  bindElement: () => {},
  ensureGraph: async () => {},
  graphInput: async () => ({ ctx: h.ctx, input: {} }),
  getDsp: () => ({ speed: 1 }),
  subscribeDsp: () => () => {},
}));

useMockServer();

let audioEl: HTMLAudioElement | null = null;

beforeEach(() => {
  resetFs();
  inAppYoutube._reset();
  streamCache._reset();
  h.FakePlayback.made = [];
  if (audioEl) {
    audioEl.removeAttribute('src');
    audioEl.src = '';
  }

  const win = window as unknown as {
    NL_MODE: string;
    NL_OS: string;
    NL_PORT: number;
    NL_APPID: string;
    Neutralino: unknown;
  };
  win.NL_MODE = 'window';
  win.NL_OS = 'Linux';
  win.NL_PORT = 5184;
  win.NL_APPID = 'sonare';
  win.Neutralino = lib;

  vi.stubGlobal(
    'Audio',
    vi.fn(function () {
      const el = document.createElement('audio');
      el.play = vi.fn(async () => {});
      el.pause = vi.fn();
      el.load = vi.fn();
      audioEl = el;
      return el;
    }),
  );
  URL.createObjectURL = vi.fn(() => 'blob:sonare/yt');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('in-app YouTube desktop transport and integration', () => {
  it('DSK-055 curlFetch writes url, headers, and body to a -K config file with escaping and cleans up temp files', async () => {
    let capturedConfig = '';
    let capturedBody = '';
    let cfgFile = '';
    let hdrFile = '';
    let outFile = '';
    let bodyFile = '';

    commands.answer = (cmd) => {
      const match = cmd.match(/^curl -K "([^"]+)"$/);
      if (!match) return { exitCode: 1, stdErr: 'unexpected command' };
      cfgFile = match[1];
      capturedConfig = new TextDecoder().decode(files.get(cfgFile)?.bytes ?? new Uint8Array());

      const outMatch = capturedConfig.match(/output = "([^"\r\n]+)"/);
      const hdrMatch = capturedConfig.match(/dump-header = "([^"\r\n]+)"/);
      const bodyMatch = capturedConfig.match(/data-binary = "@([^"\r\n]+)"/);

      outFile = outMatch ? outMatch[1].replace(/\\\\/g, '\\').replace(/\\"/g, '"') : '';
      hdrFile = hdrMatch ? hdrMatch[1].replace(/\\\\/g, '\\').replace(/\\"/g, '"') : '';
      bodyFile = bodyMatch ? bodyMatch[1].replace(/\\\\/g, '\\').replace(/\\"/g, '"') : '';

      if (bodyFile && files.has(bodyFile)) {
        capturedBody = new TextDecoder().decode(files.get(bodyFile)!.bytes);
      }
      if (hdrFile) {
        writeFile(hdrFile, 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n');
      }
      if (outFile) {
        writeFile(outFile, '{"ok":true}');
      }
      return fakeCurlDone(cmd, 200);
    };

    const response = await curlFetch('https://example.com/api?q="quoted\\test"', {
      method: 'POST',
      headers: {
        'X-Special': 'val"with"quotes and \\backslashes\\',
      },
      body: '{"message":"hello"}',
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"ok":true}');
    expect(capturedConfig).toContain('url = "https://example.com/api?q=\\"quoted\\\\test\\""');
    expect(capturedConfig).toContain('request = "POST"');
    expect(capturedConfig).toContain('header = "x-special: val\\"with\\"quotes and \\\\backslashes\\\\"');
    expect(capturedBody).toBe('{"message":"hello"}');
    expect(escapeCurlConfigValue('val"quotes\\slash\nline\rret\ttab')).toBe('val\\"quotes\\\\slash\\nline\\rret\\ttab');

    await vi.waitFor(() => {
      expect(files.has(cfgFile)).toBe(false);
      expect(files.has(hdrFile)).toBe(false);
      expect(files.has(outFile)).toBe(false);
      expect(files.has(bodyFile)).toBe(false);
    });
  });

  it('DSK-056 curlFetch parses status code, multi-hop headers, and binary body from curl output', async () => {
    commands.answer = (cmd) => {
      const match = cmd.match(/^curl -K "([^"]+)"$/);
      const cfgFile = match![1];
      const cfg = new TextDecoder().decode(files.get(cfgFile)?.bytes ?? new Uint8Array());
      const outMatch = cfg.match(/output = "([^"\r\n]+)"/);
      const hdrMatch = cfg.match(/dump-header = "([^"\r\n]+)"/);

      const multiHop =
        'HTTP/1.1 302 Found\r\n' +
        'Location: https://example.com/final\r\n\r\n' +
        'HTTP/1.1 200 OK\r\n' +
        'Content-Type: audio/webm\r\n' +
        'X-Track-Id: yt123\r\n\r\n';
      writeFile(hdrMatch![1], multiHop);
      writeFile(outMatch![1], new Uint8Array([10, 20, 30, 40, 50]));
      return fakeCurlDone(cmd, 200);
    };

    const response = await curlFetch('https://example.com/audio');
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.headers.get('content-type')).toBe('audio/webm');
    expect(response.headers.get('x-track-id')).toBe('yt123');
    expect(response.headers.get('location')).toBeNull();

    const buf = await response.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([10, 20, 30, 40, 50]));
    expect(response.url).toBe('https://example.com/audio');
  });

  it('DSK-057 curlFetch throws on non-zero curl exit code and supports abort signals', async () => {
    commands.answer = () => ({ exitCode: 28, stdErr: 'Operation timed out after 30000ms' });
    await expect(curlFetch('https://example.com/timeout')).rejects.toThrow(TypeError);

    const abortedController = new AbortController();
    abortedController.abort();
    await expect(curlFetch('https://example.com/aborted', { signal: abortedController.signal })).rejects.toThrow(
      'The operation was aborted',
    );

    const liveController = new AbortController();
    commands.answer = (cmd) => {
      liveController.abort();
      return fakeCurlDone(cmd, 200);
    };
    await expect(curlFetch('https://example.com/live-abort', { signal: liveController.signal })).rejects.toThrow(
      'The operation was aborted',
    );
  });

  it('DSK-058 isInAppYoutubeAllowed returns true only in Neutralino window mode and respects admin kill-switch', async () => {
    const win = window as unknown as { NL_MODE?: string };
    win.NL_MODE = 'window';
    await setAppConfig({ inAppYoutube: true, youtubeClients: ['VISIONOS'] });
    expect(isInAppYoutubeAllowed()).toBe(true);

    await setAppConfig({ inAppYoutube: false, youtubeClients: ['VISIONOS'] });
    expect(isInAppYoutubeAllowed()).toBe(false);

    await setAppConfig({ inAppYoutube: true, youtubeClients: ['VISIONOS'] });
    win.NL_MODE = 'browser';
    expect(isInAppYoutubeAllowed()).toBe(false);

    win.NL_MODE = undefined;
    expect(isInAppYoutubeAllowed()).toBe(false);

    win.NL_MODE = 'window';
    expect(isInAppYoutubeAllowed()).toBe(true);
  });

  it('DSK-059 loadCachedConfig and setAppConfig sync config with Neutralino storage and re-create catalog on client change', async () => {
    const win = window as unknown as { NL_MODE: string };
    win.NL_MODE = 'window';

    store.set(
      'sonare_app_config',
      JSON.stringify({ inAppYoutube: true, youtubeClients: ['ANDROID', 'VISIONOS'], updatedAt: 12345 }),
    );

    const loaded = await loadCachedConfig();
    expect(loaded).toEqual({
      inAppYoutube: true,
      youtubeClients: ['ANDROID', 'VISIONOS'],
      updatedAt: 12345,
    });

    const mockInnertube = {
      session: { player: null },
    } as unknown as Parameters<typeof inAppYoutube._setMockInnertube>[0];

    inAppYoutube._setMockInnertube(mockInnertube);
    const catalog1 = await inAppYoutube.getCatalog();
    expect(catalog1).toBeDefined();

    const newConfig: AppConfig = {
      inAppYoutube: true,
      youtubeClients: ['IOS'],
      updatedAt: 67890,
    };
    await setAppConfig(newConfig);

    expect(JSON.parse(store.get('sonare_app_config')!)).toEqual(newConfig);
    const catalog2 = await inAppYoutube.getCatalog();
    expect(catalog2).not.toBe(catalog1);
  });

  it('DSK-060 streamCache downloads stream via curl with Range: bytes=0- into .part file and renames on success', async () => {
    let partSeen = false;
    let rangeHeaderSeen = false;

    commands.answer = (cmd) => {
      const match = cmd.match(/^curl -K "([^"]+)"$/);
      const cfgFile = match![1];
      const cfg = new TextDecoder().decode(files.get(cfgFile)?.bytes ?? new Uint8Array());
      rangeHeaderSeen = cfg.includes('header = "Range: bytes=0-"');
      const outMatch = cfg.match(/output = "([^"\r\n]+)"/);
      const partPath = outMatch![1];
      partSeen = partPath.endsWith('.part');
      writeFile(partPath, new Uint8Array(1024));
      return fakeCurlDone(cmd, 206);
    };

    const cached = await streamCache.getOrDownload(
      'vid123',
      'https://rr1---sn.googlevideo.com/videoplayback?id=vid123',
      251,
      'audio/webm',
    );

    expect(rangeHeaderSeen).toBe(true);
    expect(partSeen).toBe(true);
    expect(cached).toContain('vid123-251.webm');
    expect(files.has(cached)).toBe(true);
    expect(files.has(`${cached}.part`)).toBe(false);

    commands.answer = () => {
      throw new Error('Should not call curl when cache is valid');
    };
    const second = await streamCache.getCachedPath('vid123', 251);
    expect(second).toBe(cached);
  });

  it('DSK-061 streamCache deduplicates concurrent in-flight downloads for the same video and itag', async () => {
    let callCount = 0;

    commands.answer = (cmd) => {
      callCount++;
      const match = cmd.match(/^curl -K "([^"]+)"$/);
      const cfgFile = match![1];
      const cfg = new TextDecoder().decode(files.get(cfgFile)?.bytes ?? new Uint8Array());
      const outMatch = cfg.match(/output = "([^"\r\n]+)"/);
      writeFile(outMatch![1], new Uint8Array(512));
      return fakeCurlDone(cmd, 206);
    };

    const [p1, p2] = await Promise.all([
      streamCache.getOrDownload('dedup-vid', 'https://googlevideo.com/stream', 251, 'audio/webm'),
      streamCache.getOrDownload('dedup-vid', 'https://googlevideo.com/stream', 251, 'audio/webm'),
    ]);

    expect(callCount).toBe(1);
    expect(p1).toBe(p2);
  });

  it('DSK-062 streamCache evicts oldest accessed files when total size exceeds 500 MB limit', async () => {
    const cacheDir = await getStreamCacheDir();
    const oldPath = `${cacheDir}/old-251.webm`;
    writeFile(oldPath, new Uint8Array(10));

    streamCache._getIndex().set('old-251', {
      videoId: 'old',
      itag: 251,
      path: oldPath,
      size: 300 * 1024 * 1024,
      ext: 'webm',
      mimeType: 'audio/webm',
      lastAccessed: 1000,
    });

    const origGetStats = lib.filesystem.getStats.getMockImplementation();
    lib.filesystem.getStats.mockImplementation(async (path: string) => {
      if (path.includes('new-251')) {
        return {
          size: 250 * 1024 * 1024,
          modifiedAt: Date.now(),
          createdAt: Date.now(),
          isFile: true,
          isDirectory: false,
        };
      }
      return origGetStats!(path);
    });

    try {
      commands.answer = (cmd) => {
        const match = cmd.match(/^curl -K "([^"]+)"$/);
        const cfgFile = match![1];
        const cfg = new TextDecoder().decode(files.get(cfgFile)?.bytes ?? new Uint8Array());
        const outMatch = cfg.match(/output = "([^"\r\n]+)"/);
        writeFile(outMatch![1], new Uint8Array(10));
        return fakeCurlDone(cmd, 206);
      };

      const newPath = await streamCache.getOrDownload('new', 'https://googlevideo.com/new', 251, 'audio/webm');
      expect(newPath).toContain('new-251.webm');
      expect(files.has(oldPath)).toBe(false);
      expect(await streamCache.getCachedPath('old', 251)).toBeNull();
      expect(await streamCache.getCachedPath('new', 251)).toBe(newPath);
    } finally {
      lib.filesystem.getStats.mockImplementation(origGetStats!);
    }
  });

  it('DSK-063 streamCache detects deleted files on disk and removes them from the cached index', async () => {
    const cacheDir = await getStreamCacheDir();
    const missingPath = `${cacheDir}/missing-251.webm`;

    streamCache._getIndex().set('missing-251', {
      videoId: 'missing',
      itag: 251,
      path: missingPath,
      size: 1024,
      ext: 'webm',
      mimeType: 'audio/webm',
      lastAccessed: Date.now(),
    });

    expect(files.has(missingPath)).toBe(false);

    const result = await streamCache.getCachedPath('missing', 251);
    expect(result).toBeNull();
    expect(streamCache._getIndex().has('missing-251')).toBe(false);
  });

  it('DSK-064 player downloads direct YouTube stream into streamCache and decodes via Web Audio on Linux', async () => {
    vi.spyOn(api, 'getTrackStream').mockResolvedValue({
      url: 'https://rr1---sn.googlevideo.com/videoplayback?id=stream64',
      direct: true,
      rawId: 'stream64',
      itag: 251,
      mimeType: 'audio/webm',
      expiresAt: Date.now() + 3600000,
    });

    commands.answer = (cmd) => {
      const match = cmd.match(/^curl -K "([^"]+)"$/);
      const cfgFile = match![1];
      const cfg = new TextDecoder().decode(files.get(cfgFile)?.bytes ?? new Uint8Array());
      const outMatch = cfg.match(/output = "([^"\r\n]+)"/);
      writeFile(outMatch![1], mp3Frames(20));
      return fakeCurlDone(cmd, 206);
    };

    await player.playTrackId('yt:stream64');

    expect(h.FakePlayback.made).toHaveLength(1);
    expect(h.FakePlayback.made[0].kind).toBe('buffer');
    expect(h.FakePlayback.made[0].paused).toBe(false);
    expect(audioEl?.getAttribute('src')).toBeNull();
    expect(player.getStatus()).toMatchObject({
      playing: true,
      trackId: 'yt:stream64',
      error: null,
    });
  });

  it('DSK-065 player falls back to backend stream relay when direct YouTube stream download fails', async () => {
    vi.spyOn(api, 'getTrackStream').mockResolvedValue({
      url: 'https://rr1---sn.googlevideo.com/videoplayback?id=failstream',
      direct: true,
      rawId: 'failstream',
      itag: 251,
      mimeType: 'audio/webm',
      expiresAt: Date.now() + 3600000,
    });

    commands.answer = () => ({ exitCode: 56, stdErr: 'Recv failure: Connection reset by peer' });

    const backendSpy = vi.spyOn(api, 'getBackendTrackStream').mockResolvedValue({
      url: '/tracks/yt%3Afailstream/stream',
      expiresAt: Date.now() + 60000,
      muxed: false,
    });

    await player.load('yt:failstream');

    expect(backendSpy).toHaveBeenCalledWith('yt:failstream', expect.anything());
    expect(audioEl?.src).toContain('/tracks/yt%3Afailstream/stream');
    expect(player.getStatus().error).toBeNull();
  });

  it('DSK-066 downloads manager routes YouTube stream chunk requests through curlFetch with Range headers', async () => {
    const track = makeTrack({ id: 'yt:chunktrack', title: 'Chunk Track', artist: 'Artist' });

    vi.spyOn(api, 'getTrackStream').mockResolvedValue({
      url: 'https://rr1---sn.googlevideo.com/videoplayback?id=chunktrack',
      contentLength: 1024,
      itag: 251,
      mimeType: 'audio/webm',
      codec: 'opus',
      bitrateKbps: 160,
    });

    let curlRan = false;
    let rangeHeaderSeen = false;

    commands.answer = (cmd) => {
      curlRan = true;
      const match = cmd.match(/^curl -K "([^"]+)"$/);
      const cfgFile = match![1];
      const cfg = new TextDecoder().decode(files.get(cfgFile)?.bytes ?? new Uint8Array());
      rangeHeaderSeen = cfg.toLowerCase().includes('header = "range: bytes=0-');

      const outMatch = cfg.match(/output = "([^"\r\n]+)"/);
      const hdrMatch = cfg.match(/dump-header = "([^"\r\n]+)"/);

      const headerContent =
        'HTTP/1.1 206 Partial Content\r\n' +
        'Content-Type: audio/webm\r\n' +
        'Content-Range: bytes 0-1023/1024\r\n' +
        'Content-Length: 1024\r\n\r\n';
      writeFile(hdrMatch![1], headerContent);
      writeFile(outMatch![1], new Uint8Array(1024));
      return fakeCurlDone(cmd, 206);
    };

    await downloads.enqueue([track]);

    await vi.waitFor(() => {
      const item = getDownloadsSnapshot().items.find((i) => i.id === track.id);
      expect(item?.status).toBe('done');
    });

    expect(curlRan).toBe(true);
    expect(rangeHeaderSeen).toBe(true);
  });

  it('DSK-067 api catalog methods query inApp catalog first and fall back to backend endpoints on failure', async () => {
    const mockCatalog = {
      track: vi.fn().mockResolvedValue({
        id: 'yt:cattrack',
        title: 'In-App Track Title',
        artist: 'In-App Artist',
        album: null,
        durationMs: 200000,
      }),
      search: vi.fn().mockRejectedValue(new Error('In-app search failure')),
    };

    vi.spyOn(inAppYoutube, 'getCatalog').mockResolvedValue(
      mockCatalog as unknown as ReturnType<typeof inAppYoutube.getCatalog> extends Promise<infer T> ? T : never,
    );

    // 1. In-app success: returns catalog result without calling backend
    const track = await api.getTrack('yt:cattrack');
    expect(track.title).toBe('In-App Track Title');
    expect(mockCatalog.track).toHaveBeenCalledWith('yt:cattrack');

    // 2. In-app failure on track: falls back to backend endpoint
    mockCatalog.track.mockRejectedValue(new Error('In-app stream error'));
    server.use(
      http.get(`${API}/tracks/yt%3Acattrack`, () => {
        return HttpResponse.json({
          id: 'yt:cattrack',
          title: 'Backend Fallback Track Title',
          artist: 'Backend Artist',
          album: null,
          durationMs: 200000,
        });
      }),
    );

    const fallbackTrack = await api.getTrack('yt:cattrack');
    expect(fallbackTrack.title).toBe('Backend Fallback Track Title');

    // 3. In-app failure on search: falls back to backend endpoint
    server.use(
      http.get(`${API}/search`, () => {
        return HttpResponse.json({
          items: [
            {
              id: 'yt:backendresult',
              title: 'Backend Search Result',
              artist: 'Backend Artist',
              album: null,
              durationMs: 150000,
            },
          ],
          nextCursor: null,
        });
      }),
    );

    const searchRes = await api.search('fallback query', 'songs');
    expect(searchRes.items[0].title).toBe('Backend Search Result');
  });
});
