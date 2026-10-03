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

useMockServer();

afterEach(() => clearSession());

/** A server that answers a favourite change only when told to. */
function gatedServer(status = 200) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  server.use(
    http.all(`${API}/me/favourites/tracks/:id`, async () => {
      await gate;
      return status === 200 ? HttpResponse.json({ ok: true }) : apiError(status, 'FAILED');
    }),
  );
  return release;
}

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

function Heart({ id, server: serverValue }: { id?: string; server?: boolean }) {
  const { favourite, toggle } = useFavourite(id, serverValue);
  return (
    <button aria-pressed={favourite} onClick={toggle}>
      heart {id}
    </button>
  );
}

describe('useFavourite', () => {
  it('WEB-FAV-006 every heart for the same song updates together', async () => {
    setSession('a', 'r', testUser);
    server.use(http.put(`${API}/me/favourites/tracks/:id`, () => HttpResponse.json({ ok: true })));
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
    expect(rec.paths()).toEqual(['PUT /me/favourites/tracks/yt%3Aguest1']);
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
    const { result } = renderHook(() => useFavourite(undefined, true));
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
