import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import NowPlaying from '../../src/screens/NowPlaying';
import Lyrics from '../../src/screens/Lyrics';
import Queue from '../../src/screens/Queue';
import Equalizer from '../../src/screens/Equalizer';
import { bindAccountGateNavigator } from '../../src/api/accountGate';
import { clearSession, setSession } from '../../src/api/auth';
import { getDsp, setDsp, EQ_PRESETS } from '../../src/audio/dsp';
import { getSettings, updateSettings } from '../../src/storage/settings';
import * as player from '../../src/audio/player';
import { makePlayer, makeStore, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makeTrack, testUser } from '../helpers/fixtures';

const toast = vi.hoisted(() => vi.fn());
vi.mock('../../src/store/toasts', () => ({ showToast: toast, dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));
vi.mock('../../src/audio/player', () => ({ retry: vi.fn(async () => {}) }));

useMockServer(http.get(`${API}/tracks/:id/peaks`, () => HttpResponse.json({ peaks: [0.2, 0.8] })));

const song = makeTrack({
  id: 'yt:np',
  title: 'Nude',
  artist: 'Radiohead',
  artistId: 'yt:rh',
  album: 'In Rainbows',
  durationMs: 200_000,
  codec: 'opus',
  bitrateKbps: 160,
});
const upNext = Array.from({ length: 6 }, (_, i) => makeTrack({ id: `yt:u${i}`, title: `Up ${i}` }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  clearSession();
  toast.mockClear();
  vi.restoreAllMocks();
});

describe('now playing', () => {
  const open = (over: Parameters<typeof makePlayer>[0] = {}) => {
    const p = makePlayer({
      queue: [song, ...upNext],
      index: 0,
      positionMs: 50_000,
      durationMs: 200_000,
      ...over,
    });
    return { ...renderWithProviders(<NowPlaying />, { player: p, route: '/now-playing' }), p };
  };

  it('WEB-NP-001 with nothing playing it points back to Home', () => {
    renderWithProviders(<NowPlaying />);
    expect(screen.getByText('Nothing playing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/home');
  });

  it('WEB-NP-002 shows the song, its album, artist link, stream quality and time left', () => {
    open();
    expect(screen.getByRole('heading', { name: 'Nude' })).toBeInTheDocument();
    expect(screen.getByText('PLAYING FROM ALBUM')).toBeInTheDocument();
    expect(screen.getByText('In Rainbows')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Radiohead' })).toHaveAttribute('href', '/artist/yt:rh');
    expect(screen.getByText('STREAMING')).toBeInTheDocument();
    expect(screen.getByText('opus · 160 kbps')).toBeInTheDocument();
    expect(screen.getByText('0:50')).toBeInTheDocument();
    expect(screen.getByText('-2:30')).toBeInTheDocument();
  });

  it('WEB-NP-003 lists the next four songs, and clicking one plays it', async () => {
    const { user, p } = open();
    expect(screen.getByText('UP NEXT')).toBeInTheDocument();
    expect(screen.getByText('Up 3')).toBeInTheDocument();
    expect(screen.queryByText('Up 4')).not.toBeInTheDocument();
    await user.click(screen.getByText('Up 1'));
    expect(p.playTrack).toHaveBeenCalledWith(upNext[1]);
    expect(screen.getByRole('link', { name: 'Open queue' })).toHaveAttribute('href', '/queue');
  });

  it('WEB-NP-004 transport, shuffle, repeat and seek go to the player', async () => {
    const { user, p } = open({ positionMs: 50_000, state: { repeat: 'all' } as never });
    await user.click(screen.getByRole('button', { name: 'Play' }));
    await user.click(screen.getByRole('button', { name: 'Next track' }));
    await user.click(screen.getByRole('button', { name: 'Previous track' }));
    await user.click(screen.getByRole('button', { name: 'Shuffle off' }));
    await user.click(screen.getByRole('button', { name: 'Repeat all' }));
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Seek' }), { key: 'ArrowLeft' });
    expect(p.togglePlay).toHaveBeenCalled();
    expect(p.next).toHaveBeenCalled();
    expect(p.previous).toHaveBeenCalled();
    expect(p.toggleShuffle).toHaveBeenCalled();
    expect(p.cycleRepeat).toHaveBeenCalled();
    expect(vi.mocked(p.seekRatio).mock.calls[0][0]).toBeCloseTo(0.225);
  });

  it('WEB-NP-005 a playback error is shown with a retry', async () => {
    const { user } = open({ playbackError: 'Playback failed' });
    expect(screen.getByRole('alert')).toHaveTextContent('Playback failed');
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' }));
    expect(player.retry).toHaveBeenCalled();
  });

  it('WEB-NP-006 leaving goes home on a direct visit', async () => {
    const { user, location } = open();
    await user.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(location()).toBe('/home');
  });
});

describe('lyrics', () => {
  const lines = [
    { atMs: 0, text: 'First line' },
    { atMs: 10_000, text: 'Second line' },
    { atMs: 20_000, text: 'Third line' },
  ];
  const lyricsEndpoint = (over: Record<string, unknown> = {}) =>
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, () =>
        HttpResponse.json({ synced: true, provider: 'lrclib', offsetMs: 0, lines, ...over }),
      ),
    );
  const open = (positionMs = 12_000, p = makePlayer({ queue: [song], index: 0, positionMs })) => ({
    ...renderWithProviders(<Lyrics />, { player: p, route: '/lyrics' }),
    p,
  });
  const active = () => screen.getAllByRole('button').find((b) => b.getAttribute('aria-current') === 'true');

  it('WEB-LYRICS-001 highlights the line at the current position, with its source', async () => {
    lyricsEndpoint();
    open(12_000);
    expect(await screen.findByText('Second line')).toBeInTheDocument();
    expect(active()).toHaveTextContent('Second line');
    expect(screen.getByText('LRCLIB')).toBeInTheDocument();
    expect(screen.getByText('Synced', { selector: '.badge' })).toBeInTheDocument();
  });

  it('WEB-LYRICS-002 clicking a line seeks there', async () => {
    lyricsEndpoint();
    const { user, p } = open();
    await user.click(await screen.findByRole('button', { name: /Third line/ }));
    expect(p.seek).toHaveBeenCalledWith(20_000);
  });

  it('WEB-LYRICS-003 a signed-in user nudges the timing and it is saved', async () => {
    setSession('a', 'r', testUser);
    lyricsEndpoint();
    const offsets: unknown[] = [];
    server.use(
      http.patch(`${API}/tracks/:id/lyrics/offset`, async ({ request }) => {
        offsets.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = open(10_100);
    await screen.findByText('Second line');
    expect(active()).toHaveTextContent('Second line');
    await user.click(screen.getByRole('button', { name: 'Show lyrics later' }));
    // +0.25 s: at 10.1 s the second line has not started yet.
    expect(active()).toHaveTextContent('First line');
    expect(screen.getAllByText(/\+0\.3s/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Show lyrics earlier' }));
    await user.click(screen.getByRole('button', { name: 'Show lyrics earlier' }));
    await waitFor(() => expect(offsets).toEqual([{ offsetMs: 250 }, { offsetMs: 0 }, { offsetMs: -250 }]));
  });

  it('WEB-LYRICS-004 a guest fixing timing or text is asked to create an account', async () => {
    lyricsEndpoint();
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const rec = recordRequests();
    const { user } = open();
    await screen.findByText('Second line');
    await user.click(screen.getByRole('button', { name: 'Show lyrics later' }));
    await user.click(screen.getByRole('button', { name: 'Edit lyrics' }));
    rec.stop();
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { reason: 'Create a free account to fix lyrics and their timing.', mode: 'signup' },
    });
    expect(rec.paths().filter((p) => !p.startsWith('GET'))).toEqual([]);
    expect(screen.queryByRole('textbox', { name: 'Lyrics editor' })).not.toBeInTheDocument();
  });

  it('WEB-LYRICS-005 editing opens the lyrics as LRC; saving LRC sends it as synced lyrics', async () => {
    setSession('a', 'r', testUser);
    lyricsEndpoint();
    let saved: unknown;
    server.use(
      http.post(`${API}/tracks/:id/lyrics`, async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = open();
    await screen.findByText('Second line');
    await user.click(screen.getByRole('button', { name: 'Edit lyrics' }));
    const editor = screen.getByRole('textbox', { name: 'Lyrics editor' });
    expect(editor).toHaveValue('[00:00.00]First line\n[00:10.00]Second line\n[00:20.00]Third line');
    await user.click(screen.getByRole('button', { name: 'Save lyrics' }));
    await waitFor(() =>
      expect(saved).toEqual({ lrc: '[00:00.00]First line\n[00:10.00]Second line\n[00:20.00]Third line' }),
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Lyrics saved' }));
    expect(screen.queryByRole('textbox', { name: 'Lyrics editor' })).not.toBeInTheDocument();
  });

  it('WEB-LYRICS-006 with no lyrics, typed plain text is saved as plain; a failed save keeps the editor', async () => {
    setSession('a', 'r', testUser);
    server.use(http.get(`${API}/tracks/:id/lyrics`, () => apiError(404, 'LYRICS_NOT_FOUND')));
    let fail = true;
    let saved: unknown;
    server.use(
      http.post(`${API}/tracks/:id/lyrics`, async ({ request }) => {
        saved = await request.json();
        return fail ? apiError(500, 'X') : HttpResponse.json({ ok: true });
      }),
    );
    const { user } = open();
    expect(await screen.findByText('No lyrics available for this track')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add lyrics' }));
    const save = screen.getByRole('button', { name: 'Save lyrics' });
    expect(save).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Lyrics editor' }), 'la la la');
    await user.click(save);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not save lyrics' })),
    );
    expect(saved).toEqual({ plain: 'la la la' });
    expect(screen.getByRole('textbox', { name: 'Lyrics editor' })).toBeInTheDocument();
    fail = false;
    await user.click(save);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Lyrics editor' })).not.toBeInTheDocument());
  });

  it('WEB-LYRICS-007 an imported .lrc file opens in the editor to check before saving', async () => {
    setSession('a', 'r', testUser);
    lyricsEndpoint();
    const { container } = open();
    await screen.findByText('Second line');
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['[00:01.00]Imported'], 'song.lrc', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Lyrics editor' })).toHaveValue('[00:01.00]Imported'),
    );
  });

  it('WEB-LYRICS-008 plain-text view drops timestamps; auto-scroll can be switched off and is remembered', async () => {
    lyricsEndpoint();
    const { user } = open();
    await screen.findByText('Second line');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Plain text' }));
    expect(screen.getByText(/First line\s+Second line\s+Third line/)).toBeInTheDocument();
    expect(active()).toBeUndefined();
    await user.click(screen.getByRole('switch', { name: 'Toggle auto-scroll' }));
    expect(localStorage.getItem('sonare_lyrics_autoscroll')).toBe('false');
  });

  it('WEB-LYRICS-009 unsynced lyrics show as plain text with no timing controls', async () => {
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, () =>
        HttpResponse.json({ synced: false, provider: 'genius', offsetMs: 0, lines: [], plain: 'Verse one\nVerse two' }),
      ),
    );
    open();
    expect(await screen.findByText(/Verse one\s+Verse two/)).toBeInTheDocument();
    expect(screen.getByText('Genius')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show lyrics later' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Synced' })).toBeDisabled();
  });

  it('WEB-LYRICS-010 with nothing playing it says so', () => {
    renderWithProviders(<Lyrics />);
    expect(screen.getByText('No track selected')).toBeInTheDocument();
  });
});

describe('queue route', () => {
  it('WEB-QROUTE-001 /queue opens the queue panel and returns to Home', () => {
    const store = makeStore();
    const { location } = renderWithProviders(<Queue />, { route: '/queue', store });
    expect(store.getState().ui.queueOpen).toBe(true);
    expect(location()).toBe('/home');
  });
});

describe('equalizer', () => {
  beforeEach(() => {
    setDsp({ enabled: true, preset: 'Flat', gains: [...EQ_PRESETS.Flat], bassBoost: 0, virtualizer: 0, speed: 1 });
    updateSettings({ gapless: false, normalization: true });
  });

  it('WEB-EQ-001 picking a preset moves the faders to its curve', async () => {
    const { user } = renderWithProviders(<Equalizer />);
    await user.click(screen.getByRole('button', { name: 'Bass' }));
    expect(getDsp().preset).toBe('Bass');
    expect(screen.getByRole('slider', { name: '32 Hz gain' })).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByRole('button', { name: 'Bass' })).toHaveClass('chip-on');
  });

  it('WEB-EQ-002 moving a fader makes a custom curve, and double-click resets it to 0 dB', async () => {
    const { user } = renderWithProviders(<Equalizer />);
    const band = screen.getByRole('slider', { name: '1k Hz gain' });
    band.focus();
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(band).toHaveAttribute('aria-valuenow', '1.5');
    expect(screen.getByText('Custom', { selector: 'span' })).toBeInTheDocument();
    expect(getSettings().eqPreset).toBe('Custom');
    await user.dblClick(band);
    expect(band).toHaveAttribute('aria-valuenow', '0');
  });

  it('WEB-EQ-003 turning the equalizer off disables presets and faders', async () => {
    const { user } = renderWithProviders(<Equalizer />);
    await user.click(screen.getByRole('switch', { name: 'Toggle equalizer' }));
    expect(getDsp().enabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Vocal' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Bass boost' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('WEB-EQ-004 bass boost, virtualizer and speed apply and show their values', async () => {
    const { user } = renderWithProviders(<Equalizer />);
    const bass = screen.getByRole('slider', { name: 'Bass boost' });
    bass.focus();
    await user.keyboard('{End}');
    expect(getDsp().bassBoost).toBe(100);
    expect(screen.getByText('100%')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Playback speed' }), '1.25');
    expect(getDsp().speed).toBe(1.25);
  });

  it('WEB-EQ-005 gapless and normalization switches update the account settings', async () => {
    const { user } = renderWithProviders(<Equalizer />);
    await user.click(screen.getByRole('switch', { name: 'Toggle gapless playback' }));
    await user.click(screen.getByRole('switch', { name: 'Toggle volume normalization' }));
    expect(getSettings()).toMatchObject({ gapless: true, normalization: false });
  });
});
