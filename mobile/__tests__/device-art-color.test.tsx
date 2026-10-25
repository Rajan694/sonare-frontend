import { act, renderHook, waitFor } from '@testing-library/react-native';
import { NativeModules } from 'react-native';
import { useDeviceArtStore, useDeviceArt } from '../src/store/deviceArt';
import { useArtColor, clearArtColorCache, artColorCache } from '../src/hooks/useArtColor';
import { useLocalMusicStore, deviceTracks } from '../src/store/localMusic';
import type { Track } from '../src/data/types';
import type { DeviceSong } from '../src/native/SonareLibrary';

const native = NativeModules.SonareLibrary as {
  scan: jest.Mock;
  artworkFor: jest.Mock;
  artworkPixels: jest.Mock;
};

// Generate base64 RGBA pixels for 16x16 red square
const generate16x16RedBase64 = (): string => {
  const bytes = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < bytes.length; i += 4) {
    bytes[i] = 255; // R
    bytes[i + 1] = 0; // G
    bytes[i + 2] = 0; // B
    bytes[i + 3] = 255; // A
  }
  return Buffer.from(bytes).toString('base64');
};

const makeDeviceSong = (mediaId: string): DeviceSong => ({
  mediaId,
  uri: `content://media/external/audio/media/${mediaId}`,
  title: `Track ${mediaId}`,
  artist: 'Artist',
  album: 'Album',
  durationMs: 180_000,
  folder: 'Music',
  fileName: `song_${mediaId}.mp3`,
  size: 3_000_000,
  modifiedAt: 1_000,
});

describe('device art and dominant colour glow', () => {
  beforeEach(() => {
    useDeviceArtStore.getState().clear();
    clearArtColorCache();
    native.artworkFor.mockReset().mockResolvedValue({});
    native.artworkPixels.mockReset().mockResolvedValue(null);
  });

  it('MOB-DART-001 useDeviceArtStore debounces requests and batches media IDs in chunks up to 50', async () => {
    jest.useFakeTimers();
    try {
      // Setup mock returning artwork for IDs
      native.artworkFor.mockImplementation(async (ids: string[]) => {
        const res: Record<string, string> = {};
        for (const id of ids) {
          res[id] = `file:///covers/${id}.jpg`;
        }
        return res;
      });

      // Request 75 IDs in two calls
      const idsBatch1 = Array.from({ length: 60 }, (_, i) => `media_${i}`);
      const idsBatch2 = Array.from({ length: 15 }, (_, i) => `media_${60 + i}`);

      useDeviceArtStore.getState().request(idsBatch1);
      useDeviceArtStore.getState().request(idsBatch2);

      // Debounce has not fired yet
      expect(native.artworkFor).not.toHaveBeenCalled();

      // Advance debounce timer (100ms)
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Flushed: total 75 items chunked into batches of <= 50 (50 and 25)
      expect(native.artworkFor).toHaveBeenCalledTimes(2);
      expect(native.artworkFor.mock.calls[0][0]).toHaveLength(50);
      expect(native.artworkFor.mock.calls[1][0]).toHaveLength(25);

      const cache = useDeviceArtStore.getState().cache;
      expect(cache.media_0).toBe('file:///covers/media_0.jpg');
      expect(cache.media_74).toBe('file:///covers/media_74.jpg');
    } finally {
      jest.useRealTimers();
    }
  });

  it('MOB-DART-002 useDeviceArt hook returns cached artwork URI for local tracks and requests artwork if not cached', async () => {
    jest.useFakeTimers();
    try {
      const deviceSong = makeDeviceSong('42');
      useLocalMusicStore.setState({
        songs: [deviceSong],
      });
      const localTrack = deviceTracks(useLocalMusicStore.getState())[0];

      native.artworkFor.mockResolvedValue({ '42': 'file:///covers/42.jpg' });

      // First render: artwork not in cache
      const { result, rerender } = renderHook(({ track }: { track: Track | null }) => useDeviceArt(track), {
        initialProps: { track: localTrack },
      });

      expect(result.current).toBeUndefined();

      // Debounce timer advances and store fetches artwork
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      rerender({ track: localTrack });
      expect(result.current).toBe('file:///covers/42.jpg');

      // Server track returns undefined and doesn't trigger request
      native.artworkFor.mockClear();
      const serverTrack: Track = {
        id: 'srv:1',
        title: 'Server Song',
        artist: 'Artist',
        artistId: '1',
        albumId: null,
        album: 'Album',
        durationMs: 200_000,
        source: 'server',
        playCount: 0,
        favourite: false,
        addedAt: Date.now(),
      };

      const { result: srvResult } = renderHook(() => useDeviceArt(serverTrack));
      expect(srvResult.current).toBeUndefined();
      expect(native.artworkFor).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('MOB-DART-003 useArtColor extracts dominant color from 16x16 pixels base64 and caches the result', async () => {
    const redBase64 = generate16x16RedBase64();
    native.artworkPixels.mockResolvedValue(redBase64);

    const uri = 'file:///covers/red_art.jpg';
    const { result } = renderHook(() => useArtColor(uri));
    expect(result.current).toBeNull(); // nothing tinted while it is worked out

    await waitFor(() => {
      // A red cover glows red.
      expect(result.current).toMatch(/^#/);
    });
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(result.current!.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g + 60);
    expect(r).toBeGreaterThan(b + 60);

    const picked = result.current;
    expect(artColorCache.get(uri)).toBe(picked);

    // Second hook call should use cached value without re-querying native module
    native.artworkPixels.mockClear();
    const { result: cachedResult } = renderHook(() => useArtColor(uri));
    expect(cachedResult.current).toBe(picked);
    expect(native.artworkPixels).not.toHaveBeenCalled();
  });

  it('MOB-DART-004 useArtColor gives null (no tint) without a cover, for unreadable pixels and on errors', async () => {
    const { result: emptyUriResult } = renderHook(() => useArtColor(undefined));
    expect(emptyUriResult.current).toBeNull();

    native.artworkPixels.mockResolvedValueOnce(null);
    const { result: nullResult } = renderHook(() => useArtColor('file:///no_art.jpg'));
    await waitFor(() => expect(artColorCache.has('file:///no_art.jpg')).toBe(true));
    expect(nullResult.current).toBeNull();

    native.artworkPixels.mockRejectedValueOnce(new Error('Decode failed'));
    const { result: errResult } = renderHook(() => useArtColor('file:///broken_art.jpg'));
    await waitFor(() => expect(artColorCache.has('file:///broken_art.jpg')).toBe(true));
    expect(errResult.current).toBeNull();

    // clearArtColorCache empties the cache
    artColorCache.set('custom_key', '#123456');
    expect(artColorCache.size).toBeGreaterThan(0);
    clearArtColorCache();
    expect(artColorCache.size).toBe(0);
  });
});
