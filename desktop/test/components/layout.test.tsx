import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import BottomPlayer from '../../src/components/layout/BottomPlayer';
import MiniPlayer from '../../src/components/layout/MiniPlayer';
import MobileTabBar from '../../src/components/layout/MobileTabBar';
import IconRail from '../../src/components/layout/IconRail';
import SearchField from '../../src/components/layout/SearchField';
import Sidebar from '../../src/components/layout/Sidebar';
import QueuePanel from '../../src/components/layout/QueuePanel';
import Topbar from '../../src/components/layout/Topbar';
import AppShell from '../../src/components/layout/AppShell';
import { usePlayerShortcuts } from '../../src/components/layout/usePlayerShortcuts';
import { useToasts } from '../../src/store/toasts';
import { bindAccountGateNavigator } from '../../src/data/accountGate';
import { clearSession, setSession } from '../../src/data/auth';
import { requestSync } from '../../src/data/sync';
import * as player from '../../src/data/player';
import { makePlayer, makeStore, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';

const dl = vi.hoisted(() => ({ active: 0 }));
vi.mock('../../src/data/downloads', () => ({
  downloads: { enqueue: vi.fn(), pause: vi.fn(), resume: vi.fn(), remove: vi.fn(), removeMany: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: dl.active }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));
vi.mock('../../src/data/player', () => ({
  retry: vi.fn(async () => {}),
  toggle: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  getVolume: vi.fn(() => 0.5),
  getStatus: vi.fn(() => ({ positionMs: 60_000 })),
}));

useMockServer(
  http.get(`${API}/tracks/:id/peaks`, () => HttpResponse.json({ peaks: [0.5, 1] })),
  http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
);

const song = makeTrack({ id: 'yt:np', title: 'Nude', artist: 'Radiohead', durationMs: 200_000 });
const queue = [
  makeTrack({ id: 'yt:q0', title: 'Before' }),
  song,
  makeTrack({ id: 'yt:q2', title: 'Next One', durationMs: 90_000 }),
  makeTrack({ id: 'yt:q3', title: 'Last One' }),
];

function ToastProbe() {
  return (
    <ul aria-label="toasts">
      {useToasts().map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
}

const setWidth = (w: number) => Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });

beforeEach(() => {
  dl.active = 0;
  setWidth(1280);
});
afterEach(() => {
  clearSession();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('bottom player', () => {
  it('WEB-LAYOUT-001 takes no space until a song is chosen, then shows it with play/pause', async () => {
    const { container } = renderWithProviders(<BottomPlayer />);
    expect(container.querySelector('footer')).toBeNull();
    const p = makePlayer({ queue: [song], index: 0 });
    const { user, rerender } = renderWithProviders(<BottomPlayer />, { player: p });
    const bar = screen.getByRole('contentinfo');
    expect(within(bar).getByText('Nude')).toBeInTheDocument();
    expect(within(bar).getByText('Radiohead')).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: 'Play' }));
    expect(p.togglePlay).toHaveBeenCalled();
    void rerender;
  });

  it('WEB-LAYOUT-002 play is disabled while loading and reads "Pause" while playing', () => {
    renderWithProviders(<BottomPlayer />, { player: makePlayer({ queue: [song], index: 0, isLoading: true }) });
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    renderWithProviders(<BottomPlayer />, { player: makePlayer({ queue: [song], index: 0, isPlaying: true }) });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  });

  it('WEB-LAYOUT-003 transport buttons drive the queue and show shuffle / repeat state', async () => {
    const p = makePlayer({ queue: [song], index: 0, state: { shuffle: true, repeat: 'one' } as never });
    const { user } = renderWithProviders(<BottomPlayer />, { player: p });
    await user.click(screen.getByRole('button', { name: 'Previous track' }));
    await user.click(screen.getByRole('button', { name: 'Next track' }));
    await user.click(screen.getByRole('button', { name: 'Shuffle on' }));
    await user.click(screen.getByRole('button', { name: 'Repeat one' }));
    expect(p.previous).toHaveBeenCalled();
    expect(p.next).toHaveBeenCalled();
    expect(p.toggleShuffle).toHaveBeenCalled();
    expect(p.cycleRepeat).toHaveBeenCalled();
  });

  it('WEB-LAYOUT-004 shows position and duration, and seeks from the waveform', () => {
    const p = makePlayer({ queue: [song], index: 0, state: { positionMs: 90_000 } as never, durationMs: 200_000 });
    renderWithProviders(<BottomPlayer />, { player: p });
    expect(screen.getByText('1:30')).toBeInTheDocument();
    expect(screen.getByText('3:20')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Seek' }), { key: 'ArrowRight' });
    expect(vi.mocked(p.seekRatio).mock.calls[0][0]).toBeCloseTo(0.475);
  });

  it('WEB-LAYOUT-005 a playback error replaces the artist line and offers a retry', async () => {
    const { user } = renderWithProviders(<BottomPlayer />, {
      player: makePlayer({ queue: [song], index: 0, playbackError: 'Playback failed' }),
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Playback failed');
    expect(screen.queryByText('Radiohead')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry playback' }));
    expect(player.retry).toHaveBeenCalled();
  });

  it('WEB-LAYOUT-006 mute, unmute and the volume slider', async () => {
    const p = makePlayer({ queue: [song], index: 0, volume: 0.4 });
    const { user } = renderWithProviders(<BottomPlayer />, { player: p });
    await user.click(screen.getByRole('button', { name: 'Mute' }));
    expect(p.toggleMute).toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Volume' }), { key: 'ArrowUp' });
    expect(p.setVolume).toHaveBeenCalledWith(0.41);
    renderWithProviders(<BottomPlayer />, { player: makePlayer({ queue: [song], index: 0, volume: 0 }) });
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
  });

  it('WEB-LAYOUT-007 opens the queue panel and links to lyrics, equalizer and the full-screen player', async () => {
    const store = makeStore();
    const { user } = renderWithProviders(<BottomPlayer />, { player: makePlayer({ queue: [song], index: 0 }), store });
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(store.getState().ui.queueOpen).toBe(true);
    expect(screen.getByRole('link', { name: 'Lyrics' })).toHaveAttribute('href', '/lyrics');
    expect(screen.getByRole('link', { name: 'Equalizer' })).toHaveAttribute('href', '/equalizer');
    expect(screen.getByRole('link', { name: 'Full screen player' })).toHaveAttribute('href', '/now-playing');
    expect(screen.getByRole('link', { name: 'Open now playing' })).toHaveAttribute('href', '/now-playing');
  });
});

describe('mini player and navigation bars', () => {
  it('WEB-LAYOUT-008 the mini player opens now-playing from its body, but not from its buttons', async () => {
    const p = makePlayer({ queue: [song], index: 0, state: { positionMs: 50_000 } as never, durationMs: 200_000 });
    const { user, location, container } = renderWithProviders(<MiniPlayer />, { player: p, route: '/home' });
    expect((container.querySelector('.mini .h-full') as HTMLElement).style.width).toBe('25%');
    await user.click(screen.getByRole('button', { name: 'Next track' }));
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(p.next).toHaveBeenCalled();
    expect(p.togglePlay).toHaveBeenCalled();
    expect(location()).toBe('/home');
    await user.click(screen.getByText('Nude'));
    expect(location()).toBe('/now-playing');
  });

  it('WEB-LAYOUT-009 the phone tab bar and tablet rail highlight the section you are in', () => {
    renderWithProviders(
      <>
        <MobileTabBar />
        <IconRail />
      </>,
      { route: '/playlist/sonare:1' },
    );
    const tabs = screen.getByRole('navigation');
    expect(within(tabs).getByRole('link', { name: 'Playlists' })).toHaveClass('text-acc');
    expect(within(tabs).getByRole('link', { name: 'Home' })).not.toHaveClass('text-acc');
    expect(screen.getByRole('link', { name: 'Lists' })).toHaveClass('text-acc');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });
});

describe('search field', () => {
  it('WEB-LAYOUT-010 typing stores the query and jumps to the search page; clearing empties it', async () => {
    const store = makeStore();
    const { user, location } = renderWithProviders(<SearchField />, { route: '/library', store });
    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'blur');
    expect(store.getState().search.query).toBe('blur');
    expect(location()).toBe('/search');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(store.getState().search.query).toBe('');
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
  });

  it('WEB-LAYOUT-011 spaces alone do not leave the page; Enter does', async () => {
    const { user, location } = renderWithProviders(<SearchField />, { route: '/home' });
    const box = screen.getByRole('textbox', { name: 'Search' });
    await user.type(box, '  ');
    expect(location()).toBe('/home');
    await user.type(box, '{Enter}');
    expect(location()).toBe('/search');
  });

  it('WEB-LAYOUT-012 "/" and Ctrl+K focus the search, but not while typing elsewhere', async () => {
    const { user } = renderWithProviders(
      <>
        <input aria-label="Other" />
        <SearchField />
      </>,
    );
    const box = screen.getByRole('textbox', { name: 'Search' });
    await user.keyboard('/');
    expect(box).toHaveFocus();
    await user.click(screen.getByRole('textbox', { name: 'Other' }));
    await user.keyboard('/');
    expect(screen.getByRole('textbox', { name: 'Other' })).toHaveValue('/');
    await user.keyboard('{Control>}k{/Control}');
    expect(box).toHaveFocus();
  });
});

describe('sidebar', () => {
  it('WEB-LAYOUT-013 a guest is invited to sign in, and "New playlist" asks for an account', async () => {
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const { user } = renderWithProviders(<Sidebar />, { route: '/home' });
    expect(screen.getByRole('link', { name: 'Sign in to make playlists' })).toHaveAttribute('href', '/signin');
    expect(screen.getByText('ONLINE · GUEST')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('on');
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    expect(navigate).toHaveBeenCalledWith('/signin', expect.anything());
  });

  it("WEB-LAYOUT-014 lists the signed-in user's playlists with kind and size", async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists`, () =>
        HttpResponse.json(
          page([
            makePlaylist({ id: 'sonare:1', name: 'Gym', kind: 'synced', trackCount: 12 }),
            makePlaylist({ name: 'Car', kind: 'online', trackCount: null }),
          ]),
        ),
      ),
    );
    renderWithProviders(<Sidebar />);
    expect(await screen.findByRole('link', { name: /Gym/ })).toHaveAttribute('href', '/playlist/sonare:1');
    expect(screen.getByText('synced · 12')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('ONLINE · SYNCED')).toBeInTheDocument();
  });

  it('WEB-LAYOUT-015 with no playlists yet it says so', async () => {
    setSession('a', 'r', testUser);
    renderWithProviders(<Sidebar />);
    expect(await screen.findByText('No playlists created')).toBeInTheDocument();
  });

  it('WEB-LAYOUT-016 creating a playlist names it, opens it, and reports a failure', async () => {
    setSession('a', 'r', testUser);
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('  Focus  ');
    let body: unknown;
    server.use(
      http.post(`${API}/me/playlists`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(makePlaylist({ id: 'sonare:new' }));
      }),
    );
    const { user, location } = renderWithProviders(
      <>
        <Sidebar />
        <ToastProbe />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    await waitFor(() => expect(location()).toBe('/playlist/sonare:new'));
    expect(body).toEqual({ name: 'Focus', kind: 'synced' });

    server.use(http.post(`${API}/me/playlists`, () => apiError(500, 'X', 'Database down')));
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    expect(
      await within(screen.getByRole('list', { name: 'toasts' })).findByText('Could not create playlist'),
    ).toBeInTheDocument();
    prompt.mockReturnValue('   ');
    await user.click(screen.getByRole('button', { name: 'New playlist' }));
    expect(prompt).toHaveBeenCalledTimes(3);
  });

  it('WEB-LAYOUT-017 collapses to an icon rail with tooltips, and counts running downloads', async () => {
    dl.active = 2;
    const store = makeStore();
    const { user } = renderWithProviders(<Sidebar />, { store });
    expect(screen.getByLabelText('2 downloading')).toHaveTextContent('2');
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Your Library' })).toHaveAttribute('data-tip-side', 'right');
    expect(screen.queryByText('Sign in to make playlists')).not.toBeInTheDocument();
  });

  it('WEB-LAYOUT-018 shows how many plays are waiting to sync', async () => {
    setSession('a', 'r', testUser);
    localStorage.setItem(
      'sonare_pending_plays',
      JSON.stringify(
        [1, 2].map((at) => ({ trackRef: { kind: 'server', id: 'x' }, at, ms: 40_000, userId: testUser.id })),
      ),
    );
    renderWithProviders(<Sidebar />);
    act(() => requestSync());
    expect(await screen.findByText('2 plays waiting to sync')).toBeInTheDocument();
    expect(screen.getByText('ONLINE · SYNC PENDING')).toBeInTheDocument();
  });
});

describe('queue panel', () => {
  const panel = (over: Parameters<typeof makePlayer>[0] = {}, opts: { onClose?: () => void; sheet?: boolean } = {}) => {
    const p = makePlayer({ queue, index: 1, state: { positionMs: 10_000 } as never, durationMs: 200_000, ...over });
    const onClose = opts.onClose ?? vi.fn();
    const utils = renderWithProviders(
      <>
        <QueuePanel onClose={onClose} isMobileSheet={opts.sheet} />
        <ToastProbe />
      </>,
      { player: p },
    );
    return { ...utils, p, onClose };
  };

  it('WEB-LAYOUT-019 summarises the queue, shows the current song and only what comes next', () => {
    panel();
    expect(screen.getByText('4 songs · 4 from server')).toBeInTheDocument();
    expect(screen.getByText('ONLINE QUEUE')).toBeInTheDocument();
    expect(screen.getByText('-3:10')).toBeInTheDocument();
    expect(screen.getByText('Next One')).toBeInTheDocument();
    expect(screen.getByText('Last One')).toBeInTheDocument();
    expect(screen.queryByText('Before')).not.toBeInTheDocument();
  });

  it('WEB-LAYOUT-020 clicking an upcoming song plays it; its X removes it without playing', async () => {
    const { user, p } = panel();
    await user.click(screen.getByText('Last One'));
    expect(p.setState).toHaveBeenCalledWith({ index: 3, positionMs: 0 });
    await user.click(screen.getAllByRole('button', { name: 'Remove from queue' })[0]);
    expect(p.removeFromQueue).toHaveBeenCalledWith(2);
    expect(p.setState).toHaveBeenCalledTimes(1);
  });

  it('WEB-LAYOUT-021 dragging a row onto another moves it', () => {
    const { p } = panel();
    const rows = screen.getAllByRole('button', { name: 'Remove from queue' }).map((b) => b.closest('[draggable]')!);
    const dataTransfer = { effectAllowed: '' };
    fireEvent.dragStart(rows[1], { dataTransfer });
    fireEvent.dragOver(rows[0], { dataTransfer });
    fireEvent.drop(rows[0], { dataTransfer });
    expect(p.moveInQueue).toHaveBeenCalledWith(3, 2);
  });

  it('WEB-LAYOUT-022 Clear drops upcoming songs; with none left it says so', async () => {
    const { user, p } = panel();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(p.clearUpcoming).toHaveBeenCalled();
    panel({ index: 3 });
    expect(screen.getByText('No upcoming songs in queue')).toBeInTheDocument();
  });

  it('WEB-LAYOUT-023 saves the queue as a playlist and opens it', async () => {
    setSession('a', 'r', testUser);
    vi.spyOn(window, 'prompt').mockReturnValue('Sunday');
    let added: unknown;
    server.use(
      http.post(`${API}/me/playlists`, () => HttpResponse.json(makePlaylist({ id: 'sonare:sun', name: 'Sunday' }))),
      http.post(`${API}/me/playlists/:id/tracks`, async ({ request }) => {
        added = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user, onClose, location } = panel();
    await user.click(screen.getByRole('button', { name: 'Save as playlist' }));
    await waitFor(() => expect(location()).toBe('/playlist/sonare:sun'));
    expect(added).toEqual({ trackIds: queue.map((t) => t.id) });
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText('Playlist saved')).toBeInTheDocument();
  });

  it('WEB-LAYOUT-024 a guest is asked to sign in first; an empty queue cannot be saved', async () => {
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const { user } = panel();
    await user.click(screen.getByRole('button', { name: 'Save as playlist' }));
    expect(navigate).toHaveBeenCalledWith('/signin', expect.anything());
    panel({ queue: [], index: 0 });
    expect(screen.getAllByRole('button', { name: 'Save as playlist' })[1]).toBeDisabled();
  });

  it('WEB-LAYOUT-025 the phone sheet has its own play button and a close button', async () => {
    const { user, p, onClose } = panel({ isPlaying: true }, { sheet: true });
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Close queue' }));
    expect(p.togglePlay).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('player keyboard shortcuts', () => {
  function Harness() {
    usePlayerShortcuts();
    return (
      <>
        <button>Some button</button>
        <input aria-label="Notes" />
        <span role="slider" tabIndex={0} aria-label="Fader" />
      </>
    );
  }
  const setup = (p = makePlayer({ queue: [song], index: 0 })) => ({
    ...renderWithProviders(<Harness />, { player: p }),
    p,
  });

  it('WEB-LAYOUT-026 Space plays or pauses from anywhere, but not while typing', async () => {
    const { user } = setup();
    await user.keyboard(' ');
    expect(player.toggle).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('textbox', { name: 'Notes' }));
    await user.keyboard(' ');
    expect(player.toggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue(' ');
  });

  it('WEB-LAYOUT-027 a clicked button does not swallow Space; a Tab-focused one keeps it', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Some button' }));
    await user.keyboard(' ');
    expect(player.toggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Some button' })).not.toHaveFocus();
    await user.click(document.body);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Some button' })).toHaveFocus();
    await user.keyboard(' ');
    expect(player.toggle).toHaveBeenCalledTimes(1);
  });

  it('WEB-LAYOUT-028 arrows seek 5 seconds; a quick double press changes song', async () => {
    const { p } = setup();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(player.seek).toHaveBeenLastCalledWith(65_000);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(p.next).toHaveBeenCalledTimes(1);
    vi.spyOn(performance, 'now').mockReturnValue(1e9);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(player.seek).toHaveBeenLastCalledWith(55_000);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(p.skipToPrevious).toHaveBeenCalledTimes(1);
    // Holding the key repeats the seek, it never counts as a double press.
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true });
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true });
    expect(p.next).toHaveBeenCalledTimes(1);
  });

  it('WEB-LAYOUT-029 up and down change the volume by 5%; modified keys are left alone', () => {
    setup();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(vi.mocked(player.setVolume).mock.calls.map((c) => c[0])).toEqual([0.55, 0.45]);
    fireEvent.keyDown(window, { key: ' ', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true });
    expect(player.toggle).not.toHaveBeenCalled();
    expect(player.setVolume).toHaveBeenCalledTimes(2);
  });

  it('WEB-LAYOUT-030 with nothing playing the arrows do not seek', () => {
    setup(makePlayer());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(player.seek).not.toHaveBeenCalled();
  });
});

describe('top bar', () => {
  it('WEB-LAYOUT-031 a guest sees Sign in; a signed-in user sees their initial; both reach settings', async () => {
    const { user, location, unmount } = renderWithProviders(<Topbar />, { route: '/home' });
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(location()).toBe('/signin');
    unmount();
    setSession('a', 'r', testUser);
    const signedIn = renderWithProviders(<Topbar />, { route: '/home' });
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    const profile = screen.getByRole('button', { name: 'Profile and settings' });
    expect(profile).toHaveTextContent('T');
    expect(profile).toHaveAttribute('data-tip', 'Test Listener · Profile and settings');
    await signedIn.user.click(profile);
    expect(signedIn.location()).toBe('/settings');
  });
});

describe('app shell', () => {
  function shell(route: string, store = makeStore()) {
    return renderWithProviders(
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<p>screen body</p>} />
        </Route>
      </Routes>,
      { route, store },
    );
  }

  it('WEB-LAYOUT-032 picks the desktop, tablet or phone shell by width, and drops chrome on now-playing', () => {
    const web = shell('/home');
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
    expect(screen.getByText('screen body')).toBeInTheDocument();
    web.unmount();

    setWidth(900);
    const tablet = shell('/home');
    expect(screen.getByRole('link', { name: 'Lists' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument();
    tablet.unmount();

    setWidth(390);
    const phone = shell('/home');
    expect(phone.container.querySelector('[data-shell="phone"]')).not.toBeNull();
    expect(within(screen.getByRole('navigation')).getByRole('link', { name: 'Search' })).toBeInTheDocument();
    phone.unmount();

    setWidth(1280);
    shell('/now-playing');
    expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument();
    expect(screen.getByText('screen body')).toBeInTheDocument();
  });

  it('WEB-LAYOUT-033 Ctrl+Q toggles the queue, Escape closes it, Ctrl+B collapses the sidebar', async () => {
    const store = makeStore();
    const { user } = shell('/home', store);
    await user.keyboard('{Control>}q{/Control}');
    expect(store.getState().ui.queueOpen).toBe(true);
    await user.keyboard('{Escape}');
    expect(store.getState().ui.queueOpen).toBe(false);
    await user.keyboard('{Control>}b{/Control}');
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
  });

  it('WEB-LAYOUT-034 Escape leaves a full-screen page, going home when there is no history', async () => {
    const { user, location } = shell('/lyrics');
    await user.keyboard('{Escape}');
    expect(location()).toBe('/home');
  });

  it('WEB-LAYOUT-035 shows toasts and lets them be dismissed', async () => {
    const { showToast } = await import('../../src/store/toasts');
    const { user } = shell('/home');
    act(() => showToast({ title: 'Added to queue', description: 'Nude' }));
    const region = screen.getByRole('status');
    expect(within(region).getByText('Added to queue')).toBeInTheDocument();
    // Earlier tests' toasts may still be up: close this one specifically.
    const toast = within(region).getByText('Added to queue').closest('.shadow-e3') as HTMLElement;
    await user.click(within(toast).getByRole('button', { name: 'Close message' }));
    await waitFor(() => expect(within(region).queryByText('Added to queue')).not.toBeInTheDocument());
  });
});
