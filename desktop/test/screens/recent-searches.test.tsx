import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import Search from '../../src/screens/Search';
import SearchField from '../../src/components/layout/SearchField';
import { addRecent } from '../../src/store/searchSlice';
import { makeStore, renderWithProviders } from '../helpers/render';
import { API, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { makeTrack, page } from '../helpers/fixtures';

vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

useMockServer(
  http.get(`${API}/genres`, () => HttpResponse.json([{ id: 'g', name: 'Indie' }])),
  http.get(`${API}/search/suggestions`, () => HttpResponse.json([])),
);

describe('recent searches', () => {
  it('WEB-RECENTSEARCH-001 a query whose result was used is offered again, and picking it searches for it', async () => {
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        const type = new URL(request.url).searchParams.get('type');
        return HttpResponse.json(
          type === 'songs'
            ? page([makeTrack({ id: 'yt:r1', title: 'Paranoid Android', artist: 'Radiohead' })])
            : page([]),
        );
      }),
    );
    const { user } = renderWithProviders(
      <>
        <SearchField />
        <Search />
      </>,
    );
    await user.type(screen.getByRole('combobox', { name: 'Search' }), 'android');
    expect(await screen.findByText('Top result')).toBeInTheDocument();
    // Results that appear while typing aren't remembered until one is used.
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.queryByText('Recent searches')).not.toBeInTheDocument();
    await user.type(screen.getByRole('combobox', { name: 'Search' }), 'android');
    await user.click((await screen.findAllByRole('button', { name: /Play Paranoid Android|Paranoid Android/ }))[0]);
    // With the field emptied the remembered query is offered back.
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByText('Recent searches')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search for android' }));
    expect(await screen.findByText('Top result')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search' })).toHaveValue('android');
  });

  it('WEB-RECENTSEARCH-002 pressing Enter remembers the typed query at once', async () => {
    const store = makeStore();
    const { user } = renderWithProviders(<SearchField />, { store });
    await user.type(screen.getByRole('combobox', { name: 'Search' }), 'karma');
    await user.keyboard('{Enter}');
    expect(store.getState().search.recent).toEqual(['karma']);
  });

  it('WEB-RECENTSEARCH-003 picking a suggestion remembers the completed query', async () => {
    server.use(http.get(`${API}/search/suggestions`, () => HttpResponse.json(['karma police'])));
    const store = makeStore();
    const { user } = renderWithProviders(<SearchField />, { store });
    await user.type(screen.getByRole('combobox', { name: 'Search' }), 'karma');
    await user.click(await screen.findByRole('option', { name: 'karma police' }));
    expect(store.getState().search.recent).toEqual(['karma police']);
  });

  it('WEB-RECENTSEARCH-004 keeps the newest first, only ten, and moves a repeat to the front whatever its case', () => {
    const store = makeStore();
    for (const q of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']) store.dispatch(addRecent(q));
    expect(store.getState().search.recent).toEqual(['k', 'j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b']);
    store.dispatch(addRecent('B'));
    expect(store.getState().search.recent).toEqual(['B', 'k', 'j', 'i', 'h', 'g', 'f', 'e', 'd', 'c']);
    // A blank query changes nothing.
    store.dispatch(addRecent('   '));
    expect(store.getState().search.recent).toHaveLength(10);
  });

  it('WEB-RECENTSEARCH-005 the × forgets just that query', async () => {
    const store = makeStore();
    store.dispatch(addRecent('one'));
    store.dispatch(addRecent('two'));
    const { user } = renderWithProviders(<Search />, { store });
    expect(screen.getByRole('button', { name: 'Search for two' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove one from recent searches' }));
    expect(screen.queryByRole('button', { name: 'Search for one' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search for two' })).toBeInTheDocument();
  });

  it('WEB-RECENTSEARCH-006 Clear forgets them all', async () => {
    const store = makeStore();
    store.dispatch(addRecent('one'));
    store.dispatch(addRecent('two'));
    const { user } = renderWithProviders(<Search />, { store });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('Recent searches')).not.toBeInTheDocument();
    expect(store.getState().search.recent).toEqual([]);
  });

  it('WEB-RECENTSEARCH-007 the list survives a restart', async () => {
    let s = await freshStore();
    s.store.dispatch(s.addRecent('blur'));
    expect(JSON.parse(localStorage.getItem('sonare_recent_searches')!)).toEqual(['blur']);
    s = await freshStore();
    expect(s.store.getState().search.recent).toEqual(['blur']);
  });

  it('WEB-RECENTSEARCH-008 unreadable or junk saved searches are ignored', async () => {
    localStorage.setItem('sonare_recent_searches', '{broken');
    expect((await freshStore()).store.getState().search.recent).toEqual([]);
    localStorage.setItem('sonare_recent_searches', JSON.stringify(['ok', '  ', 7, 'OK', 'late']));
    expect((await freshStore()).store.getState().search.recent).toEqual(['ok', 'late']);
  });
});

/** The real app store, re-imported so the saved searches are read from storage afresh. */
const freshStore = async () => {
  vi.resetModules();
  const mod = await import('../../src/store/index');
  const slice = await import('../../src/store/searchSlice');
  return { ...mod, ...slice };
};
