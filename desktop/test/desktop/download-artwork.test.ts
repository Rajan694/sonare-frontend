import { beforeEach, describe, expect, it, vi } from 'vitest';
import { files, resetFs, store, writeFile } from '../helpers/fakeNeutralino';
import { cat, id3Frame, id3PicFrame, id3Tag, mp3Frame } from '../helpers/audioFixtures';

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);

const launch = async () => {
  vi.resetModules();
  const local = await import('../../src/storage/local');
  const neu = (await import('@neutralinojs/lib')) as unknown as typeof import('../helpers/fakeNeutralino').lib;
  return { ...local, neu };
};

beforeEach(() => {
  resetFs();
});

describe('downloaded songs cover art', () => {
  it('WEB-DLART-001 a download handed its cover saves it as a file:// cover beside the server thumbnail', async () => {
    const fakeCover = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const path = '/home/me/Music/Sonare/song_with_art.mp3';
    writeFile(path, cat(id3Tag(id3Frame('TIT2', 'Song With Art')), mp3Frame()));

    const { localLibrary, getDownloadCover } = await launch();
    await localLibrary.addDownload({
      serverId: 'yt:art1',
      path,
      dir: '/home/me/Music/Sonare',
      title: 'Song With Art',
      artist: 'Artist',
      album: 'Album',
      durationMs: 180_000,
      thumbnail: 'https://server.test/thumb.jpg',
      cover: { mime: 'image/jpeg', data: fakeCover },
    });

    // Stored by the time the download is indexed: no read of the file needed.
    expect(getDownloadCover('yt:art1')).toMatch(
      /^file:\/\/\/home\/me\/\.local\/share\/sonare\/art\/[0-9a-f]{64}\.jpg$/,
    );
    const entry = (await localLibrary.downloadedEntries()).find((e) => e.serverId === 'yt:art1');
    expect(entry?.thumbnail).toBe('https://server.test/thumb.jpg');

    const artFiles = [...files.keys()].filter((p) => p.startsWith('/home/me/.local/share/sonare/art/'));
    expect(artFiles).toHaveLength(1);
    expect(files.get(artFiles[0])?.bytes).toEqual(fakeCover);
  });

  it('WEB-DLART-002 one without keeps the server thumbnail', async () => {
    const mp3NoArt = cat(id3Tag(id3Frame('TIT2', 'Song Without Art')), mp3Frame());
    const path = '/home/me/Music/Sonare/song_no_art.mp3';
    writeFile(path, mp3NoArt);

    const { localLibrary } = await launch();
    const { trackArtwork } = await import('../../src/components/music/Artwork');

    await localLibrary.addDownload({
      serverId: 'yt:noart',
      path,
      dir: '/home/me/Music/Sonare',
      title: 'Song Without Art',
      artist: 'Artist',
      album: 'Album',
      durationMs: 180_000,
      thumbnail: 'https://server.test/thumb_noart.jpg',
    });

    const entries = await localLibrary.downloadedEntries();
    const entry = entries.find((e) => e.serverId === 'yt:noart');
    expect(entry).toBeDefined();
    expect(entry?.coverArt).toBeUndefined();
    expect(entry?.thumbnail).toBe('https://server.test/thumb_noart.jpg');

    const artwork = trackArtwork({
      id: 'yt:noart',
      source: 'server',
      thumbnail: 'https://server.test/thumb_noart.jpg',
    });
    expect(artwork).toBe('https://server.test/thumb_noart.jpg');
  });

  it("WEB-DLART-003 trackArtwork prefers the download's cover over the thumbnail", async () => {
    const fakeCover = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 10, 20, 30]);
    const mp3WithArt = cat(
      id3Tag(id3Frame('TIT2', 'Preferred Art'), id3PicFrame('image/jpeg', 3, fakeCover)),
      mp3Frame(),
    );
    const path = '/home/me/Music/Sonare/preferred.mp3';
    writeFile(path, mp3WithArt);

    const { localLibrary } = await launch();
    const { catalogArtwork, trackArtwork } = await import('../../src/components/music/Artwork');

    await localLibrary.addDownload({
      serverId: 'yt:preferred',
      path,
      dir: '/home/me/Music/Sonare',
      title: 'Preferred Art',
      artist: 'Artist',
      album: 'Album',
      durationMs: 200_000,
      thumbnail: 'https://server.test/server_thumb.jpg',
      cover: { mime: 'image/jpeg', data: fakeCover },
    });

    const track = { id: 'yt:preferred', source: 'server', thumbnail: 'https://server.test/server_thumb.jpg' };
    const artwork = trackArtwork(track);

    expect(artwork).toMatch(/^file:\/\/\/home\/me\/\.local\/share\/sonare\/art\/[0-9a-f]{64}\.jpg$/);
    expect(artwork).not.toBe('https://server.test/server_thumb.jpg');
    // The cover a new download embeds comes from the catalogue, never from an earlier copy on disk.
    expect(catalogArtwork(track, 640)).toBe('https://server.test/server_thumb.jpg');
  });

  it('WEB-DLART-004 an old entry without the field gets filled on first use, read once', async () => {
    const fakeCover = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 50, 60, 70]);
    const mp3WithArt = cat(
      id3Tag(id3Frame('TIT2', 'Old Download'), id3PicFrame('image/jpeg', 3, fakeCover)),
      mp3Frame(),
    );
    const path = '/home/me/Music/Sonare/old_song.mp3';
    writeFile(path, mp3WithArt);

    const oldEntry = {
      id: 'local:old123',
      path,
      folderId: 'downloads',
      size: mp3WithArt.length,
      mtime: 1000,
      title: 'Old Download',
      artist: 'Old Artist',
      album: 'Old Album',
      durationMs: 150_000,
      addedAt: 1000,
      serverId: 'yt:old1',
      thumbnail: 'https://server.test/old_thumb.jpg',
    };

    store.set(
      'sonare_library',
      JSON.stringify({
        version: 1,
        folders: [
          {
            id: 'downloads',
            name: 'Sonare downloads',
            path: '/home/me/Music/Sonare',
            trackCount: 1,
            bytes: mp3WithArt.length,
            included: true,
            lastScanAt: 1000,
          },
        ],
        entries: [oldEntry],
      }),
    );

    const { localLibrary, getDownloadCover, neu } = await launch();
    const { trackArtwork } = await import('../../src/components/music/Artwork');

    await localLibrary.listFolders();
    vi.mocked(neu.filesystem.readBinaryFile).mockClear();

    const track = {
      id: 'yt:old1',
      source: 'server',
      thumbnail: 'https://server.test/old_thumb.jpg',
    };

    // First ask: returns server thumbnail without blocking render
    const firstCallArt = trackArtwork(track);
    expect(firstCallArt).toBe('https://server.test/old_thumb.jpg');

    // Wait for the lazy background fill to finish
    await vi.waitFor(() => {
      expect(getDownloadCover('yt:old1')).toBeDefined();
    });

    const filledArt = getDownloadCover('yt:old1');
    expect(filledArt).toMatch(/^file:\/\/\/home\/me\/\.local\/share\/sonare\/art\/[0-9a-f]{64}\.jpg$/);
    expect(trackArtwork(track)).toBe(filledArt);

    const readCallsForSong = vi
      .mocked(neu.filesystem.readBinaryFile)
      .mock.calls.filter((call) => call[0] === path).length;
    expect(readCallsForSong).toBeGreaterThan(0);

    // Repeated requests use the cached cover and do not re-read from disk
    trackArtwork(track);
    trackArtwork(track);
    getDownloadCover('yt:old1');

    const subsequentReads = vi
      .mocked(neu.filesystem.readBinaryFile)
      .mock.calls.filter((call) => call[0] === path).length;
    expect(subsequentReads).toBe(readCallsForSong);
  });

  it('WEB-DLART-005 an old entry without embedded art is checked once and keeps the thumbnail', async () => {
    const mp3NoArt = cat(id3Tag(id3Frame('TIT2', 'Old No Art')), mp3Frame());
    const path = '/home/me/Music/Sonare/old_no_art.mp3';
    writeFile(path, mp3NoArt);

    const oldEntry = {
      id: 'local:oldnoart',
      path,
      folderId: 'downloads',
      size: mp3NoArt.length,
      mtime: 1000,
      title: 'Old No Art',
      artist: 'Old Artist',
      album: 'Old Album',
      durationMs: 150_000,
      addedAt: 1000,
      serverId: 'yt:oldnoart',
      thumbnail: 'https://server.test/old_noart.jpg',
    };

    store.set(
      'sonare_library',
      JSON.stringify({
        version: 1,
        folders: [
          {
            id: 'downloads',
            name: 'Sonare downloads',
            path: '/home/me/Music/Sonare',
            trackCount: 1,
            bytes: mp3NoArt.length,
            included: true,
            lastScanAt: 1000,
          },
        ],
        entries: [oldEntry],
      }),
    );

    const { localLibrary, getDownloadCover, neu } = await launch();
    const { trackArtwork } = await import('../../src/components/music/Artwork');

    await localLibrary.listFolders();
    vi.mocked(neu.filesystem.readBinaryFile).mockClear();

    const track = { id: 'yt:oldnoart', source: 'server', thumbnail: 'https://server.test/old_noart.jpg' };
    expect(trackArtwork(track)).toBe('https://server.test/old_noart.jpg');

    await new Promise((r) => setTimeout(r, 20));

    expect(getDownloadCover('yt:oldnoart')).toBeUndefined();
    expect(trackArtwork(track)).toBe('https://server.test/old_noart.jpg');

    const readCallsForSong = vi
      .mocked(neu.filesystem.readBinaryFile)
      .mock.calls.filter((call) => call[0] === path).length;
    expect(readCallsForSong).toBeGreaterThan(0);

    trackArtwork(track);
    getDownloadCover('yt:oldnoart');

    const subsequentReads = vi
      .mocked(neu.filesystem.readBinaryFile)
      .mock.calls.filter((call) => call[0] === path).length;
    expect(subsequentReads).toBe(readCallsForSong);
  });
});
