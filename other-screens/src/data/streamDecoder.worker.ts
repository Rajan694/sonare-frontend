/// <reference lib="webworker" />
/**
 * Decodes files for streamPlayback.ts, off the main thread.
 *
 * WebKitGTK's AudioDecoder hands every packet back through its thread's event loop. On the
 * page that loop is busy re-rendering the UI, and decoding fell behind real time there
 * (the audio stopped for seconds at a time); a worker's loop is free.
 *
 * Messages in:  probe · open · start · need · stop · close  (see StreamDecoderRequest)
 * Messages out: probed · chunk · end · error                  (see StreamDecoderEvent)
 */

export interface StreamMedia {
  config: AudioDecoderConfig;
  codec: 'mp3' | 'opus';
  bytes: Uint8Array<ArrayBuffer>;
  offsets: Uint32Array<ArrayBuffer>;
  sizes: Uint32Array<ArrayBuffer>;
  starts: Float64Array<ArrayBuffer>;
  count: number;
  duration: number;
}

export type StreamDecoderRequest =
  | { type: 'probe'; probe: number; config: AudioDecoderConfig }
  | { type: 'open'; media: number; data: StreamMedia }
  | { type: 'start'; media: number; run: number; target: number; contextRate: number }
  | { type: 'need'; run: number; until: number }
  | { type: 'stop'; run: number }
  | { type: 'close'; media: number };

export type StreamDecoderEvent =
  | { type: 'probed'; probe: number; supported: boolean }
  /** `planes` holds one Float32Array per channel; `offset` is the media time of its first sample. */
  | { type: 'chunk'; run: number; offset: number; sampleRate: number; planes: Float32Array<ArrayBuffer>[] }
  | { type: 'end'; run: number }
  | { type: 'error'; run: number; message: string };

/** The first chunk is short, so playback starts as soon as a fraction of a second is decoded. */
const FIRST_CHUNK_S = 0.25;
const CHUNK_S = 2;
/**
 * Packets decoded before a seek target and thrown away: an MP3 frame can borrow bytes from
 * the ones before it (bit reservoir), and Opus needs ~80 ms to converge.
 */
const PREROLL = { mp3: 2, opus: 4 };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const medias = new Map<number, StreamMedia>();
const runs = new Map<number, Run>();

function post(event: StreamDecoderEvent, transfer: Transferable[] = []) {
  scope.postMessage(event, transfer);
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

function packetAt(media: StreamMedia, seconds: number): number {
  let lo = 0;
  let hi = media.count - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (media.starts[mid] <= seconds) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * The decoded samples, one Float32Array per channel. Always copies whole planes:
 * WebKitGTK's AudioData.copyTo crashes the page when given a frameOffset together with a
 * format conversion.
 */
function planesOf(data: AudioData): Float32Array<ArrayBuffer>[] {
  const frames = data.numberOfFrames;
  const channels = data.numberOfChannels;
  if (data.format === 'f32-planar') {
    return Array.from({ length: channels }, (_, c) => {
      const plane = new Float32Array(frames);
      data.copyTo(plane, { planeIndex: c, format: 'f32-planar' });
      return plane;
    });
  }
  const interleaved = new Float32Array(frames * channels);
  data.copyTo(interleaved, { planeIndex: 0, format: 'f32' });
  return Array.from({ length: channels }, (_, c) => {
    const plane = new Float32Array(frames);
    for (let i = 0; i < frames; i++) plane[i] = interleaved[i * channels + c];
    return plane;
  });
}

/** Decodes from `target` onwards, as far as the page has asked for. */
class Run {
  private readonly decoder: AudioDecoder;
  private nextPacket: number;
  private fedUntil: number;
  private until: number;
  /** Media time of the next sample the decoder outputs. */
  private outTime: number;
  private chunk: Float32Array<ArrayBuffer>[] = [];
  private chunkFill = 0;
  private chunkStart = 0;
  private chunkFrames = 0;
  private fullChunkFrames = 0;
  private outRate = 0;
  private drained = false;
  private stopped = false;

  constructor(
    private readonly id: number,
    private readonly media: StreamMedia,
    private readonly target: number,
    private readonly contextRate: number,
  ) {
    const first = Math.max(0, packetAt(media, target) - PREROLL[media.codec]);
    this.nextPacket = first;
    this.fedUntil = media.starts[first];
    this.outTime = media.starts[first];
    this.until = target;
    this.decoder = new AudioDecoder({
      output: (data) => this.take(data),
      error: (e) => {
        if (this.stopped) return;
        this.stop();
        post({ type: 'error', run: this.id, message: e.message });
      },
    });
    this.decoder.configure(media.config);
    this.decoder.addEventListener('dequeue', () => this.pump());
  }

  need(until: number) {
    this.until = Math.max(this.until, until);
    this.pump();
  }

  private pump() {
    if (this.stopped || this.drained) return;
    const { media } = this;
    while (this.nextPacket < media.count && this.fedUntil < this.until && this.decoder.decodeQueueSize < 64) {
      const i = this.nextPacket++;
      const start = media.offsets[i];
      this.decoder.decode(
        new EncodedAudioChunk({
          type: 'key',
          timestamp: Math.round(media.starts[i] * 1e6),
          data: media.bytes.subarray(start, start + media.sizes[i]),
        }),
      );
      this.fedUntil = i + 1 < media.count ? media.starts[i + 1] : media.duration;
    }
    if (this.nextPacket >= media.count) {
      this.drained = true;
      this.decoder.flush().then(
        () => {
          if (this.stopped) return;
          if (this.chunkFill > 0) this.send();
          post({ type: 'end', run: this.id });
        },
        () => {
          // Closed by stop(), or the error callback already reported it.
        },
      );
    }
  }

  private take(data: AudioData) {
    if (this.stopped) return data.close();
    const frames = data.numberOfFrames;
    const rate = data.sampleRate;
    if (!this.fullChunkFrames) {
      // Chunk lengths that land on whole context samples, so chunks butt together exactly
      // even when the context resamples (48 kHz audio, 44.1 kHz context: multiples of 160).
      const step = rate / gcd(rate, this.contextRate);
      this.chunkFrames = Math.max(step, Math.round((FIRST_CHUNK_S * rate) / step) * step);
      this.fullChunkFrames = Math.max(step, Math.round((CHUNK_S * rate) / step) * step);
      this.outRate = rate;
    }
    const planes = planesOf(data);
    // Samples before the target are preroll (or the part of a packet before a seek point).
    let skip = Math.max(0, Math.min(frames, Math.round((this.target - this.outTime) * rate)));
    while (skip < frames) {
      if (this.chunkFill === 0) {
        this.chunkStart = this.outTime + skip / rate;
        this.chunk = planes.map(() => new Float32Array(this.chunkFrames));
      }
      const n = Math.min(frames - skip, this.chunkFrames - this.chunkFill);
      planes.forEach((plane, c) => this.chunk[c].set(plane.subarray(skip, skip + n), this.chunkFill));
      this.chunkFill += n;
      skip += n;
      if (this.chunkFill === this.chunkFrames) this.send();
    }
    this.outTime += frames / rate;
    data.close();
  }

  private send() {
    const planes = this.chunk.map((p) => (this.chunkFill === p.length ? p : p.slice(0, this.chunkFill)));
    post(
      { type: 'chunk', run: this.id, offset: this.chunkStart, sampleRate: this.outRate, planes },
      planes.map((p) => p.buffer),
    );
    this.chunk = [];
    this.chunkFill = 0;
    this.chunkFrames = this.fullChunkFrames;
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    runs.delete(this.id);
    try {
      this.decoder.close();
    } catch {
      // Already closed after an error.
    }
  }
}

scope.onmessage = async (e: MessageEvent<StreamDecoderRequest>) => {
  const m = e.data;
  switch (m.type) {
    case 'probe': {
      let supported = false;
      try {
        supported = !!(await AudioDecoder.isConfigSupported(m.config)).supported;
      } catch {
        // Unknown codec string.
      }
      post({ type: 'probed', probe: m.probe, supported });
      break;
    }
    case 'open':
      medias.set(m.media, m.data);
      break;
    case 'start': {
      const media = medias.get(m.media);
      if (!media) return post({ type: 'error', run: m.run, message: 'Media was closed' });
      try {
        runs.set(m.run, new Run(m.run, media, m.target, m.contextRate));
      } catch (err) {
        post({ type: 'error', run: m.run, message: err instanceof Error ? err.message : 'Decoder failed' });
      }
      break;
    }
    case 'need':
      runs.get(m.run)?.need(m.until);
      break;
    case 'stop':
      runs.get(m.run)?.stop();
      break;
    case 'close':
      medias.delete(m.media);
      break;
  }
};
