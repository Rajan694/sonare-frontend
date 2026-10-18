import { describe, expect, it, vi } from 'vitest';
import type { TrayOptions } from '@neutralinojs/lib';
import { emitNativeEvent, lib } from '../helpers/fakeNeutralino';

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);

const { bindTray, initNeutralino, showInTray } = await import('../../src/neutralino');

initNeutralino();

const lastMenu = () => (vi.mocked(lib.os.setTray).mock.lastCall?.[0] as TrayOptions | undefined)?.menuItems ?? [];
const item = (id: string) => lastMenu().find((m) => m.id === id);
const click = (id: string) => emitNativeEvent('trayMenuItemClicked', { id });

describe('tray menu', () => {
  it('DSK-083 the tray shows the current track and Play or Pause, and greys the controls out when nothing is loaded', () => {
    showInTray({ title: 'Naina', artist: 'Arijit Singh' }, true);
    expect(item('NOW')).toMatchObject({ text: 'Naina - Arijit Singh', isDisabled: true });
    expect(item('TOGGLE')).toMatchObject({ text: 'Pause', isDisabled: false });
    expect(item('NEXT')).toMatchObject({ isDisabled: false });

    showInTray({ title: 'Naina', artist: 'Arijit Singh' }, false);
    expect(item('TOGGLE')?.text).toBe('Play');

    showInTray(null, false);
    expect(item('NOW')?.text).toBe('Nothing playing');
    expect(item('TOGGLE')).toMatchObject({ text: 'Play', isDisabled: true });
    expect(item('PREVIOUS')).toMatchObject({ isDisabled: true });
    expect(item('QUIT')).toBeDefined();

    // The same menu again (a re-render, a position tick) doesn't rebuild the tray.
    const calls = vi.mocked(lib.os.setTray).mock.calls.length;
    showInTray(null, false);
    expect(vi.mocked(lib.os.setTray).mock.calls.length).toBe(calls);

    showInTray({ title: 'x'.repeat(80), artist: 'Someone' }, true);
    expect(item('NOW')?.text).toHaveLength(60);
  });

  it('DSK-084 Play/Pause, Next and Previous in the tray reach the player until it unbinds', () => {
    const actions = { togglePlay: vi.fn(), next: vi.fn(), previous: vi.fn() };
    const unbind = bindTray(actions);

    click('TOGGLE');
    click('NEXT');
    click('PREVIOUS');
    expect(actions.togglePlay).toHaveBeenCalledTimes(1);
    expect(actions.next).toHaveBeenCalledTimes(1);
    expect(actions.previous).toHaveBeenCalledTimes(1);

    click('QUIT');
    expect(lib.app.exit).toHaveBeenCalled();

    unbind();
    click('NEXT');
    expect(actions.next).toHaveBeenCalledTimes(1);
  });
});
