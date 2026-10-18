import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Home from '../../src/screens/Home';
import Search from '../../src/screens/Search';
import Playlists from '../../src/screens/Playlists';
import { api, onAiUnavailable } from '../../src/api/api';
import { clearSession, setSession } from '../../src/api/auth';
import { setQuery } from '../../src/store/searchSlice';
import { setAiAvailable } from '../../src/store/aiSlice';
import { makePlayer, makeStore, renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';
import type { AiPick } from '../../../shared/apiTypes';

const toast = vi.hoisted(() => vi.fn());
vi.mock('../../src/store/toasts', () => ({ showToast: toast, dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

/** Search answers: a song per query, titled after it ("Kesariya Arijit Singh" → "Kesariya" by "Arijit Singh"). */
const catalog: Record<string, { title: string; artist: string }[]> = {};
const songFor = (title: string, artist: string) =>
  makeTrack({ id: `yt:${title.replace(/\W/g, '').toLowerCase()}`, title, artist, source: 'server' });

useMockServer(
  http.get(`${API}/trending`, () => HttpResponse.json(page([]))),
  http.get(`${API}/genres`, () => HttpResponse.json([])),
  http.get(`${API}/me/recently-played`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/most-played`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/favourites/ids`, () => HttpResponse.json({ ids: [] })),
  http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
  http.get(`${API}/search`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    const songs = catalog[q] ?? [];
    return HttpResponse.json(page(songs.map((s) => songFor(s.title, s.artist))));
  }),
);

afterEach(() => {
  clearSession();
  toast.mockClear();
  for (const k of Object.keys(catalog)) delete catalog[k];
});

const PICKS: AiPick[] = [
  { title: 'Channa Mereya', artist: 'Arijit Singh', reason: 'Because you play Arijit Singh' },
  { title: 'Lut Gaye', artist: 'Jubin Nautiyal' },
  { title: 'Made Up Song', artist: 'Nobody' },
  { title: 'Kesariya', artist: 'Arijit Singh', reason: 'A Brahmastra favourite' },
];
const searchable = (picks: AiPick[]) => {
  for (const p of picks) if (p.artist !== 'Nobody') catalog[`${p.title} ${p.artist}`] = [p];
};

const aiOn = () => makeStore({ available: true });

describe('AI features: hidden unless available', () => {
  it('WEB-AIUI-001 with AI off, or signed out, there is no AI on Home, Search or Playlists, and nothing asks the AI', async () => {
    const rec = recordRequests();
    setSession('a', 'r', testUser);
    const off = makeStore();
    renderWithProviders(<Home />, { store: off });
    off.dispatch(setQuery('sad punjabi songs'));
    renderWithProviders(<Search />, { store: off, route: '/search' });
    renderWithProviders(<Playlists />, { store: off });
    await screen.findAllByText('Welcome back, Test Listener');
    expect(screen.queryByText('You may like')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ask AI/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create with AI' })).not.toBeInTheDocument();

    clearSession();
    const on = aiOn();
    renderWithProviders(<Playlists />, { store: on });
    expect(screen.queryAllByRole('button', { name: 'Create with AI' })).toHaveLength(0);
    rec.stop();
    expect(rec.paths().filter((p) => p.includes('/ai/'))).toEqual([]);
  });

  it('WEB-AIUI-002 an AI_UNAVAILABLE answer turns the AI features off', async () => {
    const store = aiOn();
    onAiUnavailable(() => store.dispatch(setAiAvailable(false)));
    server.use(http.get(`${API}/ai/search`, () => apiError(503, 'AI_UNAVAILABLE', "AI isn't available right now.")));
    setSession('a', 'r', testUser);
    await expect(api.aiSearchPlan('anything')).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(store.getState().ai.available).toBe(false);
  });
});

describe('You may like', () => {
  it('WEB-AIUI-003 shows the songs found for the picks, with their reasons, once per session', async () => {
    setSession('a', 'r', testUser);
    searchable(PICKS);
    const rec = recordRequests();
    server.use(
      http.get(`${API}/me/ai/you-may-like`, () =>
        HttpResponse.json({ picks: PICKS, basedOn: ['Arijit Singh', 'Jubin Nautiyal'], generatedAt: 1 }),
      ),
    );
    const store = aiOn();
    const player = makePlayer();
    const { user, unmount } = renderWithProviders(<Home />, { store, player });
    const section = await screen.findByRole('region', { name: 'You may like' });
    expect(within(section).getByText('Based on Arijit Singh and Jubin Nautiyal')).toBeInTheDocument();
    expect(within(section).getByText('Because you play Arijit Singh')).toBeInTheDocument();
    // No reason: the artist instead. A pick nobody's search finds is left out.
    expect(within(section).getByText('Jubin Nautiyal')).toBeInTheDocument();
    expect(within(section).queryByText('Made Up Song')).not.toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: /Play Lut Gaye/ }));
    const queue = (player.playTrack as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(queue.map((t: { title: string }) => t.title)).toEqual(['Channa Mereya', 'Lut Gaye', 'Kesariya']);

    // Back to Home later: from the store, no new AI call or searches.
    unmount();
    const before = rec.paths().length;
    renderWithProviders(<Home />, { store });
    await screen.findByRole('region', { name: 'You may like' });
    rec.stop();
    expect(
      rec
        .paths()
        .slice(before)
        .filter((p) => p.includes('/ai/') || p.startsWith('GET /search')),
    ).toEqual([]);
    expect(rec.paths().filter((p) => p === 'GET /me/ai/you-may-like')).toHaveLength(1);
  });

  it('WEB-AIUI-004 shows nothing for no picks, an error, or fewer than 3 songs found', async () => {
    setSession('a', 'r', testUser);
    for (const answer of [
      () => HttpResponse.json({ picks: [], basedOn: [], generatedAt: 1 }),
      () => apiError(500, 'INTERNAL_ERROR'),
      () => HttpResponse.json({ picks: PICKS, basedOn: ['X'], generatedAt: 2 }),
    ]) {
      server.use(http.get(`${API}/me/ai/you-may-like`, answer));
      // Only two of the picks can be found.
      catalog['Channa Mereya Arijit Singh'] = [PICKS[0]];
      catalog['Lut Gaye Jubin Nautiyal'] = [PICKS[1]];
      const { unmount } = renderWithProviders(<Home />, { store: aiOn() });
      await screen.findByText('Welcome back, Test Listener');
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByText('You may like')).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('Ask AI on the search screen', () => {
  it('WEB-AIUI-005 asks only when tapped, runs the plan’s searches and lists their songs once each', async () => {
    setSession('a', 'r', testUser);
    catalog['Soch Hardy Sandhu'] = [{ title: 'Soch', artist: 'Hardy Sandhu' }];
    catalog['Qismat Ammy Virk'] = [
      { title: 'Qismat', artist: 'Ammy Virk' },
      { title: 'Soch', artist: 'Hardy Sandhu' },
    ];
    let asked = 0;
    server.use(
      http.get(`${API}/ai/search`, ({ request }) => {
        asked++;
        expect(new URL(request.url).searchParams.get('q')).toBe('sad punjabi songs');
        return HttpResponse.json({ summary: 'Sad Punjabi songs', queries: ['Soch Hardy Sandhu', 'Qismat Ammy Virk'] });
      }),
    );
    const store = aiOn();
    store.dispatch(setQuery('sad punjabi songs'));
    const player = makePlayer();
    const { user } = renderWithProviders(<Search />, { store, player, route: '/search' });
    const ask = await screen.findByRole('button', { name: 'Ask AI about “sad punjabi songs”' });
    expect(asked).toBe(0);

    await user.click(ask);
    const picks = await screen.findByRole('region', { name: 'AI picks' });
    expect(asked).toBe(1);
    expect(within(picks).getByText('Sad Punjabi songs')).toBeInTheDocument();
    expect(within(picks).getAllByText('Soch')).toHaveLength(1);
    await user.click(within(picks).getByText('Qismat'));
    expect(player.playTrack).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Qismat' }),
      [expect.objectContaining({ title: 'Soch' }), expect.objectContaining({ title: 'Qismat' })],
      { kind: 'Search', name: 'AI picks' },
    );
  });

  it('WEB-AIUI-006 a failed AI search says so in one line', async () => {
    setSession('a', 'r', testUser);
    server.use(http.get(`${API}/ai/search`, () => apiError(429, 'RATE_LIMITED', 'Too many AI requests.')));
    const store = aiOn();
    store.dispatch(setQuery('late night drive'));
    const { user } = renderWithProviders(<Search />, { store, route: '/search' });
    await user.click(await screen.findByRole('button', { name: /Ask AI/ }));
    expect(await screen.findByText('AI is busy right now. Try again later.')).toBeInTheDocument();
  });
});

describe('Create with AI', () => {
  const openDialog = async () => {
    setSession('a', 'r', testUser);
    const utils = renderWithProviders(<Playlists />, { store: aiOn() });
    await utils.user.click(await screen.findByRole('button', { name: 'Create with AI' }));
    await utils.user.type(
      screen.getByPlaceholderText('e.g. Rainy evening, Hindi acoustic'),
      'Rainy evening, Hindi acoustic',
    );
    return utils;
  };

  it('WEB-AIUI-007 makes the playlist from the songs found and opens it', async () => {
    searchable(PICKS);
    let created: unknown = null;
    let added: { trackIds: string[] } | null = null;
    server.use(
      http.post(`${API}/me/ai/playlist`, async ({ request }) => {
        expect(await request.json()).toEqual({ prompt: 'Rainy evening, Hindi acoustic', count: 15 });
        return HttpResponse.json({ name: 'Rainy Evening', description: 'Soft songs.', picks: PICKS });
      }),
      http.post(`${API}/me/playlists`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json(makePlaylist({ id: 'sonare:rain', name: 'Rainy Evening' }));
      }),
      http.post(`${API}/me/playlists/sonare%3Arain/tracks`, async ({ request }) => {
        added = (await request.json()) as { trackIds: string[] };
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user, location } = await openDialog();
    await user.click(screen.getByRole('button', { name: '15' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(location()).toBe('/playlist/sonare:rain'));
    expect(created).toEqual({ name: 'Rainy Evening', description: 'Soft songs.', kind: 'synced' });
    expect(added!.trackIds).toEqual(['yt:channamereya', 'yt:lutgaye', 'yt:kesariya']);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Made Rainy Evening', description: '3 songs' }),
    );
  });

  it('WEB-AIUI-008 too few songs found: says so and makes nothing', async () => {
    catalog['Channa Mereya Arijit Singh'] = [PICKS[0]];
    const rec = recordRequests();
    server.use(
      http.post(`${API}/me/ai/playlist`, () => HttpResponse.json({ name: 'X', description: '', picks: PICKS })),
    );
    const { user } = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(
      await screen.findByText("Couldn't find enough of those songs. Try describing it differently."),
    ).toBeInTheDocument();
    rec.stop();
    expect(rec.paths()).not.toContain('POST /me/playlists');
  });

  it('WEB-AIUI-009 Cancel while the AI is thinking closes it and makes nothing', async () => {
    let answer: (() => void) | null = null;
    const rec = recordRequests();
    server.use(
      http.post(
        `${API}/me/ai/playlist`,
        () =>
          new Promise<Response>((resolve) => {
            answer = () => resolve(HttpResponse.json({ name: 'X', description: '', picks: PICKS }));
          }),
      ),
    );
    searchable(PICKS);
    const { user } = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Asking AI…')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    answer!();
    await new Promise((r) => setTimeout(r, 50));
    rec.stop();
    expect(rec.paths().some((p) => p.startsWith('GET /search'))).toBe(false);
    expect(rec.paths()).not.toContain('POST /me/playlists');
  });
});
