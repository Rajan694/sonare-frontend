import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { commands, env, files, opened, resetFs, writeFile } from '../helpers/fakeNeutralino';
import { API, http, HttpResponse, server, useMockServer } from '../helpers/server';
import type { AppRelease } from '../../src/types';

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);
vi.mock('../../neutralino.config.json', () => ({ version: '1.2.0' }));

const { checkForUpdate, downloadUpdate, installFormats, openUpdate, showUpdateFolder } =
  await import('../../src/storage/appUpdate');
const { compareVersions, findLatest, findUpdate } = await import('../../../shared/releases');

useMockServer();

const BYTES = new TextEncoder().encode('the new sonare build');
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

const release = (over: Partial<AppRelease>): AppRelease => ({
  id: '11111111-2222-3333-4444-555555555555',
  platform: 'linux',
  format: 'deb',
  version: '1.3.0',
  fileName: 'sonare_1.3.0_amd64.deb',
  sizeBytes: BYTES.length,
  sha256: sha(BYTES),
  notes: null,
  uploadedAt: '2026-10-11T00:00:00.000Z',
  ...over,
});

/** What curl was configured with, per run. */
const curlConfigs: string[] = [];

/** curl "downloads" `bytes` into the config's output file and answers `status`. */
const curlServes = (bytes: Uint8Array, status = 206) => {
  commands.answer = (cmd) => {
    const cfgPath = /-K "([^"]+)"/.exec(cmd)?.[1];
    if (!cfgPath) return { exitCode: 0 };
    const cfg = new TextDecoder().decode(files.get(cfgPath)!.bytes);
    curlConfigs.push(cfg);
    writeFile(/output = "([^"]+)"/.exec(cfg)![1], bytes);
    writeFile(/dump-header = "([^"]+)"/.exec(cfg)![1], `HTTP/1.1 ${status} OK\r\n\r\n`);
    return { exitCode: 0 };
  };
};

beforeEach(() => {
  resetFs();
  const win = window as unknown as { NL_MODE: string; NL_OS: string; NL_PATH: string };
  win.NL_MODE = 'window';
  win.NL_OS = 'Linux';
  win.NL_PATH = '/home/me/apps/sonare';
});

afterEach(() => {
  commands.answer = null;
  curlConfigs.length = 0;
});

describe('app updates', () => {
  it('DSK-068 versions compare by number, and a -dev build comes before its release', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBeGreaterThan(0);
    expect(compareVersions('1.0', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.0-dev')).toBeGreaterThan(0);
    expect(compareVersions('1.0.1-dev', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });

  it('DSK-069 the update is the newest version above this one, in the way this copy was installed', () => {
    const list = [
      release({ id: 'a', format: 'tar.gz', version: '1.3.0' }),
      release({ id: 'b', format: 'deb', version: '1.3.0' }),
      release({ id: 'c', format: 'deb', version: '1.2.5' }),
      release({ id: 'w', platform: 'windows', format: 'exe', version: '9.0.0' }),
    ];
    expect(findUpdate(list, 'linux', '1.2.0', ['deb', 'tar.gz'])?.id).toBe('b');
    expect(findUpdate(list, 'linux', '1.2.0', ['tar.gz', 'deb'])?.id).toBe('a');
    // Only formats this copy can use; nothing newer means up to date.
    expect(findUpdate(list, 'linux', '1.2.0', ['appimage'])).toBeNull();
    expect(findUpdate(list, 'linux', '1.3.0', ['deb', 'tar.gz'])).toBeNull();
    expect(findUpdate(list, 'windows', '1.2.0', ['exe'])?.id).toBe('w');
    // The newest build is found even when this app is already on it.
    expect(findLatest(list, 'linux', ['deb', 'tar.gz'])?.id).toBe('b');
    expect(findLatest(list, 'linux', ['appimage'])).toBeNull();
  });

  it('DSK-070 the install kind comes first: AppImage, the .deb in /opt/sonare, else the archive; Windows the .exe', async () => {
    expect((await installFormats())[0]).toBe('tar.gz');
    (window as unknown as { NL_PATH: string }).NL_PATH = '/opt/sonare';
    expect((await installFormats())[0]).toBe('deb');
    env.APPIMAGE = '/home/me/Sonare.AppImage';
    expect((await installFormats())[0]).toBe('appimage');
    (window as unknown as { NL_OS: string }).NL_OS = 'Windows';
    expect((await installFormats())[0]).toBe('exe');
  });

  it('DSK-071 checkForUpdate compares this app (1.2.0) with the builds uploaded on the admin page', async () => {
    (window as unknown as { NL_PATH: string }).NL_PATH = '/opt/sonare';
    server.use(
      http.get(`${API}/releases`, () =>
        HttpResponse.json({
          items: [release({ version: '1.3.0' }), release({ id: 'x', format: 'tar.gz', version: '1.4.0' })],
        }),
      ),
    );
    // The newest one, even if it only comes as another kind of file.
    expect((await checkForUpdate()).update?.version).toBe('1.4.0');
    server.use(http.get(`${API}/releases`, () => HttpResponse.json({ items: [release({ version: '1.2.0' })] })));
    // Already on it: no update, but the release (its notes) is still there for "What's new".
    const same = await checkForUpdate();
    expect(same.update).toBeNull();
    expect(same.latest?.version).toBe('1.2.0');
  });

  it('DSK-072 a download lands in Downloads once its checksum matches, with progress, and can be opened', async () => {
    curlServes(BYTES);
    const progress: number[] = [];
    const path = await downloadUpdate(release({}), (f) => progress.push(f));
    expect(path).toBe('/home/me/Downloads/sonare_1.3.0_amd64.deb');
    expect(files.get(path)?.bytes).toEqual(BYTES);
    expect(files.has(`${path}.part`)).toBe(false);
    expect(progress.at(-1)).toBe(1);
    // From the backend's download url, ranged like every curl download.
    expect(curlConfigs[0]).toContain(`url = "${API}/releases/11111111-2222-3333-4444-555555555555/download"`);
    expect(curlConfigs[0]).toContain('header = "Range: bytes=0-"');

    await openUpdate(path);
    await showUpdateFolder(path);
    expect(opened).toEqual([path, '/home/me/Downloads']);
  });

  it('DSK-073 a download that does not match the uploaded file is thrown away', async () => {
    curlServes(new TextEncoder().encode('something else entirely'));
    await expect(downloadUpdate(release({ sizeBytes: 0 }), () => {})).rejects.toThrow(/doesn't match/);
    expect([...files.keys()].some((p) => p.startsWith('/home/me/Downloads/'))).toBe(false);
  });

  it('DSK-074 an AppImage is made executable, and odd characters in the name are made safe', async () => {
    curlServes(BYTES);
    const path = await downloadUpdate(release({ format: 'appimage', fileName: 'sonare:1.3.0/x.AppImage' }), () => {});
    expect(path).toBe('/home/me/Downloads/sonare_1.3.0_x.AppImage');
    expect(commands.ran.at(-1)).toBe(`chmod +x "${path}"`);
  });
});
