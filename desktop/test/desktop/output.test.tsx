import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { commands, resetFs } from '../helpers/fakeNeutralino';
import { renderWithProviders } from '../helpers/render';
import { chooseOption } from '../helpers/dialogs';

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);

const h = vi.hoisted(() => ({ playback: new Set<(s: { playing: boolean; trackId: string | null }) => void>() }));
vi.mock('../../src/audio/player', () => ({
  onPlaybackChange: (fn: (s: { playing: boolean; trackId: string | null }) => void) => {
    h.playback.add(fn);
    return () => h.playback.delete(fn);
  },
}));

/**
 * The Linux window plays through WebKitGTK, which has no setSinkId: Sonare moves its own
 * PulseAudio / PipeWire stream with pactl (src/audio/output.ts).
 */

const SINKS = [
  {
    index: 1,
    name: 'alsa_output.pci-0000_00_1f.3.analog-stereo',
    description: 'Built-in Audio Analog Stereo',
    properties: { 'device.form_factor': 'internal' },
  },
  {
    index: 2,
    name: 'bluez_output.AA_BB.1',
    description: 'WH-1000XM4',
    properties: { 'device.bus': 'bluetooth', 'device.form_factor': 'headset' },
  },
  {
    index: 3,
    name: 'alsa_output.pci-0000_01_00.1.hdmi-stereo',
    description: 'HDMI / DisplayPort',
    properties: { 'device.profile.name': 'hdmi-stereo' },
  },
  {
    index: 4,
    name: 'alsa_output.usb-headphones',
    description: 'USB Headphones',
    properties: { 'device.form_factor': 'headphone' },
  },
];

/** Our stream (pid 4243, a child of the app), and another app's. */
const INPUTS = [
  { index: 31, properties: { 'application.process.id': '4243', 'application.name': 'WebKitWebProcess' } },
  { index: 32, properties: { 'application.process.id': '999', 'application.name': 'Firefox' } },
];

function pactlWorks() {
  commands.answer = (cmd) => {
    if (cmd === 'pactl -f json list sinks') return { stdOut: JSON.stringify(SINKS) };
    if (cmd === 'pactl -f json list sink-inputs') return { stdOut: JSON.stringify(INPUTS) };
    if (cmd === 'pactl get-default-sink') return { stdOut: 'alsa_output.pci-0000_00_1f.3.analog-stereo\n' };
    if (cmd.startsWith('ps -o pid= --ppid 4242')) return { stdOut: '  4243\n  4250\n' };
    if (cmd.startsWith('pactl move-sink-input')) return {};
    return { exitCode: 1 };
  };
}

async function fresh() {
  vi.resetModules();
  const output = await import('../../src/audio/output');
  const prefs = await import('../../src/storage/devicePrefs');
  const picker = await import('../../src/components/music/OutputPicker');
  return { ...output, prefs, picker };
}

const moves = () => commands.ran.filter((c) => c.startsWith('pactl move-sink-input'));

beforeEach(() => {
  resetFs();
  h.playback.clear();
  (window as { NL_PID?: string }).NL_PID = '4242';
});

describe('audio output (Linux window)', () => {
  it('DSK-044 lists the PulseAudio / PipeWire outputs with their kind', async () => {
    pactlWorks();
    const o = await fresh();
    expect(o.outputSupport()).toBe('pulse');
    expect(await o.listOutputs()).toEqual([
      { id: '', name: 'System default', kind: 'default', detail: 'Follows your system' },
      { id: SINKS[0].name, name: 'Built-in Audio Analog Stereo', kind: 'speaker', detail: 'Speaker' },
      { id: SINKS[1].name, name: 'WH-1000XM4', kind: 'bluetooth', detail: 'Bluetooth' },
      { id: SINKS[2].name, name: 'HDMI / DisplayPort', kind: 'hdmi', detail: 'HDMI / DisplayPort' },
      { id: SINKS[3].name, name: 'USB Headphones', kind: 'headphones', detail: 'Headphones' },
    ]);
  });

  it("DSK-045 choosing one moves only Sonare's own stream, and is remembered", async () => {
    pactlWorks();
    const o = await fresh();
    await o.selectOutput(SINKS[1].name);
    expect(moves()).toEqual(["pactl move-sink-input 31 'bluez_output.AA_BB.1'"]);
    expect(o.prefs.getDevicePrefs().audioOutputId).toBe(SINKS[1].name);
  });

  it('DSK-046 back to the system default sends the stream to the default sink', async () => {
    pactlWorks();
    const o = await fresh();
    await o.selectOutput('');
    expect(moves()).toEqual(["pactl move-sink-input 31 'alsa_output.pci-0000_00_1f.3.analog-stereo'"]);
  });

  it('DSK-047 the chosen output is applied again on start-up and whenever another track starts', async () => {
    pactlWorks();
    localStorage.setItem('sonare_device_prefs', JSON.stringify({ audioOutputId: SINKS[3].name }));
    const o = await fresh();
    o.watchOutput();
    await vi.waitFor(() => expect(moves()).toHaveLength(1));

    const tell = (s: { playing: boolean; trackId: string | null }) => h.playback.forEach((fn) => fn(s));
    tell({ playing: true, trackId: 'yt:a' });
    await vi.waitFor(() => expect(moves()).toHaveLength(2));
    // The same track pausing and resuming doesn't move it again.
    tell({ playing: false, trackId: 'yt:a' });
    tell({ playing: true, trackId: 'yt:a' });
    tell({ playing: true, trackId: 'yt:b' });
    await vi.waitFor(() => expect(moves()).toHaveLength(3));
    expect(moves().every((m) => m.endsWith(`'${SINKS[3].name}'`))).toBe(true);
  });

  it('DSK-048 with the default output nothing is moved when tracks change', async () => {
    pactlWorks();
    const o = await fresh();
    o.watchOutput();
    h.playback.forEach((fn) => fn({ playing: true, trackId: 'yt:a' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(moves()).toEqual([]);
  });

  it('DSK-049 without pactl only the system default is offered', async () => {
    const o = await fresh();
    expect(await o.listOutputs()).toEqual([
      { id: '', name: 'System default', kind: 'default', detail: 'Follows your system' },
    ]);
    expect(await o.selectOutput('anything')).toBe(false);
  });

  it('DSK-050 the output button switches the speaker from the list', async () => {
    pactlWorks();
    const o = await fresh();
    const { user } = renderWithProviders(<o.picker.OutputButton />);
    await chooseOption(user, 'Audio output: System default', /WH-1000XM4/);
    expect(await screen.findByRole('button', { name: 'Audio output: WH-1000XM4' })).toBeInTheDocument();
    expect(moves()).toEqual(["pactl move-sink-input 31 'bluez_output.AA_BB.1'"]);
  });
});
