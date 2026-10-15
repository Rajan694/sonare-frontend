import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  isFavourite,
  onFavouritesSaved,
  setFavourite,
  useFavourite,
  useFavouriteLookup,
} from '../../src/api/favourites';
import { bindAccountGateNavigator, takePendingAction } from '../../src/api/accountGate';
import { clearSession, setSession } from '../../src/api/auth';
import { API, apiError, http, HttpResponse, recordRequests, server, useMockServer } from '../helpers/server';
import { testUser } from '../helpers/fixtures';
import type { Track } from '../../src/types';

// Signing in loads the account's liked ids; none unless a test says otherwise.
useMockServer(http.get(`${API}/me/favourites/ids`, () => HttpResponse.json({ ids: [] })));

afterEach(() => clearSession());

/** A server that answers a favourite change only when told to. */
const gatedServer = (status = 200) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  server.use(
    http.all(`${API}/me/favourites/tracks/:id`, async () => {
      await gate;
      return status === 200 ? HttpResponse.json({ ok: true }) : apiError(status, 'FAILED');
    }),
  );
  return release;
};

describe('favourite state', () => {
  it('WEB-FAV-001 the heart flips before the server answers', async () => {
    const release = gatedServer();
    const saving = setFavourite('yt:opt1', true);
    expect(isFavourite('yt:opt1', false)).toBe(true);
    release();
    await saving;
    expect(isFavourite('yt:opt1', false)).toBe(true);
  });

  it('WEB-FAV-002 a failed save rolls the heart back to the server value and rethrows', async () => {
    const release = gatedServer(500);
    const saving = setFavourite('yt:fail1', true);
    expect(isFavourite('yt:fail1', false)).toBe(true);
    release();
    await expect(saving).rejects.toMatchObject({ status: 500 });
    expect(isFavourite('yt:fail1', false)).toBe(false);
  });

  it('WEB-FAV-003 a failed un-heart returns to the previous local choice, not the stale server value', async () => {
    server.use(http.put(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })));
    await setFavourite('yt:roll1', true);
    server.use(http.delete(`${API}/me/favourites/tracks/:id`, () => apiError(503, 'DOWN')));
    await expect(setFavourite('yt:roll1', false)).rejects.toBeTruthy();
    // The server list still says "not favourite", but the user's successful heart stands.
    expect(isFavourite('yt:roll1', false)).toBe(true);
  });

  it('WEB-FAV-004 tells saved-listeners only after the server accepted the change', async () => {
    const saved = vi.fn();
    const off = onFavouritesSaved(saved);
    server.use(http.put(`${API}/me/favourites/tracks/:id`, () => apiError(500, 'X')));
    await setFavourite('yt:s1', true).catch(() => {});
    expect(saved).not.toHaveBeenCalled();
    server.use(http.put(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })));
    await setFavourite('yt:s1', true);
    expect(saved).toHaveBeenCalledTimes(1);
    off();
    await setFavourite('yt:s2', true);
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it('WEB-FAV-005 without a local change, the server value is used as is', () => {
    expect(isFavourite('yt:never-touched', true)).toBe(true);
    expect(isFavourite('yt:never-touched', false)).toBe(false);
  });
});

const song = (id: string, favourite: boolean) =>
  ({
    id,
    favourite,
    title: 'Song',
    artist: 'Band',
    artistId: 'yt:UCband',
    album: null,
    albumId: null,
    durationMs: 1000,
  }) as Track;

const Heart = ({ id, server: serverValue }: { id?: string; server?: boolean }) => {
  const { favourite, toggle } = useFavourite(id ? song(id, !!serverValue) : undefined);
  return (
    <button aria-pressed={favourite} onClick={toggle}>
      heart {id}
    </button>
  );
};

describe('useFavourite', () => {
  it('WEB-FAV-006 every heart for the same song updates together', async () => {
    setSession('a', 'r', testUser);
    const bodies: unknown[] = [];
    server.use(
      http.put(`${API}/me/favourites/tracks/:id`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    render(
      <>
        <Heart id="yt:sync1" server={false} />
        <Heart id="yt:sync1" server={false} />
      </>,
    );
    const [a, b] = screen.getAllByRole('button');
    await userEvent.click(a);
    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'true');
    // The song goes with it: the backend may never have seen one found in-app.
    await waitFor(() =>
      expect(bodies).toEqual([{ meta: { title: 'Song', artist: 'Band', artistId: 'yt:UCband', durationMs: 1000 } }]),
    );
  });

  it('WEB-FAV-007 a guest is sent to sign up, and the heart is saved after signing in', async () => {
    const navigate = vi.fn();
    bindAccountGateNavigator(navigate);
    const rec = recordRequests();
    server.use(http.put(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })));
    render(<Heart id="yt:guest1" server={false} />);
    await userEvent.click(screen.getByRole('button'));
    expect(navigate).toHaveBeenCalledWith(
      '/signin',
      expect.objectContaining({ state: expect.objectContaining({ mode: 'signup' }) }),
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    expect(rec.seen).toHaveLength(0);

    act(() => setSession('a', 'r', testUser));
    await act(async () => {
      await takePendingAction()?.();
    });
    rec.stop();
    // Signing in also loads the account's liked ids.
    expect(rec.paths().filter((p) => p !== 'GET /me/favourites/ids')).toEqual([
      'PUT /me/favourites/tracks/yt%3Aguest1',
    ]);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('WEB-FAV-008 a toggle that fails on the server shows the old state again', async () => {
    setSession('a', 'r', testUser);
    const release = gatedServer(500);
    render(<Heart id="yt:unheart1" server={true} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    release();
    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true'));
  });

  it('WEB-FAV-009 no track id means not favourite and a no-op toggle', async () => {
    const rec = recordRequests();
    const { result } = renderHook(() => useFavourite(undefined));
    expect(result.current.favourite).toBe(false);
    act(() => result.current.toggle());
    rec.stop();
    expect(rec.seen).toHaveLength(0);
  });

  it('WEB-FAV-010 useFavouriteLookup re-renders lists when any heart changes', async () => {
    server.use(http.put(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })));
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useFavouriteLookup();
    });
    const before = renders;
    await act(() => setFavourite('yt:lookup1', true));
    expect(renders).toBeGreaterThan(before);
    expect(result.current('yt:lookup1', false)).toBe(true);
  });
});

describe("the account's liked ids", () => {
  const idsAnswer = (ids: string[] | null) => {
    let asked = 0;
    server.use(
      http.get(`${API}/me/favourites/ids`, () => {
        asked++;
        return ids ? HttpResponse.json({ ids }) : apiError(500, 'DOWN');
      }),
    );
    return () => asked;
  };

  it('WEB-FAV-011 a song from search shows a filled heart when the account likes it', async () => {
    idsAnswer(['yt:liked1']);
    render(
      <>
        <Heart id="yt:liked1" server={false} />
        <Heart id="yt:other1" server={false} />
      </>,
    );
    act(() => setSession('a', 'r', testUser));
    const [liked, other] = screen.getAllByRole('button');
    await waitFor(() => expect(liked).toHaveAttribute('aria-pressed', 'true'));
    expect(other).toHaveAttribute('aria-pressed', 'false');
  });

  it('WEB-FAV-012 un-hearting a liked song empties every heart for it; signing out forgets the list', async () => {
    idsAnswer(['yt:liked2']);
    server.use(http.all(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })));
    act(() => setSession('a', 'r', testUser));
    render(
      <>
        <Heart id="yt:liked2" server={false} />
        <Heart id="yt:liked2" server={false} />
      </>,
    );
    const [a, b] = screen.getAllByRole('button');
    await waitFor(() => expect(a).toHaveAttribute('aria-pressed', 'true'));
    await userEvent.click(a);
    expect(a).toHaveAttribute('aria-pressed', 'false');
    expect(b).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(a);
    await waitFor(() => expect(b).toHaveAttribute('aria-pressed', 'true'));
    act(() => clearSession());
    expect(isFavourite('yt:liked2', false)).toBe(false);
  });

  it('WEB-FAV-013 a token refresh for the same account loads nothing again; a failed load keeps the old behaviour', async () => {
    const asked = idsAnswer(null);
    act(() => setSession('a', 'r', testUser));
    await waitFor(() => expect(asked()).toBe(1));
    expect(isFavourite('yt:x', false)).toBe(false);
    expect(isFavourite('yt:x', true)).toBe(true);
    act(() => setSession('a2', 'r2', testUser));
    await new Promise((r) => setTimeout(r, 20));
    expect(asked()).toBe(1);
  });
});
