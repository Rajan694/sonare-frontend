import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { makeTrack } from '../helpers/fixtures';
import type { Track } from '../../src/types';

/**
 * The download manager runs against an in-memory storage target (what downloadTargets.ts
 * would write to disk / IndexedDB) and an msw relay that serves real byte ranges.
 */
const h = vi.hoisted(() => {
  const parts = new Map<string, Uint8Array[]>();
  const files = new Map<string, { name: string; mime: string; bytes: Uint8Array }>();
  const state = {
    ready: true,
    removeError: null as Error | null,
    removed: [] as string[],
    savedAgain: [] as string[],
  };
  const size = (id: string) => (parts.get(id) ?? []).reduce((n, c) => n + c.length, 0);
  const join = (chunks: Uint8Array[]) => {
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
    return out;
  };
  const target = (id: string) => ({
    kind: 'browser' as const,
    ready: async () => state.ready,
    open: async () => ({
      size: async () => size(id),
      append: async (b: Uint8Array) => {
        parts.set(id, [...(parts.get(id) ?? []), b.slice()]);
      },
      flush: async () => {},
      discard: async () => {
        parts.delete(id);
      },
      finish: async (name: string, mime: string) => {
        const bytes = join(parts.get(id) ?? []);
        files.set(id, { name, mime, bytes });
        parts.delete(id);
        return { path: name, size: bytes.length, copyKept: true };
      },
    }),
    removeFile: async (path: string) => {
      if (state.removeError) throw state.removeError;
      state.removed.push(path);
    },
    saveAgain: async (name: string) => {
      state.savedAgain.push(name);
      return files.has(id);
    },
  });
  return { parts, files, state, target, toast: vi.fn() };
});

vi.mock('../../src/storage/downloadTargets', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/storage/downloadTargets')>();
  return {
    ...real,
    loadLocation: async () => {},
    getLocation: () => ({ kind: 'browser', label: 'Browser downloads' }),
    askForWebFolderOnce: async () => null,
    targetFor: (ref: { id: string }) => h.target(ref.id),
  };
});
vi.mock('../../src/store/toasts', () => ({ showToast: h.toast, dismissToast: () => {}, useToasts: () => [] }));

useMockServer();

const MB = 1024 * 1024;
const RELAY = 'http://api.sonare.test/api/v1/stream/:token';

/** Byte-for-byte equality; expect().toEqual on megabytes of Uint8Array is far too slow. */
const sameBytes = (a: Uint8Array | undefined, b: Uint8Array): boolean => {
  return (
    !!a && Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength))
  );
};

/** Deterministic audio bytes, so a corrupted or reordered file is detectable. */
const audioBytes = (n: number, seed = 7): Uint8Array => {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = (i * 31 + seed) & 0xff;
  return b;
};

interface RelayOptions {
  /** Answer with this status instead, for the first `times` requests. */
  failWith?: { status: number; times: number };
  /** Ignore Range and send the whole file with 200. */
  ignoreRange?: boolean;
  /** No Content-Range header (size unknown to the client). */
  hideSize?: boolean;
  /** Wait on this before answering. */
  gate?: Promise<void>;
}

const relay = (bytes: Uint8Array, opts: RelayOptions = {}) => {
  const ranges: string[] = [];
  let failures = 0;
  server.use(
    http.get(RELAY, async ({ request }) => {
      const range = request.headers.get('range') ?? '';
      ranges.push(range);
      if (opts.gate) await opts.gate;
      if (opts.failWith && failures < opts.failWith.times) {
        failures++;
        return new HttpResponse(null, { status: opts.failWith.status });
      }
      if (opts.ignoreRange)
        return new HttpResponse(bytes.slice(), { status: 200, headers: { 'content-length': String(bytes.length) } });
      const m = range.match(/bytes=(\d+)-(\d+)/)!;
      const start = Number(m[1]);
      if (start >= bytes.length)
        return new HttpResponse(null, { status: 416, headers: { 'content-range': `bytes */${bytes.length}` } });
      const end = Math.min(Number(m[2]), bytes.length - 1);
      const headers: Record<string, string> = opts.hideSize
        ? {}
        : { 'content-range': `bytes ${start}-${end}/${bytes.length}` };
      return new HttpResponse(bytes.slice(start, end + 1), { status: 206, headers });
    }),
  );
  return ranges;
};

const streamInfo = (over: Record<string, unknown> = {}) => {
  const calls: string[] = [];
  server.use(
    http.get(`${API}/tracks/:id/stream`, ({ request, params }) => {
      calls.push(new URL(request.url).search);
      return HttpResponse.json({
        url: `/api/v1/stream/tok-${String(params.id)}-${calls.length}`,
        mimeType: 'audio/webm; codecs="opus"',
        codec: 'opus',
        bitrateKbps: 160,
        contentLength: 0,
        expiresAt: Date.now() + 3_600_000,
        itag: 251,
        ...(typeof over === 'function' ? (over as any)(calls.length) : over),
      });
    }),
  );
  return calls;
};

const fresh = async () => {
  vi.resetModules();
  const mod = await import('../../src/storage/downloads');
  return mod;
};

const item = (mod: Awaited<ReturnType<typeof fresh>>, id: string) => mod.getDownloadsSnapshot().byId.get(id);

const waitForStatus = async (mod: Awaited<ReturnType<typeof fresh>>, id: string, status: string) => {
  await vi.waitFor(() => expect(item(mod, id)?.status).toBe(status), { timeout: 4000 });
};

beforeEach(() => {
  h.parts.clear();
  h.files.clear();
  h.state.ready = true;
  h.state.removeError = null;
  h.state.removed = [];
  h.state.savedAgain = [];
  h.toast.mockClear();
});

afterEach(() => vi.useRealTimers());

const song = (over: Partial<Track> = {}) => makeTrack({ artist: 'Radiohead', title: 'Reckoner', ...over });

describe('queueing downloads', () => {
  it('WEB-DL-001 queues server songs once, skips local files, and remembers the list', async () => {
    streamInfo();
    relay(audioBytes(10));
    const dl = await fresh();
    const a = song({ id: 'yt:a' });
    const local = song({ id: 'local:x', source: 'local' });
    await expect(dl.downloads.enqueue([a, local])).resolves.toBe(1);
    await expect(dl.downloads.enqueue([a])).resolves.toBe(0);
    expect(dl.getDownloadsSnapshot().items.map((i) => i.id)).toEqual(['yt:a']);
    const stored = JSON.parse(localStorage.getItem('sonare_downloads')!);
    expect(stored.map((i: { id: string }) => i.id)).toEqual(['yt:a']);
  });

  it('WEB-DL-002 uses the quality and format from settings', async () => {
    const calls = streamInfo();
    relay(audioBytes(10));
    const dl = await fresh();
    // Same module instance the fresh downloads.ts reads its settings from.
    const s = await import('../../src/storage/settings');
    s.updateSettings({ downloadQuality: 'normal', downloadFormat: 'm4a' });
    await dl.downloads.enqueue([song({ id: 'yt:q' })]);
    await waitForStatus(dl, 'yt:q', 'done');
    expect(calls[0]).toBe('?quality=normal&format=m4a');
    expect(item(dl, 'yt:q')).toMatchObject({ quality: 'normal', format: 'm4a' });
  });
});

describe('downloading', () => {
  it('WEB-DL-003 fetches the file in 2 MB ranges and saves the exact bytes as "Artist - Title.webm"', async () => {
    const bytes = audioBytes(5 * MB);
    streamInfo({ contentLength: bytes.length });
    const ranges = relay(bytes);
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:big' })]);
    await waitForStatus(dl, 'yt:big', 'done');
    expect(ranges).toEqual([`bytes=0-${2 * MB - 1}`, `bytes=${2 * MB}-${4 * MB - 1}`, `bytes=${4 * MB}-${6 * MB - 1}`]);
    const file = h.files.get('yt:big')!;
    expect(file.name).toBe('Radiohead - Reckoner.webm');
    expect(sameBytes(file.bytes, bytes)).toBe(true);
    expect(item(dl, 'yt:big')).toMatchObject({
      receivedBytes: bytes.length,
      totalBytes: bytes.length,
      path: file.name,
      copyKept: true,
    });
    expect(item(dl, 'yt:big')!.completedAt).toBeGreaterThan(0);
  });

  it('WEB-DL-004 names AAC downloads .m4a and strips characters file systems reject', async () => {
    streamInfo({ mimeType: 'audio/mp4', codec: 'mp4a.40.2' });
    relay(audioBytes(100));
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:n', artist: 'AC/DC', title: 'What?  Is: "This"' })]);
    await waitForStatus(dl, 'yt:n', 'done');
    expect(h.files.get('yt:n')!.name).toBe('AC_DC - What_ Is_ _This_.m4a');
  });

  it('WEB-DL-005 with no size from the server, a short final range ends the download', async () => {
    streamInfo({ contentLength: -1 });
    const bytes = audioBytes(3 * MB);
    relay(bytes, { hideSize: true });
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:nosize' })]);
    await waitForStatus(dl, 'yt:nosize', 'done');
    expect(sameBytes(h.files.get('yt:nosize')!.bytes, bytes)).toBe(true);
  });

  it('WEB-DL-006 runs at most two downloads at a time and starts the next when one finishes', async () => {
    streamInfo();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const ranges = relay(audioBytes(100), { gate });
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:1' }), song({ id: 'yt:2' }), song({ id: 'yt:3' })]);
    await vi.waitFor(() => expect(ranges).toHaveLength(2));
    const statuses = () => ['yt:1', 'yt:2', 'yt:3'].map((id) => item(dl, id)!.status);
    expect(statuses()).toEqual(['downloading', 'downloading', 'queued']);
    expect(dl.getDownloadsSnapshot().activeCount).toBe(3);
    release();
    await waitForStatus(dl, 'yt:3', 'done');
    expect(statuses()).toEqual(['done', 'done', 'done']);
  });

  it('WEB-DL-007 tells the user once the whole batch is saved', async () => {
    streamInfo();
    relay(audioBytes(100));
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:b1' }), song({ id: 'yt:b2' })]);
    await vi.waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Downloads finished', description: '2 songs saved' }),
      ),
    );
  });

  it('WEB-DL-008 refuses a video-only stream with a clear reason', async () => {
    streamInfo({ muxed: true });
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:video' })]);
    await waitForStatus(dl, 'yt:video', 'failed');
    expect(item(dl, 'yt:video')!.error).toMatch(/Only a video stream is available/);
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download failed' }));
  });

  it('WEB-DL-009 fails with a permission message when the folder cannot be written', async () => {
    h.state.ready = false;
    streamInfo();
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:perm' })]);
    await waitForStatus(dl, 'yt:perm', 'failed');
    expect(item(dl, 'yt:perm')!.error).toBe('Sonare is not allowed to write to the download folder');
  });
});

describe('interruptions', () => {
  it('WEB-DL-010 an expired stream url (403) is re-resolved and the same file continues', async () => {
    const bytes = audioBytes(3 * MB);
    const calls = streamInfo({ contentLength: bytes.length });
    relay(bytes, { failWith: { status: 403, times: 1 } });
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:exp' })]);
    await waitForStatus(dl, 'yt:exp', 'done');
    expect(calls).toHaveLength(2);
    expect(sameBytes(h.files.get('yt:exp')!.bytes, bytes)).toBe(true);
  });

  it('WEB-DL-011 gives up after the server keeps refusing fresh urls', async () => {
    streamInfo();
    relay(audioBytes(100), { failWith: { status: 403, times: 99 } });
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:refuse' })]);
    await waitForStatus(dl, 'yt:refuse', 'failed');
    expect(item(dl, 'yt:refuse')!.error).toBe('The server keeps refusing this download. Try again later.');
  });

  it('WEB-DL-012 pausing keeps the bytes so far, and resuming asks only for the rest', async () => {
    const bytes = audioBytes(5 * MB);
    streamInfo({ contentLength: bytes.length });
    let release!: () => void;
    let gate: Promise<void> = Promise.resolve();
    const ranges: string[] = [];
    server.use(
      http.get(RELAY, async ({ request }) => {
        const range = request.headers.get('range')!;
        ranges.push(range);
        const [s, e] = range
          .match(/(\d+)-(\d+)/)!
          .slice(1)
          .map(Number);
        if (s > 0) await gate;
        return new HttpResponse(bytes.slice(s, Math.min(e, bytes.length - 1) + 1), {
          status: 206,
          headers: { 'content-range': `bytes ${s}-${Math.min(e, bytes.length - 1)}/${bytes.length}` },
        });
      }),
    );
    gate = new Promise<void>((r) => (release = r));
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:p' })]);
    await vi.waitFor(() => expect(item(dl, 'yt:p')!.receivedBytes).toBe(2 * MB));
    await dl.downloads.pause('yt:p');
    release();
    expect(item(dl, 'yt:p')).toMatchObject({ status: 'paused', receivedBytes: 2 * MB });
    expect(dl.downloadProgress(item(dl, 'yt:p')!)).toBeCloseTo(0.4);

    ranges.length = 0;
    await dl.downloads.resume('yt:p');
    await waitForStatus(dl, 'yt:p', 'done');
    expect(ranges[0]).toBe(`bytes=${2 * MB}-${4 * MB - 1}`);
    expect(sameBytes(h.files.get('yt:p')!.bytes, bytes)).toBe(true);
  });

  it('WEB-DL-013 starts over when the server now serves a different file than the part holds', async () => {
    const oldBytes = audioBytes(3 * MB, 1);
    const newBytes = audioBytes(3 * MB + 10, 2);
    let first = true;
    server.use(
      http.get(`${API}/tracks/:id/stream`, () =>
        HttpResponse.json({
          url: '/api/v1/stream/t',
          mimeType: 'audio/webm',
          contentLength: first ? oldBytes.length : newBytes.length,
          itag: first ? 251 : 250,
          expiresAt: Date.now() + 1e6,
        }),
      ),
      http.get(RELAY, ({ request }) => {
        const bytes = first ? oldBytes : newBytes;
        const [s, e] = request.headers
          .get('range')!
          .match(/(\d+)-(\d+)/)!
          .slice(1)
          .map(Number);
        const end = Math.min(e, bytes.length - 1);
        if (first && s > 0) return new HttpResponse(null, { status: 500 });
        return new HttpResponse(bytes.slice(s, end + 1), {
          status: 206,
          headers: { 'content-range': `bytes ${s}-${end}/${bytes.length}` },
        });
      }),
    );
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:changed' })]);
    await vi.waitFor(() => expect(item(dl, 'yt:changed')!.receivedBytes).toBe(2 * MB));
    await dl.downloads.pause('yt:changed');
    first = false;
    await dl.downloads.resume('yt:changed');
    await waitForStatus(dl, 'yt:changed', 'done');
    expect(sameBytes(h.files.get('yt:changed')!.bytes, newBytes)).toBe(true);
    expect(item(dl, 'yt:changed')!.itag).toBe(250);
  });

  it('WEB-DL-014 a server that ignores Range on resume does not duplicate bytes', async () => {
    const bytes = audioBytes(3 * MB);
    streamInfo({ contentLength: bytes.length });
    h.parts.set('yt:norange', [bytes.slice(0, MB)]);
    localStorage.setItem(
      'sonare_downloads',
      JSON.stringify([
        {
          id: 'yt:norange',
          title: 'Reckoner',
          artist: 'Radiohead',
          artistId: '',
          album: null,
          albumId: null,
          durationMs: null,
          status: 'paused',
          quality: 'high',
          format: 'opus',
          target: 'browser',
          totalBytes: bytes.length,
          receivedBytes: MB,
          addedAt: 1,
          itag: 251,
        },
      ]),
    );
    relay(bytes, { ignoreRange: true });
    const dl = await fresh();
    await dl.downloads.resume('yt:norange');
    await waitForStatus(dl, 'yt:norange', 'done');
    expect(sameBytes(h.files.get('yt:norange')!.bytes, bytes)).toBe(true);
  });

  it('WEB-DL-015 a part that already holds the whole file (416) is finished without re-downloading', async () => {
    const bytes = audioBytes(1000);
    streamInfo({ contentLength: bytes.length });
    h.parts.set('yt:full', [bytes]);
    localStorage.setItem(
      'sonare_downloads',
      JSON.stringify([
        {
          id: 'yt:full',
          title: 'Reckoner',
          artist: 'Radiohead',
          artistId: '',
          album: null,
          albumId: null,
          durationMs: null,
          status: 'paused',
          quality: 'high',
          format: 'opus',
          target: 'browser',
          totalBytes: bytes.length,
          receivedBytes: bytes.length,
          addedAt: 1,
          itag: 251,
        },
      ]),
    );
    relay(bytes);
    const dl = await fresh();
    await dl.downloads.resume('yt:full');
    await waitForStatus(dl, 'yt:full', 'done');
    expect(sameBytes(h.files.get('yt:full')!.bytes, bytes)).toBe(true);
  });

  it('WEB-DL-016 a dropped connection is retried after a pause and the download completes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const bytes = audioBytes(1000);
    streamInfo({ contentLength: bytes.length });
    let drops = 1;
    server.use(
      http.get(RELAY, () => {
        if (drops-- > 0) return HttpResponse.error();
        return new HttpResponse(bytes.slice(), { status: 206, headers: { 'content-range': `bytes 0-999/1000` } });
      }),
    );
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:drop' })]);
    await vi.waitFor(() => expect(drops).toBe(0));
    expect(item(dl, 'yt:drop')!.status).toBe('downloading');
    await vi.advanceTimersByTimeAsync(2_000);
    await waitForStatus(dl, 'yt:drop', 'done');
  });

  it('WEB-DL-017 downloads interrupted by closing the app carry on at the next start', async () => {
    const bytes = audioBytes(500);
    streamInfo({ contentLength: bytes.length });
    relay(bytes);
    localStorage.setItem(
      'sonare_downloads',
      JSON.stringify([
        {
          id: 'yt:restart',
          title: 'T',
          artist: 'A',
          artistId: '',
          album: null,
          albumId: null,
          durationMs: null,
          status: 'downloading',
          quality: 'high',
          format: 'opus',
          target: 'browser',
          totalBytes: 0,
          receivedBytes: 0,
          addedAt: 1,
        },
      ]),
    );
    const dl = await fresh();
    await dl.downloads.init();
    await waitForStatus(dl, 'yt:restart', 'done');
  });

  it('WEB-DL-018 asking again for a failed download retries it instead of adding a duplicate', async () => {
    streamInfo({ muxed: true });
    const dl = await fresh();
    const s = song({ id: 'yt:again' });
    await dl.downloads.enqueue([s]);
    await waitForStatus(dl, 'yt:again', 'failed');
    streamInfo();
    relay(audioBytes(50));
    await expect(dl.downloads.enqueue([s])).resolves.toBe(0);
    await waitForStatus(dl, 'yt:again', 'done');
    expect(dl.getDownloadsSnapshot().items).toHaveLength(1);
  });
});

describe('managing finished downloads', () => {
  const finished = async (id: string) => {
    streamInfo();
    relay(audioBytes(64));
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id })]);
    await waitForStatus(dl, id, 'done');
    return dl;
  };

  it('WEB-DL-019 deleting a finished download removes its file and the list entry', async () => {
    const dl = await finished('yt:del');
    await expect(dl.downloads.remove('yt:del')).resolves.toEqual({ fileDeleted: true });
    expect(h.state.removed).toEqual(['Radiohead - Reckoner.webm']);
    expect(item(dl, 'yt:del')).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('sonare_downloads')!)).toEqual([]);
  });

  it('WEB-DL-020 a file that has moved is only removed from the list, with the reason', async () => {
    const dl = await finished('yt:moved');
    const { FileMissingError } = await import('../../src/storage/downloadTargets');
    h.state.removeError = new FileMissingError(
      'Files saved by the browser have to be deleted from its Downloads folder',
    );
    await expect(dl.downloads.remove('yt:moved')).resolves.toEqual({
      fileDeleted: false,
      reason: 'Files saved by the browser have to be deleted from its Downloads folder',
    });
    expect(item(dl, 'yt:moved')).toBeUndefined();
  });

  it('WEB-DL-021 removing an unfinished download throws away its partial data', async () => {
    streamInfo();
    const gate = new Promise<void>(() => {});
    relay(audioBytes(64), { gate });
    const dl = await fresh();
    h.parts.set('yt:half', [audioBytes(10)]);
    await dl.downloads.enqueue([song({ id: 'yt:half' })]);
    await vi.waitFor(() => expect(item(dl, 'yt:half')!.status).toBe('downloading'));
    await dl.downloads.remove('yt:half');
    expect(h.parts.has('yt:half')).toBe(false);
    expect(dl.getDownloadsSnapshot().items).toHaveLength(0);
  });

  it('WEB-DL-022 removeMany counts files that could not be deleted', async () => {
    const dl = await finished('yt:m1');
    h.state.removeError = new Error('EACCES');
    await expect(dl.downloads.removeMany(['yt:m1'])).resolves.toBe(1);
  });

  it('WEB-DL-023 "save again" hands the kept copy to the browser, and reports when there is none', async () => {
    const dl = await finished('yt:again2');
    await expect(dl.downloads.saveAgain('yt:again2')).resolves.toBe(true);
    expect(h.state.savedAgain).toEqual(['Radiohead - Reckoner.webm']);
    h.files.delete('yt:again2');
    await expect(dl.downloads.saveAgain('yt:again2')).resolves.toBe(false);
    expect(item(dl, 'yt:again2')!.copyKept).toBe(false);
    await expect(dl.downloads.saveAgain('yt:unknown')).resolves.toBe(false);
  });

  it('WEB-DL-024 pause all and resume all act on every unfinished download', async () => {
    streamInfo();
    const gate = new Promise<void>(() => {});
    relay(audioBytes(64), { gate });
    const dl = await fresh();
    await dl.downloads.enqueue([song({ id: 'yt:pa1' }), song({ id: 'yt:pa2' }), song({ id: 'yt:pa3' })]);
    await dl.downloads.pauseAll();
    expect(dl.getDownloadsSnapshot().items.map((i) => i.status)).toEqual(['paused', 'paused', 'paused']);
    expect(dl.getDownloadsSnapshot().activeCount).toBe(0);
    await dl.downloads.resumeAll();
    expect(dl.getDownloadsSnapshot().activeCount).toBe(3);
  });

  it('WEB-DL-025 a download becomes a playable track with its metadata', async () => {
    const dl = await finished('yt:track');
    expect(dl.downloads.toTrack(item(dl, 'yt:track')!)).toMatchObject({
      id: 'yt:track',
      title: 'Reckoner',
      artist: 'Radiohead',
      source: 'server',
      codec: 'opus',
      favourite: false,
    });
    expect(dl.downloadProgress({ ...item(dl, 'yt:track')!, totalBytes: 0 })).toBeNull();
  });
});
