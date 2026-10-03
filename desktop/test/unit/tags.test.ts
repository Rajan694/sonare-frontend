import { describe, expect, it } from 'vitest';
import { clean, readTags, tagsFromFileName, type RangeReader } from '../../src/storage/tags';
import {
  atom,
  be32,
  cat,
  flac,
  id3Frame,
  id3Tag,
  latin1,
  le32,
  mp3Frame,
  mp4,
  oggOpus,
  reader,
  synchsafe,
  utf8,
  vorbisComments,
} from '../helpers/audioFixtures';

describe('file-name fallback', () => {
  it('WEB-TAG-001 reads "Artist - Title" and uses the parent folder as the album', () => {
    expect(tagsFromFileName('/music/OK Computer/Radiohead - Airbag.mp3')).toEqual({
      artist: 'Radiohead',
      title: 'Airbag',
      album: 'OK Computer',
    });
    expect(tagsFromFileName('C:\\Songs\\Mix\\my_track_01.flac')).toEqual({ title: 'my track 01', album: 'Mix' });
    expect(tagsFromFileName('loose.ogg')).toEqual({ title: 'loose', album: undefined });
  });

  it('WEB-TAG-002 removes download-site stamps, NULs and extra spaces', () => {
    expect(clean('Tum Hi Ho ::www.RAAG.ME::')).toBe('Tum Hi Ho');
    expect(clean('Kesariya(PagalWorld.com.se)')).toBe('Kesariya');
    expect(clean('Track [site.mobi]')).toBe('Track');
    expect(clean('A  B\0\0')).toBe('A B');
    expect(clean('   ')).toBeUndefined();
    expect(clean(undefined)).toBeUndefined();
  });

  it('WEB-TAG-015 strips ".info" download-site stamps completely', () => {
    expect(clean('Song - DJMaza.info')).toBe('Song');
    expect(clean('Tune (Mp3Mad.info)')).toBe('Tune');
  });
});

describe('MP3 (ID3v2)', () => {
  it('WEB-TAG-003 reads title, artist, album, year and genre from ID3v2.3 frames', async () => {
    const file = cat(
      id3Tag(
        id3Frame('TIT2', 'Paranoid Android'),
        id3Frame('TPE1', 'Radiohead', 0),
        id3Frame('TALB', 'OK Computer', 1),
        id3Frame('TYER', '1997'),
        id3Frame('TCON', '(17)Rock'),
      ),
      mp3Frame(),
    );
    const tags = await readTags('a.mp3', file.length, reader(file).read);
    expect(tags).toMatchObject({
      codec: 'MP3',
      title: 'Paranoid Android',
      artist: 'Radiohead',
      album: 'OK Computer',
      year: 1997,
      genre: 'Rock',
    });
  });

  it('WEB-TAG-004 uses TLEN for the duration when present', async () => {
    const file = cat(id3Tag(id3Frame('TIT2', 'x'), id3Frame('TLEN', '215000')), mp3Frame());
    expect((await readTags('a.mp3', file.length, reader(file).read)).durationMs).toBe(215_000);
  });

  it('WEB-TAG-005 works out a CBR duration from the bitrate and file size', async () => {
    const tag = id3Tag(id3Frame('TIT2', 'x'));
    const file = cat(tag, mp3Frame());
    // 128 kbps: 16 bytes per millisecond of audio after the tag.
    const size = tag.length + 16 * 180_000;
    expect(await readTags('a.mp3', size, reader(file).read)).toMatchObject({ durationMs: 180_000, bitrateKbps: 128 });
  });

  it('WEB-TAG-006 prefers the Xing frame count for VBR files', async () => {
    const file = mp3Frame(1000);
    const tags = await readTags('vbr.mp3', 400_000, reader(file).read);
    // 1000 frames x 1152 samples / 44100 Hz
    expect(tags.durationMs).toBe(26_122);
    expect(tags.bitrateKbps).toBe(Math.round((400_000 * 8) / 26_122));
  });

  it('WEB-TAG-007 reads only the tag and the first frame, not the whole file', async () => {
    const file = cat(id3Tag(id3Frame('TIT2', 'x')), mp3Frame(), new Uint8Array(5_000_000));
    const r = reader(file);
    await readTags('big.mp3', file.length, r.read);
    expect(r.bytesRead()).toBeLessThan(10_000);
  });
});

describe('older and newer tag layouts', () => {
  it('WEB-TAG-016 ID3v2.4: synchsafe frame sizes, UTF-16BE text and TDRC dates', () => {
    const utf16be = (t: string) => Uint8Array.from([...t].flatMap((c) => [0, c.charCodeAt(0)]));
    const frame = (id: string, body: Uint8Array) => cat(latin1(id), synchsafe(body.length), [0, 0], body);
    const body = cat(frame('TIT2', cat([2], utf16be('Nude'))), frame('TDRC', cat([3], utf8('2007-10-10'))));
    const file = cat(latin1('ID3'), [4, 0, 0], synchsafe(body.length), body, mp3Frame());
    return readTags('v24.mp3', file.length, reader(file).read).then((tags) => {
      expect(tags).toMatchObject({ title: 'Nude', year: 2007, codec: 'MP3' });
    });
  });

  it('WEB-TAG-017 ID3v2.2: three-letter frames with 3-byte sizes', async () => {
    const frame = (id: string, text: string) => {
      const b = cat([0], latin1(text));
      return cat(latin1(id), [0, 0, b.length], b);
    };
    const body = cat(frame('TT2', 'Old Song'), frame('TP1', 'Old Band'), frame('TAL', 'Old Album'));
    const file = cat(latin1('ID3'), [2, 0, 0], synchsafe(body.length), body, mp3Frame());
    expect(await readTags('v22.mp3', file.length, reader(file).read)).toMatchObject({
      title: 'Old Song',
      artist: 'Old Band',
      album: 'Old Album',
    });
  });

  it('WEB-TAG-018 an extended ID3 header is skipped before the frames', async () => {
    const frames = id3Frame('TIT2', 'After extended');
    // v2.3 extended header: a size field (not counted) + 6 bytes of flags and padding size.
    const ext = cat(be32(6), [0, 0, 0, 0, 0, 0]);
    const body = cat(ext, frames);
    const file = cat(latin1('ID3'), [3, 0, 0x40], synchsafe(body.length), body, mp3Frame());
    expect((await readTags('ext.mp3', file.length, reader(file).read)).title).toBe('After extended');
  });

  it('WEB-TAG-019 MPEG-2 (22.05 kHz) files get a duration from their bitrate', async () => {
    // MPEG-2 Layer III, 64 kbps (index 8), 22.05 kHz: 8 bytes per millisecond.
    const frame = cat([0xff, 0xf3, 0x80, 0x44], new Array(200).fill(0));
    const tags = await readTags('lofi.mp3', 8 * 60_000, reader(frame).read);
    expect(tags).toMatchObject({ durationMs: 60_000, bitrateKbps: 64 });
  });

  it("WEB-TAG-020 Ogg Vorbis: tags from the comment header, duration at the stream's own sample rate", async () => {
    const idHeader = cat(latin1('\x01vorbis'), le32(0), [2], le32(44_100), new Array(16).fill(0));
    const comments = cat(latin1('\x03vorbis'), vorbisComments(['TITLE=Ogg Song', 'ARTIST=Ogg Band']));
    const granule = 44_100 * 90;
    const lastPage = cat(latin1('OggS'), [0, 4], le32(granule), le32(0), new Array(12).fill(0));
    const file = cat(latin1('OggS'), new Array(22).fill(0), idHeader, comments, lastPage);
    expect(await readTags('v.ogg', file.length, reader(file).read)).toEqual({
      codec: 'Vorbis',
      title: 'Ogg Song',
      artist: 'Ogg Band',
      durationMs: 90_000,
    });
  });

  it('WEB-TAG-021 MP4 with a 64-bit atom size and a version-1 mvhd', async () => {
    const mvhd1 = atom(
      'mvhd',
      Uint8Array.from([1, 0, 0, 0, ...new Array(16).fill(0), ...be32(1000), ...be32(0), ...be32(200_000), 0, 0, 0, 0]),
    );
    const big = cat(be32(1), latin1('mdat'), be32(0), be32(24), new Uint8Array(8)); // 64-bit size = 24
    const file = cat(atom('ftyp', latin1('M4A ')), big, atom('moov', mvhd1));
    expect(await readTags('v1.m4a', file.length, reader(file).read)).toEqual({ codec: 'AAC', durationMs: 200_000 });
  });
});

describe('FLAC, Ogg and MP4', () => {
  it('WEB-TAG-008 FLAC: duration from STREAMINFO and tags from Vorbis comments', async () => {
    const file = flac(44_100, 44_100 * 200, [
      'TITLE=Svefn-g-englar',
      'artist=Sigur Rós',
      'ALBUM=Ágætis byrjun',
      'DATE=1999-06-12',
      'TITLE=ignored duplicate',
    ]);
    const tags = await readTags('s.flac', file.length, reader(file).read);
    expect(tags).toEqual({
      codec: 'FLAC',
      durationMs: 200_000,
      title: 'Svefn-g-englar',
      artist: 'Sigur Rós',
      album: 'Ágætis byrjun',
      year: 1999,
    });
  });

  it('WEB-TAG-009 Ogg Opus: tags from OpusTags and duration from the last granule at 48 kHz', async () => {
    const file = oggOpus(48_000 * 245, ['TITLE=Hyperballad', 'ARTIST=Björk']);
    const tags = await readTags('h.opus', file.length, reader(file).read);
    expect(tags).toEqual({ codec: 'Opus', title: 'Hyperballad', artist: 'Björk', durationMs: 245_000 });
  });

  it('WEB-TAG-010 MP4/M4A: finds moov after mdat, reads mvhd duration and ilst tags', async () => {
    const file = mp4(1000, 187_500, {
      '\xa9nam': 'Teardrop',
      '\xa9ART': 'Massive Attack',
      '\xa9alb': 'Mezzanine',
      '\xa9day': '1998-04-20',
      '\xa9gen': 'Trip hop',
    });
    const tags = await readTags('t.m4a', file.length, reader(file).read);
    expect(tags).toEqual({
      codec: 'AAC',
      durationMs: 187_500,
      title: 'Teardrop',
      artist: 'Massive Attack',
      album: 'Mezzanine',
      year: 1998,
      genre: 'Trip hop',
    });
  });

  it('WEB-TAG-011 recognises the container by its bytes, not the extension', async () => {
    const file = flac(48_000, 48_000, ['TITLE=Real FLAC']);
    expect((await readTags('mislabelled.mp3', file.length, reader(file).read)).codec).toBe('FLAC');
  });
});

describe('unreadable input', () => {
  it('WEB-TAG-012 WAV and WebM get a codec only; unknown files get nothing', async () => {
    const empty = new Uint8Array(64);
    expect(await readTags('a.wav', 64, reader(empty).read)).toEqual({ codec: 'WAV' });
    expect(await readTags('a.webm', 64, reader(empty).read)).toEqual({ codec: 'Opus' });
    expect(await readTags('a.xyz', 64, reader(empty).read)).toEqual({});
  });

  it('WEB-TAG-013 a reader that fails mid-way falls back to no tags instead of throwing', async () => {
    const failing: RangeReader = async (pos) => {
      if (pos === 0) return latin1('fLaC________');
      throw new Error('EIO');
    };
    await expect(readTags('broken.flac', 1000, failing)).resolves.toEqual({});
  });

  it('WEB-TAG-014 a truncated ID3 tag keeps whatever frames were complete', async () => {
    const full = id3Tag(id3Frame('TIT2', 'Kept'), id3Frame('TPE1', 'Lost artist'));
    const truncated = full.slice(0, full.length - 5);
    const tags = await readTags('t.mp3', truncated.length, reader(truncated).read);
    expect(tags.title).toBe('Kept');
  });
});
