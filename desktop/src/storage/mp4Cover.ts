import type { Cover } from './coverArt';

/**
 * Title, artist, album and cover written into an AAC (.m4a) download, the way iTunes does
 * (`moov/udta/meta/ilst`), so other players and the system's media index show them.
 */

export interface Mp4Tags {
  title?: string;
  artist?: string;
  album?: string;
  cover?: Cover;
}

const u32 = (b: Uint8Array, offset: number): number => {
  return ((b[offset] << 24) | (b[offset + 1] << 16) | (b[offset + 2] << 8) | b[offset + 3]) >>> 0;
};

const writeU32 = (b: Uint8Array, offset: number, value: number) => {
  b[offset] = (value >>> 24) & 255;
  b[offset + 1] = (value >>> 16) & 255;
  b[offset + 2] = (value >>> 8) & 255;
  b[offset + 3] = value & 255;
};

const writeU64 = (b: Uint8Array, offset: number, value: bigint) => {
  const high = Number((value >> 32n) & 0xffffffffn);
  const low = Number(value & 0xffffffffn);
  writeU32(b, offset, high);
  writeU32(b, offset + 4, low);
};

const readU64 = (b: Uint8Array, offset: number): bigint => {
  const high = BigInt(u32(b, offset));
  const low = BigInt(u32(b, offset + 4));
  return (high << 32n) | low;
};

const ascii = (b: Uint8Array, offset: number, len: number): string => {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += String.fromCharCode(b[offset + i]);
  }
  return s;
};

const latin1ToBytes = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i) & 255;
  }
  return out;
};

const makeAtom = (type: string, ...payloads: Uint8Array[]): Uint8Array => {
  const totalPayload = payloads.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(8 + totalPayload);
  writeU32(out, 0, out.length);
  out.set(latin1ToBytes(type), 4);
  let at = 8;
  for (const p of payloads) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

/**
 * Creates an iTunes-style metadata text item atom:
 * [atom: type]
 *   [atom: data]
 *     type_set: 0x00000001 (UTF-8 text)
 *     locale: 0x00000000
 *     text bytes
 */
const makeTextItemAtom = (type: string, text: string): Uint8Array => {
  const textBytes = new TextEncoder().encode(text);
  const dataHeader = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0]);
  const dataAtom = makeAtom('data', dataHeader, textBytes);
  return makeAtom(type, dataAtom);
};

/** `covr` with one `data` atom: type 13 is JPEG, 14 PNG. */
const makeCoverItemAtom = (cover: Cover): Uint8Array => {
  const dataHeader = new Uint8Array([0, 0, 0, cover.mime === 'image/png' ? 14 : 13, 0, 0, 0, 0]);
  return makeAtom('covr', makeAtom('data', dataHeader, cover.data));
};

/**
 * Builds the `meta` atom containing `ilst` with the given tags:
 * meta (FullAtom: 4 bytes version + flags = 0)
 *   hdlr (Component type = 'mdir', Subtype = 'appl')
 *   ilst
 *     ©nam, ©ART, ©alb, covr
 */
const buildMetaAtom = (tags: Mp4Tags): Uint8Array => {
  const items: Uint8Array[] = [];
  if (tags.title) items.push(makeTextItemAtom('\xa9nam', tags.title));
  if (tags.artist) items.push(makeTextItemAtom('\xa9ART', tags.artist));
  if (tags.album) items.push(makeTextItemAtom('\xa9alb', tags.album));
  if (tags.cover) items.push(makeCoverItemAtom(tags.cover));

  const ilstAtom = makeAtom('ilst', ...items);

  // hdlr atom inside meta
  const hdlrPayload = new Uint8Array(25);
  // version + flags = 0 (4 bytes)
  // pre-defined = 0 (4 bytes)
  // handler type = 'mdir' (4 bytes)
  hdlrPayload.set(latin1ToBytes('mdir'), 8);
  // manufacturer = 'appl' (4 bytes)
  hdlrPayload.set(latin1ToBytes('appl'), 12);
  // flags/reserved = 0 (8 bytes)
  // name = '' (1 byte null terminator)
  const hdlrAtom = makeAtom('hdlr', hdlrPayload);

  // meta is a FullAtom: 4 bytes of version (0) + flags (0) before child atoms
  const metaVersionFlags = new Uint8Array([0, 0, 0, 0]);
  return makeAtom('meta', metaVersionFlags, hdlrAtom, ilstAtom);
};

interface AtomSpan {
  type: string;
  start: number;
  headerSize: number;
  size: number;
  end: number;
}

const findAtoms = (b: Uint8Array, start: number, end: number): AtomSpan[] => {
  const atoms: AtomSpan[] = [];
  let p = start;
  while (p + 8 <= end) {
    let size = u32(b, p);
    const type = ascii(b, p + 4, 4);
    let headerSize = 8;
    if (size === 1) {
      if (p + 16 > end) break;
      const bigSize = readU64(b, p + 8);
      if (bigSize > BigInt(Number.MAX_SAFE_INTEGER)) break;
      size = Number(bigSize);
      headerSize = 16;
    } else if (size === 0) {
      size = end - p;
    }
    if (size < headerSize || p + size > end) break;
    atoms.push({ type, start: p, headerSize, size, end: p + size });
    p += size;
  }
  return atoms;
};

/**
 * Adjusts sample table chunk offset atoms (stco, co64) and track fragment run/header
 * offsets (tfhd, tfra) in the MP4 buffer by delta.
 */
const adjustOffsets = (b: Uint8Array, start: number, end: number, delta: number) => {
  if (delta === 0) return;
  const atoms = findAtoms(b, start, end);
  for (const atom of atoms) {
    const { type, start: atomStart, headerSize, end: atomEnd } = atom;
    const bodyStart = atomStart + headerSize;

    if (type === 'stco') {
      // FullBox: version(1) + flags(3) = 4 bytes, then entry_count(4 bytes), then 32-bit offsets
      if (bodyStart + 8 <= atomEnd) {
        const count = u32(b, bodyStart + 4);
        let p = bodyStart + 8;
        for (let i = 0; i < count && p + 4 <= atomEnd; i++) {
          const currentOffset = u32(b, p);
          writeU32(b, p, currentOffset + delta);
          p += 4;
        }
      }
    } else if (type === 'co64') {
      // FullBox: version(1) + flags(3) = 4 bytes, entry_count(4 bytes), then 64-bit offsets
      if (bodyStart + 8 <= atomEnd) {
        const count = u32(b, bodyStart + 4);
        let p = bodyStart + 8;
        for (let i = 0; i < count && p + 8 <= atomEnd; i++) {
          const currentOffset = readU64(b, p);
          writeU64(b, p, currentOffset + BigInt(delta));
          p += 8;
        }
      }
    } else if (type === 'tfhd') {
      // FullBox: version(1) + flags(3)
      if (bodyStart + 8 <= atomEnd) {
        const flags = ((b[bodyStart + 1] << 16) | (b[bodyStart + 2] << 8) | b[bodyStart + 3]) >>> 0;
        // flag 0x000001 = base-data-offset-present
        if (flags & 0x000001) {
          // base-data-offset is 64-bit right after track_ID (4 bytes)
          if (bodyStart + 16 <= atomEnd) {
            const currentOffset = readU64(b, bodyStart + 8);
            writeU64(b, bodyStart + 8, currentOffset + BigInt(delta));
          }
        }
      }
    } else if (type === 'tfra') {
      // FullBox: version(1) + flags(3), track_ID (4), then one word whose low 6 bits give the
      // sizes of traf/trun/sample numbers, entry_count (4), then the entries.
      if (bodyStart + 16 <= atomEnd) {
        const version = b[bodyStart];
        const lengthSize = u32(b, bodyStart + 8);
        const trafSize = ((lengthSize >> 4) & 3) + 1;
        const trunSize = ((lengthSize >> 2) & 3) + 1;
        const sampleNumSize = (lengthSize & 3) + 1;
        const count = u32(b, bodyStart + 12);
        let p = bodyStart + 16;
        const timeSize = version === 1 ? 8 : 4;
        const moofOffsetSize = version === 1 ? 8 : 4;

        for (let i = 0; i < count && p + timeSize + moofOffsetSize <= atomEnd; i++) {
          p += timeSize;
          if (moofOffsetSize === 4) {
            const currentOffset = u32(b, p);
            writeU32(b, p, currentOffset + delta);
            p += 4;
          } else {
            const currentOffset = readU64(b, p);
            writeU64(b, p, currentOffset + BigInt(delta));
            p += 8;
          }
          p += trafSize + trunSize + sampleNumSize;
        }
      }
    } else {
      // Recurse into container atoms
      const containers = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'mvex', 'moof', 'traf', 'mfra'];
      if (containers.includes(type)) {
        adjustOffsets(b, bodyStart, atomEnd, delta);
      }
    }
  }
};

/**
 * Replaces or injects `udta > meta` into `moov` atom in MP4 buffer and updates container sizes
 * and media chunk offsets (stco/co64/etc.).
 */
export const addMp4Tags = (mp4: Uint8Array, tags: Mp4Tags): Uint8Array | null => {
  try {
    const topAtoms = findAtoms(mp4, 0, mp4.length);
    const moovAtom = topAtoms.find((a) => a.type === 'moov');
    if (!moovAtom) return null;

    // Build the new meta atom
    const newMetaAtom = buildMetaAtom(tags);

    // Look for existing udta inside moov
    const moovChildAtoms = findAtoms(mp4, moovAtom.start + moovAtom.headerSize, moovAtom.end);
    const udtaAtom = moovChildAtoms.find((a) => a.type === 'udta');

    let newUdtaBytes: Uint8Array;
    let udtaStartInMoov = 0;
    let udtaOriginalSize = 0;

    if (udtaAtom) {
      udtaStartInMoov = udtaAtom.start - moovAtom.start;
      udtaOriginalSize = udtaAtom.size;
      // Look for meta atom inside udta
      const udtaChildren = findAtoms(mp4, udtaAtom.start + udtaAtom.headerSize, udtaAtom.end);
      const existingMeta = udtaChildren.find((a) => a.type === 'meta');

      if (existingMeta) {
        // Replace existing meta inside udta
        const beforeMeta = mp4.subarray(udtaAtom.start + udtaAtom.headerSize, existingMeta.start);
        const afterMeta = mp4.subarray(existingMeta.end, udtaAtom.end);
        newUdtaBytes = makeAtom('udta', beforeMeta, newMetaAtom, afterMeta);
      } else {
        // Append meta to udta children
        const udtaBody = mp4.subarray(udtaAtom.start + udtaAtom.headerSize, udtaAtom.end);
        newUdtaBytes = makeAtom('udta', udtaBody, newMetaAtom);
      }
    } else {
      // Create new udta atom containing meta
      newUdtaBytes = makeAtom('udta', newMetaAtom);
      udtaStartInMoov = moovAtom.size; // append at end of moov
      udtaOriginalSize = 0;
    }

    // Assemble new moov
    const moovHeader = mp4.subarray(moovAtom.start, moovAtom.start + moovAtom.headerSize);
    const moovBodyBeforeUdta = mp4.subarray(moovAtom.start + moovAtom.headerSize, moovAtom.start + udtaStartInMoov);
    const moovBodyAfterUdta = mp4.subarray(moovAtom.start + udtaStartInMoov + udtaOriginalSize, moovAtom.end);

    const newMoovPayloadLength = moovBodyBeforeUdta.length + newUdtaBytes.length + moovBodyAfterUdta.length;
    const newMoovSize = moovAtom.headerSize + newMoovPayloadLength;
    const newMoov = new Uint8Array(newMoovSize);

    // Write header
    if (moovAtom.headerSize === 8) {
      writeU32(newMoov, 0, newMoovSize);
      newMoov.set(moovHeader.subarray(4, 8), 4);
    } else {
      writeU32(newMoov, 0, 1);
      newMoov.set(moovHeader.subarray(4, 8), 4);
      writeU64(newMoov, 8, BigInt(newMoovSize));
    }

    // Write payload
    let at = moovAtom.headerSize;
    newMoov.set(moovBodyBeforeUdta, at);
    at += moovBodyBeforeUdta.length;
    newMoov.set(newUdtaBytes, at);
    at += newUdtaBytes.length;
    newMoov.set(moovBodyAfterUdta, at);

    // Everything after moov moves by delta: absolute offsets pointing past it (sample chunks in
    // stco/co64, a fragment's explicit base-data-offset, mfra's moof offsets) move with it.
    const delta = newMoov.length - moovAtom.size;
    const mediaAfterMoov = topAtoms.some((a) => a.start > moovAtom.start && (a.type === 'mdat' || a.type === 'moof'));
    if (mediaAfterMoov && delta !== 0) adjustOffsets(newMoov, 0, newMoov.length, delta);

    const beforeMoov = mp4.subarray(0, moovAtom.start);
    const afterMoov = mp4.slice(moovAtom.end);
    if (delta !== 0) adjustOffsets(afterMoov, 0, afterMoov.length, delta);

    const out = new Uint8Array(beforeMoov.length + newMoov.length + afterMoov.length);
    out.set(beforeMoov, 0);
    out.set(newMoov, beforeMoov.length);
    out.set(afterMoov, beforeMoov.length + newMoov.length);
    return out;
  } catch {
    return null;
  }
};
