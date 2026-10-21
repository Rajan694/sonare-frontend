import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { resetFs } from '../helpers/fakeNeutralino';
import { renderWithProviders } from '../helpers/render';

vi.mock('@neutralinojs/lib', async () => (await import('../helpers/fakeNeutralino')).lib);
vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { init: vi.fn(async () => {}) },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

import Library from '../../src/screens/Library';

beforeEach(() => resetFs());

describe('library (desktop window)', () => {
  it('DSK-051 folders open from the Songs view only; the sidebar picks the view, so there are no tabs', () => {
    const songs = renderWithProviders(<Library />, { route: '/library', mode: 'offline' });
    expect(screen.getByRole('link', { name: 'Folders' })).toHaveAttribute('href', '/folders');
    expect(screen.queryByRole('button', { name: 'Albums' })).not.toBeInTheDocument();
    songs.unmount();
    for (const view of ['albums', 'artists', 'favourites', 'most-played']) {
      const other = renderWithProviders(<Library />, { route: `/library?view=${view}`, mode: 'offline' });
      expect(screen.queryByRole('link', { name: 'Folders' })).not.toBeInTheDocument();
      other.unmount();
    }
    // ?view=genres falls back to Songs, so Folders is shown
    const genres = renderWithProviders(<Library />, { route: '/library?view=genres', mode: 'offline' });
    expect(screen.getByRole('link', { name: 'Folders' })).toBeInTheDocument();
    genres.unmount();
  });

  it('DSK-052 an old ?view=folders link opens the Songs tab', () => {
    renderWithProviders(<Library />, { route: '/library?view=folders', mode: 'offline' });
    expect(screen.getByText('Songs', { selector: '.text-display-m' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Folders' })).toBeInTheDocument();
  });
});
