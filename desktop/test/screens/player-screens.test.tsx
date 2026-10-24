import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import NowPlaying from '../../src/screens/NowPlaying';
import Lyrics from '../../src/screens/Lyrics';
import Queue from '../../src/screens/Queue';
import Equalizer from '../../src/screens/Equalizer';
import { bindAccountGateNavigator, takePendingAction } from '../../src/api/accountGate';
import { updateDevicePrefs } from '../../src/storage/devicePrefs';
import { clearSession, setSession } from '../../src/api/auth';
import { getDsp, setDsp, EQ_PRESETS } from '../../src/audio/dsp';
import { getSpatial, setSpatial, getSpatialBypass, setSpatialBypass, setSpatialSupport } from '../../src/audio/spatial';
import { getSettings, updateSettings } from '../../src/storage/settings';
import * as player from '../../src/audio/player';
import { makePlayer, makeStore, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';
import { chooseOption } from '../helpers/dialogs';
import { resetLyricsCache } from '../../src/api/lyricsAvailability';
import BottomPlayer from '../../src/components/layout/BottomPlayer';

const toast = vi.hoisted(() => vi.fn());
vi.mock('../../src/store/toasts', () => ({ showToast: toast, dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));
vi.mock('../../src/audio/player', () => ({ retry: vi.fn(async () => {}) }));

useMockServer(
  http.get(`${API}/tracks/:id/peaks`, () => HttpResponse.json({ peaks: [0.2, 0.8] })),
  // The Lyrics buttons ask once per song whether there are lyrics.
  http.get(`${API}/tracks/:id/lyrics`, () =>
    HttpResponse.json({ synced: false, provider: 'lrclib', offsetMs: 0, lines: [], plain: 'La' }),
  ),
);

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
  resetLyricsCache();
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
    expect(screen.getByText('Playing from Album')).toBeInTheDocument();
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

  it('WEB-NP-007 "Add to playlist" opens the playlist picker for the song', async () => {
    setSession('a', 'r', testUser);
    server.use(
      http.get(`${API}/me/playlists`, () =>
        HttpResponse.json(page([makePlaylist({ id: 'sonare:p', name: 'Night drive' })])),
      ),
    );
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Add to playlist' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add to playlist' });
    expect(dialog).toHaveTextContent('Nude');
    expect(await within(dialog).findByRole('button', { name: /Night drive/ })).toBeInTheDocument();
  });

  it('WEB-NP-008 a guest is asked to sign up first, and gets the picker once signed in', async () => {
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    server.use(http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))));
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Add to playlist' }));
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { reason: 'Create a free account to make playlists.', mode: 'signup' },
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // What SignIn does after a successful sign-in.
    setSession('a', 'r', testUser);
    act(() => void takePendingAction()?.());
    expect(await screen.findByRole('dialog', { name: 'Add to playlist' })).toHaveTextContent('Nude');
  });

  it('WEB-NP-009 there is no output picker: Sonare plays on the system output', () => {
    open();
    expect(screen.queryByRole('button', { name: /^Audio output/ })).not.toBeInTheDocument();
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

  it('WEB-LYRICS-003 a signed-in user nudges the timing: it moves at once and is saved once, after the taps', async () => {
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
    expect(screen.getAllByText(/−0\.3s/).length).toBeGreaterThan(0);
    // Nothing is sent while the taps keep coming; one save follows the last one.
    expect(offsets).toEqual([]);
    await waitFor(() => expect(offsets).toEqual([{ offsetMs: -250 }]));
    await new Promise((r) => setTimeout(r, 700));
    expect(offsets).toEqual([{ offsetMs: -250 }]);
  });

  it('WEB-LYRICS-004 a guest fixing the timing is asked to create an account', async () => {
    lyricsEndpoint();
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const rec = recordRequests();
    const { user } = open();
    await screen.findByText('Second line');
    await user.click(screen.getByRole('button', { name: 'Show lyrics later' }));
    await new Promise((r) => setTimeout(r, 700));
    rec.stop();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { reason: 'Create a free account to fix the timing of lyrics.', mode: 'signup' },
    });
    expect(rec.paths().filter((p) => !p.startsWith('GET'))).toEqual([]);
  });

  it('WEB-LYRICS-005 lyrics are read-only: no editing, adding or importing', async () => {
    setSession('a', 'r', testUser);
    lyricsEndpoint();
    const { container } = open();
    await screen.findByText('Second line');
    expect(screen.queryByRole('button', { name: /Edit lyrics|Add lyrics|Import/ })).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('WEB-LYRICS-006 a timing change still waiting is saved when the screen closes', async () => {
    setSession('a', 'r', testUser);
    lyricsEndpoint();
    const offsets: unknown[] = [];
    server.use(
      http.patch(`${API}/tracks/:id/lyrics/offset`, async ({ request }) => {
        offsets.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user, unmount } = open();
    await screen.findByText('Second line');
    await user.click(screen.getByRole('button', { name: 'Show lyrics later' }));
    unmount();
    await waitFor(() => expect(offsets).toEqual([{ offsetMs: 250 }]));
  });

  it('WEB-LYRICS-007 the auto-scroll switch is there for synced lyrics only', async () => {
    lyricsEndpoint();
    const first = open();
    await screen.findByText('Second line');
    expect(screen.getByRole('switch', { name: 'Toggle auto-scroll' })).toBeInTheDocument();
    first.unmount();
    resetLyricsCache();
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, () =>
        HttpResponse.json({ synced: false, provider: 'lrclib', offsetMs: 0, lines: [], plain: 'Verse one' }),
      ),
    );
    open();
    expect(await screen.findByText('Verse one')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Toggle auto-scroll' })).not.toBeInTheDocument();
  });

  it('WEB-LYRICS-008 plain-text view drops timestamps; auto-scroll can be switched off and is remembered', async () => {
    lyricsEndpoint();
    const { user } = open();
    await screen.findByText('Second line');
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Plain text' }));
    expect(screen.getByText(/First line\s+Second line\s+Third line/)).toBeInTheDocument();
    expect(active()).toBeUndefined();
    await user.click(screen.getByRole('switch', { name: 'Toggle auto-scroll' }));
    expect(localStorage.getItem('sonare_lyrics_autoscroll')).toBe('false');
  });

  it('WEB-LYRICS-009 unsynced lyrics show as plain text with no timing controls', async () => {
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, () =>
        HttpResponse.json({ synced: false, provider: 'lrclib', offsetMs: 0, lines: [], plain: 'Verse one\nVerse two' }),
      ),
    );
    open();
    expect(await screen.findByText(/Verse one\s+Verse two/)).toBeInTheDocument();
    expect(screen.getByText('LRCLIB')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show lyrics later' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Toggle auto-scroll' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Synced' })).toBeDisabled();
  });

  it('WEB-LYRICS-010 with nothing playing it says so', () => {
    renderWithProviders(<Lyrics />);
    expect(screen.getByText('No track selected')).toBeInTheDocument();
  });

  it('WEB-LYRICS-011 asks for lyrics in the preferred script, and asks again when it changes', async () => {
    const asked: (string | null)[] = [];
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('script'));
        return HttpResponse.json({ synced: true, provider: 'lrclib', offsetMs: 0, lines });
      }),
    );
    updateDevicePrefs({ lyricsScript: 'latin' });
    open();
    await screen.findByText('Second line');
    expect(asked).toEqual(['latin']);
    act(() => updateDevicePrefs({ lyricsScript: 'original' }));
    // "Original" sends no script at all.
    await waitFor(() => expect(asked).toEqual(['latin', null]));
  });

  it("WEB-LYRICS-012 a song whose lyrics can't be found gets a disabled Lyrics button with a tooltip", async () => {
    let answer!: () => void;
    const gate = new Promise<void>((r) => (answer = r));
    let asked = 0;
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, async () => {
        asked++;
        await gate;
        return apiError(404, 'NOT_FOUND', 'Lyrics not found');
      }),
    );
    const p = makePlayer({ queue: [song], index: 0, positionMs: 1_000 });
    renderWithProviders(
      <>
        <BottomPlayer />
        <NowPlaying />
      </>,
      { player: p, route: '/now-playing' },
    );
    // Unknown while the one request is out: both buttons work.
    for (const el of screen.getAllByLabelText('Lyrics')) expect(el).toHaveAttribute('href', '/lyrics');
    answer();
    await waitFor(() =>
      expect(screen.getAllByLabelText('Lyrics').every((el) => el.getAttribute('aria-disabled') === 'true')).toBe(true),
    );
    for (const el of screen.getAllByLabelText('Lyrics')) {
      expect(el).not.toHaveAttribute('href');
      expect(el).toHaveAttribute('data-tip', "Lyrics aren't available for this song right now");
    }
    expect(asked).toBe(1);
  });

  it('WEB-LYRICS-013 a guest who signs in to fix the timing gets that change saved', async () => {
    lyricsEndpoint();
    const offsets: unknown[] = [];
    server.use(
      http.patch(`${API}/tracks/:id/lyrics/offset`, async ({ request }) => {
        offsets.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    bindAccountGateNavigator(vi.fn());
    const first = open();
    await screen.findByText('Second line');
    await first.user.click(screen.getByRole('button', { name: 'Show lyrics later' }));
    expect(offsets).toEqual([]);
    first.unmount();
    setSession('a', 'r', testUser);
    await takePendingAction()?.();
    open();
    await waitFor(() => expect(offsets).toEqual([{ offsetMs: 250 }]));
  });

  it('WEB-LYRICS-014 LRCLIB down says so and retries, instead of "No lyrics"', async () => {
    let down = true;
    server.use(
      http.get(`${API}/tracks/:id/lyrics`, () =>
        down
          ? apiError(502, 'LYRICS_UNAVAILABLE', "The lyrics service isn't responding. Try again in a moment.")
          : HttpResponse.json({ synced: false, provider: 'lrclib', offsetMs: 0, lines: [], plain: 'Back again' }),
      ),
    );
    const { user } = open();
    expect(await screen.findByText("Couldn't load lyrics")).toBeInTheDocument();
    expect(screen.getByText("The lyrics service isn't responding. Try again in a moment.")).toBeInTheDocument();
    expect(screen.queryByText('No lyrics available for this track')).not.toBeInTheDocument();
    down = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Back again')).toBeInTheDocument();
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
    setDsp({
      enabled: true,
      preset: 'Flat',
      gains: [...EQ_PRESETS.Flat],
      bassBoost: 0,
      virtualizer: 0,
      speed: 1,
      crossfade: false,
      crossfadeMs: 6000,
      fades: false,
    });
    updateSettings({ gapless: false, normalization: true });
    setSpatial({ enabled: false, mode: 'presets', preset: 'concert' });
    setSpatialBypass(false);
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
    await chooseOption(user, 'Playback speed', '1.25×');
    expect(getDsp().speed).toBe(1.25);
  });

  it('WEB-EQ-005 gapless and normalization switches update the account settings', async () => {
    updateSettings({ gapless: false, normalization: true });
    const { user } = renderWithProviders(<Equalizer />);
    await user.click(screen.getByRole('switch', { name: 'Toggle gapless playback' }));
    await user.click(screen.getByRole('switch', { name: 'Toggle volume normalization' }));
    expect(getSettings()).toMatchObject({ gapless: true, normalization: false });
  });

  it('WEB-EQ-006 the crossfade switch turns crossfade on; gapless then says it skips one album', async () => {
    const { user } = renderWithProviders(<Equalizer />);
    expect(screen.getByText('Seamless album transitions')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Toggle crossfade' }));
    expect(getDsp().crossfade).toBe(true);
    expect(screen.getByText('No crossfade between tracks of one album')).toBeInTheDocument();
  });

  it('WEB-EQ-017 crossfade length slider and fade-on-play-pause switch control dsp state', async () => {
    const { user } = renderWithProviders(<Equalizer />);
    // Fade on play & pause switch
    const fadeSwitch = screen.getByRole('switch', { name: 'Toggle fade on play & pause' });
    expect(getDsp().fades).toBe(false);
    await user.click(fadeSwitch);
    expect(getDsp().fades).toBe(true);

    // Crossfade length slider hidden when crossfade is off
    expect(screen.queryByRole('slider', { name: 'Crossfade length' })).toBeNull();

    // Turn crossfade on
    await user.click(screen.getByRole('switch', { name: 'Toggle crossfade' }));
    const slider = screen.getByRole('slider', { name: 'Crossfade length' });
    expect(slider).toBeInTheDocument();
    expect(screen.getByText('6 s')).toBeInTheDocument();

    slider.focus();
    await user.keyboard('{ArrowRight}');
    expect(getDsp().crossfadeMs).toBe(6500);
    expect(screen.getByText('6.5 s')).toBeInTheDocument();
  });

  it('WEB-EQ-007 toggling spatial audio enables presets and soundstage controls', async () => {
    const { user } = renderWithProviders(<Equalizer />);
    expect(getSpatial().enabled).toBe(false);
    await user.click(screen.getByRole('switch', { name: 'Toggle spatial audio' }));
    expect(getSpatial().enabled).toBe(true);
  });

  it('WEB-EQ-008 selecting spatial presets switches active acoustic profile', async () => {
    setSpatial({ enabled: true, mode: 'presets', preset: 'concert' });
    const { user } = renderWithProviders(<Equalizer />);
    await user.click(screen.getByRole('radio', { name: /Café/i }));
    expect(getSpatial().preset).toBe('cafe');
    expect(screen.getByRole('radio', { name: /Café/i })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: /Hall/i }));
    expect(getSpatial().preset).toBe('hall');
  });

  it('WEB-EQ-009 switching to custom soundstage mode displays the 2D disc and controls', async () => {
    setSpatial({ enabled: true, mode: 'presets' });
    const { user } = renderWithProviders(<Equalizer />);
    await user.click(screen.getByRole('button', { name: 'Custom Soundstage' }));
    expect(getSpatial().mode).toBe('custom');
    expect(screen.getByRole('application', { name: /Soundstage 2D position disc/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Soundstage distance' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Soundstage width' })).toBeInTheDocument();
  });

  it('WEB-EQ-010 dragging soundstage marker or using arrow keys updates custom coordinates', async () => {
    setSpatial({ enabled: true, mode: 'custom', custom: { x: 0, y: 0.3, intensity: 70, ambience: 30, width: 60 } });
    const { user } = renderWithProviders(<Equalizer />);
    const disc = screen.getByRole('application', { name: /Soundstage 2D position disc/i });
    disc.focus();
    const prevY = getSpatial().custom.y;
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(getSpatial().custom.y).toBeGreaterThan(prevY);

    await user.click(screen.getByRole('button', { name: 'Behind' }));
    expect(getSpatial().custom.y).toBeLessThan(0);
  });

  it('WEB-EQ-011 spatial controls sliders adjust distance, width, intensity, and ambience', async () => {
    setSpatial({ enabled: true, mode: 'custom', custom: { x: 0, y: 0.4, intensity: 70, ambience: 30, width: 60 } });
    const { user } = renderWithProviders(<Equalizer />);
    const widthSlider = screen.getByRole('slider', { name: 'Soundstage width' });
    widthSlider.focus();
    await user.keyboard('{End}');
    expect(getSpatial().custom.width).toBe(100);

    const intensitySlider = screen.getByRole('slider', { name: 'Spatial intensity' });
    intensitySlider.focus();
    await user.keyboard('{Home}');
    expect(getSpatial().custom.intensity).toBe(0);
  });

  it('WEB-EQ-012 compare bypass button toggles temporary bypass without altering settings', async () => {
    setSpatial({ enabled: true, mode: 'presets', preset: 'concert' });
    const { user } = renderWithProviders(<Equalizer />);
    expect(getSpatialBypass()).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Compare' }));
    expect(getSpatialBypass()).toBe(true);
    expect(getSpatial().enabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Hearing original' }));
    expect(getSpatialBypass()).toBe(false);
  });

  it('WEB-EQ-013 the soundstage marker lands under the pointer: the disc edge is the farthest distance', () => {
    setSpatial({ enabled: true, mode: 'custom', custom: { x: 0, y: 0.3, intensity: 70, ambience: 30, width: 60 } });
    renderWithProviders(<Equalizer />);
    const svg = screen.getByRole('application', { name: /Soundstage 2D position disc/i }).querySelector('svg')!;
    // 240 px square: the disc (radius 95 of the 120-unit half viewBox) is 95 px around (120, 120).
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 240, height: 240, right: 240, bottom: 240 }) as DOMRect;
    svg.setPointerCapture = vi.fn();
    svg.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: 120, clientY: 25 });
    expect(getSpatial().custom.x).toBeCloseTo(0, 5);
    expect(getSpatial().custom.y).toBeCloseTo(1, 5);

    // Half way out to the right, then let go there.
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 167.5, clientY: 120 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 167.5, clientY: 120 });
    expect(getSpatial().custom.x).toBeCloseTo(0.5, 5);
    expect(getSpatial().custom.y).toBeCloseTo(0, 5);
    expect(screen.getByText(/Right \(90°\)/)).toBeInTheDocument();
  });

  it('WEB-EQ-014 leaving the Audio screen ends Compare, and Reset position keeps the sliders', async () => {
    setSpatial({ enabled: true, mode: 'custom', custom: { x: 0.6, y: -0.5, intensity: 20, ambience: 90, width: 10 } });
    const { user, unmount } = renderWithProviders(<Equalizer />);
    await user.click(screen.getByRole('button', { name: 'Reset position' }));
    expect(getSpatial().custom).toMatchObject({ x: 0, y: 0.4, intensity: 20, ambience: 90, width: 10 });

    await user.click(screen.getByRole('button', { name: 'Compare' }));
    expect(getSpatialBypass()).toBe(true);
    unmount();
    expect(getSpatialBypass()).toBe(false);
  });

  it('WEB-EQ-015 without Web Audio the section says so and spatial audio cannot be switched on', () => {
    setSpatialSupport('none');
    try {
      renderWithProviders(<Equalizer />);
      expect(screen.getByText(/needs Web Audio/)).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Toggle spatial audio' })).toBeDisabled();
    } finally {
      setSpatialSupport('pending');
    }
  });

  it('WEB-EQ-016 in offline mode the spatial preset cards use the gold accent', () => {
    setSpatial({ enabled: true, mode: 'presets', preset: 'hall' });
    renderWithProviders(<Equalizer />, { mode: 'offline' });
    expect(screen.getByRole('radio', { name: /Hall/i })).toHaveClass('border-gold');
  });
});
