import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import Home from '../../src/screens/Home';
import { renderWithProviders } from '../helpers/render';
import { API, http, HttpResponse, useMockServer } from '../helpers/server';
import { page } from '../helpers/fixtures';
import { rememberRecentPlay } from '../../src/storage/recentPlays';

vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

// Offline the app plays from the device library, which the web build always reports as empty.
// This file stands in a small one — with one server song already downloaded — so that the
// offline "what did this device play" wiring can be exercised.
vi.mock('../../src/storage/local', async () => {
  const { makeTrack: track } = await import('../helpers/fixtures');
  return {
    useLocalLibrary: () => ({
      ready: true,
      folders: [],
      tracks: [
        track({ id: 'local:one', source: 'local', title: 'One', artist: 'A' }),
        track({ id: 'local:two', source: 'local', title: 'Two', artist: 'A' }),
      ],
      downloads: new Map([['yt:dl1', 'local:one']]),
      scanning: null,
    }),
    resolveLocalRefs: (tracks: unknown) => tracks,
    getDownloadCover: () => undefined,
  };
});

useMockServer(
  http.get(`${API}/trending`, () => HttpResponse.json(page([]))),
  http.get(`${API}/genres`, () => HttpResponse.json([])),
);

describe('home offline', () => {
  it('WEB-HOME-008 offline, the tiles come from what this device played', async () => {
    // Newest last: the download was played first, then a library file.
    rememberRecentPlay({ id: 'yt:dl1' });
    rememberRecentPlay({ id: 'local:two' });
    renderWithProviders(<Home />, { mode: 'offline' });

    // Two plays fit in the tiles, so no "Jump back in" shelf repeats them.
    expect((await screen.findAllByRole('button', { name: 'Play Two' })).length).toBeGreaterThan(0);
    expect(screen.queryByText('Jump back in')).not.toBeInTheDocument();
    expect(screen.queryByText('Recently played')).not.toBeInTheDocument();
    // Newest first, and the downloaded song is followed back to the file on the device.
    const played = screen.getAllByRole('button', { name: /^Play (One|Two)$/ });
    expect(new Set(played.map((b) => b.getAttribute('aria-label')))).toEqual(new Set(['Play One', 'Play Two']));
    // The online-only shelves stay away offline.
    expect(screen.queryByText('Trending locally this week')).not.toBeInTheDocument();
    expect(screen.queryByText('Most played')).not.toBeInTheDocument();
    expect(screen.queryByText("Haven't played in a while")).not.toBeInTheDocument();
    expect(screen.getByText('Songs on device')).toBeInTheDocument();
  });
});
