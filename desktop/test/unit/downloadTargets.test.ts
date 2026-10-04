import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { Blob as NodeBlob } from 'node:buffer';

/** In-memory stand-ins for the File System Access API (Chromium's folder picker). */
class FakeWritable {
  private pos = 0;
  constructor(
    private file: FakeFile,
    keep: boolean,
  ) {
    this.buf = keep ? file.bytes.slice() : new Uint8Array(0);
  }
  private buf: Uint8Array;
  async seek(p: number) {
    this.pos = p;
  }
  async write(data: Uint8Array | Blob) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer());
    const out = new Uint8Array(Math.max(this.buf.length, this.pos + bytes.length));
    out.set(this.buf);
    out.set(bytes, this.pos);
    this.buf = out;
    this.pos += bytes.length;
  }
  async close() {
    this.file.bytes = this.buf;
  }
  async abort() {}
}

class FakeFile {
  bytes = new Uint8Array(0);
  constructor(
    public dir: FakeDir,
    public name: string,
    private canMove: boolean,
  ) {}
  async getFile() {
    return new File([this.bytes.slice()], this.name);
  }
  async createWritable(o?: { keepExistingData?: boolean }) {
    return new FakeWritable(this, !!o?.keepExistingData);
  }
  get move() {
    if (!this.canMove) return undefined;
    return async (name: string) => {
      this.dir.files.delete(this.name);
      this.name = name;
      this.dir.files.set(name, this);
    };
  }
}

class FakeDir {
  files = new Map<string, FakeFile>();
  permission: PermissionState = 'granted';
  grantOnRequest = true;
  constructor(
    public name: string,
    private canMove = true,
  ) {}
  async getFileHandle(name: string, o?: { create?: boolean }) {
    let f = this.files.get(name);
    if (!f) {
      if (!o?.create) throw new DOMException('missing', 'NotFoundError');
      f = new FakeFile(this, name, this.canMove);
      this.files.set(name, f);
    }
    return f;
  }
  async removeEntry(name: string) {
    if (!this.files.delete(name)) throw new DOMException('missing', 'NotFoundError');
  }
  async queryPermission() {
    return this.permission;
  }
  async requestPermission() {
    if (this.grantOnRequest) this.permission = 'granted';
    return this.permission;
  }
}

let clickedDownloads: string[] = [];

async function fresh(picker?: () => Promise<FakeDir>) {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
  // fake-indexeddb stores values with Node's structuredClone, which can copy Node's Blob
  // but not jsdom's. A real browser's IndexedDB stores its own Blobs, so this matches it.
  vi.stubGlobal('Blob', NodeBlob);
  if (picker) vi.stubGlobal('showDirectoryPicker', vi.fn(picker));
  return import('../../src/storage/downloadTargets');
}

beforeEach(() => {
  clickedDownloads = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clickedDownloads.push(this.download);
  });
  URL.createObjectURL = vi.fn(() => 'blob:sonare/1');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const bytes = (...v: number[]) => new Uint8Array(v);

describe('download location', () => {
  it("WEB-TGT-001 on the web, downloads go to the browser's Downloads by default", async () => {
    const t = await fresh();
    await t.loadLocation();
    expect(t.getLocation()).toEqual({ kind: 'browser', label: 'Browser downloads' });
    expect(t.canPickWebFolder).toBe(false);
  });

  it('WEB-TGT-002 browsers without a folder picker are never asked', async () => {
    const t = await fresh();
    await expect(t.askForWebFolderOnce()).resolves.toBeNull();
  });

  it('WEB-TGT-003 Chromium asks once for a folder and uses the one picked', async () => {
    const music = new FakeDir('Music');
    const t = await fresh(async () => music);
    const changed = vi.fn();
    t.subscribeLocation(changed);
    await expect(t.askForWebFolderOnce()).resolves.toBe('folder');
    expect(t.getLocation()).toEqual({ kind: 'folder', label: 'Music', custom: true });
    expect(changed).toHaveBeenCalled();
    await expect(t.askForWebFolderOnce()).resolves.toBeNull();
    expect(window.showDirectoryPicker).toHaveBeenCalledTimes(1);
  });

  it('WEB-TGT-004 cancelling the picker settles on browser downloads and does not ask again', async () => {
    const t = await fresh(() => Promise.reject(new DOMException('cancel', 'AbortError')));
    await expect(t.askForWebFolderOnce()).resolves.toBe('browser');
    expect(t.getLocation().kind).toBe('browser');
    await expect(t.askForWebFolderOnce()).resolves.toBeNull();
  });

  it('WEB-TGT-005 resetting goes back to browser downloads', async () => {
    const t = await fresh(async () => new FakeDir('Songs'));
    await t.chooseLocation();
    expect(t.getLocation().kind).toBe('folder');
    await t.resetLocation();
    expect(t.getLocation()).toEqual({ kind: 'browser', label: 'Browser downloads' });
  });
});

describe('browser target (IndexedDB)', () => {
  it('WEB-TGT-006 keeps partial data across reopening, so a download can resume', async () => {
    const t = await fresh();
    const target = t.targetFor({ id: 'yt:1', target: 'browser' });
    const part = await target.open();
    await part.append(bytes(1, 2, 3));
    await part.append(bytes(4, 5));
    expect(await part.size()).toBe(5);
    const reopened = await target.open();
    expect(await reopened.size()).toBe(5);
  });

  it('WEB-TGT-007 finishing hands the file to the browser under its name and keeps a copy', async () => {
    const t = await fresh();
    const target = t.targetFor({ id: 'yt:2', target: 'browser' });
    const part = await target.open();
    await part.append(bytes(9, 9, 9));
    await expect(part.finish('Artist - Song.webm', 'audio/webm')).resolves.toEqual({
      path: 'Artist - Song.webm',
      size: 3,
      copyKept: true,
    });
    expect(clickedDownloads).toEqual(['Artist - Song.webm']);
    // The part is gone once finished.
    expect(await (await target.open()).size()).toBe(0);
    await expect(target.saveAgain!('Artist - Song.webm')).resolves.toBe(true);
    expect(clickedDownloads).toEqual(['Artist - Song.webm', 'Artist - Song.webm']);
  });

  it('WEB-TGT-008 deleting explains that the browser owns the saved file, and drops the kept copy', async () => {
    const t = await fresh();
    const target = t.targetFor({ id: 'yt:3', target: 'browser' });
    const part = await target.open();
    await part.append(bytes(1));
    await part.finish('x.webm', 'audio/webm');
    const err = await target.removeFile('x.webm').catch((e) => e);
    expect(err).toBeInstanceOf(t.FileMissingError);
    expect(err.message).toBe('Files saved by the browser have to be deleted from its Downloads folder');
    await expect(target.saveAgain!('x.webm')).resolves.toBe(false);
  });

  it('WEB-TGT-009 discarding a part empties it', async () => {
    const t = await fresh();
    const target = t.targetFor({ id: 'yt:4', target: 'browser' });
    const part = await target.open();
    await part.append(bytes(1, 2));
    await part.discard();
    expect(await (await target.open()).size()).toBe(0);
  });
});

describe('folder target (File System Access)', () => {
  async function folder(canMove = true) {
    const dir = new FakeDir('Music', canMove);
    const t = await fresh(async () => dir);
    await t.chooseLocation();
    return { t, dir, target: t.targetFor({ id: 'yt:f/1', target: 'folder' }) };
  }

  it('WEB-TGT-010 writes a hidden part file in the folder and resumes from its size', async () => {
    const { dir, target } = await folder();
    const part = await target.open();
    await part.append(bytes(1, 2, 3));
    await part.flush();
    expect([...dir.files.keys()]).toEqual(['.sonare-yt_f_1.part']);
    const again = await target.open();
    expect(await again.size()).toBe(3);
    await again.append(bytes(4));
    await again.flush();
    expect([...dir.files.get('.sonare-yt_f_1.part')!.bytes]).toEqual([1, 2, 3, 4]);
  });

  it('WEB-TGT-011 finishing never overwrites: it picks "Name (2)" when the name is taken', async () => {
    const { dir, target } = await folder();
    await dir.getFileHandle('Song.webm', { create: true });
    const part = await target.open();
    await part.append(bytes(7, 7));
    await expect(part.finish('Song.webm', 'audio/webm')).resolves.toEqual({ path: 'Song (2).webm', size: 2 });
    expect([...dir.files.keys()].sort()).toEqual(['Song (2).webm', 'Song.webm']);
  });

  it('WEB-TGT-012 on browsers without move(), finishing copies the part and removes it', async () => {
    const { dir, target } = await folder(false);
    const part = await target.open();
    await part.append(bytes(5, 6));
    await expect(part.finish('Song.webm', 'audio/webm')).resolves.toEqual({ path: 'Song.webm', size: 2 });
    expect([...dir.files.keys()]).toEqual(['Song.webm']);
    expect([...dir.files.get('Song.webm')!.bytes]).toEqual([5, 6]);
  });

  it('WEB-TGT-013 after a reload the folder needs permission again; a click can re-grant it', async () => {
    const { dir, target } = await folder();
    dir.permission = 'prompt';
    dir.grantOnRequest = false;
    await expect(target.ready(false)).resolves.toBe(false);
    await expect(target.ready(true)).resolves.toBe(false);
    dir.grantOnRequest = true;
    await expect(target.ready(false)).resolves.toBe(false);
    await expect(target.ready(true)).resolves.toBe(true);
  });

  it('WEB-TGT-014 deleting a file that was already removed reports it as missing', async () => {
    const { t, dir, target } = await folder();
    await dir.getFileHandle('Here.webm', { create: true });
    await target.removeFile('Here.webm');
    expect(dir.files.has('Here.webm')).toBe(false);
    await expect(target.removeFile('Here.webm')).rejects.toBeInstanceOf(t.FileMissingError);
  });
});

describe('helpers', () => {
  it('WEB-TGT-015 concat joins chunks in order', async () => {
    const t = await fresh();
    expect([...t.concat([bytes(1), bytes(), bytes(2, 3)])]).toEqual([1, 2, 3]);
  });
});
