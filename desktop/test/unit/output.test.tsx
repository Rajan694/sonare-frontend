import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderWithProviders } from '../helpers/render';
import { chooseOption } from '../helpers/dialogs';

/**
 * Choosing the speaker in a browser / WebView2: AudioContext and HTMLMediaElement.setSinkId
 * (src/audio/output.ts, the setSinkId part of dsp.ts). The Linux window's pactl path is in
 * test/desktop/output.test.tsx.
 */

/** Just enough Web Audio for dsp.ensureGraph to build its chain. */
class FakeNode {
  connect(n: unknown) {
    return n;
  }
}
class FakeParam {
  value = 0;
  setTargetAtTime(v: number) {
    this.value = v;
  }
}
const sinks: string[] = [];
class FakeContext {
  state = 'running';
  currentTime = 0;
  destination = new FakeNode();
  createMediaElementSource = () => new FakeNode();
  createBiquadFilter = () =>
    Object.assign(new FakeNode(), { frequency: new FakeParam(), Q: new FakeParam(), gain: new FakeParam() });
  createGain = () => Object.assign(new FakeNode(), { gain: new FakeParam() });
  createChannelSplitter = () => new FakeNode();
  createChannelMerger = () => new FakeNode();
  createDynamicsCompressor = () =>
    Object.assign(new FakeNode(), {
      threshold: new FakeParam(),
      ratio: new FakeParam(),
      knee: new FakeParam(),
      attack: new FakeParam(),
      release: new FakeParam(),
    });
  resume = async () => {};
  async setSinkId(id: string) {
    sinks.push(`context:${id}`);
  }
}

const devices = [
  { kind: 'audiooutput', deviceId: 'default', label: 'Default' },
  { kind: 'audiooutput', deviceId: 'spk', label: 'Built-in Speakers' },
  { kind: 'audiooutput', deviceId: 'bt', label: 'WH-1000XM4 (Bluetooth)' },
  { kind: 'audiooutput', deviceId: 'hp', label: 'Headphones' },
  { kind: 'audiooutput', deviceId: 'nolabel', label: '' },
  { kind: 'audioinput', deviceId: 'mic', label: 'Microphone' },
];

function supportSinkId() {
  vi.stubGlobal('AudioContext', FakeContext);
  Object.defineProperty(HTMLMediaElement.prototype, 'setSinkId', {
    configurable: true,
    value: async function (this: HTMLMediaElement, id: string) {
      sinks.push(`element:${id}`);
    },
  });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      enumerateDevices: vi.fn(async () => devices),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

async function fresh() {
  vi.resetModules();
  const output = await import('../../src/audio/output');
  const dsp = await import('../../src/audio/dsp');
  const prefs = await import('../../src/storage/devicePrefs');
  const picker = await import('../../src/components/music/OutputPicker');
  return { ...output, dsp, prefs, picker };
}

afterEach(() => {
  // Unmount while navigator.mediaDevices is still there: the pickers unsubscribe from it.
  cleanup();
  vi.unstubAllGlobals();
  delete (HTMLMediaElement.prototype as { setSinkId?: unknown }).setSinkId;
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  sinks.length = 0;
});

describe('audio output (browser)', () => {
  it('WEB-OUTPUT-001 without setSinkId there is nothing to choose, and no button', async () => {
    const o = await fresh();
    expect(o.outputSupport()).toBe('none');
    expect(await o.listOutputs()).toEqual([
      { id: '', name: 'System default', kind: 'default', detail: 'Follows your system' },
    ]);
    const { container } = renderWithProviders(<o.picker.OutputButton />);
    expect(container.querySelector('[aria-label^="Audio output"]')).toBeNull();
  });

  it('WEB-OUTPUT-002 lists the output devices after the system default, with their kind', async () => {
    supportSinkId();
    const o = await fresh();
    expect(o.outputSupport()).toBe('sinkId');
    expect(await o.listOutputs()).toEqual([
      { id: '', name: 'System default', kind: 'default', detail: 'Follows your system' },
      { id: 'spk', name: 'Built-in Speakers', kind: 'speaker', detail: 'Speaker' },
      { id: 'bt', name: 'WH-1000XM4 (Bluetooth)', kind: 'bluetooth', detail: 'Bluetooth' },
      { id: 'hp', name: 'Headphones', kind: 'headphones', detail: 'Headphones' },
      // Browsers hide labels until a permission is granted.
      { id: 'nolabel', name: 'Output 4', kind: 'speaker', detail: 'Speaker' },
    ]);
  });

  it('WEB-OUTPUT-003 choosing a device routes the element, then the graph once it exists, and is remembered', async () => {
    supportSinkId();
    const o = await fresh();
    const audio = document.createElement('audio');
    o.dsp.bindElement(audio);
    expect(await o.selectOutput('bt')).toBe(true);
    expect(sinks).toEqual(['element:bt']);
    expect(o.prefs.getDevicePrefs().audioOutputId).toBe('bt');
    expect(JSON.parse(localStorage.getItem('sonare_device_prefs')!)).toMatchObject({ audioOutputId: 'bt' });

    // The equalizer graph built on the first play takes over the output: it gets the device too.
    await o.dsp.ensureGraph();
    expect(sinks).toEqual(['element:bt', 'context:bt']);
    await o.selectOutput('');
    expect(sinks.at(-1)).toBe('context:');
  });

  it('WEB-OUTPUT-004 the output button lists the devices, marks the current one, and switches', async () => {
    supportSinkId();
    const o = await fresh();
    o.dsp.bindElement(document.createElement('audio'));
    const { user } = renderWithProviders(<o.picker.OutputButton />);
    const button = await screen.findByRole('button', { name: 'Audio output: System default' });
    await user.click(button);
    expect(await screen.findByRole('option', { name: /Built-in Speakers/ })).toBeInTheDocument();
    // The system default and the four outputs; the microphone isn't one.
    expect(screen.getAllByRole('option')).toHaveLength(5);
    expect(screen.getByRole('option', { name: /System default/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: /Headphones/ }));
    expect(await screen.findByRole('button', { name: 'Audio output: Headphones' })).toBeInTheDocument();
    expect(sinks).toContain('element:hp');
  });

  it('WEB-OUTPUT-005 a remembered device that is gone reads as the system default', async () => {
    supportSinkId();
    localStorage.setItem('sonare_device_prefs', JSON.stringify({ audioOutputId: 'unplugged' }));
    const o = await fresh();
    renderWithProviders(<o.picker.OutputCard />);
    const card = await screen.findByRole('button', { name: 'Audio output: System default' });
    expect(card).toHaveTextContent('Follows your system');
  });

  it('WEB-OUTPUT-006 the Now Playing card opens the same list and switches the device', async () => {
    supportSinkId();
    const o = await fresh();
    o.dsp.bindElement(document.createElement('audio'));
    const { user } = renderWithProviders(<o.picker.OutputCard />);
    await screen.findByRole('button', { name: 'Audio output: System default' });
    await chooseOption(user, 'Audio output: System default', /WH-1000XM4/);
    expect(await screen.findByRole('button', { name: /Audio output: WH-1000XM4/ })).toHaveTextContent('Bluetooth');
    expect(sinks).toContain('element:bt');
  });
});
