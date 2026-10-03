import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { opened, resetFs, writeFile } from '../helpers/fakeNeutralino';
import { makeTrack } from '../helpers/fixtures';
import { makePlayer, renderWithProviders } from '../helpers/render';
import type { Mode } from '../../src/types';
import type { PlayerStore } from '../../src/store/playerContext';

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);

const h = vi.hoisted(() => ({
  online: true,
  toast: vi.fn(),
  probe: { player: null as PlayerStore | null, mode: null as { mode: Mode; setMode: (m: Mode) => void } | null },
  ended: new Set<() => void>(),
  syncOnline: vi.fn(),
}));

vi.mock('../../src/lib/connectivity', () => ({ hasInternet: vi.fn(async () => h.online) }));
vi.mock('../../src/store/toasts', () => ({ showToast: h.toast, dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/audio/player', () => ({
  getStatus: () => ({
    trackId: null,
    playing: false,
    loading: false,
    positionMs: 0,
    durationMs: 0,
    muxed: false,
    error: null,
    volume: 1,
  }),
  onPlaybackChange: () => () => {},
  onEnded: (fn: () => void) => {
    h.ended.add(fn);
    return () => h.ended.delete(fn);
  },
  playTrackId: vi.fn(async () => {}),
  play: vi.fn(),
  toggle: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
}));
vi.mock('../../src/api/plays', () => ({ resetPlay: vi.fn(), maybeRecordPlay: vi.fn() }));
vi.mock('../../src/api/sync', () => ({
  setSyncOnline: h.syncOnline,
  startBackgroundSync: vi.fn(),
  useSyncStatus: () => ({ pending: 0, syncing: false }),
}));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { init: vi.fn(async () => {}) },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));
vi.mock('../../src/components/layout/AppShell', async () => {
  const { usePlayerStore } = await import('../../src/store/playerContext');
  const { useModeStore } = await import('../../src/store/modeContext');
  return {
    default: function Probe() {
      h.probe.player = usePlayerStore();
      h.probe.mode = useModeStore();
      return <span data-testid="mode">{h.probe.mode.mode}</span>;
    },
  };
});

import App from '../../src/App';
import ModeSwitch from '../../src/screens/ModeSwitch';
import Folders from '../../src/screens/Folders';
import Settings from '../../src/screens/Settings';
import { localLibrary, getLocalSnapshot } from '../../src/storage/local';
import { getSettings, updateSettings } from '../../src/storage/settings';

const MUSIC = '/home/me/Music';
const mode = () => screen.getByTestId('mode').textContent;

beforeEach(async () => {
  resetFs();
  h.online = true;
  h.toast.mockClear();
  h.syncOnline.mockClear();
  updateSettings({ stayOffline: false });
  for (const f of getLocalSnapshot().folders) await localLibrary.removeFolder(f.id);
  window.history.pushState({}, '', '/home');
});

describe('offline mode at launch', () => {
  it('DSK-026 with no internet the app starts in Offline Mode and says why', async () => {
    h.online = false;
    render(<App />);
    await waitFor(() => expect(mode()).toBe('offline'));
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'No internet connection' }));
    // Sync follows the mode from an effect, which runs after the render that shows it.
    await waitFor(() => expect(h.syncOnline).toHaveBeenLastCalledWith(false));
  });

  it('DSK-027 with internet it stays online and syncs', async () => {
    render(<App />);
    await new Promise((r) => setTimeout(r, 20));
    expect(mode()).toBe('online');
    expect(h.syncOnline).toHaveBeenLastCalledWith(true);
    expect(h.toast).not.toHaveBeenCalled();
  });

  it('DSK-028 "stay offline" survives a restart; going online clears it', async () => {
    updateSettings({ stayOffline: true });
    render(<App />);
    await waitFor(() => expect(mode()).toBe('offline'));
    act(() => h.probe.mode!.setMode('online'));
    expect(mode()).toBe('online');
    expect(getSettings().stayOffline).toBe(false);
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Connected to Sonare Online' }));
    act(() => h.probe.mode!.setMode('offline'));
    expect(mode()).toBe('offline');
    expect(h.toast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Switched to Offline Mode' }));
  });

  it('DSK-029 offline, the queue skips songs that are not on this device', async () => {
    writeFile(`${MUSIC}/one.mp3`, new Uint8Array(8));
    writeFile(`${MUSIC}/two.mp3`, new Uint8Array(8));
    await localLibrary.addFolder(MUSIC);
    const [first, second] = [...getLocalSnapshot().tracks].sort((a, b) => a.title.localeCompare(b.title));
    const streamOnly = makeTrack({ id: 'yt:cloud' });
    h.online = false;
    render(<App />);
    await waitFor(() => expect(mode()).toBe('offline'));
    act(() => h.probe.player!.playTrack(first, [first, streamOnly, second]));
    act(() => h.probe.player!.next());
    expect(h.probe.player!.currentTrack?.id).toBe(second.id);
    // Nothing playable after the last local song.
    act(() => h.probe.player!.next());
    expect(h.probe.player!.currentTrack?.id).toBe(second.id);
    act(() => h.probe.player!.skipToPrevious());
    expect(h.probe.player!.currentTrack?.id).toBe(first.id);
  });
});

describe('switching to Offline Mode', () => {
  it('DSK-030 the confirmation shows what stays available and remembers "stay offline"', async () => {
    writeFile(`${MUSIC}/a.mp3`, new Uint8Array(8));
    writeFile(`${MUSIC}/b.mp3`, new Uint8Array(8));
    await localLibrary.addFolder(MUSIC);
    const setMode = vi.fn();
    const { user, location } = renderWithProviders(<ModeSwitch />, { route: '/mode-switch', setMode });
    expect(screen.getByText('2 songs on device')).toBeInTheDocument();
    expect(screen.getByText(/^1 music folders? & local lists$/)).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Stay offline until manual switch' }));
    await user.click(screen.getByRole('button', { name: 'Go offline' }));
    expect(setMode).toHaveBeenCalledWith('offline');
    expect(getSettings().stayOffline).toBe(true);
    expect(location()).toBe('/home');
  });

  it('DSK-031 settings on the desktop include the connection mode and the library sections', async () => {
    const { user, container, location } = renderWithProviders(<Settings />, {
      route: '/settings?section=connection',
    });
    const wide = within(container.firstElementChild!.children[1] as HTMLElement);
    expect(wide.getByRole('button', { name: 'Library & scanning' })).toBeInTheDocument();
    expect(wide.getByText('Online · streaming from Sonare server')).toBeInTheDocument();
    await user.click(wide.getByRole('button', { name: 'Offline' }));
    expect(location()).toBe('/mode-switch');
  });
});

describe('music folders screen', () => {
  it('DSK-032 with no folders it invites the user to add one, using the folder picker', async () => {
    writeFile('/home/me/Picked/x.flac', new Uint8Array(8));
    const { user } = renderWithProviders(<Folders />);
    expect(await screen.findByText('No music folders added')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Add folder' })[0]);
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Added Picked' })));
    expect(await screen.findByText(/^1 songs? across 1 folders? · 0 KB$/)).toBeInTheDocument();
  });

  it('DSK-033 lists folders; scanning reports what changed; open, exclude and remove work', async () => {
    writeFile(`${MUSIC}/a.mp3`, new Uint8Array(8));
    await localLibrary.addFolder(MUSIC);
    const { user } = renderWithProviders(<Folders />);
    expect(await screen.findByText('Music', { selector: 'span.text-body-m' })).toBeInTheDocument();
    writeFile(`${MUSIC}/b.mp3`, new Uint8Array(8));
    await user.click(screen.getByRole('button', { name: 'Scan now' }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Library rescanned', description: '1 added · 0 removed' }),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Open folder' }));
    expect(opened).toEqual([`file://${MUSIC}`]);
    await user.click(screen.getByRole('switch', { name: 'Exclude Music' }));
    await waitFor(() => expect(getLocalSnapshot().tracks).toHaveLength(0));
    expect(screen.getByRole('switch', { name: 'Include Music' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Music' }));
    expect(await screen.findByText('No music folders added')).toBeInTheDocument();
  });

  it('DSK-034 a failed scan is reported instead of breaking the page', async () => {
    writeFile(`${MUSIC}/a.mp3`, new Uint8Array(8));
    await localLibrary.addFolder(MUSIC);
    const spy = vi.spyOn(localLibrary, 'rescan').mockRejectedValueOnce(new Error('Disk unplugged'));
    const { user } = renderWithProviders(<Folders />);
    await user.click(await screen.findByRole('button', { name: 'Scan now' }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Rescan failed', description: 'Disk unplugged' }),
      ),
    );
    expect(screen.getByRole('button', { name: 'Scan now' })).toBeEnabled();
    spy.mockRestore();
  });

  it('DSK-035 the downloads folder cannot be removed from the list', async () => {
    writeFile(`${MUSIC}/Sonare/x.webm`, new Uint8Array(8));
    await localLibrary.addDownload({
      serverId: 'yt:x',
      path: `${MUSIC}/Sonare/x.webm`,
      dir: `${MUSIC}/Sonare`,
      title: 'X',
      artist: 'Y',
      album: null,
      durationMs: null,
    });
    renderWithProviders(<Folders />, { player: makePlayer() });
    expect(await screen.findByRole('button', { name: 'Rescan Sonare downloads' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Sonare downloads' })).not.toBeInTheDocument();
  });
});
