import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { os } from '@neutralinojs/lib';
import { CAPS } from '../lib/caps';
import { getDevicePrefs, updateDevicePrefs, useDevicePrefs } from '../storage/devicePrefs';
import { canSetSinkId, setSinkId } from './dsp';
import { onPlaybackChange } from './player';

/**
 * Choosing the speaker (design D06 "Audio output", left of the volume slider).
 *
 * - Linux window: WebKitGTK has no setSinkId, so the app moves its own PulseAudio /
 *   PipeWire stream with `pactl` (pipewire-pulse speaks the same protocol).
 * - Browsers and Windows' WebView2: AudioContext / HTMLMediaElement.setSinkId.
 * - Anything else: the system default, and no picker.
 *
 * The choice is per device (devicePrefs.audioOutputId); '' is the system default.
 */

export type OutputKind = 'speaker' | 'headphones' | 'bluetooth' | 'hdmi' | 'default';

export interface OutputDevice {
  id: string;
  name: string;
  kind: OutputKind;
  /** Second line, e.g. "Bluetooth" or "System default". */
  detail: string;
}

export type OutputSupport = 'pulse' | 'sinkId' | 'none';

const DEFAULT_DEVICE: OutputDevice = { id: '', name: 'System default', kind: 'default', detail: 'Follows your system' };

export function outputSupport(): OutputSupport {
  if (CAPS.localLibrary && window.NL_OS === 'Linux') return 'pulse';
  if (canSetSinkId() && typeof navigator.mediaDevices?.enumerateDevices === 'function') return 'sinkId';
  return 'none';
}

// ---- PulseAudio / PipeWire (Linux window) ----

interface PactlSink {
  index: number;
  name: string;
  description?: string;
  properties?: Record<string, string>;
}

interface PactlSinkInput {
  index: number;
  properties?: Record<string, string>;
}

async function pactlJson<T>(args: string): Promise<T | null> {
  try {
    const r = await os.execCommand(`pactl -f json ${args}`);
    if (r.exitCode !== 0) return null;
    return JSON.parse(r.stdOut) as T;
  } catch {
    return null;
  }
}

function sinkKind(p: Record<string, string> = {}): OutputKind {
  const bus = p['device.bus'] ?? '';
  const form = p['device.form_factor'] ?? '';
  const name = `${p['device.description'] ?? ''} ${p['device.product.name'] ?? ''}`.toLowerCase();
  if (bus === 'bluetooth') return 'bluetooth';
  if (form === 'headphone' || form === 'headset' || /headphone|headset/.test(name)) return 'headphones';
  if (/hdmi|displayport/.test(name) || p['device.profile.name']?.includes('hdmi')) return 'hdmi';
  return 'speaker';
}

const KIND_DETAIL: Record<OutputKind, string> = {
  speaker: 'Speaker',
  headphones: 'Headphones',
  bluetooth: 'Bluetooth',
  hdmi: 'HDMI / DisplayPort',
  default: 'Follows your system',
};

async function listPulse(): Promise<OutputDevice[] | null> {
  const sinks = await pactlJson<PactlSink[]>('list sinks');
  if (!sinks) return null;
  return sinks.map((s) => {
    const kind = sinkKind(s.properties);
    return { id: s.name, name: s.description || s.name, kind, detail: KIND_DETAIL[kind] };
  });
}

/** This app's own processes: the Neutralino binary and the WebKit processes it started. */
async function ownPids(): Promise<Set<string>> {
  const pids = new Set<string>([String(window.NL_PID)]);
  try {
    const r = await os.execCommand(`ps -o pid= --ppid ${Number(window.NL_PID)}`);
    for (const pid of r.stdOut.split(/\s+/)) if (pid) pids.add(pid);
  } catch {
    // Only the main process is matched.
  }
  return pids;
}

async function movePulse(sink: string): Promise<boolean> {
  const inputs = await pactlJson<PactlSinkInput[]>('list sink-inputs');
  if (!inputs) return false;
  // '' (system default): send it to whatever the default sink is now.
  let target = sink;
  if (!target) {
    try {
      target = (await os.execCommand('pactl get-default-sink')).stdOut.trim();
    } catch {
      return false;
    }
  }
  const pids = await ownPids();
  const mine = inputs.filter((i) => pids.has(i.properties?.['application.process.id'] ?? ''));
  for (const i of mine) {
    await os.execCommand(`pactl move-sink-input ${i.index} '${target.replace(/'/g, '')}'`).catch(() => null);
  }
  // No stream yet (nothing has played): applied again when playback starts.
  return true;
}

// ---- Browsers / WebView2 ----

async function listSinkId(): Promise<OutputDevice[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'default');
  return outputs.map((d, i) => {
    const name = d.label || `Output ${i + 1}`;
    const kind: OutputKind = /bluetooth/i.test(name)
      ? 'bluetooth'
      : /headphone|headset/i.test(name)
        ? 'headphones'
        : /hdmi|displayport/i.test(name)
          ? 'hdmi'
          : 'speaker';
    return { id: d.deviceId, name, kind, detail: KIND_DETAIL[kind] };
  });
}

// ---- Shared ----

export async function listOutputs(): Promise<OutputDevice[]> {
  const support = outputSupport();
  try {
    const found = support === 'pulse' ? await listPulse() : support === 'sinkId' ? await listSinkId() : [];
    return [DEFAULT_DEVICE, ...(found ?? [])];
  } catch {
    return [DEFAULT_DEVICE];
  }
}

async function apply(id: string): Promise<boolean> {
  const support = outputSupport();
  if (support === 'pulse') return movePulse(id);
  if (support === 'sinkId') return setSinkId(id);
  return false;
}

export async function selectOutput(id: string): Promise<boolean> {
  updateDevicePrefs({ audioOutputId: id });
  return apply(id);
}

// A new track can start a new audio stream (and the context's stream only appears on the
// first play), so a chosen device is applied again whenever a different track starts.
let lastAppliedTrack: string | null = null;
let watching = false;

export function watchOutput(): void {
  if (watching || outputSupport() === 'none') return;
  watching = true;
  if (getDevicePrefs().audioOutputId) void apply(getDevicePrefs().audioOutputId);
  onPlaybackChange((s) => {
    if (!s.playing || !s.trackId || s.trackId === lastAppliedTrack) return;
    lastAppliedTrack = s.trackId;
    const id = getDevicePrefs().audioOutputId;
    if (id) void apply(id);
  });
}

// ---- React ----

let cache: OutputDevice[] = [DEFAULT_DEVICE];
const listeners = new Set<() => void>();
function setCache(next: OutputDevice[]) {
  cache = next;
  for (const l of listeners) l();
}

/** Devices, the current choice and a picker action; `support === 'none'` hides the UI. */
export function useOutputs() {
  const support = outputSupport();
  const { audioOutputId } = useDevicePrefs();
  const devices = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => cache,
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (support === 'none') return;
    setLoading(true);
    setCache(await listOutputs());
    setLoading(false);
  }, [support]);

  useEffect(() => {
    void refresh();
    if (support !== 'sinkId') return;
    navigator.mediaDevices.addEventListener?.('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', refresh);
  }, [refresh, support]);

  // A device that went away (headphones unplugged) reads as the default again.
  const current = devices.find((d) => d.id === audioOutputId) ?? DEFAULT_DEVICE;
  return { support, devices, current, loading, refresh, select: selectOutput };
}
