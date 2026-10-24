import { describe, expect, it } from 'vitest';
import { webmOpus } from '../helpers/audioFixtures';
import { flacPictureBlock, headerPages, oggCrc32, opusTagsPacket, webmToOggOpus } from '../../src/storage/oggOpus';
import { demuxAudio } from '../../src/audio/audioDemux';
import { readTags } from '../../src/storage/tags';

interface Page {
  flags: number;
  granule: bigint;
  serial: number;
  sequence: number;
  lacing: number[];
  crcOk: boolean;
  bytes: Uint8Array;
}

/** Splits an Ogg stream into its pages, checking each page's CRC. */
const pagesOf = (b: Uint8Array): Page[] => {
  const pages: Page[] = [];
  let at = 0;
  while (at < b.length) {
    const view = new DataView(b.buffer, b.byteOffset + at);
    expect(new TextDecoder().decode(b.subarray(at, at + 4))).toBe('OggS');
    const count = b[at + 26];
    const lacing = Array.from(b.subarray(at + 27, at + 27 + count));
    const size = 27 + count + lacing.reduce((n, v) => n + v, 0);
    const bytes = b.slice(at, at + size);
    const stored = new DataView(bytes.buffer).getUint32(22, true);
    bytes.fill(0, 22, 26);
    pages.push({
      flags: b[at + 5],
      granule: view.getBigInt64(6, true),
      serial: view.getUint32(14, true),
      sequence: view.getUint32(18, true),
      lacing,
      crcOk: oggCrc32(bytes) === stored,
      bytes: b.subarray(at, at + size),
    });
    at += size;
  }
  return pages;
};

const cover = (size: number) => ({
  data: Uint8Array.from({ length: size }, (_, i) => (i * 7) & 0xff),
  mime: 'image/jpeg' as const,
  width: 640,
  height: 480,
});

describe('oggOpus: WebM Opus repacked as tagged Ogg Opus', () => {
  it("WEB-OGG-001 Ogg's CRC32 gives the reference check value", () => {
    // Poly 0x04C11DB7, init 0, not reflected, no final xor: check value for "123456789".
    expect(oggCrc32(new TextEncoder().encode('123456789'))).toBe(0x89a1897f);
  });

  it('WEB-OGG-002 the FLAC picture block is a big-endian front cover with type, size and data', () => {
    const c = cover(6);
    const block = flacPictureBlock(c);
    const view = new DataView(block.buffer);
    expect(view.getUint32(0)).toBe(3);
    expect(view.getUint32(4)).toBe(10);
    expect(new TextDecoder().decode(block.subarray(8, 18))).toBe('image/jpeg');
    expect(view.getUint32(18)).toBe(0); // description
    expect([view.getUint32(22), view.getUint32(26), view.getUint32(30), view.getUint32(34)]).toEqual([640, 480, 24, 0]);
    expect(view.getUint32(38)).toBe(6);
    expect(Array.from(block.subarray(42))).toEqual(Array.from(c.data));
  });

  it('WEB-OGG-003 OpusTags holds the vendor and only the comments that are present', () => {
    const packet = opusTagsPacket({ title: 'Tést – 日本', album: 'Album' });
    const view = new DataView(packet.buffer);
    expect(new TextDecoder().decode(packet.subarray(0, 8))).toBe('OpusTags');
    expect(view.getUint32(8, true)).toBe(6);
    expect(new TextDecoder().decode(packet.subarray(12, 18))).toBe('Sonare');
    expect(view.getUint32(18, true)).toBe(2);
    const text = new TextDecoder().decode(packet);
    expect(text).toContain('TITLE=Tést – 日本');
    expect(text).toContain('ALBUM=Album');
    expect(text).not.toContain('ARTIST=');
  });

  it('WEB-OGG-004 a header packet spans pages with correct lacing, including lengths that divide by 255', () => {
    const lacingOf = (size: number) => headerPages(new Uint8Array(size), 7, 1).map((p) => pagesOf(p)[0]);
    // 510 bytes: two full segments and a 0 that ends the packet.
    expect(lacingOf(510).map((p) => p.lacing)).toEqual([[255, 255, 0]]);
    // Exactly one page of 255 full segments: the ending 0 goes on a continued second page.
    const exact = lacingOf(255 * 255);
    expect(exact.map((p) => p.lacing.length)).toEqual([255, 1]);
    expect(exact[1].lacing).toEqual([0]);
    expect(exact.map((p) => p.flags)).toEqual([0, 0x01]);
    const big = lacingOf(70_000);
    expect(big).toHaveLength(2);
    expect(big[1].lacing.at(-1)).toBe(70_000 % 255);
    for (const p of [...exact, ...big]) {
      expect(p.crcOk).toBe(true);
      expect(p.granule).toBe(0n);
    }
    expect(big.map((p) => p.sequence)).toEqual([1, 2]);
  });

  it('WEB-OGG-005 the audio packets come out unchanged, on valid pages with growing granules', () => {
    const webm = webmOpus(400);
    const ogg = webmToOggOpus(webm, { title: 'Song', cover: cover(100_000) })!;
    expect(ogg).not.toBeNull();

    const pages = pagesOf(ogg);
    expect(pages.every((p) => p.crcOk)).toBe(true);
    expect(new Set(pages.map((p) => p.serial)).size).toBe(1);
    expect(pages.map((p) => p.sequence)).toEqual(pages.map((_, i) => i));
    expect(pages[0].flags).toBe(0x02);
    expect(pages.at(-1)!.flags).toBe(0x04);
    // OpusHead page + a comment header over several pages, all at granule 0.
    expect(pages.slice(0, 3).every((p) => p.granule === 0n)).toBe(true);
    const audio = pages.filter((p) => p.granule > 0n);
    for (let i = 1; i < audio.length; i++) expect(audio[i].granule).toBeGreaterThan(audio[i - 1].granule);
    // 400 packets of 20 ms at 48 kHz.
    expect(audio.at(-1)!.granule).toBe(400n * 960n);

    const before = demuxAudio(webm.slice().buffer, 'webm')!;
    const after = demuxAudio(ogg.slice().buffer, 'opus')!;
    expect(after.count).toBe(before.count);
    expect(after.duration).toBeCloseTo(before.duration, 6);
    for (let i = 0; i < before.count; i++) {
      const a = before.bytes.subarray(before.offsets[i], before.offsets[i] + before.sizes[i]);
      const b = after.bytes.subarray(after.offsets[i], after.offsets[i] + after.sizes[i]);
      expect(Array.from(b)).toEqual(Array.from(a));
    }
    expect(Array.from(after.description!)).toEqual(Array.from(before.description!));
  });

  it('WEB-OGG-006 the tags survive a comment header that spans pages', async () => {
    const ogg = webmToOggOpus(webmOpus(20), {
      title: 'Long Cover',
      artist: 'Artist',
      album: 'Album',
      cover: cover(150_000),
    })!;
    const tags = await readTags('song.opus', ogg.length, async (pos, size) => ogg.subarray(pos, pos + size));
    expect(tags).toMatchObject({ title: 'Long Cover', artist: 'Artist', album: 'Album' });
  });

  it('WEB-OGG-007 anything that is not Opus in WebM gives null, so the file is kept as downloaded', () => {
    expect(webmToOggOpus(new Uint8Array([0, 1, 2, 3, 4, 5]), { title: 'x' })).toBeNull();
    expect(webmToOggOpus(new Uint8Array(0), { title: 'x' })).toBeNull();
  });
});
