import { vi } from 'vitest';

/**
 * In-memory stand-in for @neutralinojs/lib: a file system, the storage API and the OS
 * dialogs, with a record of what the app asked for. Tests mock the package with `lib`.
 */
interface FakeFile {
  bytes: Uint8Array;
  modifiedAt: number;
  createdAt: number;
}

// Kept on globalThis: tests re-import app modules (vi.resetModules), and every copy of this
// fake must see the same disk.
const g = globalThis as typeof globalThis & { __sonareFakeFs?: Record<string, unknown> };
const state = (g.__sonareFakeFs ??= {
  files: new Map<string, FakeFile>(),
  dirs: new Set<string>(),
  store: new Map<string, string>(),
  dialog: { folder: '/home/me/Picked' as string | null },
  opened: [] as string[],
  unreadable: new Set<string>(),
  clock: { now: 1_700_000_000_000 },
  commands: { ran: [] as string[], answer: null as null | ((cmd: string) => ExecResult | Promise<ExecResult>) },
  env: {} as Record<string, string>,
  listeners: new Map<string, Set<(ev: CustomEvent) => void>>(),
  native: { busy: Promise.resolve(), spawned: 0 },
});
export const files = state.files as Map<string, FakeFile>;
export const dirs = state.dirs as Set<string>;
export const store = state.store as Map<string, string>;
export const dialog = state.dialog as { folder: string | null };
export const opened = state.opened as string[];
export const unreadable = state.unreadable as Set<string>;
/** os.getEnv answers from here (unset names are ''). */
export const env = state.env as Record<string, string>;

interface ExecResult {
  stdOut?: string;
  stdErr?: string;
  exitCode?: number;
}
/**
 * os.execCommand and os.spawnProcess: every command run is recorded in `commands.ran`;
 * `commands.answer` decides the output (by default every command fails, as if the tool were
 * missing). An answer may be async: the command runs until it settles.
 */
export const commands = state.commands as {
  ran: string[];
  answer: null | ((cmd: string) => ExecResult | Promise<ExecResult>);
};
const listeners = state.listeners as Map<string, Set<(ev: CustomEvent) => void>>;
const native = state.native as { busy: Promise<void>; spawned: number };

/** Sends a Neutralino event (`events.on` listeners get a CustomEvent with this detail). */
export const emitNativeEvent = (name: string, detail: unknown) => {
  for (const fn of listeners.get(name) ?? []) fn(new CustomEvent(name, { detail }));
};

const answerFor = (cmd: string) => {
  commands.ran.push(cmd);
  return commands.answer?.(cmd) ?? { exitCode: 127, stdErr: 'command not found' };
};

/** Like real Neutralino, which answers native calls one at a time: file calls wait while an execCommand runs. */
const gated =
  <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<R> => {
    await native.busy;
    return fn(...args);
  };

const clock = state.clock as { now: number };

const notFound = (path: string) => {
  return Object.assign(new Error(`NE_FS_NOPATHE: ${path}`), { code: 'NE_FS_NOPATHE' });
};

export const writeFile = (path: string, bytes: Uint8Array | string) => {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const prev = files.get(path);
  files.set(path, { bytes: data, modifiedAt: ++clock.now, createdAt: prev?.createdAt ?? clock.now });
  let dir = path.slice(0, path.lastIndexOf('/'));
  while (dir) {
    dirs.add(dir);
    dir = dir.slice(0, dir.lastIndexOf('/'));
  }
};

export const resetFs = () => {
  files.clear();
  dirs.clear();
  store.clear();
  opened.length = 0;
  unreadable.clear();
  commands.ran.length = 0;
  commands.answer = null;
  native.busy = Promise.resolve();
  for (const k of Object.keys(env)) delete env[k];
  dialog.folder = '/home/me/Picked';
  for (const fn of Object.values(lib.filesystem)) vi.mocked(fn).mockClear();
  for (const fn of Object.values(lib.os)) vi.mocked(fn).mockClear();
  for (const fn of Object.values(lib.events)) vi.mocked(fn).mockClear();
};

export const lib = {
  filesystem: {
    readDirectory: vi.fn(
      gated(async (dir: string, opts?: { recursive?: boolean }) => {
        if (!dirs.has(dir)) throw notFound(dir);
        return [...files.keys()]
          .filter((p) => p.startsWith(dir + '/') && (opts?.recursive || !p.slice(dir.length + 1).includes('/')))
          .map((p) => ({ entry: p.slice(p.lastIndexOf('/') + 1), path: p, type: 'FILE' }));
      }),
    ),
    getStats: vi.fn(
      gated(async (path: string) => {
        if (unreadable.has(path)) throw new Error('EACCES');
        const f = files.get(path);
        if (f)
          return {
            size: f.bytes.length,
            modifiedAt: f.modifiedAt,
            createdAt: f.createdAt,
            isFile: true,
            isDirectory: false,
          };
        if (dirs.has(path)) return { size: 0, modifiedAt: 0, createdAt: 0, isFile: false, isDirectory: true };
        throw notFound(path);
      }),
    ),
    readBinaryFile: vi.fn(
      gated(async (path: string, opts?: { pos?: number; size?: number }) => {
        const f = files.get(path);
        if (!f) throw notFound(path);
        const start = opts?.pos ?? 0;
        const end = opts?.size !== undefined ? start + opts.size : f.bytes.length;
        return f.bytes.slice(start, end).buffer;
      }),
    ),
    readFile: vi.fn(
      gated(async (path: string) => {
        const f = files.get(path);
        if (!f) throw notFound(path);
        return new TextDecoder().decode(f.bytes);
      }),
    ),
    createDirectory: vi.fn(
      gated(async (path: string) => {
        if (dirs.has(path)) throw new Error('exists');
        dirs.add(path);
      }),
    ),
    writeFile: vi.fn(
      gated(async (path: string, data: string) => {
        writeFile(path, data);
      }),
    ),
    writeBinaryFile: vi.fn(
      gated(async (path: string, data: ArrayBuffer) => {
        writeFile(path, new Uint8Array(data));
      }),
    ),
    appendBinaryFile: vi.fn(
      gated(async (path: string, data: ArrayBuffer) => {
        const prev = files.get(path)?.bytes ?? new Uint8Array(0);
        const next = new Uint8Array(prev.length + data.byteLength);
        next.set(prev);
        next.set(new Uint8Array(data), prev.length);
        writeFile(path, next);
      }),
    ),
    remove: vi.fn(
      gated(async (path: string) => {
        if (!files.delete(path)) throw notFound(path);
      }),
    ),
    move: vi.fn(
      gated(async (from: string, to: string) => {
        const f = files.get(from);
        if (!f) throw notFound(from);
        files.delete(from);
        writeFile(to, f.bytes);
      }),
    ),
  },
  os: {
    getPath: vi.fn(async (name: string) => {
      if (name === 'music') return '/home/me/Music';
      if (name === 'temp') return '/tmp';
      if (name === 'cache') return '/home/me/.cache';
      if (name === 'downloads') return '/home/me/Downloads';
      return '/home/me';
    }),
    getEnv: vi.fn(async (name: string) => env[name] ?? ''),
    showFolderDialog: vi.fn(async () => dialog.folder),
    open: vi.fn(async (url: string) => {
      opened.push(url);
    }),
    setTray: vi.fn(async () => {}),
    execCommand: vi.fn(async (cmd: string) => {
      const run = Promise.resolve(answerFor(cmd));
      native.busy = run.then(
        () => {},
        () => {},
      );
      const r = await run;
      return { pid: 1, stdOut: r.stdOut ?? '', stdErr: r.stdErr ?? '', exitCode: r.exitCode ?? 0 };
    }),
    // Runs alongside other native calls and reports through 'spawnedProcess' events.
    spawnProcess: vi.fn(async (cmd: string, _cwd?: string) => {
      const id = ++native.spawned;
      const answer = answerFor(cmd);
      void Promise.resolve(answer).then((r) => {
        if (r.stdOut) emitNativeEvent('spawnedProcess', { id, pid: id, action: 'stdOut', data: r.stdOut });
        if (r.stdErr) emitNativeEvent('spawnedProcess', { id, pid: id, action: 'stdErr', data: r.stdErr });
        emitNativeEvent('spawnedProcess', { id, pid: id, action: 'exit', data: r.exitCode ?? 0 });
      });
      return { id, pid: id };
    }),
    updateSpawnedProcess: vi.fn(async (_id: number, _event: string, _data?: unknown) => {}),
    showMessageBox: vi.fn(async () => 'OK'),
  },
  storage: {
    getData: vi.fn(async (key: string) => {
      if (!store.has(key)) throw Object.assign(new Error('NE_ST_NOSTKEX'), { code: 'NE_ST_NOSTKEX' });
      return store.get(key)!;
    }),
    setData: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  },
  app: { exit: vi.fn(), restartProcess: vi.fn(async () => {}) },
  events: {
    on: vi.fn(async (name: string, handler: (ev: CustomEvent) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(handler);
    }),
    off: vi.fn(async (name: string, handler: (ev: CustomEvent) => void) => {
      listeners.get(name)?.delete(handler);
    }),
  },
  init: vi.fn(),
};
