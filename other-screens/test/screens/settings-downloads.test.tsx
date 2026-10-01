import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import SettingsScreen from '../../src/screens/SettingsScreen';
import Downloads from '../../src/screens/Downloads';
import { clearSession, setSession } from '../../src/data/auth';
import { getSettings, updateSettings } from '../../src/data/settings';
import type { DownloadItem } from '../../src/data/downloads';
import { makePlayer, renderWithProviders } from '../helpers/render';
import { API, http, HttpResponse, recordRequests, useMockServer, server } from '../helpers/server';
import { testUser } from '../helpers/fixtures';

const h = vi.hoisted(() => {
  const state = {
    items: [] as DownloadItem[],
    location: { kind: 'browser', label: 'Browser downloads' } as { kind: string; label: string; custom?: boolean },
    listeners: new Set<() => void>(),
  };
  return {
    state,
    toast: vi.fn(),
    dl: {
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      pauseAll: vi.fn(async () => {}),
      resumeAll: vi.fn(async () => {}),
      remove: vi.fn(async () => ({ fileDeleted: true }) as { fileDeleted: boolean; reason?: string }),
      saveAgain: vi.fn(async () => true),
      toTrack: (d: DownloadItem) => ({ id: d.id, title: d.title, artist: d.artist, source: 'server' }),
    },
    loc: {
      chooseLocation: vi.fn(async () => true),
      resetLocation: vi.fn(async () => {}),
    },
  };
});

vi.mock('../../src/store/toastStore', () => ({ showToast: h.toast, dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/data/downloads', () => ({
  downloads: h.dl,
  useDownloads: () => ({
    ready: true,
    items: h.state.items,
    byId: new Map(h.state.items.map((i) => [i.id, i])),
    activeCount: h.state.items.filter((i) => i.status === 'queued' || i.status === 'downloading').length,
  }),
  useDownload: () => undefined,
  downloadProgress: (i: DownloadItem) => (i.totalBytes > 0 ? Math.min(1, i.receivedBytes / i.totalBytes) : null),
}));
vi.mock('../../src/data/downloadTargets', () => ({
  canPickWebFolder: true,
  loadLocation: async () => {},
  getLocation: () => h.state.location,
  subscribeLocation: (fn: () => void) => {
    h.state.listeners.add(fn);
    return () => h.state.listeners.delete(fn);
  },
  chooseLocation: h.loc.chooseLocation,
  resetLocation: h.loc.resetLocation,
}));

useMockServer();

const MB = 1_000_000;
function item(over: Partial<DownloadItem>): DownloadItem {
  return {
    id: 'yt:x',
    title: 'Song',
    artist: 'Artist',
    artistId: '',
    album: null,
    albumId: null,
    durationMs: 1,
    status: 'done',
    quality: 'high',
    format: 'opus',
    target: 'browser',
    totalBytes: 0,
    receivedBytes: 0,
    addedAt: 1,
    ...over,
  };
}

beforeEach(() => {
  h.state.items = [];
  h.state.location = { kind: 'browser', label: 'Browser downloads' };
  updateSettings({
    streamQuality: 'high',
    downloadQuality: 'high',
    downloadFormat: 'opus',
    gapless: false,
    normalization: true,
  });
});
afterEach(() => {
  clearSession();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

/**
 * Settings renders two layouts and CSS container queries show one: a stacked list on phones
 * and a section sidebar on wider screens. Tests look inside one of them.
 */
function openSettings(route = '/settings') {
  const utils = renderWithProviders(<SettingsScreen />, { route });
  const root = utils.container.firstElementChild!;
  const [phone, wide] = [root.children[0] as HTMLElement, root.children[1] as HTMLElement];
  return { ...utils, w: within(wide), phone: within(phone) };
}

describe('settings', () => {
  it('WEB-SETTINGS-001 a guest is offered to create an account or sign in', async () => {
    const { user, location, w } = openSettings();
    expect(w.getByText('Listening as a guest')).toBeInTheDocument();
    await user.click(w.getByRole('button', { name: 'Create account' }));
    expect(location()).toBe('/signin');
  });

  it('WEB-SETTINGS-002 a signed-in user sees their profile and can sign out', async () => {
    setSession('acc', 'ref', testUser);
    const rec = recordRequests();
    server.use(http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })));
    const { user, w } = openSettings();
    expect(w.getByText('Test Listener')).toBeInTheDocument();
    expect(w.getByText('listener@sonare.test')).toBeInTheDocument();
    await user.click(w.getByRole('button', { name: 'Sign out' }));
    expect(await w.findByText('Listening as a guest')).toBeInTheDocument();
    rec.stop();
    expect(rec.paths()).toEqual(['POST /auth/logout']);
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Signed out' }));
  });

  it('WEB-SETTINGS-003 the web build shows no desktop-only sections, on either layout', () => {
    const { w, phone } = openSettings();
    const nav = w.getAllByRole('button').map((b) => b.textContent);
    expect(nav).toEqual(expect.arrayContaining(['Account', 'Playback', 'Downloads', 'Audio & effects', 'About']));
    expect(nav).not.toContain('Connection mode');
    expect(nav).not.toContain('Library & scanning');
    // The phone layout stacks every section on one page.
    for (const title of ['Account', 'Playback', 'Downloads', 'Audio & effects', 'Appearance', 'About']) {
      expect(phone.getByText(title, { selector: '.text-overline' })).toBeInTheDocument();
    }
    expect(phone.queryByText('Connection mode')).not.toBeInTheDocument();
  });

  it('WEB-SETTINGS-004 playback: streaming quality and the two switches change the settings', async () => {
    const { user, w } = openSettings('/settings?section=playback');
    await user.selectOptions(w.getByRole('combobox', { name: 'Streaming quality' }), 'low');
    await user.click(w.getByRole('switch', { name: 'Toggle gapless playback' }));
    await user.click(w.getByRole('switch', { name: 'Toggle volume normalization' }));
    expect(getSettings()).toMatchObject({ streamQuality: 'low', gapless: true, normalization: false });
  });

  it('WEB-SETTINGS-005 choosing a section updates the address and shows it', async () => {
    const { user, location, w } = openSettings();
    await user.click(w.getByRole('button', { name: 'Downloads' }));
    expect(location()).toBe('/settings?section=downloads');
    expect(w.getByRole('combobox', { name: 'Download format' })).toBeInTheDocument();
    expect(w.queryByText('Listening as a guest')).not.toBeInTheDocument();
  });

  it('WEB-SETTINGS-006 download quality choices follow the file format', async () => {
    const { user, w } = openSettings('/settings?section=downloads');
    const quality = w.getByRole('combobox', { name: 'Download quality' });
    expect(within(quality).getByRole('option', { name: 'High · about 150 kbps' })).toBeInTheDocument();
    await user.selectOptions(w.getByRole('combobox', { name: 'Download format' }), 'm4a');
    expect(getSettings().downloadFormat).toBe('m4a');
    expect(within(quality).getByRole('option', { name: 'High · 128 kbps' })).toBeInTheDocument();
    await user.selectOptions(quality, 'low');
    expect(getSettings().downloadQuality).toBe('low');
  });

  it('WEB-SETTINGS-007 shows download progress counts and links to the Downloads page', () => {
    h.state.items = [item({ id: 'a', status: 'downloading' }), item({ id: 'b' }), item({ id: 'c' })];
    const { w } = openSettings('/settings?section=downloads');
    expect(w.getByText('1 in progress · 2 downloaded')).toBeInTheDocument();
    expect(w.getByRole('link', { name: /Manage downloads/ })).toHaveAttribute('href', '/downloads');
  });

  it('WEB-SETTINGS-008 choosing a download folder confirms it; cancelling says nothing; a failure is reported', async () => {
    const { user, w } = openSettings('/settings?section=downloads');
    expect(
      w.getByText("Your browser's Downloads folder. Choose a folder to let Sonare delete files too."),
    ).toBeInTheDocument();
    await user.click(w.getByRole('button', { name: 'Choose folder' }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download location changed' })),
    );
    h.toast.mockClear();
    h.loc.chooseLocation.mockResolvedValueOnce(false);
    await user.click(w.getByRole('button', { name: 'Choose folder' }));
    expect(h.toast).not.toHaveBeenCalled();
    h.loc.chooseLocation.mockRejectedValueOnce(new Error('Permission denied'));
    await user.click(w.getByRole('button', { name: 'Choose folder' }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not change the location', description: 'Permission denied' }),
      ),
    );
  });

  it('WEB-SETTINGS-009 a picked folder shows its name and can be reset to the default', async () => {
    h.state.location = { kind: 'folder', label: 'Music', custom: true };
    const { user, w } = openSettings('/settings?section=downloads');
    expect(w.getByText('Music')).toBeInTheDocument();
    await user.click(w.getByRole('button', { name: 'Default' }));
    expect(h.loc.resetLocation).toHaveBeenCalled();
    expect(w.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });
});

describe('downloads page', () => {
  const open = (player = makePlayer()) => ({ ...renderWithProviders(<Downloads />, { player }), player });

  it('WEB-DLPAGE-001 with nothing downloaded it says so and where files go', () => {
    open();
    expect(screen.getByText('No downloads yet')).toBeInTheDocument();
    expect(screen.getByText(/saving to your browser's Downloads folder/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change' })).toHaveAttribute('href', '/settings?section=downloads');
  });

  it('WEB-DLPAGE-002 in-progress rows show their state, size and progress, with the right control', async () => {
    h.state.items = [
      item({ id: 'd1', title: 'Going', status: 'downloading', receivedBytes: 1 * MB, totalBytes: 2 * MB }),
      item({ id: 'd2', title: 'Waiting one', status: 'queued' }),
      item({ id: 'd3', title: 'Held', status: 'paused', receivedBytes: 3 * MB }),
      item({ id: 'd4', title: 'Broken', status: 'failed', error: 'Only a video stream is available' }),
    ];
    const { user } = open();
    expect(screen.getByText('2 active · 2 paused')).toBeInTheDocument();
    expect(screen.getByText('1 MB of 2 MB · 50%')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Paused · 3 MB')).toBeInTheDocument();
    expect(screen.getByText('Failed · Only a video stream is available')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pause Going' }));
    await user.click(screen.getByRole('button', { name: 'Resume Held' }));
    await user.click(screen.getByRole('button', { name: 'Retry Broken' }));
    expect(h.dl.pause).toHaveBeenCalledWith('d1');
    expect(h.dl.resume.mock.calls.map((c) => c[0])).toEqual(['d3', 'd4']);
    await user.click(screen.getByRole('button', { name: 'Pause all' }));
    await user.click(screen.getByRole('button', { name: 'Resume all' }));
    expect(h.dl.pauseAll).toHaveBeenCalled();
    expect(h.dl.resumeAll).toHaveBeenCalled();
  });

  it('WEB-DLPAGE-003 finished downloads are counted, and play as a queue of downloads', async () => {
    h.state.items = [
      item({ id: 'f1', title: 'First', totalBytes: 2 * MB, codec: 'opus', bitrateKbps: 160 }),
      item({ id: 'f2', title: 'Second', totalBytes: 1 * MB }),
    ];
    const { user, player } = open();
    expect(screen.getByText(/2 songs · 3 MB/)).toBeInTheDocument();
    expect(screen.getByText('opus 160 kbps · 2 MB · saved by the browser')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Play Second' }));
    const [track, queue] = vi.mocked(player.playTrack).mock.calls[0];
    expect(track.id).toBe('f2');
    expect(queue!.map((t) => t.id)).toEqual(['f1', 'f2']);
  });

  it('WEB-DLPAGE-004 "Save again" re-saves the kept copy, and explains when there is none', async () => {
    h.state.items = [item({ id: 'k1', title: 'Kept', copyKept: true })];
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Save Kept again' }));
    expect(h.dl.saveAgain).toHaveBeenCalledWith('k1');
    expect(h.toast).not.toHaveBeenCalled();
    h.dl.saveAgain.mockResolvedValueOnce(false);
    await user.click(screen.getByRole('button', { name: 'Save Kept again' }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't save it again" })),
    );
  });

  it('WEB-DLPAGE-005 deleting asks first, warns that the browser keeps its file, and reports the result', async () => {
    h.state.items = [item({ id: 'x1', title: 'Gone soon' })];
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    h.dl.remove.mockResolvedValueOnce({
      fileDeleted: false,
      reason: 'Files saved by the browser have to be deleted from its Downloads folder',
    });
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Delete Gone soon' }));
    expect(confirm).toHaveBeenLastCalledWith(
      'Delete "Gone soon"? Sonare can\'t delete files the browser saved; remove them from your Downloads folder.',
    );
    expect(h.dl.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete Gone soon' }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Removed from downloads',
          description: 'Files saved by the browser have to be deleted from its Downloads folder',
        }),
      ),
    );
  });

  it('WEB-DLPAGE-006 cancelling an unfinished download needs no file warning', async () => {
    h.state.items = [item({ id: 'c1', title: 'Half', status: 'paused' })];
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Cancel Half' }));
    expect(confirm).toHaveBeenCalledWith('Delete "Half"?');
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download deleted' })));
  });

  it('WEB-DLPAGE-007 "Delete all" removes every finished download', async () => {
    h.state.items = [
      item({ id: 'a1', title: 'A' }),
      item({ id: 'a2', title: 'B' }),
      item({ id: 'p', title: 'Running', status: 'downloading' }),
    ];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Delete all' }));
    await waitFor(() => expect(h.dl.remove.mock.calls.map((c) => c[0])).toEqual(['a1', 'a2']));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Downloads deleted' })));
  });
});
