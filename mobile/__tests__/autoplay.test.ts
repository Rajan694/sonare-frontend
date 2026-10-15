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
  it("MOB-AUTO-001 the queue's last song asks once for similar songs and adds the new ones, which play next", async () => {
    const related = jest.spyOn(api, 'relatedTracks').mockResolvedValue([a, e, t('local:x'), f]);
    usePlayerStore.getState().playTrack(b, [a, b]);
    await settle();
    expect(related).toHaveBeenCalledTimes(1);
    expect(related).toHaveBeenCalledWith('yt:b');
    expect(ids()).toEqual(['yt:a', 'yt:b', 'yt:e', 'yt:f']);
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
});
