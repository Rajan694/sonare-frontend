/**
 * Plays a fully decoded track from memory, through the same DSP graph as the <audio>
 * element.
 *
 * Why it exists: WebKitGTK (the Linux window) plays <audio> through GStreamer, which reads
 * the source in ~64 KB chunks and at chunk boundaries sometimes delivers late, so the
 * audio sink drops 25-65 ms. That is the cutting/lag heard on local files - every ~4 s at
 * 128 kbps, every ~1.6 s at 320 kbps, with or without the EQ, from a blob or a URL. A
 * decoded AudioBuffer has no source to read, and measured gap-free.
 *
 * An AudioBufferSourceNode plays once and can't be paused or moved, so every play or seek
 * starts a new one at the remembered offset.
 */
export class BufferPlayback {
  private readonly gain: GainNode;
  private source: AudioBufferSourceNode | null = null;
  /** Position in the track, in seconds, as of `startedAt` (context time) when playing. */
  private offset = 0;
  private startedAt = 0;
  private rate = 1;
  private finished = false;
  /** Set by play(), cleared by pause(): what a start still resuming the context should do. */
  private wantPlaying = false;
  private starting: Promise<void> | null = null;
  private disposed = false;

  constructor(
    private readonly ctx: AudioContext,
    input: AudioNode,
    private readonly buffer: AudioBuffer,
    private readonly onEnded: () => void,
  ) {
    this.gain = ctx.createGain();
    this.gain.connect(input);
  }

  get duration(): number {
    return this.buffer.duration;
  }

  get paused(): boolean {
    return !this.source;
  }

  get ended(): boolean {
    return this.finished;
  }

  get currentTime(): number {
    if (!this.source) return this.offset;
    return Math.min(this.duration, this.offset + (this.ctx.currentTime - this.startedAt) * this.rate);
  }

  play(): Promise<void> {
    this.wantPlaying = true;
    if (this.source) return Promise.resolve();
    // Resuming the context is async: a second play() waits for the first instead of
    // starting a second source.
    this.starting ??= this.start().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  private async start(): Promise<void> {
    if (this.finished || this.offset >= this.duration) this.offset = 0;
    this.finished = false;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    // Paused or seeked away while the context resumed.
    if (!this.wantPlaying || this.source || this.disposed) return;
    // Still suspended: autoplay policy. Starting now would sit silent at a frozen position.
    if (this.ctx.state !== 'running')
      throw new DOMException('Audio is blocked until you press play', 'NotAllowedError');

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = this.rate;
    source.connect(this.gain);
    // Also fires on stop(): only the node still playing, reaching the end, counts.
    source.onended = () => {
      if (this.source !== source) return;
      this.offset = this.duration;
      this.source = null;
      this.finished = true;
      this.wantPlaying = false;
      this.onEnded();
    };
    this.startedAt = this.ctx.currentTime;
    source.start(0, this.offset);
    this.source = source;
  }

  pause(): void {
    this.wantPlaying = false;
    if (!this.source) return;
    this.offset = this.currentTime;
    this.stopSource();
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
    if (this.source) {
      this.offset = this.currentTime;
      this.startedAt = this.ctx.currentTime;
      this.source.playbackRate.value = rate;
    }
    this.rate = rate;
  }

  dispose(): void {
    this.disposed = true;
    this.wantPlaying = false;
    this.stopSource();
    this.gain.disconnect();
  }

  private stopSource(): void {
    const source = this.source;
    this.source = null;
    if (!source) return;
    source.onended = null;
    try {
      source.stop();
    } catch {
      // Never started, or already stopped.
    }
    source.disconnect();
  }
}
