import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dialog, files, opened, resetFs, store, unreadable, writeFile } from '../helpers/fakeNeutralino';
import { flac, id3Frame, id3Tag, mp3Frame, cat } from '../helpers/audioFixtures';
import { makeTrack } from '../helpers/fixtures';

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);

/** local.ts keeps the index in module state; a fresh import is a fresh app launch. */
async function launch() {
  vi.resetModules();
  const local = await import('../../src/data/local');
  // The mocked package, i.e. the very spies the app calls.
  const neu = (await import('@neutralinojs/lib')) as unknown as typeof import('../helpers/fakeNeutralino').lib;
  return { ...local, neu };
}

const MUSIC = '/home/me/Music';

beforeEach(() => resetFs());

describe('desktop capabilities', () => {
  it('DSK-001 the Linux window has the local library, offline mode and native downloads, but no admin page', async () => {
    const { CAPS, CLIENT } = await import('../../src/lib/caps');
    expect(CAPS).toMatchObject({
      localLibrary: true,
      offlineMode: true,
      offlineDownloads: true,
      nativeEq: true,
      admin: false,
    });
    expect(CLIENT).toBe('linux');
  });
});

describe('scanning music folders', () => {
  it('DSK-002 adding a folder indexes its audio files recursively and ignores other files', async () => {
    writeFile(`${MUSIC}/Radiohead - Airbag.mp3`, new Uint8Array(40));
    writeFile(`${MUSIC}/OK Computer/Lucky.flac`, new Uint8Array(40));
    writeFile(`${MUSIC}/OK Computer/cover.jpg`, new Uint8Array(40));
    writeFile(`${MUSIC}/notes.txt`, 'hi');
    const { localLibrary, getLocalSnapshot } = await launch();
    const folder = await localLibrary.addFolder(MUSIC);
    expect(folder).toMatchObject({ name: 'Music', path: MUSIC, included: true });
    const snap = getLocalSnapshot();
    expect(snap.tracks.map((t) => t.title).sort()).toEqual(['Airbag', 'Lucky']);
    expect(snap.tracks.find((t) => t.title === 'Airbag')).toMatchObject({
      artist: 'Radiohead',
      source: 'local',
      localPath: `${MUSIC}/Radiohead - Airbag.mp3`,
    });
    expect(snap.tracks.find((t) => t.title === 'Lucky')).toMatchObject({
      album: 'OK Computer',
      artist: 'Unknown artist',
    });
    expect(snap.folders[0]).toMatchObject({ trackCount: 2, bytes: 80 });
    expect(snap.scanning).toBeNull();
  });

  it('DSK-003 tags inside the file win over the file name, and site stamps are cleaned', async () => {
    writeFile(
      `${MUSIC}/track01.flac`,
      flac(44_100, 44_100 * 180, ['TITLE=Svefn-g-englar', 'ARTIST=Sigur Rós', 'ALBUM=Ágætis byrjun ::www.raag.me::']),
    );
    writeFile(
      `${MUSIC}/track02.mp3`,
      cat(id3Tag(id3Frame('TIT2', 'Karma Police'), id3Frame('TPE1', 'Radiohead')), mp3Frame()),
    );
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    const byTitle = Object.fromEntries(getLocalSnapshot().tracks.map((t) => [t.title, t]));
    expect(byTitle['Svefn-g-englar']).toMatchObject({
      artist: 'Sigur Rós',
      album: 'Ágætis byrjun',
      durationMs: 180_000,
      codec: 'FLAC',
    });
    expect(byTitle['Karma Police']).toMatchObject({ artist: 'Radiohead', codec: 'MP3' });
  });

  it('DSK-004 the same folder is not added twice', async () => {
    writeFile(`${MUSIC}/a.mp3`, new Uint8Array(10));
    const { localLibrary, getLocalSnapshot } = await launch();
    const first = await localLibrary.addFolder(MUSIC);
    const second = await localLibrary.addFolder(MUSIC);
    expect(second!.id).toBe(first!.id);
    expect(getLocalSnapshot().folders).toHaveLength(1);
    expect(getLocalSnapshot().tracks).toHaveLength(1);
  });

  it('DSK-005 without a path it asks with the folder picker (starting in Music); cancelling adds nothing', async () => {
    writeFile('/home/me/Picked/song.ogg', new Uint8Array(10));
    const { localLibrary, neu } = await launch();
    await expect(localLibrary.addFolder()).resolves.toMatchObject({ path: '/home/me/Picked', name: 'Picked' });
    expect(neu.os.showFolderDialog).toHaveBeenCalledWith('Add a music folder', { defaultPath: MUSIC });
    dialog.folder = null;
    await expect(localLibrary.addFolder()).resolves.toBeNull();
    expect(await localLibrary.listFolders()).toHaveLength(1);
  });

  it('DSK-006 a rescan reports added and removed songs and does not re-read unchanged files', async () => {
    writeFile(`${MUSIC}/keep.mp3`, new Uint8Array(30));
    writeFile(`${MUSIC}/drop.mp3`, new Uint8Array(30));
    const { localLibrary, getLocalSnapshot, neu } = await launch();
    await localLibrary.addFolder(MUSIC);
    files.delete(`${MUSIC}/drop.mp3`);
    writeFile(`${MUSIC}/new one.mp3`, new Uint8Array(30));
    vi.mocked(neu.filesystem.readBinaryFile).mockClear();
    const result = await localLibrary.rescan();
    expect(result).toMatchObject({ added: 1, removed: 1 });
    expect(
      getLocalSnapshot()
        .tracks.map((t) => t.title)
        .sort(),
    ).toEqual(['keep', 'new one']);
    const reads = vi.mocked(neu.filesystem.readBinaryFile).mock.calls.map((c) => c[0]);
    expect(reads.length).toBeGreaterThan(0);
    expect(new Set(reads)).toEqual(new Set([`${MUSIC}/new one.mp3`]));
  });

  it('DSK-007 a file that cannot be read is skipped without failing the folder', async () => {
    writeFile(`${MUSIC}/good.mp3`, new Uint8Array(10));
    writeFile(`${MUSIC}/locked.mp3`, new Uint8Array(10));
    unreadable.add(`${MUSIC}/locked.mp3`);
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    expect(getLocalSnapshot().tracks.map((t) => t.title)).toEqual(['good']);
  });

  it('DSK-008 a folder that disappeared scans as empty', async () => {
    writeFile(`${MUSIC}/a.mp3`, new Uint8Array(10));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    files.clear();
    const { dirs } = await import('../helpers/fakeNeutralino');
    dirs.clear();
    await expect(localLibrary.rescan()).resolves.toMatchObject({ removed: 1 });
    expect(getLocalSnapshot().tracks).toEqual([]);
  });
});

describe('managing folders', () => {
  it('DSK-009 excluding a folder hides its songs; including it brings them back', async () => {
    writeFile(`${MUSIC}/a.mp3`, new Uint8Array(10));
    writeFile('/data/Podcasts/p.mp3', new Uint8Array(10));
    const { localLibrary, getLocalSnapshot } = await launch();
    const music = await localLibrary.addFolder(MUSIC);
    await localLibrary.addFolder('/data/Podcasts');
    await localLibrary.setIncluded(music!.id, false);
    expect(getLocalSnapshot().tracks.map((t) => t.title)).toEqual(['p']);
    await localLibrary.setIncluded(music!.id, true);
    expect(getLocalSnapshot().tracks).toHaveLength(2);
  });

  it('DSK-010 removing a folder forgets its songs and their saved lyrics, but leaves the files', async () => {
    writeFile(`${MUSIC}/a.mp3`, new Uint8Array(10));
    const { localLibrary, getLocalSnapshot } = await launch();
    const folder = await localLibrary.addFolder(MUSIC);
    const id = getLocalSnapshot().tracks[0].id;
    await localLibrary.saveLyrics(id, { plain: 'words' });
    await localLibrary.removeFolder(folder!.id);
    expect(getLocalSnapshot().folders).toEqual([]);
    expect(getLocalSnapshot().tracks).toEqual([]);
    expect(JSON.parse(store.get('sonare_library')!).lyrics).toEqual({});
    expect(files.has(`${MUSIC}/a.mp3`)).toBe(true);
  });

  it('DSK-011 the library is kept in Neutralino storage and restored at the next launch', async () => {
    writeFile(`${MUSIC}/a - b.mp3`, new Uint8Array(10));
    let app = await launch();
    await app.localLibrary.addFolder(MUSIC);
    expect(JSON.parse(store.get('sonare_library')!).version).toBe(1);
    app = await launch();
    const tracks = await app.localLibrary.listTracks();
    expect(tracks.map((t) => [t.artist, t.title])).toEqual([['a', 'b']]);
  });

  it('DSK-012 a corrupt stored library starts empty instead of crashing', async () => {
    store.set('sonare_library', '{nope');
    const { localLibrary } = await launch();
    await expect(localLibrary.listFolders()).resolves.toEqual([]);
  });

  it('DSK-013 "open folder" shows the file\'s folder in the file manager', async () => {
    writeFile(`${MUSIC}/Album/x.mp3`, new Uint8Array(10));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    await localLibrary.showInFolder(getLocalSnapshot().tracks[0].id);
    expect(opened).toEqual([`file://${MUSIC}/Album`]);
  });
});

describe('playing local files', () => {
  it("DSK-014 reads a file's bytes with its type; an unknown id is an error", async () => {
    writeFile(`${MUSIC}/x.flac`, new Uint8Array([1, 2, 3]));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    const file = await localLibrary.readFile(getLocalSnapshot().tracks[0].id);
    expect([...new Uint8Array(file.data)]).toEqual([1, 2, 3]);
    expect(file).toMatchObject({ mime: 'audio/flac', ext: 'flac' });
    await expect(localLibrary.readFile('local:missing')).rejects.toThrow('File is not in the local library');
  });

  it("DSK-015 the player's real duration is remembered for files the scan could not measure", async () => {
    writeFile(`${MUSIC}/x.mp3`, new Uint8Array(8));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    const id = getLocalSnapshot().tracks[0].id;
    localLibrary.noteDuration(id, 123_000);
    expect(getLocalSnapshot().tracks[0].durationMs).toBe(123_000);
  });

  it("DSK-016 server lists swap in this device's copy of a local song and drop ones it lacks", async () => {
    writeFile(`${MUSIC}/Real Title.mp3`, new Uint8Array(8));
    const { localLibrary, getLocalSnapshot, resolveLocalRefs, playsFrom } = await launch();
    await localLibrary.addFolder(MUSIC);
    const mine = getLocalSnapshot().tracks[0];
    const server = makeTrack({ id: 'yt:s' });
    const fromServer = [
      server,
      makeTrack({ id: mine.id, title: 'Local Track', source: 'local' }),
      makeTrack({ id: 'local:elsewhere', source: 'local' }),
    ];
    expect(resolveLocalRefs(fromServer, getLocalSnapshot()).map((t) => t.title)).toEqual([server.title, 'Real Title']);
    expect(playsFrom(server, getLocalSnapshot())).toBe('server');
    expect(playsFrom(mine, getLocalSnapshot())).toBe('local');
  });
});

describe('lyrics for local files', () => {
  it('DSK-017 reads a sidecar .lrc next to the file, synced or plain', async () => {
    writeFile(`${MUSIC}/song.mp3`, new Uint8Array(8));
    writeFile(`${MUSIC}/song.lrc`, '[offset:500]\n[00:01.50]One\n[00:03.00][00:05.00]Echo');
    writeFile(`${MUSIC}/plain.mp3`, new Uint8Array(8));
    writeFile(`${MUSIC}/plain.lrc`, '  just words  ');
    writeFile(`${MUSIC}/none.mp3`, new Uint8Array(8));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    const id = (t: string) => getLocalSnapshot().tracks.find((x) => x.title === t)!.id;
    expect(await localLibrary.lyrics(id('song'))).toEqual({
      synced: true,
      provider: 'lrc',
      offsetMs: -500,
      lines: [
        { atMs: 1500, text: 'One' },
        { atMs: 3000, text: 'Echo' },
        { atMs: 5000, text: 'Echo' },
      ],
    });
    expect(await localLibrary.lyrics(id('plain'))).toEqual({
      synced: false,
      lines: [],
      plain: 'just words',
      offsetMs: 0,
      provider: 'lrc',
    });
    expect(await localLibrary.lyrics(id('none'))).toBeNull();
  });

  it('DSK-018 lyrics the user saves replace the sidecar, and their timing offset is kept', async () => {
    writeFile(`${MUSIC}/song.mp3`, new Uint8Array(8));
    writeFile(`${MUSIC}/song.lrc`, '[00:01.00]From file');
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addFolder(MUSIC);
    const id = getLocalSnapshot().tracks[0].id;
    await localLibrary.saveLyrics(id, { lrc: '[00:02.00]Mine' });
    await localLibrary.setLyricsOffset(id, 750);
    expect(await localLibrary.lyrics(id)).toEqual({
      synced: true,
      lines: [{ atMs: 2000, text: 'Mine' }],
      offsetMs: 750,
      provider: 'user',
    });
    // No lyrics at all: the offset has nothing to attach to.
    await localLibrary.setLyricsOffset('local:nothing', 100);
    expect(await localLibrary.lyrics('local:nothing')).toBeNull();
  });
});

describe('downloads in the local library', () => {
  const download = (over = {}) => ({
    serverId: 'yt:dl1',
    path: `${MUSIC}/Sonare/Radiohead - Reckoner.webm`,
    dir: `${MUSIC}/Sonare`,
    title: 'Reckoner',
    artist: 'Radiohead',
    album: 'In Rainbows',
    durationMs: 290_000,
    codec: 'opus',
    ...over,
  });

  it('DSK-019 a finished download joins the library under "Sonare downloads" and replaces the stream', async () => {
    writeFile(download().path, new Uint8Array(100));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addDownload(download());
    const snap = getLocalSnapshot();
    expect(snap.folders).toEqual([
      expect.objectContaining({
        id: 'downloads',
        name: 'Sonare downloads',
        path: `${MUSIC}/Sonare`,
        trackCount: 1,
        bytes: 100,
      }),
    ]);
    const localId = localLibrary.localIdFor('yt:dl1');
    expect(localId).toMatch(/^local:/);
    expect(snap.downloads.get('yt:dl1')).toBe(localId);
    expect(snap.tracks[0]).toMatchObject({ title: 'Reckoner', artist: 'Radiohead', id: localId });
  });

  it('DSK-020 downloading the same song again keeps one copy; forgetting it unlinks the stream', async () => {
    writeFile(download().path, new Uint8Array(10));
    writeFile(`${MUSIC}/Sonare/Radiohead - Reckoner (2).webm`, new Uint8Array(20));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addDownload(download());
    await localLibrary.addDownload(download({ path: `${MUSIC}/Sonare/Radiohead - Reckoner (2).webm` }));
    expect(getLocalSnapshot().tracks).toHaveLength(1);
    expect(getLocalSnapshot().tracks[0].localPath).toMatch(/\(2\)\.webm$/);
    await localLibrary.forgetDownload('yt:dl1');
    expect(localLibrary.localIdFor('yt:dl1')).toBeNull();
    expect(getLocalSnapshot().tracks).toEqual([]);
  });

  it('DSK-021 rescanning downloads drops files deleted outside Sonare', async () => {
    writeFile(download().path, new Uint8Array(10));
    const { localLibrary, getLocalSnapshot } = await launch();
    await localLibrary.addDownload(download());
    files.delete(download().path);
    await expect(localLibrary.rescan('downloads')).resolves.toMatchObject({ removed: 1 });
    expect(getLocalSnapshot().downloads.size).toBe(0);
  });

  it('DSK-022 downloads indexed by an older version are listed for the download manager to import', async () => {
    writeFile(download().path, new Uint8Array(42));
    const { localLibrary } = await launch();
    await localLibrary.addDownload(download());
    await expect(localLibrary.downloadedEntries()).resolves.toEqual([
      expect.objectContaining({
        serverId: 'yt:dl1',
        path: download().path,
        dir: `${MUSIC}/Sonare`,
        size: 42,
        title: 'Reckoner',
      }),
    ]);
  });
});

describe('native download folder', () => {
  async function targets() {
    vi.resetModules();
    return import('../../src/data/downloadTargets');
  }

  it('DSK-023 downloads go to ~/Music/Sonare until the user picks another folder, which is remembered', async () => {
    let t = await targets();
    await t.loadLocation();
    expect(t.getLocation()).toEqual({
      kind: 'native',
      label: `${MUSIC}/Sonare`,
      path: `${MUSIC}/Sonare`,
      custom: false,
    });
    dialog.folder = '/mnt/usb/Songs';
    await expect(t.chooseLocation()).resolves.toBe(true);
    expect(t.getLocation()).toMatchObject({ path: '/mnt/usb/Songs', custom: true });
    t = await targets();
    await t.loadLocation();
    expect(t.getLocation().path).toBe('/mnt/usb/Songs');
    await t.resetLocation();
    expect(t.getLocation().path).toBe(`${MUSIC}/Sonare`);
  });

  it('DSK-024 cancelling the folder picker keeps the current folder', async () => {
    const t = await targets();
    dialog.folder = null;
    await expect(t.chooseLocation()).resolves.toBe(false);
    expect(t.getLocation().path).toBe(`${MUSIC}/Sonare`);
  });

  it('DSK-025 a download is written to a hidden part file, then moved to a free name', async () => {
    const t = await targets();
    const dir = `${MUSIC}/Sonare`;
    writeFile(`${dir}/Song.webm`, new Uint8Array(1));
    const target = t.targetFor({ id: 'yt:a/b', target: 'native', dir });
    const part = await target.open();
    await part.append(new Uint8Array([1, 2]));
    await part.append(new Uint8Array([3]));
    expect(await part.size()).toBe(3);
    expect(files.has(`${dir}/.sonare-yt_a_b.part`)).toBe(true);
    await expect(part.finish('Song.webm', 'audio/webm')).resolves.toEqual({ path: `${dir}/Song (2).webm`, size: 3 });
    expect(files.has(`${dir}/.sonare-yt_a_b.part`)).toBe(false);
    await target.removeFile(`${dir}/Song (2).webm`);
    await expect(target.removeFile(`${dir}/Song (2).webm`)).rejects.toBeInstanceOf(t.FileMissingError);
  });
});
