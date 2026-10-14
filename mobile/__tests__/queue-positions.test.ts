import { shuffleTracks, usePlayerStore } from '../src/store/player';
import type { Track } from '../src/data/types';

const t = (id: string) => ({ id: `yt:${id}`, title: id, artist: '', source: 'server' }) as Track;
const [a, b, c] = [t('a'), t('b'), t('c')];
const ids = () => usePlayerStore.getState().queue.map((x) => x.title);
const now = () => {
  const s = usePlayerStore.getState();
  return { title: s.currentTrack?.title, index: s.index };
};

beforeEach(() => {
  usePlayerStore.setState({ currentTrack: null, queue: [], index: 0, shuffle: false, repeat: 'off', isPlaying: false });
});

describe('queue positions', () => {
  it('MOB-QUEUE-001 a list with the same song twice plays through to its end', () => {
    // A playlist row is its own object, as the API returns it; the second "a" is a copy.
    const list = [a, b, { ...a }, c];
    usePlayerStore.getState().playTrack(list[0], list);
    const heard = [now().title];
    for (let i = 0; i < 4; i++) {
      usePlayerStore.getState().onTrackEnded();
      heard.push(now().title);
    }
    expect(heard).toEqual(['a', 'b', 'a', 'c', 'c']);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('MOB-QUEUE-002 tapping the second copy of a song starts from that copy', () => {
    const second = { ...a };
    const list = [a, b, second, c];
    usePlayerStore.getState().playTrack(second, list);
    expect(now()).toEqual({ title: 'a', index: 2 });
    usePlayerStore.getState().playNext();
    expect(now()).toEqual({ title: 'c', index: 3 });
    usePlayerStore.getState().playPrevious();
    usePlayerStore.getState().playPrevious();
    expect(now()).toEqual({ title: 'b', index: 1 });
  });

  it('MOB-QUEUE-003 adding the playing song to the queue leaves the queue as it is', () => {
    usePlayerStore.getState().playTrack(a, [a, b]);
    usePlayerStore.getState().addToQueue(a);
    expect(ids()).toEqual(['a', 'b']);
    expect(usePlayerStore.getState().upcomingTrack()?.title).toBe('b');
    // Play next moves a queued song up instead of adding it twice.
    usePlayerStore.getState().addToQueue(c);
    usePlayerStore.getState().playNextInQueue(c);
    expect(ids()).toEqual(['a', 'c', 'b']);
    expect(now()).toEqual({ title: 'a', index: 0 });
  });

  it('MOB-QUEUE-004 shuffle keeps every entry, duplicates too, with the playing one first', () => {
    const list = [a, b, { ...a }, c];
    usePlayerStore.getState().playTrack(list[1], list);
    usePlayerStore.getState().toggleShuffle();
    expect(now()).toEqual({ title: 'b', index: 0 });
    expect([...ids()].sort()).toEqual(['a', 'a', 'b', 'c']);
    // Turning it off keeps the shuffled order.
    const shuffled = ids();
    usePlayerStore.getState().toggleShuffle();
    expect(ids()).toEqual(shuffled);
  });

  it('MOB-QUEUE-005 reordering keeps the playing entry current without reloading it', () => {
    usePlayerStore.getState().playTrack(b, [a, b, c]);
    const { playId } = usePlayerStore.getState();
    const q = usePlayerStore.getState().queue;
    usePlayerStore.getState().setQueue([q[1], q[0], q[2]]);
    expect(now()).toEqual({ title: 'b', index: 0 });
    expect(usePlayerStore.getState().playId).toBe(playId);
  });

  it('MOB-QUEUE-006 moving to the same song again still counts as a new entry for the player', () => {
    const list = [a, { ...a }];
    usePlayerStore.getState().playTrack(list[0], list);
    const { playId } = usePlayerStore.getState();
    usePlayerStore.getState().playNext();
    expect(now()).toEqual({ title: 'a', index: 1 });
    expect(usePlayerStore.getState().playId).toBe(playId + 1);
  });

  it('MOB-QUEUE-007 shuffleTracks returns every item, each order about equally often', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 6000; i++) {
      const order = shuffleTracks([1, 2, 3]).join('');
      counts.set(order, (counts.get(order) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const n of counts.values()) expect(n).toBeGreaterThan(800);
  });
});
