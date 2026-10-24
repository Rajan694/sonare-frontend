import { usePlayerStore } from '../src/store/player';
import { useDevicePrefsStore } from '../src/store/devicePrefs';
import { useModeStore } from '../src/store/mode';
import { autoplay, startAutoplay } from '../src/store/autoplay';
import { api } from '../src/data/api';
import type { Track } from '../src/data/types';

const t = (id: string) => ({ id, title: id, artist: '', source: 'server' }) as Track;
const [a, b, e, f] = [t('yt:a'), t('yt:b'), t('yt:e'), t('yt:f')];
const ids = () => usePlayerStore.getState().queue.map((x) => x.id);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let stop: () => void;

beforeEach(() => {
  usePlayerStore.setState({ currentTrack: null, queue: [], index: 0, shuffle: false, repeat: 'off', isPlaying: false });
  useDevicePrefsStore.setState({ autoplaySimilar: true });
  useModeStore.setState({ mode: 'online' });
  autoplay.reset();
  stop = startAutoplay();
});

afterEach(() => {
  stop();
  jest.restoreAllMocks();
});

describe('autoplay', () => {
  it('MOB-AUTO-001 fewer than 10 upcoming songs asks once for similar songs and adds the new ones, which play next', async () => {
    const related = jest.spyOn(api, 'relatedTracks').mockResolvedValue([a, e, t('local:x'), f]);
    usePlayerStore.getState().playTrack(a, [a, b]);
    await settle();
    expect(related).toHaveBeenCalledTimes(1);
    expect(related).toHaveBeenCalledWith('yt:b');
    expect(ids()).toEqual(['yt:a', 'yt:b', 'yt:e', 'yt:f']);
    usePlayerStore.getState().onTrackEnded();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('yt:b');
    usePlayerStore.getState().onTrackEnded();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('yt:e');
  });

  it('MOB-AUTO-002 nothing is asked for with Autoplay off, in Offline Mode, or on repeat all', async () => {
    const related = jest.spyOn(api, 'relatedTracks').mockResolvedValue([e]);
    useDevicePrefsStore.getState().setAutoplaySimilar(false);
    usePlayerStore.getState().playTrack(a, [a]);
    await settle();

    useDevicePrefsStore.setState({ autoplaySimilar: true });
    useModeStore.setState({ mode: 'offline' });
    usePlayerStore.getState().playTrack(b, [b]);
    await settle();

    useModeStore.setState({ mode: 'online' });
    usePlayerStore.setState({ repeat: 'all' });
    usePlayerStore.getState().playTrack(f, [f]);
    await settle();
    expect(related).not.toHaveBeenCalled();
  });

  it('MOB-AUTO-003 10 or more upcoming songs does not ask for similar songs until queue drops below 10', async () => {
    const related = jest.spyOn(api, 'relatedTracks').mockResolvedValue([e]);
    // 1 currently playing track + 10 upcoming tracks = 11 tracks total
    const upcoming = Array.from({ length: 10 }, (_, i) => t(`yt:u${i}`));
    const initialQueue = [a, ...upcoming];
    usePlayerStore.getState().playTrack(a, initialQueue);
    await settle();
    // 10 upcoming songs ahead of `a` (index 0) => no autoplay needed yet
    expect(related).not.toHaveBeenCalled();

    // Advance to next track u0 (index 1, 9 upcoming songs ahead < 10)
    usePlayerStore.getState().onTrackEnded();
    await settle();
    expect(related).toHaveBeenCalledTimes(1);
    expect(related).toHaveBeenCalledWith('yt:u9');
    expect(ids()).toContain('yt:e');
  });
});
