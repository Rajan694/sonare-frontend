import type { DemuxedAudio } from './audioDemux';
import type { StreamDecoderEvent, StreamDecoderRequest, StreamMedia } from './streamDecoder.worker';

/**
 * Gap-free playback for files too long to decode whole (bufferPlayback.ts caps that at
 * 15 min / 60 MB - a two-hour recording would be ~2.5 GB of samples).
 *
 * The file is split into packets up front (audioDemux.ts), and a WebCodecs AudioDecoder in
 * a worker (streamDecoder.worker.ts) decodes a few seconds ahead of the playhead. Each
 * couple of seconds of output becomes an AudioBuffer, scheduled to start exactly where the
 * previous one ends, so the audio is continuous while only ~12 s of it sits in memory.
 * Like BufferPlayback it feeds the DSP graph and never touches the <audio> element, whose
 * reads drop audio on WebKitGTK.
 *
 * Play, seek and speed changes start a fresh run of the decoder at the new position;
 * pause stops it.
 */

/** Decoded and scheduled ahead of the playhead; covers main-thread stalls and throttled timers. */
const AHEAD_S = 12;
const START_LEAD_S = 0.05;

let worker: Worker | null = null;
let nextId = 0;
const handlers = new Map<number, (e: StreamDecoderEvent) => void>();

function decoderWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./streamDecoder.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<StreamDecoderEvent>) => {
    const key = e.data.type === 'probed' ? e.data.probe : e.data.run;
    handlers.get(key)?.(e.data);
  };
  return worker;
}

function send(request: StreamDecoderRequest, transfer: Transferable[] = []) {
  decoderWorker().postMessage(request, transfer);
}

function decoderConfig(media: DemuxedAudio): AudioDecoderConfig {
  return {
    codec: media.codec,
    sampleRate: media.sampleRate,
    numberOfChannels: media.channels,
    ...(media.description ? { description: media.description } : {}),
  };
}

/** Whether the worker can decode this file (WebCodecs, and this codec, in this WebKit). */
export function canStream(media: DemuxedAudio): Promise<boolean> {
  if (typeof Worker === 'undefined' || typeof AudioDecoder === 'undefined') return Promise.resolve(false);
  const probe = ++nextId;
  return new Promise((resolve) => {
    handlers.set(probe, (e) => {
      handlers.delete(probe);
      resolve(e.type === 'probed' && e.supported);
    });
    try {
      send({ type: 'probe', probe, config: decoderConfig(media) });
    } catch {
      handlers.delete(probe);
      resolve(false);
    }
  });
}

/** One continuous run of decoding and scheduling, from a start position. */
class Run {
  private readonly id = ++nextId;
  /** Context time the next chunk starts at; null until the first one is scheduled. */
  private nextWhen: number | null = null;
  private readonly segments: { when: number; offset: number; duration: number; source: AudioBufferSourceNode }[] = [];
  private playing = 0;
  private drained = false;
  private stopped = false;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
    media: number,
    private readonly target: number,
    private readonly rate: number,
    private readonly onEnd: () => void,
    private readonly onError: (message: string) => void,
  ) {
    handlers.set(this.id, (e) => this.handle(e));
    send({ type: 'start', media, run: this.id, target, contextRate: ctx.sampleRate });
    this.timer = setInterval(() => this.need(), 1000);
    this.need();
  }

  position(): number {
    const now = this.ctx.currentTime;
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const s = this.segments[i];
      if (s.when <= now) return s.offset + Math.min(s.duration, (now - s.when) * this.rate);
    }
    return this.segments[0]?.offset ?? this.target;
  }

  /** Ask the worker for audio up to AHEAD_S past the playhead. */
  private need() {
    if (!this.stopped && !this.drained) send({ type: 'need', run: this.id, until: this.position() + AHEAD_S });
  }

  private handle(e: StreamDecoderEvent) {
    if (this.stopped) return;
    if (e.type === 'chunk') this.schedule(e.planes, e.sampleRate, e.offset);
    else if (e.type === 'end') {
      this.drained = true;
      if (this.playing === 0) this.finish();
    } else if (e.type === 'error') {
      this.stop();
      this.onError(e.message);
    }
  }

  private schedule(planes: Float32Array<ArrayBuffer>[], sampleRate: number, offset: number) {
    const frames = planes[0].length;
    const buffer = this.ctx.createBuffer(planes.length, frames, sampleRate);
    planes.forEach((samples, c) => buffer.copyToChannel(samples, c));

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this.rate;
    source.connect(this.out);

    const now = this.ctx.currentTime;
    // First chunk, or decoding fell behind: start just ahead of now, on a sample boundary.
    if (this.nextWhen === null || this.nextWhen < now + 0.005) {
      this.nextWhen = Math.ceil((now + START_LEAD_S) * this.ctx.sampleRate) / this.ctx.sampleRate;
    }
    const when = this.nextWhen;
    const duration = frames / sampleRate;
    this.segments.push({ when, offset, duration, source });
    this.nextWhen = when + duration / this.rate;
    this.playing++;
    source.onended = () => {
      this.playing--;
      // Keep the one that just ended while nothing newer has started: position() needs it.
      while (this.segments.length > 1 && this.segments[1].when <= this.ctx.currentTime) this.segments.shift();
      if (this.drained && this.playing === 0) this.finish();
      else this.need();
    };
    source.start(when);
  }

  private finish() {
    if (this.stopped) return;
    this.stop();
    this.onEnd();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    clearInterval(this.timer);
    handlers.delete(this.id);
    send({ type: 'stop', run: this.id });
    for (const { source } of this.segments) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Not started yet.
      }
      source.disconnect();
    }
    this.segments.length = 0;
  }
}

/** Same surface as BufferPlayback, so player.ts can drive either. */
export class StreamPlayback {
  private readonly gain: GainNode;
  /** The file's id in the worker, which holds its packets. */
  private readonly mediaId = ++nextId;
  private readonly length: number;
  private run: Run | null = null;
  private offset = 0;
  private rate = 1;
  private finished = false;
  private wantPlaying = false;
  private starting: Promise<void> | null = null;
  private disposed = false;

  /** Hands `media`'s buffers to the worker: they're unusable here afterwards. */
  constructor(
    private readonly ctx: AudioContext,
    input: AudioNode,
    media: DemuxedAudio,
    private readonly onEnded: () => void,
    private readonly onError: (message: string) => void,
  ) {
    this.gain = ctx.createGain();
    this.gain.connect(input);
    this.length = media.duration;
    const data: StreamMedia = {
      config: decoderConfig(media),
      codec: media.codec,
      bytes: media.bytes as Uint8Array<ArrayBuffer>,
      offsets: media.offsets as Uint32Array<ArrayBuffer>,
      sizes: media.sizes as Uint32Array<ArrayBuffer>,
      starts: media.starts as Float64Array<ArrayBuffer>,
      count: media.count,
      duration: media.duration,
    };
    const buffers = new Set<ArrayBuffer>([
      data.bytes.buffer,
      data.offsets.buffer,
      data.sizes.buffer,
      data.starts.buffer,
    ]);
    send({ type: 'open', media: this.mediaId, data }, [...buffers]);
  }

  get duration(): number {
    return this.length;
  }

  get paused(): boolean {
    return !this.run;
  }

  get ended(): boolean {
    return this.finished;
  }

  get currentTime(): number {
    return this.run ? Math.min(this.duration, this.run.position()) : this.offset;
  }

  play(): Promise<void> {
    this.wantPlaying = true;
    if (this.run) return Promise.resolve();
    this.starting ??= this.start().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  private async start(): Promise<void> {
    if (this.finished || this.offset >= this.duration) this.offset = 0;
    this.finished = false;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (!this.wantPlaying || this.run || this.disposed) return;
    if (this.ctx.state !== 'running')
      throw new DOMException('Audio is blocked until you press play', 'NotAllowedError');
    const run: Run = new Run(
      this.ctx,
      this.gain,
      this.mediaId,
      this.offset,
      this.rate,
      () => {
        if (this.run !== run) return;
        this.run = null;
        this.offset = this.duration;
        this.finished = true;
        this.wantPlaying = false;
        this.onEnded();
      },
      (message) => {
        if (this.run !== run) return;
        this.offset = run.position();
        this.run = null;
        this.wantPlaying = false;
        this.onError(message);
      },
    );
    this.run = run;
  }

  pause(): void {
    this.wantPlaying = false;
    if (!this.run) return;
    this.offset = this.currentTime;
    this.run.stop();
    this.run = null;
  }

  seek(seconds: number): void {
    const playing = this.wantPlaying;
    this.pause();
    this.offset = Math.max(0, Math.min(seconds, this.duration));
    this.finished = false;
    if (playing) void this.play();
  }

  setVolume(v: number): void {
    this.gain.gain.value = v;
  }

  /** Playback speed. Unlike the element's, this also shifts pitch. */
  setRate(rate: number): void {
    if (rate === this.rate) return;
    const position = this.currentTime;
    this.rate = rate;
    if (this.run) this.seek(position);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.wantPlaying = false;
    this.run?.stop();
    this.run = null;
    this.gain.disconnect();
    send({ type: 'close', media: this.mediaId });
  }
}
