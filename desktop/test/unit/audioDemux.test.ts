import { describe, expect, it } from 'vitest';
import { demuxAudio, packetAt } from '../../src/audio/audioDemux';
import { cat, id3Frame, id3Tag, latin1, le32, MP3_FRAME_LEN, mp3Frames } from '../helpers/audioFixtures';

const toBuf = (b: Uint8Array) => b.slice().buffer;

// ---- Ogg: pages with a segment table; packets may continue across pages ----
function oggPage(serial: number, segments: number[], body: Uint8Array) {
  const header = new Uint8Array(27);
  header.set(latin1('OggS'));
  header.set(le32(serial), 14);
  header[26] = segments.length;
  return cat(header, Uint8Array.from(segments), body);
}
function opusHead(channels = 2) {
  return cat(latin1('OpusHead'), [1, channels, 0x38, 0x01], le32(48_000), [0, 0, 0]);
}
/** An Opus packet whose TOC byte says 20 ms, one frame. */
const opus20ms = (len: number, fill = 7) => Uint8Array.from({ length: len }, (_, i) => (i === 0 ? 0x08 : fill));

// ---- WebM: EBML elements with 1- or 2-byte sizes ----
function ebml(id: number[], ...body: (Uint8Array | number[])[]) {
  const b = cat(...body);
  const size = b.length < 127 ? [0x80 | b.length] : [0x40 | (b.length >> 8), b.length & 0xff];
  return cat(id, size, b);
}
function webm(opusPackets: Uint8Array[], { laced = false, codec = 'A_OPUS' } = {}) {
  const track = ebml([0xae], ebml([0xd7], [1]), ebml([0x86], latin1(codec)), ebml([0x63, 0xa2], opusHead(1)));
  const blocks = opusPackets.map((p, i) => ebml([0xa3], [0x81, 0, i, laced ? 0x82 : 0x80], p));
  const cluster = ebml([0x1f, 0x43, 0xb6, 0x75], ...blocks);
  // Segment with an "unknown" size, as live-written files have.
  return cat(
    [0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff],
    ebml([0x16, 0x54, 0xae, 0x6b], track),
    cluster,
  );
}

describe('MP3', () => {
  it('WEB-DEMUX-001 splits frames after the ID3 tag, with exact start times and duration', () => {
    const file = cat(id3Tag(id3Frame('TIT2', 'x')), mp3Frames(5));
    const m = demuxAudio(toBuf(file), 'mp3')!;
    expect(m).toMatchObject({ codec: 'mp3', sampleRate: 44_100, channels: 2, count: 5 });
    expect([...m.sizes]).toEqual(Array(5).fill(MP3_FRAME_LEN));
    expect(m.starts[3]).toBeCloseTo((3 * 1152) / 44_100, 9);
    expect(m.duration).toBeCloseTo((5 * 1152) / 44_100, 9);
    expect([...m.offsets].map((o) => m.bytes[o + 4])).toEqual([0, 1, 2, 3, 4]);
  });

  it('WEB-DEMUX-002 skips junk before the first frame, including a false sync word, and stops at an ID3v1 tag', () => {
    const junk = Uint8Array.from([1, 2, 0xff, 0xfb, 0x90, 0x44, 9, 9]); // a header with no frame after it
    const file = cat(junk, mp3Frames(3), latin1('TAG'), new Uint8Array(125));
    const m = demuxAudio(toBuf(file), 'mp3')!;
    expect(m.count).toBe(3);
    expect(m.offsets[0]).toBe(junk.length);
  });

  it('WEB-DEMUX-003 recognises mono files', () => {
    expect(demuxAudio(toBuf(mp3Frames(2, { mono: true })), 'mp3')!.channels).toBe(1);
  });

  it('WEB-DEMUX-004 a file with no MP3 frames is left to the audio element', () => {
    expect(demuxAudio(toBuf(new Uint8Array(2000)), 'mp3')).toBeNull();
  });
});

describe('Ogg Opus', () => {
  it('WEB-DEMUX-005 reads the OpusHead and times each packet from its TOC byte', () => {
    const file = cat(
      oggPage(7, [19], opusHead(2)),
      oggPage(7, [8], latin1('OpusTags')),
      oggPage(7, [10, 12], cat(opus20ms(10), opus20ms(12))),
    );
    const m = demuxAudio(toBuf(file), 'opus')!;
    expect(m).toMatchObject({ codec: 'opus', sampleRate: 48_000, channels: 2, count: 2 });
    expect([...m.description!]).toEqual([...opusHead(2)]);
    expect([...m.starts]).toEqual([0, 0.02]);
    expect(m.duration).toBeCloseTo(0.04, 9);
  });

  it('WEB-DEMUX-006 joins a packet that continues onto the next page', () => {
    const big = opus20ms(300, 5);
    const file = cat(
      oggPage(1, [19], opusHead()),
      oggPage(1, [8], latin1('OpusTags')),
      oggPage(1, [255], big.subarray(0, 255)),
      oggPage(1, [45], big.subarray(255)),
    );
    const m = demuxAudio(toBuf(file), 'ogg')!;
    expect(m.count).toBe(1);
    expect(m.sizes[0]).toBe(300);
    expect([...m.bytes.subarray(m.offsets[0], m.offsets[0] + 300)]).toEqual([...big]);
  });

  it('WEB-DEMUX-007 ignores pages from another logical stream', () => {
    const file = cat(
      oggPage(1, [19], opusHead()),
      oggPage(1, [8], latin1('OpusTags')),
      oggPage(2, [10], opus20ms(10)),
      oggPage(1, [10], opus20ms(10)),
    );
    expect(demuxAudio(toBuf(file), 'ogg')!.count).toBe(1);
  });

  it('WEB-DEMUX-008 Ogg Vorbis and broken pages are not demuxed', () => {
    const vorbis = cat(oggPage(1, [7], latin1('\x01vorbis')));
    expect(demuxAudio(toBuf(vorbis), 'ogg')).toBeNull();
    expect(demuxAudio(toBuf(latin1('NotOggAtAll...............................')), 'ogg')).toBeNull();
  });
});

describe('WebM (Matroska)', () => {
  it('WEB-DEMUX-009 finds the Opus track and its blocks, even inside an unknown-size segment', () => {
    const file = webm([opus20ms(20), opus20ms(30), opus20ms(25)]);
    const m = demuxAudio(toBuf(file), 'webm')!;
    expect(m).toMatchObject({ codec: 'opus', sampleRate: 48_000, channels: 1, count: 3 });
    expect([...m.sizes]).toEqual([20, 30, 25]);
    expect(m.duration).toBeCloseTo(0.06, 9);
    expect(m.bytes[m.offsets[1]]).toBe(0x08);
  });

  it('WEB-DEMUX-010 laced blocks and non-Opus tracks are left to the audio element', () => {
    expect(demuxAudio(toBuf(webm([opus20ms(10)], { laced: true })), 'webm')).toBeNull();
    expect(demuxAudio(toBuf(webm([opus20ms(10)], { codec: 'A_VORBIS' })), 'mka')).toBeNull();
  });
});

describe('seeking and other formats', () => {
  it('WEB-DEMUX-011 packetAt finds the packet playing at a time', () => {
    const m = demuxAudio(toBuf(mp3Frames(10)), 'mp3')!;
    const frame = 1152 / 44_100;
    expect(packetAt(m, 0)).toBe(0);
    expect(packetAt(m, frame * 4.5)).toBe(4);
    expect(packetAt(m, frame * 5)).toBe(5);
    expect(packetAt(m, 999)).toBe(9);
  });

  it('WEB-DEMUX-012 formats it does not handle return null', () => {
    expect(demuxAudio(new ArrayBuffer(100), 'm4a')).toBeNull();
    expect(demuxAudio(new ArrayBuffer(0), 'flac')).toBeNull();
  });
});
