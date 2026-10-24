import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { artColorCache, useArtColor } from '../../src/lib/useArtColor';
import NowPlaying from '../../src/screens/NowPlaying';
import { makePlayer, renderWithProviders } from '../helpers/render';
import { makeTrack } from '../helpers/fixtures';
import { useMockServer } from '../helpers/server';

useMockServer();

/** 16 x 16 RGBA of one colour, as a canvas would give for a solid cover. */
const solid = (r: number, g: number, b: number) =>
  new Uint8ClampedArray(Array.from({ length: 256 }, () => [r, g, b, 255]).flat());

let pixels = solid(220, 30, 40);
let loads: string[] = [];
let failLoad = false;

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';
  set src(url: string) {
    loads.push(url);
    setTimeout(() => (failLoad ? this.onerror?.() : this.onload?.()), 0);
  }
}

beforeEach(() => {
  artColorCache.clear();
  loads = [];
  failLoad = false;
  pixels = solid(220, 30, 40);
  vi.stubGlobal('Image', FakeImage);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: () => {},
    getImageData: () => ({ data: pixels }),
  } as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const hueIsRed = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return r > g + 60 && r > b + 60;
};

describe('the Now Playing glow takes the cover colour', () => {
  it('WEB-GLOW-001 a red cover gives a red glow, sampled once per cover', async () => {
    const url = 'https://i.ytimg.com/vi/abc/hqdefault.jpg';
    const { result } = renderHook(() => useArtColor(url));
    expect(result.current).toBeNull(); // nothing tinted while it is worked out
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(hueIsRed(result.current!)).toBe(true);
    const again = renderHook(() => useArtColor(url));
    expect(again.result.current).toBe(result.current);
    expect(loads).toHaveLength(1);
  });

  it('WEB-GLOW-002 no cover, a cover that fails to load and a grey cover all keep the fixed colours', async () => {
    expect(renderHook(() => useArtColor(null)).result.current).toBeNull();

    failLoad = true;
    const broken = renderHook(() => useArtColor('https://i.ytimg.com/vi/broken/hqdefault.jpg'));
    await waitFor(() => expect(artColorCache.has('https://i.ytimg.com/vi/broken/hqdefault.jpg')).toBe(true));
    expect(broken.result.current).toBeNull();

    failLoad = false;
    pixels = solid(128, 128, 128);
    const grey = renderHook(() => useArtColor('https://i.ytimg.com/vi/grey/hqdefault.jpg'));
    await waitFor(() => expect(artColorCache.has('https://i.ytimg.com/vi/grey/hqdefault.jpg')).toBe(true));
    expect(grey.result.current).toBeNull();
  });

  it('WEB-GLOW-003 Now Playing paints its two main glows in the cover colour', async () => {
    const song = makeTrack({ id: 'yt:glow', title: 'Glow', thumbnail: 'https://i.ytimg.com/vi/glow/hqdefault.jpg' });
    const { container } = renderWithProviders(<NowPlaying />, {
      player: makePlayer({ queue: [song], index: 0, positionMs: 0, durationMs: 100_000 }),
      route: '/now-playing',
    });
    const glows = () => [...container.querySelectorAll('.ambient i')] as HTMLElement[];
    await waitFor(() => expect(glows()[0].style.backgroundColor).not.toBe(''));
    expect(glows()[0].style.backgroundColor).toBe(glows()[1].style.backgroundColor);
    // The third (purple) glow keeps its own colour.
    expect(glows()[2].style.backgroundColor).toBe('');
  });
});
