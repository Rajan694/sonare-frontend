import { demuxWebm, opusPacketSamples } from '../audio/audioDemux';
import type { Cover } from './coverArt';

/**
 * WebM Opus (what YouTube serves) repacked as Ogg Opus (RFC 7845), with the title, artist, album
 * and cover in its comment header, so other players and the system's media index show them. The
 * audio packets are copied as they are; nothing is re-encoded.
 */

export interface OggTags {
  title?: string;
  artist?: string;
  album?: string;
  cover?: Cover;
}

const CONTINUED = 0x01;
const BOS = 0x02;
const EOS = 0x04;
/** Audio pages close at about this many bytes, like opusenc's. */
const PAGE_TARGET_BYTES = 4096;

// Ogg's CRC32: polynomial 0x04C11DB7, initial value 0, not reflected, no final xor.
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let r = i << 24;
  for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
  CRC_TABLE[i] = r >>> 0;
}

export const oggCrc32 = (bytes: Uint8Array): number => {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ bytes[i]) & 0xff]) >>> 0;
  return crc;
};

const utf8 = (s: string) => new TextEncoder().encode(s);

const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

const u32 = (value: number, littleEndian: boolean): Uint8Array => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, value, littleEndian);
  return b;
};

const base64 = (bytes: Uint8Array): string => {
  let binary = '';
  // In slices: String.fromCharCode takes its arguments on the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

/** A FLAC picture block (big-endian), as METADATA_BLOCK_PICTURE carries it: the front cover. */
export const flacPictureBlock = (cover: Cover): Uint8Array => {
  const mime = utf8(cover.mime);
  return concat([
    u32(3, false), // front cover
    u32(mime.length, false),
    mime,
    u32(0, false), // no description
    u32(cover.width, false),
    u32(cover.height, false),
    u32(24, false), // colour depth
    u32(0, false), // not an indexed image
    u32(cover.data.length, false),
    cover.data,
  ]);
};

/** The OpusTags packet: vendor, then `KEY=value` comments, each with its length (little-endian). */
export const opusTagsPacket = (tags: OggTags): Uint8Array => {
  const comments = [
    tags.title && `TITLE=${tags.title}`,
    tags.artist && `ARTIST=${tags.artist}`,
    tags.album && `ALBUM=${tags.album}`,
    tags.cover && `METADATA_BLOCK_PICTURE=${base64(flacPictureBlock(tags.cover))}`,
  ]
    .filter((c): c is string => !!c)
    .map(utf8);
  const vendor = utf8('Sonare');
  return concat([
    utf8('OpusTags'),
    u32(vendor.length, true),
    vendor,
    u32(comments.length, true),
    ...comments.flatMap((c) => [u32(c.length, true), c]),
  ]);
};

/** A packet's lacing values: 255 for each whole 255 bytes, then the rest (0 when it divides evenly). */
const lacingOf = (length: number): number[] => [...new Array<number>(Math.floor(length / 255)).fill(255), length % 255];

interface PageSpec {
  serial: number;
  sequence: number;
  granule: bigint;
  flags: number;
  lacing: number[];
  body: Uint8Array;
}

/** One Ogg page: the 27-byte header, the lacing table and the body, with the CRC over all of it. */
export const oggPage = ({ serial, sequence, granule, flags, lacing, body }: PageSpec): Uint8Array => {
  if (lacing.length > 255) throw new Error('An Ogg page holds at most 255 lacing values');
  const page = new Uint8Array(27 + lacing.length + body.length);
  const view = new DataView(page.buffer);
  page.set(utf8('OggS'), 0);
  page[4] = 0; // version
  page[5] = flags;
  view.setBigInt64(6, granule, true);
  view.setUint32(14, serial, true);
  view.setUint32(18, sequence, true);
  page[26] = lacing.length;
  page.set(lacing, 27);
  page.set(body, 27 + lacing.length);
  view.setUint32(22, oggCrc32(page), true);
  return page;
};

/**
 * A header packet over as many pages as it needs (the comment header with a cover is usually
 * larger than one page holds). Header pages all have granule 0, as RFC 7845 asks.
 */
export const headerPages = (packet: Uint8Array, serial: number, firstSequence: number, flags = 0): Uint8Array[] => {
  const lacing = lacingOf(packet.length);
  const pages: Uint8Array[] = [];
  let at = 0;
  for (let first = 0; first < lacing.length; first += 255) {
    const values = lacing.slice(first, first + 255);
    const size = values.reduce((n, v) => n + v, 0);
    pages.push(
      oggPage({
        serial,
        sequence: firstSequence + pages.length,
        granule: 0n,
        flags: first === 0 ? flags : CONTINUED,
        lacing: values,
        body: packet.subarray(at, at + size),
      }),
    );
    at += size;
  }
  return pages;
};

/** WebM Opus to Ogg Opus with tags; null when the file isn't Opus in WebM (the caller keeps it as is). */
export const webmToOggOpus = (webm: Uint8Array, tags: OggTags): Uint8Array | null => {
  let media;
  try {
    media = demuxWebm(webm).media;
  } catch {
    return null;
  }
  if (!media?.description || media.count === 0) return null;

  const serial = crypto.getRandomValues(new Uint32Array(1))[0];
  const pages: Uint8Array[] = [
    oggPage({
      serial,
      sequence: 0,
      granule: 0n,
      flags: BOS,
      lacing: lacingOf(media.description.length),
      body: media.description,
    }),
  ];
  pages.push(...headerPages(opusTagsPacket(tags), serial, pages.length));

  // Audio: whole packets per page. A page's granule is the 48 kHz sample count (pre-skip
  // included) at the end of its last packet.
  let lacing: number[] = [];
  let body: Uint8Array[] = [];
  let bytes = 0;
  let granule = 0n;
  const flush = (flags: number) => {
    pages.push(oggPage({ serial, sequence: pages.length, granule, flags, lacing, body: concat(body) }));
    lacing = [];
    body = [];
    bytes = 0;
  };
  for (let i = 0; i < media.count; i++) {
    const packet = media.bytes.subarray(media.offsets[i], media.offsets[i] + media.sizes[i]);
    const packetLacing = lacingOf(packet.length);
    if (lacing.length && (lacing.length + packetLacing.length > 255 || bytes + packet.length > PAGE_TARGET_BYTES)) {
      flush(0);
    }
    lacing.push(...packetLacing);
    body.push(packet);
    bytes += packet.length;
    granule += BigInt(opusPacketSamples(packet));
  }
  flush(EOS);
  return concat(pages);
};
