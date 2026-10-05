import type { RangeReader } from '../../src/storage/tags';

/** Byte builders for real audio container layouts (ID3v2 + MPEG, FLAC, Ogg Opus, MP4). */
export const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
export const utf8 = (s: string) => new TextEncoder().encode(s);
export const cat = (...parts: (Uint8Array | number[])[]) => {
  const arrs = parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let at = 0;
  for (const a of arrs) {
    out.set(a, at);
    at += a.length;
  }
  return out;
};
export const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
export const le32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
export const synchsafe = (n: number) => [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127];

/** A reader over an in-memory file that also records how much it was asked for. */
export const reader = (file: Uint8Array) => {
  let bytesRead = 0;
  const read: RangeReader = async (pos, size) => {
    const out = file.slice(Math.max(0, pos), Math.max(0, pos) + size);
    bytesRead += out.length;
    return out;
  };
  return { read, bytesRead: () => bytesRead };
};

/** ID3v2.3 text frame: encoding 0 (latin1), 1 (UTF-16 + BOM) or 3 (UTF-8). */
export const id3Frame = (id: string, text: string, enc: 0 | 1 | 3 = 3) => {
  let body: Uint8Array;
  if (enc === 1) {
    const u16 = new Uint8Array(text.length * 2);
    for (let i = 0; i < text.length; i++) {
      u16[i * 2] = text.charCodeAt(i) & 255;
      u16[i * 2 + 1] = text.charCodeAt(i) >> 8;
    }
    body = cat([1, 0xff, 0xfe], u16);
  } else body = cat([enc], enc === 0 ? latin1(text) : utf8(text));
  return cat(latin1(id), be32(body.length), [0, 0], body);
};

export const id3Tag = (...frames: Uint8Array[]) => {
  const body = cat(...frames);
  return cat(latin1('ID3'), [3, 0, 0], synchsafe(body.length), body);
};

/** MPEG-1 Layer III frame header: 128 kbps, 44.1 kHz, stereo; optional Xing frame count. */
export const mp3Frame = (xingFrames?: number) => {
  const header = [0xff, 0xfb, 0x90, 0x44];
  const side = new Array(32).fill(0);
  const xing = xingFrames === undefined ? [] : [...latin1('Xing'), ...be32(1), ...be32(xingFrames)];
  return cat(header, side, xing, new Array(64).fill(0));
};

export const vorbisComments = (entries: string[]) => {
  const vendor = utf8('libsonare');
  const list = entries.flatMap((e) => [...le32(utf8(e).length), ...utf8(e)]);
  return cat(le32(vendor.length), vendor, le32(entries.length), list);
};

export const flac = (sampleRate: number, totalSamples: number, comments: string[]) => {
  const si = new Uint8Array(34);
  si[10] = (sampleRate >> 12) & 255;
  si[11] = (sampleRate >> 4) & 255;
  si[12] = ((sampleRate & 15) << 4) | 0x02;
  si[13] = 0x70 | Math.floor(totalSamples / 2 ** 32);
  si.set(be32(totalSamples >>> 0), 14);
  const vc = vorbisComments(comments);
  return cat(
    latin1('fLaC'),
    [0x00, 0, 0, 34],
    si,
    [0x84, (vc.length >> 16) & 255, (vc.length >> 8) & 255, vc.length & 255],
    vc,
  );
};

export const oggOpus = (granule: number, comments: string[]) => {
  const g = [...le32(granule % 2 ** 32), ...le32(Math.floor(granule / 2 ** 32))];
  return cat(
    latin1('OggS'),
    new Array(22).fill(0),
    latin1('OpusTags'),
    vorbisComments(comments),
    latin1('OggS'),
    [0, 4],
    g,
    new Array(12).fill(0),
  );
};

export const atom = (type: string, ...body: Uint8Array[]) => {
  const b = cat(...body);
  return cat(be32(b.length + 8), latin1(type), b);
};
export const mp4 = (timescale: number, duration: number, meta: Record<string, string>) => {
  const mvhd = atom(
    'mvhd',
    Uint8Array.from([0, 0, 0, 0, ...be32(0), ...be32(0), ...be32(timescale), ...be32(duration)]),
  );
  const items = Object.entries(meta).map(([k, v]) =>
    atom(k, atom('data', Uint8Array.from([0, 0, 0, 1, 0, 0, 0, 0]), utf8(v))),
  );
  const udta = atom('udta', atom('meta', Uint8Array.from([0, 0, 0, 0]), atom('ilst', ...items)));
  // moov after mdat, as many encoders write it.
  return cat(
    atom('ftyp', latin1('M4A '), Uint8Array.from(be32(0))),
    atom('mdat', new Uint8Array(32)),
    atom('moov', mvhd, udta),
  );
};

/** Whole MPEG-1 Layer III frames: 128 kbps, 44.1 kHz, 417 bytes and 1152 samples each. */
export const MP3_FRAME_LEN = Math.floor((144 * 128_000) / 44_100);

export const mp3Frames = (n: number, { mono = false } = {}) => {
  const frames: Uint8Array[] = [];
  for (let i = 0; i < n; i++) {
    const f = new Uint8Array(MP3_FRAME_LEN);
    f.set([0xff, 0xfb, 0x90, mono ? 0xc4 : 0x44]);
    f[4] = i; // payload marker, to check offsets
    frames.push(f);
  }
  return cat(...frames);
};
