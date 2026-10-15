import React, { createRef, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { clearSession, setSession } from '../../src/api/auth';
import { renderWithProviders } from '../helpers/render';
import { API, http, HttpResponse, useMockServer } from '../helpers/server';
import { makeTrack, page, testUser } from '../helpers/fixtures';
import Library from '../../src/screens/Library';
import { useVirtualRows } from '../../src/lib/useVirtualRows';

/**
 * Virtualisation tests (DSK-4 Part 2, audit I6).
 *
 * WEB-VIRT-001/002 test the hook directly via renderHook so we can fully
 * control the ref and the element's clientHeight without needing jsdom layout.
 * WEB-VIRT-003/004 test the Library screen integration by asserting on the
 * spacer elements and the rendered row slice.
 */

vi.mock('../../src/store/toasts', () => ({ showToast: vi.fn(), dismissToast: () => {}, useToasts: () => [] }));
vi.mock('../../src/storage/downloads', () => ({
  downloads: { enqueue: vi.fn() },
  useDownloads: () => ({ ready: true, items: [], byId: new Map(), activeCount: 0 }),
  useDownload: () => undefined,
  downloadProgress: () => null,
}));

const MANY = 200;
const bigLibrary = Array.from({ length: MANY }, (_, i) =>
  makeTrack({ id: `yt:virt${i}`, title: `Track ${String(i).padStart(3, '0')}` }),
);

useMockServer(
  http.get(`${API}/me/library/tracks`, () => HttpResponse.json(page(bigLibrary))),
  http.get(`${API}/me/most-played`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/library/albums`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/library/artists`, () => HttpResponse.json(page([]))),
  http.get(`${API}/genres`, () => HttpResponse.json([])),
  http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
  http.get(`${API}/me/favourites/ids`, () => HttpResponse.json({ ids: [] })),
);

afterEach(() => {
  clearSession();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Hook-level tests (no layout engine required)
// ---------------------------------------------------------------------------

describe('useVirtualRows hook', () => {
  /** Make a fake element ref whose clientHeight and scrollTop we control. */
  const makeRef = (clientHeight: number, scrollTop = 0) => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => clientHeight });
    Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => scrollTop });
    const ref = createRef<HTMLElement>() as React.MutableRefObject<HTMLElement | null>;
    ref.current = el;
    return { ref, el };
  };

  it('WEB-VIRT-001 with a measured container (clientHeight > 0) only a visible window of rows is returned', () => {
    const { ref } = makeRef(600); // 600 px container
    const { result } = renderHook(() => useVirtualRows({ count: MANY, rowHeight: 54, gap: 2, scrollRef: ref }));
    const { start, end } = result.current;
    // stride = 56 px → visible ≈ 11 rows; overscan = 8 each side → end ≤ 27.
    // The slice must be far smaller than MANY.
    expect(end - start).toBeGreaterThan(0);
    expect(end - start).toBeLessThan(Math.floor(MANY / 2));
    // Spacers cover the rest.
    expect(result.current.topPad).toBe(start * 56);
    expect(result.current.bottomPad).toBe(Math.max(0, (MANY - end) * 56));
    // The rows box is as tall as every row, the drawn ones pushed down to their place.
    expect(result.current.style).toEqual({ height: MANY * 56 - 2, paddingTop: start * 56 });
  });

  it('WEB-VIRT-002 without a measured container (clientHeight = 0) every row is returned (null-state fallback)', () => {
    const { ref } = makeRef(0); // no layout
    const { result } = renderHook(() => useVirtualRows({ count: MANY, rowHeight: 54, gap: 2, scrollRef: ref }));
    // Fallback: start=0, end=count.
    expect(result.current.start).toBe(0);
    expect(result.current.end).toBe(MANY);
    expect(result.current.topPad).toBe(0);
    expect(result.current.bottomPad).toBe(0);
    expect(result.current.style).toBeUndefined();
  });

  it('WEB-VIRT-003 scrolling the element fires a scroll event and shifts the rendered window', async () => {
    let scrollTop = 0;
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => 600 });
    Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => scrollTop });
    el.addEventListener = (ev: string, cb: EventListenerOrEventListenerObject) => {
      HTMLElement.prototype.addEventListener.call(el, ev, cb);
    };
    const ref = createRef<HTMLElement>() as React.MutableRefObject<HTMLElement | null>;
    ref.current = el;

    const { result } = renderHook(() => useVirtualRows({ count: MANY, rowHeight: 54, gap: 2, scrollRef: ref }));
    // Initially at top.
    const initialEnd = result.current.end;

    // Scroll to row 50.
    scrollTop = 50 * 56;
    act(() => fireEvent.scroll(el));

    expect(result.current.start).toBeGreaterThan(0);
    expect(result.current.start).toBeLessThanOrEqual(50);
    expect(result.current.end).toBeGreaterThan(initialEnd);
  });

  it('WEB-VIRT-006 scrolling moves the drawn rows inside the box but never changes its height', () => {
    // WebKitGTK pulled the scroll position back near the end when the list was briefly shorter mid-update.
    let scrollTop = 0;
    const { ref, el } = makeRef(600);
    Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => scrollTop });
    const { result } = renderHook(() => useVirtualRows({ count: MANY, rowHeight: 54, gap: 2, scrollRef: ref }));
    const heights = [result.current.style?.height];
    for (const row of [50, 120, MANY - 1]) {
      scrollTop = row * 56;
      act(() => fireEvent.scroll(el));
      heights.push(result.current.style?.height);
      expect(result.current.style?.paddingTop).toBe(result.current.start * 56);
    }
    expect(result.current.end).toBe(MANY);
    expect(new Set(heights)).toEqual(new Set([MANY * 56 - 2]));
  });

  it('WEB-VIRT-007 the height of a drawn row replaces the guessed one', () => {
    const List = () => {
      const ref = useRef<HTMLDivElement>(null);
      const v = useVirtualRows({ count: MANY, rowHeight: 54, gap: 2, scrollRef: ref });
      return (
        <div ref={ref}>
          <div data-virtual-rows data-testid="box" style={v.style}>
            {Array.from({ length: v.end - v.start }, (_, i) => (
              <div key={v.start + i} className="row" />
            ))}
          </div>
        </div>
      );
    };
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return (this as HTMLElement).classList.contains('row') ? 60 : 0;
      },
    });
    try {
      render(<List />);
      // Rows are 60 px, not the 54 guessed: the box is sized from what was drawn.
      expect(screen.getByTestId('box').style.height).toBe(`${MANY * 62 - 2}px`);
    } finally {
      delete (HTMLElement.prototype as Record<string, unknown>).clientHeight;
      delete (HTMLElement.prototype as Record<string, unknown>).offsetHeight;
    }
  });
});

// ---------------------------------------------------------------------------
// Library screen integration
// ---------------------------------------------------------------------------

describe('Library screen virtualisation integration', () => {
  /** Trigger virtualisation by patching clientHeight on all elements after render. */
  const enableLayout = (px: number) => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return px;
      },
    });
  };

  afterEach(() => {
    // Restore default behaviour (jsdom returns 0 — the fallback renders all rows).
    delete (HTMLElement.prototype as Record<string, unknown>).clientHeight;
  });

  it('WEB-VIRT-004 the Library screen draws a slice of rows in a box as tall as every row when virtualisation is active', async () => {
    setSession('a', 'r', testUser);
    enableLayout(600);
    renderWithProviders(<Library />, { route: '/library' });

    await screen.findByText(`${MANY} songs in your library`);

    // The list shown before the songs came may still be leaving (AnimatePresence "wait").
    const box = await waitFor(() => {
      const found = [...document.querySelectorAll<HTMLElement>('[data-virtual-rows]')].find((b) => b.children.length);
      expect(found).toBeDefined();
      return found!;
    });
    expect(box.children.length).toBeLessThan(MANY);
    // 58 px rows guessed until measured (jsdom has no layout), 2 px apart.
    expect(box.style.height).toBe(`${MANY * 60 - 2}px`);
    expect(box.style.paddingTop).toBe('0px');
  });

  it('WEB-VIRT-005 without layout (clientHeight = 0) all rows are rendered and no large spacer appears', async () => {
    setSession('a', 'r', testUser);
    // Default jsdom: clientHeight = 0 → full render, no spacers.
    renderWithProviders(<Library />, { route: '/library' });

    await screen.findByText(`${MANY} songs in your library`);

    // All MANY song-title buttons should be in the document.
    const songButtons = document.querySelectorAll('[aria-label^="Play Track "]');
    expect(songButtons.length).toBe(MANY);
    // Drawing every row takes about a second alone, and several when the whole suite runs at once.
  }, 15_000);
});
