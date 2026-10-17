import { events, filesystem, os } from '@neutralinojs/lib';

// A `fetch` for youtubei.js (and stream checks) that goes through curl, because the webview
// can't make cross-site requests to YouTube. Nothing but the config file's path reaches a shell:
// the url, headers and body go into a curl config file (`curl -K`), so Windows `cmd` never sees
// a `%` in a url and quoting rules don't differ per OS.

/** Escape a value for a double-quoted string in a curl config file. */
export const escapeCurlConfigValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');

/** curl.exe ships with Windows 10+; `curl` elsewhere. */
export const curlBinary = (): string => (window.NL_OS === 'Windows' ? 'curl.exe' : 'curl');

let tempDirPromise: Promise<string> | null = null;

/** The folder for curl's config, header and body files. */
export const curlTempDir = (): Promise<string> => {
  tempDirPromise ??= (async () => {
    const dir = `${(await os.getPath('temp')).replace(/[/\\]+$/, '')}/sonare-yt`;
    await filesystem.createDirectory(dir).catch(() => {
      // Already there.
    });
    return dir;
  })();
  return tempDirPromise;
};

interface CommandResult {
  exitCode: number;
  stdOut: string;
  stdErr: string;
}

interface ProcessEvent {
  id: number;
  action: 'stdOut' | 'stdErr' | 'exit';
  data: unknown;
}

/**
 * Runs `command` and waits for it to exit. Not os.execCommand: Neutralino answers native calls
 * one at a time, so while an execCommand runs every file read waits, and a song couldn't be
 * read while curl was still downloading it (audit I3).
 */
export const runCommand = async (command: string): Promise<CommandResult> => {
  let id: number | null = null;
  // Events that came before spawnProcess answered with the id.
  const early: ProcessEvent[] = [];
  const result = { exitCode: 0, stdOut: '', stdErr: '' };
  let exited!: () => void;
  const exit = new Promise<void>((resolve) => (exited = resolve));
  const take = (e: ProcessEvent) => {
    if (e.id !== id) return;
    if (e.action === 'stdOut') result.stdOut += String(e.data);
    else if (e.action === 'stdErr') result.stdErr += String(e.data);
    else if (e.action === 'exit') {
      result.exitCode = Number(e.data);
      exited();
    }
  };
  const onEvent = (ev: CustomEvent<ProcessEvent>) => {
    if (id === null) early.push(ev.detail);
    else take(ev.detail);
  };
  await events.on('spawnedProcess', onEvent);
  try {
    id = (await os.spawnProcess(command)).id;
    early.splice(0).forEach(take);
    await exit;
    return result;
  } finally {
    void events.off('spawnedProcess', onEvent).catch(() => {});
  }
};

let compressionPromise: Promise<boolean> | null = null;

/**
 * Whether this curl can decompress (built with zlib): YouTube's JSON is 10-13 times smaller
 * gzipped. Some Windows curl.exe builds have no zlib, and `compressed` would then fail every call.
 */
export const curlCanDecompress = (): Promise<boolean> => {
  compressionPromise ??= runCommand(`${curlBinary()} -V`)
    .then((r) => r.exitCode === 0 && /^Features:.*\blibz\b/im.test(r.stdOut))
    .catch(() => false);
  return compressionPromise;
};

/** Testing: check curl's features again. */
export const _resetCurlFeatures = (): void => {
  compressionPromise = null;
};

let fileCounter = 0;
export const tempFileId = (): string => {
  fileCounter = (fileCounter + 1) % 1_000_000;
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${fileCounter}`;
};

// Statuses whose Response must not have a body (the constructor throws otherwise).
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

const abortError = () => new DOMException('The operation was aborted', 'AbortError');

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

const writeBody = async (path: string, body: BodyInit): Promise<void> => {
  if (typeof body === 'string') return filesystem.writeFile(path, body);
  if (body instanceof ArrayBuffer) return filesystem.writeBinaryFile(path, body);
  if (ArrayBuffer.isView(body)) {
    return filesystem.writeBinaryFile(
      path,
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer,
    );
  }
  if (body instanceof Blob) return filesystem.writeBinaryFile(path, await body.arrayBuffer());
  return filesystem.writeFile(path, String(body));
};

/** Status, status text and headers of the last response in curl's `--dump-header` file (after redirects). */
export const parseDumpedHeaders = (raw: string): { status: number; statusText: string; headers: Headers } => {
  const blocks = raw.split(/\r?\n\r?\n/).filter((b) => b.trim());
  const lines = (blocks[blocks.length - 1] ?? '').split(/\r?\n/);
  const statusLine = /^HTTP\/[\d.]+\s+(\d{3})\s*(.*)$/.exec(lines[0] ?? '');
  const headers = new Headers();
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(':');
    if (colon > 0) headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }
  return { status: statusLine ? Number(statusLine[1]) : 0, statusText: statusLine?.[2].trim() ?? '', headers };
};

export const curlFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (init?.signal?.aborted) throw abortError();

  const url = urlOf(input);
  const request = typeof input === 'object' && !(input instanceof URL) ? input : undefined;
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
  const headers = new Headers(request?.headers);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  // curl asks for compression itself (below) and hands back the decoded body.
  headers.delete('accept-encoding');
  const compressed = await curlCanDecompress();
  const body = init?.body ?? (request && method !== 'GET' && method !== 'HEAD' ? await request.text() : undefined);

  const dir = await curlTempDir();
  const id = tempFileId();
  const cfgPath = `${dir}/cfg-${id}.conf`;
  const hdrPath = `${dir}/hdr-${id}.txt`;
  const outPath = `${dir}/out-${id}.bin`;
  const bodyPath = body != null ? `${dir}/body-${id}.bin` : null;

  try {
    const config = [
      'silent',
      'show-error',
      'location',
      'connect-timeout = 10',
      'max-time = 30',
      `url = "${escapeCurlConfigValue(url)}"`,
      `request = "${escapeCurlConfigValue(method)}"`,
      `output = "${escapeCurlConfigValue(outPath)}"`,
      `dump-header = "${escapeCurlConfigValue(hdrPath)}"`,
    ];
    if (compressed) config.push('compressed');
    headers.forEach((value, name) => config.push(`header = "${escapeCurlConfigValue(`${name}: ${value}`)}"`));
    if (bodyPath) {
      await writeBody(bodyPath, body!);
      config.push(`data-binary = "@${escapeCurlConfigValue(bodyPath)}"`);
    }
    await filesystem.writeFile(cfgPath, config.join('\n'));

    const run = await runCommand(`${curlBinary()} -K "${cfgPath}"`);
    if (init?.signal?.aborted) throw abortError();
    // fetch rejects with a TypeError when the request never got an answer; keep that contract.
    if (run.exitCode !== 0)
      throw new TypeError(`curl exited ${run.exitCode}: ${run.stdErr.trim() || run.stdOut.trim()}`);

    const {
      status,
      statusText,
      headers: resHeaders,
    } = parseDumpedHeaders(await filesystem.readFile(hdrPath).catch(() => ''));
    if (!status) throw new TypeError('curl returned no HTTP status');
    // The body on disk is already decoded, so these would describe bytes that aren't there.
    if (compressed && resHeaders.has('content-encoding')) {
      resHeaders.delete('content-encoding');
      resHeaders.delete('content-length');
    }
    const data = NULL_BODY_STATUSES.has(status)
      ? null
      : await filesystem.readBinaryFile(outPath).catch(() => new ArrayBuffer(0));
    const response = new Response(data, { status, statusText, headers: resHeaders });
    Object.defineProperty(response, 'url', { value: url });
    return response;
  } finally {
    for (const path of [cfgPath, hdrPath, outPath, bodyPath]) {
      if (path) void filesystem.remove(path).catch(() => {});
    }
  }
};

/** A download the server refused (googlevideo: 403 on a limited url, so get a fresh one and retry), or that stopped short. */
export class StreamDownloadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'StreamDownloadError';
  }
}

/**
 * Download `url` to `path` with curl (ranged, so googlevideo doesn't throttle it). Gives up if the
 * transfer stalls (< 4 KB/s for 20 s) instead of hanging the player. Throws StreamDownloadError for
 * an HTTP error, and when the file doesn't end up `contentLength` bytes long (when that is known).
 */
export const curlDownload = async (url: string, path: string, contentLength = 0): Promise<void> => {
  const dir = await curlTempDir();
  const id = tempFileId();
  const cfgPath = `${dir}/dl-${id}.conf`;
  const hdrPath = `${dir}/dl-${id}.hdr`;
  try {
    await filesystem.writeFile(
      cfgPath,
      [
        'silent',
        'show-error',
        'location',
        'connect-timeout = 15',
        'speed-limit = 4096',
        'speed-time = 20',
        'retry = 2',
        'header = "Range: bytes=0-"',
        `dump-header = "${escapeCurlConfigValue(hdrPath)}"`,
        `output = "${escapeCurlConfigValue(path)}"`,
        `url = "${escapeCurlConfigValue(url)}"`,
      ].join('\n'),
    );
    const run = await runCommand(`${curlBinary()} -K "${cfgPath}"`);
    const { status } = parseDumpedHeaders(await filesystem.readFile(hdrPath).catch(() => ''));
    if (run.exitCode !== 0) throw new StreamDownloadError(`curl exited ${run.exitCode}: ${run.stdErr.trim()}`, status);
    if (status !== 200 && status !== 206) throw new StreamDownloadError(`Stream download got HTTP ${status}`, status);
    if (contentLength > 0) {
      const { size } = await filesystem.getStats(path);
      if (size !== contentLength)
        throw new StreamDownloadError(`Stream download stopped at ${size} of ${contentLength} bytes`, status);
    }
  } finally {
    void filesystem.remove(cfgPath).catch(() => {});
    void filesystem.remove(hdrPath).catch(() => {});
  }
};
