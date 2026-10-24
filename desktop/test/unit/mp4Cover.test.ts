import { describe, expect, it } from 'vitest';
import { addMp4Tags } from '../../src/storage/mp4Cover';
import { atom, be32, cat, latin1, mp4 } from '../helpers/audioFixtures';
import { readTags } from '../../src/storage/tags';

describe('mp4Cover', () => {
  it('WEB-MP4-001 injects metadata and cover art into MP4 moov atom', async () => {
    const original = mp4(44100, 44100 * 3, {});
    const fakeCover = {
      data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x11, 0x22]),
      mime: 'image/jpeg' as const,
      width: 1,
      height: 1,
    };

    const tagged = addMp4Tags(original, {
      title: 'M4A Song',
      artist: 'M4A Artist',
      album: 'M4A Album',
      cover: fakeCover,
    });

    expect(tagged).not.toBeNull();

    // Verify through tags reader
    const reader = async (pos: number, size: number) => tagged!.subarray(pos, pos + size);
    const parsed = await readTags('test.m4a', tagged!.length, reader);

    expect(parsed.codec).toBe('AAC');
    expect(parsed.title).toBe('M4A Song');
    expect(parsed.artist).toBe('M4A Artist');
    expect(parsed.album).toBe('M4A Album');
  });

  it('WEB-MP4-002 replaces existing udta/meta tags cleanly', async () => {
    const original = mp4(44100, 44100 * 2, {
      '\xa9nam': 'Old Title',
      '\xa9ART': 'Old Artist',
    });

    const tagged = addMp4Tags(original, {
      title: 'New Title',
      artist: 'New Artist',
    });

    expect(tagged).not.toBeNull();

    const reader = async (pos: number, size: number) => tagged!.subarray(pos, pos + size);
    const parsed = await readTags('test.m4a', tagged!.length, reader);

    expect(parsed.title).toBe('New Title');
    expect(parsed.artist).toBe('New Artist');
  });

  it('WEB-MP4-003 adjusts stco offsets when moov precedes mdat', () => {
    // Construct an MP4 where moov precedes mdat
    const stcoEntries = [1000, 2000, 3000];
    const stcoBody = cat(
      [0, 0, 0, 0], // version + flags
      be32(stcoEntries.length),
      ...stcoEntries.map((n) => be32(n)),
    );
    const stcoAtom = atom('stco', stcoBody);
    const stblAtom = atom('stbl', stcoAtom);
    const minfAtom = atom('minf', stblAtom);
    const mdiaAtom = atom('mdia', minfAtom);
    const trakAtom = atom('trak', mdiaAtom);

    const mvhd = atom('mvhd', new Uint8Array(24));
    const moovBefore = atom('moov', mvhd, trakAtom);
    const mdatAfter = atom('mdat', new Uint8Array(50));
    const input = cat(atom('ftyp', latin1('M4A '), Uint8Array.from(be32(0))), moovBefore, mdatAfter);

    const tagged = addMp4Tags(input, {
      title: 'Adjusted Title',
    });

    expect(tagged).not.toBeNull();

    // Find stco inside tagged buffer
    const text = new TextDecoder('latin1').decode(tagged!);
    const stcoPos = text.indexOf('stco');
    expect(stcoPos).toBeGreaterThan(0);

    const view = new DataView(tagged!.buffer, tagged!.byteOffset, tagged!.byteLength);
    // stco body is at stcoPos + 4
    const count = view.getUint32(stcoPos + 8, false);
    expect(count).toBe(3);
    // Every chunk moved by exactly what moov grew.
    const delta = tagged!.length - input.length;
    expect(delta).toBeGreaterThan(0);
    expect([0, 1, 2].map((i) => view.getUint32(stcoPos + 12 + i * 4, false))).toEqual(
      stcoEntries.map((n) => n + delta),
    );
  });

  it('WEB-MP4-005 a fragmented file: an explicit base-data-offset and mfra moof offsets move with the data', () => {
    const trak = atom('trak', atom('mdia', atom('minf', atom('stbl', atom('stco', cat([0, 0, 0, 0], be32(0)))))));
    const moov = atom('moov', atom('mvhd', new Uint8Array(24)), trak, atom('mvex', atom('trex', new Uint8Array(24))));
    const ftyp = atom('ftyp', latin1('dash'), Uint8Array.from(be32(0)));
    const moofAt = ftyp.length + moov.length;
    // tfhd with flag 1: track_ID, then a 64-bit base-data-offset pointing at the moof itself.
    const tfhd = atom('tfhd', cat([0, 0, 0, 1], be32(1), be32(0), be32(moofAt)));
    const moof = atom('moof', atom('mfhd', cat([0, 0, 0, 0], be32(1))), atom('traf', tfhd));
    const mdat = atom('mdat', new Uint8Array(40));
    // tfra v0: track_ID, sizes word (all 1 byte), one entry: time, moof offset, traf/trun/sample numbers.
    const tfra = atom('tfra', cat([0, 0, 0, 0], be32(1), be32(0), be32(1), be32(0), be32(moofAt), [1, 1, 1]));
    const input = cat(ftyp, moov, moof, mdat, atom('mfra', tfra));

    const tagged = addMp4Tags(input, { title: 'Fragmented' })!;
    expect(tagged).not.toBeNull();
    const delta = tagged.length - input.length;
    const text = new TextDecoder('latin1').decode(tagged);
    const view = new DataView(tagged.buffer, tagged.byteOffset, tagged.byteLength);
    const tfhdAt = text.indexOf('tfhd') + 4;
    expect(view.getUint32(tfhdAt + 12)).toBe(moofAt + delta);
    expect(text.indexOf('moof') - 4).toBe(moofAt + delta);
    const tfraAt = text.indexOf('tfra') + 4;
    expect(view.getUint32(tfraAt + 16 + 4)).toBe(moofAt + delta);
  });

  it('WEB-MP4-006 a PNG cover is written as covr data type 14, a JPEG as 13', () => {
    const covrType = (mime: 'image/jpeg' | 'image/png') => {
      const tagged = addMp4Tags(mp4(44100, 44100, {}), {
        cover: { data: new Uint8Array([1, 2, 3]), mime, width: 1, height: 1 },
      })!;
      const text = new TextDecoder('latin1').decode(tagged);
      const dataAt = text.indexOf('data', text.indexOf('covr'));
      return tagged[dataAt + 7];
    };
    expect(covrType('image/jpeg')).toBe(13);
    expect(covrType('image/png')).toBe(14);
  });

  it('WEB-MP4-004 returns null when moov atom is absent', () => {
    const corrupt = new Uint8Array([0, 0, 0, 8, 102, 116, 121, 112]); // just ftyp
    const res = addMp4Tags(corrupt, { title: 'None' });
    expect(res).toBeNull();
  });
});
