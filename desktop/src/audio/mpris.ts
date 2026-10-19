import { events, os } from '@neutralinojs/lib';
import type { Track } from '../types';
import { isNeutralino } from '../neutralino';
import { resolveArtworkUrl, trackArtwork } from '../components/music/Artwork';
import type { MediaSessionActions } from './mediaSession';
import helperSource from './mpris.py?raw';

/**
 * MPRIS on Linux: what GNOME and the other desktops send media keys, headset buttons and their
 * own player controls to. WebKitGTK offers it only for a playing <audio>, and Linux plays
 * through Web Audio (player.ts), so a Python helper (mpris.py; Python 3 with GObject, as the
 * desktops ship it) owns the D-Bus name. Commands come back on its stdout, what's playing goes
 * in on its stdin, and it exits with the app. Does nothing elsewhere, or where it can't run.
 *
 * A page reload leaves the process running (Neutralino owns it), so the page stops it as it
 * goes, and pings it: the helper also quits after 30 s without a word.
 */

interface ProcessEvent {
  id: number;
  action: 'stdOut' | 'stdErr' | 'exit';
  data: unknown;
}

/** The helper's position runs on by itself while playing: correct it this often, or on a jump. */
const POSITION_RESYNC_MS = 5000;
const POSITION_JUMP_MS = 1000;
const PING_MS = 10_000;

let actions: MediaSessionActions | null = null;
let started = false;
let helper: number | null = null;
/** Events that came before spawnProcess answered with the id. */
let early: ProcessEvent[] | null = null;
let partialLine = '';
let state = '';
let playing = false;
let position = { ms: 0, durationMs: 0, sentAt: Number.NEGATIVE_INFINITY };
let ping: ReturnType<typeof setInterval> | null = null;

const available = (): boolean => isNeutralino() && window.NL_MODE === 'window' && window.NL_OS === 'Linux';

const write = (line: string): void => {
  if (helper === null) return;
  void os.updateSpawnedProcess(helper, 'stdIn', `${line}\n`).catch(() => {});
};

const writePosition = (): void => {
  write(JSON.stringify({ type: 'position', positionMs: Math.round(position.ms), durationMs: position.durationMs }));
};

const run = (line: string): void => {
  let message: { cmd?: string; positionMs?: number };
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  switch (message.cmd) {
    case 'play':
      actions?.play();
      break;
    case 'pause':
      actions?.pause();
      break;
    case 'next':
      actions?.next();
      break;
    case 'previous':
      actions?.previous();
      break;
    case 'seek':
      if (typeof message.positionMs === 'number') actions?.seekTo(message.positionMs);
      break;
  }
};

const take = (e: ProcessEvent): void => {
  if (e.id !== helper) return;
  if (e.action === 'stdOut') {
    const lines = (partialLine + String(e.data)).split('\n');
    partialLine = lines.pop() ?? '';
    lines.forEach(run);
  } else if (e.action === 'exit') {
    // No Python or no GObject for it, or no session bus: stay without media keys.
    helper = null;
    if (ping !== null) clearInterval(ping);
    ping = null;
    window.removeEventListener('pagehide', stop);
    void events.off('spawnedProcess', onEvent).catch(() => {});
  }
};

const stop = (): void => {
  if (helper !== null) void os.updateSpawnedProcess(helper, 'exit').catch(() => {});
};

const onEvent = (ev: CustomEvent<ProcessEvent>): void => {
  if (early) early.push(ev.detail);
  else take(ev.detail);
};

/** The helper's source goes in as an argument, base64 so the shell leaves it alone. */
const command = (): string => {
  const bytes = new TextEncoder().encode(helperSource);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return `python3 -c "import base64,sys;exec(base64.b64decode(sys.argv[1]))" ${btoa(binary)}`;
};

const start = async (): Promise<void> => {
  started = true;
  early = [];
  try {
    await events.on('spawnedProcess', onEvent);
    helper = (await os.spawnProcess(command())).id;
  } catch {
    helper = null;
  }
  if (helper !== null) {
    ping = setInterval(() => write('{"type":"ping"}'), PING_MS);
    window.addEventListener('pagehide', stop);
  }
  const before = early;
  early = null;
  before.forEach(take);
  // What was playing before it started.
  if (state) write(state);
  if (state && position.sentAt > Number.NEGATIVE_INFINITY) writePosition();
};

/** Hands the desktop's controls to the player, starting the helper once; returns the cleanup. */
export const bindMpris = (next: MediaSessionActions): (() => void) => {
  actions = next;
  if (!started && available()) void start();
  return () => {
    if (actions === next) actions = null;
  };
};

/** What's playing, for the desktop's player controls. */
export const showInMpris = (track: Track | null, isPlaying: boolean): void => {
  playing = isPlaying && !!track;
  const art = track ? resolveArtworkUrl(trackArtwork(track, 640), 640) : undefined;
  const line = JSON.stringify({
    type: 'state',
    status: track ? (isPlaying ? 'Playing' : 'Paused') : 'Stopped',
    track: track && {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album ?? '',
      artUrl: art && /^https?:\/\//.test(art) ? art : '',
      lengthMs: track.durationMs ?? 0,
    },
  });
  if (line === state) return;
  state = line;
  write(line);
};

/**
 * The position, for the desktop's seek bar. Sent only when it jumped (a seek, the next track)
 * or now and then against drift: the helper keeps time by itself while playing.
 */
export const showPositionInMpris = (positionMs: number, durationMs: number): void => {
  const now = Date.now();
  const expected = position.ms + (playing ? now - position.sentAt : 0);
  const durationChanged = Math.abs(durationMs - position.durationMs) >= POSITION_JUMP_MS;
  if (
    now - position.sentAt < POSITION_RESYNC_MS &&
    Math.abs(positionMs - expected) < POSITION_JUMP_MS &&
    !durationChanged
  ) {
    return;
  }
  position = { ms: positionMs, durationMs: Math.round(durationMs || 0), sentAt: now };
  writePosition();
};
