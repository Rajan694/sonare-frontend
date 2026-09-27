/**
 * Splits a whole audio file into the packets a WebCodecs AudioDecoder takes, with the
 * start time of each, so streamPlayback.ts can decode any stretch of it on demand.
 *
 * Handles what the local library and downloads actually hold: MP3, and Opus in Ogg
 * (.opus) or WebM (downloads). Anything else - or a file these parsers don't understand -
 * returns null and plays through the <audio> element instead.
 *
 * Packet times come from the codec, not the container: every MP3 frame holds a fixed
 * number of samples, and every Opus packet says its own length in its first byte.
 */

export interface DemuxedAudio {
  codec: 'mp3' | 'opus';
  sampleRate: number;
  channels: number;
  /** Opus: the OpusHead header, which the decoder needs as its description. */
  description?: Uint8Array;
  /** Packets are `bytes.subarray(offsets[i], offsets[i] + sizes[i])`. */
  bytes: Uint8Array;
  offsets: Uint32Array;
  sizes: Uint32Array;
  /** Start of each packet, in seconds. */
  starts: Float64Array;
  count: number;
  /** Seconds. */
  duration: number;
}

export function demuxAudio(data: ArrayBuffer, ext: string): DemuxedAudio | null {
  const bytes = new Uint8Array(data);
  try {
    if (ext === 'mp3') return demuxMp3(bytes);
    if (ext === 'opus' || ext === 'ogg') return demuxOgg(bytes);
    if (ext === 'webm' || ext === 'mka') return demuxWebm(bytes);
  } catch {
    // Truncated or unusual file: let the element have a go.
  }
  return null;
}

/** Index of the packet playing at `seconds`. */
export function packetAt(media: DemuxedAudio, seconds: number): number {
  let lo = 0;
  let hi = media.count - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (media.starts[mid] <= seconds) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Growable packet table. */
class Packets {
  offsets = new Uint32Array(4096);
  sizes = new Uint32Array(4096);
  starts = new Float64Array(4096);
  count = 0;
  time = 0;

  push(offset: number, size: number, seconds: number) {
    if (this.count === this.offsets.length) {
      const grow = <T extends Uint32Array | Float64Array>(a: T): T => {
        const b = new (a.constructor as { new (n: number): T })(a.length * 2);
        b.set(a);
        return b;
      };
      this.offsets = grow(this.offsets);
      this.sizes = grow(this.sizes);
      this.starts = grow(this.starts);
    }
    this.offsets[this.count] = offset;
    this.sizes[this.count] = size;
    this.starts[this.count] = this.time;
    this.count++;
    this.time += seconds;
  }

  result(base: Omit<DemuxedAudio, 'offsets' | 'sizes' | 'starts' | 'count' | 'duration'>): DemuxedAudio | null {
    if (this.count === 0) return null;
    return {
      ...base,
      offsets: this.offsets.subarray(0, this.count),
      sizes: this.sizes.subarray(0, this.count),
      starts: this.starts.subarray(0, this.count),
      count: this.count,
      duration: this.time,
    };
  }
}

// ---------- MP3 ----------

const MP3_BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MP3_BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const MP3_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  0: [11025, 12000, 8000], // MPEG 2.5
};

interface Mp3Frame {
  length: number;
  samples: number;
  sampleRate: number;
  channels: number;
}

/** A Layer III frame header at `i`, or null. Free-format bitrates are not supported. */
function mp3Frame(b: Uint8Array, i: number): Mp3Frame | null {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const version = (b[i + 1] >> 3) & 3;
  const layer = (b[i + 1] >> 1) & 3;
  const bitrateIndex = b[i + 2] >> 4;
  const rateIndex = (b[i + 2] >> 2) & 3;
  if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const v1 = version === 3;
  const bitrate = (v1 ? MP3_BITRATES_V1 : MP3_BITRATES_V2)[bitrateIndex] * 1000;
  const sampleRate = MP3_RATES[version][rateIndex];
  const padding = (b[i + 2] >> 1) & 1;
  const length = Math.floor(((v1 ? 144 : 72) * bitrate) / sampleRate) + padding;
  return { length, samples: v1 ? 1152 : 576, sampleRate, channels: b[i + 3] >> 6 === 3 ? 1 : 2 };
}

function demuxMp3(b: Uint8Array): DemuxedAudio | null {
  let i = 0;
  // ID3v2 tags, possibly several.
  while (i + 10 <= b.length && b[i] === 0x49 && b[i + 1] === 0x44 && b[i + 2] === 0x33) {
    const size = ((b[i + 6] & 0x7f) << 21) | ((b[i + 7] & 0x7f) << 14) | ((b[i + 8] & 0x7f) << 7) | (b[i + 9] & 0x7f);
    i += 10 + size + (b[i + 5] & 0x10 ? 10 : 0);
  }
  const packets = new Packets();
  let first: Mp3Frame | null = null;
  while (i + 4 <= b.length) {
    const f = mp3Frame(b, i);
    // Resync on junk; when syncing, also demand a valid frame right after, so a stray
    // 0xFFE in the data isn't taken for a header.
    const trusted =
      f &&
      (packets.count > 0 || i + f.length >= b.length || mp3Frame(b, i + f.length)) &&
      (!first || f.sampleRate === first.sampleRate);
    if (!f || !trusted) {
      if (b[i] === 0x54 && b[i + 1] === 0x41 && b[i + 2] === 0x47) break; // ID3v1 at the end
      i++;
      continue;
    }
    if (i + f.length > b.length) break;
    first ??= f;
    packets.push(i, f.length, f.samples / f.sampleRate);
    i += f.length;
  }
  if (!first) return null;
  return packets.result({ codec: 'mp3', sampleRate: first.sampleRate, channels: first.channels, bytes: b });
}

// ---------- Opus ----------

/** Length of an Opus packet in seconds, from its TOC byte (RFC 6716 §3.1). */
function opusPacketSeconds(p: Uint8Array): number {
  if (p.length === 0) return 0;
  const config = p[0] >> 3;
  const frameMs =
    config < 12 ? [10, 20, 40, 60][config & 3] : config < 16 ? [10, 20][config & 1] : [2.5, 5, 10, 20][config & 3];
  const code = p[0] & 3;
  const frames = code === 0 ? 1 : code === 3 ? (p.length > 1 ? p[1] & 0x3f : 0) : 2;
  return (frames * frameMs) / 1000;
}

function opusHeadInfo(head: Uint8Array): { channels: number } | null {
  const magic = String.fromCharCode(...head.subarray(0, 8));
  if (magic !== 'OpusHead' || head.length < 19) return null;
  return { channels: head[9] };
}

function demuxOgg(b: Uint8Array): DemuxedAudio | null {
  // Packets can continue across pages, so they're copied out into one contiguous buffer.
  const out = new Uint8Array(b.length);
  let outLen = 0;
  const packets = new Packets();
  let head: Uint8Array | null = null;
  let serial = -1;
  let headersSeen = 0;
  let pending: number[] = []; // [offset, size] pieces of a packet that continues on the next page

  let i = 0;
  while (i + 27 <= b.length) {
    if (b[i] !== 0x4f || b[i + 1] !== 0x67 || b[i + 2] !== 0x67 || b[i + 3] !== 0x53) return null; // "OggS"
    const pageSerial = b[i + 14] | (b[i + 15] << 8) | (b[i + 16] << 16) | (b[i + 17] << 24);
    const segments = b[i + 26];
    let body = i + 27 + segments;
    if (body > b.length) break;
    if (serial === -1) serial = pageSerial;
    const mine = pageSerial === serial;
    for (let s = 0; s < segments; s++) {
      const len = b[i + 27 + s];
      if (mine) pending.push(body, len);
      body += len;
      if (len < 255 && mine) {
        let size = 0;
        for (let k = 1; k < pending.length; k += 2) size += pending[k];
        const packet = new Uint8Array(size);
        let at = 0;
        for (let k = 0; k < pending.length; k += 2) {
          packet.set(b.subarray(pending[k], pending[k] + pending[k + 1]), at);
          at += pending[k + 1];
        }
        pending = [];
        if (headersSeen === 0) {
          if (!opusHeadInfo(packet)) return null;
          head = packet;
          headersSeen++;
        } else if (headersSeen === 1) {
          headersSeen++; // OpusTags
        } else if (size > 0) {
          out.set(packet, outLen);
          packets.push(outLen, size, opusPacketSeconds(packet));
          outLen += size;
        }
      }
    }
    i = body;
  }
  if (!head) return null;
  return packets.result({
    codec: 'opus',
    sampleRate: 48000,
    channels: opusHeadInfo(head)!.channels,
    description: head,
    bytes: out.subarray(0, outLen),
  });
}

// ---------- WebM (Matroska) ----------

const EBML_SEGMENT = 0x18538067;
const EBML_CLUSTER = 0x1f43b675;
const EBML_TRACKS = 0x1654ae6b;
const EBML_TRACK_ENTRY = 0xae;
const EBML_TRACK_NUMBER = 0xd7;
const EBML_CODEC_ID = 0x86;
const EBML_CODEC_PRIVATE = 0x63a2;
const EBML_SIMPLE_BLOCK = 0xa3;
const EBML_BLOCK_GROUP = 0xa0;
const EBML_BLOCK = 0xa1;

/** Reads an EBML variable-length integer; `id` keeps the length marker bits. */
function vint(b: Uint8Array, i: number, id: boolean): { value: number; length: number; unknown: boolean } {
  const first = b[i];
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
  if (length > 8) throw new Error('Bad EBML');
  let value = id ? first : first & (0xff >> length);
  let allOnes = value === 0xff >> length;
  for (let k = 1; k < length; k++) {
    value = value * 256 + b[i + k];
    if (b[i + k] !== 0xff) allOnes = false;
  }
  return { value, length, unknown: !id && allOnes };
}

function demuxWebm(b: Uint8Array): DemuxedAudio | null {
  const packets = new Packets();
  let head: Uint8Array | null = null;
  let opusTrack = -1;

  // Walks one level of elements in [start, end), descending only into the containers
  // that lead to tracks and blocks.
  const walk = (start: number, end: number) => {
    let i = start;
    while (i < end) {
      const id = vint(b, i, true);
      const size = vint(b, i + id.length, false);
      const data = i + id.length + size.length;
      const stop = size.unknown ? end : Math.min(end, data + size.value);
      switch (id.value) {
        case EBML_SEGMENT:
        case EBML_CLUSTER:
        case EBML_TRACKS:
        case EBML_BLOCK_GROUP:
          walk(data, stop);
          break;
        case EBML_TRACK_ENTRY:
          readTrack(data, stop);
          break;
        case EBML_SIMPLE_BLOCK:
        case EBML_BLOCK:
          readBlock(data, stop);
          break;
      }
      i = stop;
    }
  };

  const readTrack = (start: number, end: number) => {
    let number = -1;
    let codec = '';
    let priv: Uint8Array | null = null;
    let i = start;
    while (i < end) {
      const id = vint(b, i, true);
      const size = vint(b, i + id.length, false);
      const data = i + id.length + size.length;
      if (id.value === EBML_TRACK_NUMBER) number = readUint(data, size.value);
      else if (id.value === EBML_CODEC_ID) codec = String.fromCharCode(...b.subarray(data, data + size.value));
      else if (id.value === EBML_CODEC_PRIVATE) priv = b.slice(data, data + size.value);
      i = data + size.value;
    }
    if (codec === 'A_OPUS' && priv && opusHeadInfo(priv) && opusTrack === -1) {
      opusTrack = number;
      head = priv;
    }
  };

  const readUint = (at: number, n: number) => {
    let v = 0;
    for (let k = 0; k < n; k++) v = v * 256 + b[at + k];
    return v;
  };

  const readBlock = (start: number, end: number) => {
    const track = vint(b, start, false);
    if (track.value !== opusTrack) return;
    const flags = b[start + track.length + 2];
    // Laced blocks (several frames in one) aren't worth supporting: YouTube doesn't use them.
    if (flags & 0x06) throw new Error('Laced WebM blocks');
    const at = start + track.length + 3;
    const packet = b.subarray(at, end);
    packets.push(at, end - at, opusPacketSeconds(packet));
  };

  walk(0, b.length);
  if (!head) return null;
  return packets.result({
    codec: 'opus',
    sampleRate: 48000,
    channels: opusHeadInfo(head)!.channels,
    description: head,
    bytes: b,
  });
}
