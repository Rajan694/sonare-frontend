import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetFs, store, writeFile } from '../helpers/fakeNeutralino';

/**
 * "Downloads after reinstall" tests (DSK-4 Part 3, audit I14).
 *
 * When a user reinstalls Sonare the download-manager list is gone, but the
 * audio files are still on disk with names like `Artist - Title [videoId].ext`.
 * `local.ts:indexFile` reads the id (exactly 11 YouTube-safe chars) from the
 * name and stores it as `serverId`.  `downloads.ts:adoptFoundDownloads` then
 * picks these up via `localLibrary.downloadedEntries()` so files reappear in the
 * Downloads panel without any user action.
 *
 * All YouTube ids used in these tests are exactly 11 characters long, matching
 * the `[A-Za-z0-9_-]{11}` regex in fileNames.ts.
 */

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);
vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));

const MUSIC = '/home/me/Music/Sonare';

const launch = async () => {
  vi.resetModules();
  const local = await import('../../src/storage/local');
  return local;
};

beforeEach(() => {
  resetFs();
  store.clear();
});

describe('filename-based download relink (audit I14)', () => {
  it('WEB-RELINK-001 idInFileName extracts the YouTube id from a file name and null for other files', async () => {
    const { idInFileName } = await import('../../../shared/downloads/fileNames');
    // 11-char ids are accepted.
    expect(idInFileName('Radiohead - Karma Police [dIIEmIla4MU].webm')).toBe('yt:dIIEmIla4MU');
    expect(idInFileName('Radiohead - Karma Police [dIIEmIla4MU].m4a')).toBe('yt:dIIEmIla4MU');
    expect(idInFileName('Track [abc12345678].mp3')).toBe('yt:abc12345678');
    // No bracketed section, too short, or too long → null.
    expect(idInFileName('Just a regular file.mp3')).toBeNull();
    expect(idInFileName('Short [abc].mp3')).toBeNull(); // 3 chars
    expect(idInFileName('File [123456789012].mp3')).toBeNull(); // 12 chars
  });

  it('WEB-RELINK-002 a file named with the Sonare pattern gets serverId set in the index', async () => {
    // downloadName() produces `Artist - Title [11-char-id].ext`
    const path = `${MUSIC}/Radiohead - Karma Police [dIIEmIla4MU].webm`;
    writeFile(path, new Uint8Array(500));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    const snap = getLocalSnapshot();
    expect(snap.downloads.get('yt:dIIEmIla4MU')).toMatch(/^local:/);
    expect(localLibrary.localIdFor('yt:dIIEmIla4MU')).toMatch(/^local:/);
  });

  it('WEB-RELINK-003 localIdFor finds a relinked file so the player uses the local copy', async () => {
    // Use a valid 11-char id: KarmaP01234 (K-a-r-m-a-P-0-1-2-3-4 = 11)
    const path = `${MUSIC}/OK Computer [KarmaP01234].m4a`;
    writeFile(path, new Uint8Array(300));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    expect(getLocalSnapshot().downloads.has('yt:KarmaP01234')).toBe(true);
    expect(localLibrary.localIdFor('yt:KarmaP01234')).toMatch(/^local:/);
    // A track id with no matching file returns null.
    expect(localLibrary.localIdFor('yt:unknownFile')).toBeNull();
  });

  it('WEB-RELINK-004 an unchanged file keeps its serverId across a rescan without re-reading tags', async () => {
    // abc123defgh = 11 chars
    const path = `${MUSIC}/Sigur Rós - Hoppipolla [abc123defgh].flac`;
    writeFile(path, new Uint8Array(128));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    // First scan: serverId set from name.
    expect(localLibrary.localIdFor('yt:abc123defgh')).toMatch(/^local:/);
    // Rescan: file unchanged (same size + mtime). The entry already has serverId,
    // so the early-return branch in indexFile is taken — no duplicate.
    await localLibrary.rescan();
    expect(getLocalSnapshot().downloads.has('yt:abc123defgh')).toBe(true);
  });

  it('WEB-RELINK-005 downloadedEntries returns all files whose names embed a server id', async () => {
    // trackone123 = 11 chars; tracktwo456 = 11 chars
    writeFile(`${MUSIC}/Track One [trackone123].webm`, new Uint8Array(100));
    writeFile(`${MUSIC}/Track Two [tracktwo456].webm`, new Uint8Array(200));

    const { localLibrary } = await launch();
    await localLibrary.addFolder(MUSIC);

    const entries = await localLibrary.downloadedEntries();
    const ids = entries.map((e) => e.serverId);
    expect(ids).toContain('yt:trackone123');
    expect(ids).toContain('yt:tracktwo456');
    // Each file is listed once.
    expect(ids.filter((id) => id === 'yt:trackone123')).toHaveLength(1);
    expect(ids.filter((id) => id === 'yt:tracktwo456')).toHaveLength(1);
  });

  it('WEB-RELINK-006 a file without a Sonare id in its name is not returned by downloadedEntries', async () => {
    writeFile(`${MUSIC}/some album track.mp3`, new Uint8Array(50));

    const { localLibrary } = await launch();
    await localLibrary.addFolder(MUSIC);

    const entries = await localLibrary.downloadedEntries();
    expect(entries).toHaveLength(0);
  });

  it('WEB-RELINK-007 a scan that finds a download the list forgot adds it to Downloads once, and a rescan adds nothing', async () => {
    const { localLibrary } = await launch();
    const { downloads, getDownloadsSnapshot } = await import('../../src/storage/downloads');
    await downloads.init();
    expect(getDownloadsSnapshot().items).toHaveLength(0);

    writeFile(`${MUSIC}/Radiohead - Karma Police [dIIEmIla4MU].webm`, new Uint8Array(500));
    await localLibrary.addFolder(MUSIC);
    await vi.waitFor(() => expect(getDownloadsSnapshot().items.map((i) => i.id)).toEqual(['yt:dIIEmIla4MU']));
    expect(getDownloadsSnapshot().items[0]).toMatchObject({
      status: 'done',
      title: 'Karma Police',
      artist: 'Radiohead',
    });

    await localLibrary.rescan();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getDownloadsSnapshot().items).toHaveLength(1);
  });
});
