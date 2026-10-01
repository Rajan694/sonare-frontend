import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStore } from '../src/store/player';
import {
  useDownloadsStore,
  localUriFor,
  downloadProgress,
  downloadTrack,
  downloadedTracks,
} from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useModeStore } from '../src/store/mode';
import { useTrackMenuStore } from '../src/store/trackMenu';
import { api } from '../src/data/api';
import { SonareDownloads } from '../src/native/SonareDownloads';
import type { Track } from '../src/data/types';

const mockTrack1: Track = {
  id: 't1',
  title: 'Song One',
  artist: 'Artist One',
  artistId: 'a1',
  album: 'Album One',
  albumId: 'alb1',
  durationMs: 180000,
  source: 'server',
  playCount: 10,
  favourite: false,
  addedAt: Date.now(),
};

const mockTrack2: Track = {
  id: 't2',
  title: 'Song Two',
  artist: 'Artist Two',
  artistId: 'a2',
  album: 'Album Two',
  albumId: 'alb2',
  durationMs: 240000,
  source: 'server',
  playCount: 5,
  favourite: true,
  addedAt: Date.now(),
};

const mockTrack3: Track = {
  id: 't3',
  title: 'Song Three',
  artist: 'Artist Three',
  artistId: 'a3',
  album: null,
  albumId: null,
  durationMs: 200000,
  source: 'server',
  playCount: 0,
  favourite: false,
  addedAt: Date.now(),
};

describe('Store Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('usePlayerStore', () => {
    beforeEach(() => {
      usePlayerStore.setState({
        currentTrack: null,
        queue: [],
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        buffering: false,
        error: null,
        shuffle: false,
        repeat: 'off',
        seekRequest: null,
      });
    });

    it('MOB-STORE-001 playTrack sets current track, queue, playing state, and seek request', () => {
      usePlayerStore.getState().playTrack(mockTrack1, [mockTrack1, mockTrack2]);
      const state = usePlayerStore.getState();
      expect(state.currentTrack).toEqual(mockTrack1);
      expect(state.queue).toEqual([mockTrack1, mockTrack2]);
      expect(state.isPlaying).toBe(true);
      expect(state.durationMs).toBe(180000);
      expect(state.seekRequest?.ms).toBe(0);

      // Play single track with no queue param
      usePlayerStore.getState().playTrack(mockTrack3);
      expect(usePlayerStore.getState().currentTrack).toEqual(mockTrack3);
    });

    it('MOB-STORE-002 setCurrentTrack, setQueue, setIsPlaying, setPositionMs, setDurationMs, setBuffering update state', () => {
      const store = usePlayerStore.getState();
      store.setCurrentTrack(mockTrack2);
      expect(usePlayerStore.getState().currentTrack).toEqual(mockTrack2);
      store.setCurrentTrack(null);
      expect(usePlayerStore.getState().currentTrack).toBeNull();
      store.setQueue([mockTrack1, mockTrack2]);
      expect(usePlayerStore.getState().queue.length).toBe(2);
      store.setIsPlaying(true);
      expect(usePlayerStore.getState().isPlaying).toBe(true);
      store.setPositionMs(5000);
      expect(usePlayerStore.getState().positionMs).toBe(5000);
      store.setDurationMs(240000);
      expect(usePlayerStore.getState().durationMs).toBe(240000);
      store.setBuffering(true);
      expect(usePlayerStore.getState().buffering).toBe(true);
    });

    it('MOB-STORE-003 setError sets error message and pauses playback', () => {
      usePlayerStore.setState({ isPlaying: true });
      usePlayerStore.getState().setError('Playback decode error');
      expect(usePlayerStore.getState().error).toBe('Playback decode error');
      expect(usePlayerStore.getState().isPlaying).toBe(false);

      usePlayerStore.getState().setError(null);
      expect(usePlayerStore.getState().error).toBeNull();
    });

    it('MOB-STORE-004 seekTo updates positionMs and seekRequest nonce', () => {
      usePlayerStore.getState().seekTo(45000);
      const state = usePlayerStore.getState();
      expect(state.positionMs).toBe(45000);
      expect(state.seekRequest?.ms).toBe(45000);
      expect(state.seekRequest?.nonce).toBeDefined();
    });

    it('MOB-STORE-005 playNextInQueue inserts track immediately after current track', () => {
      usePlayerStore.getState().playTrack(mockTrack1, [mockTrack1, mockTrack3]);
      usePlayerStore.getState().playNextInQueue(mockTrack2);
      const state = usePlayerStore.getState();
      expect(state.queue.map(t => t.id)).toEqual(['t1', 't2', 't3']);

      // When currentTrack is null
      usePlayerStore.setState({ currentTrack: null, queue: [] });
      usePlayerStore.getState().playNextInQueue(mockTrack1);
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack1.id);
    });

    it('MOB-STORE-006 addToQueue appends track to end of queue', () => {
      usePlayerStore.getState().playTrack(mockTrack1, [mockTrack1, mockTrack2]);
      usePlayerStore.getState().addToQueue(mockTrack3);
      const state = usePlayerStore.getState();
      expect(state.queue.map(t => t.id)).toEqual(['t1', 't2', 't3']);

      // When currentTrack is null
      usePlayerStore.setState({ currentTrack: null, queue: [] });
      usePlayerStore.getState().addToQueue(mockTrack1);
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack1.id);
    });

    it('MOB-STORE-007 toggleShuffle shuffles remaining queue keeping current track first', () => {
      usePlayerStore
        .getState()
        .playTrack(mockTrack1, [mockTrack1, mockTrack2, mockTrack3]);
      usePlayerStore.getState().toggleShuffle();
      const state = usePlayerStore.getState();
      expect(state.shuffle).toBe(true);
      expect(state.queue[0].id).toBe(mockTrack1.id);
      expect(state.queue.length).toBe(3);

      usePlayerStore.getState().toggleShuffle();
      expect(usePlayerStore.getState().shuffle).toBe(false);
    });

    it('MOB-STORE-008 cycleRepeat cycles between off, all, one', () => {
      const store = usePlayerStore.getState();
      expect(usePlayerStore.getState().repeat).toBe('off');
      store.cycleRepeat();
      expect(usePlayerStore.getState().repeat).toBe('all');
      store.cycleRepeat();
      expect(usePlayerStore.getState().repeat).toBe('one');
      store.cycleRepeat();
      expect(usePlayerStore.getState().repeat).toBe('off');
    });

    it('MOB-STORE-009 playNext advances to next track in queue or loops if repeat all', () => {
      usePlayerStore.getState().playTrack(mockTrack1, [mockTrack1, mockTrack2]);
      usePlayerStore.getState().playNext();
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack2.id);

      // End of queue with repeat off
      usePlayerStore.getState().playNext();
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack2.id);

      // Repeat all loops back to start
      usePlayerStore.setState({ repeat: 'all' });
      usePlayerStore.getState().playNext();
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack1.id);

      // Empty queue
      usePlayerStore.setState({ queue: [], currentTrack: null });
      usePlayerStore.getState().playNext();
    });

    it('MOB-STORE-010 playPrevious moves to previous track or seeks to start if position > 3s', () => {
      usePlayerStore.getState().playTrack(mockTrack2, [mockTrack1, mockTrack2]);
      usePlayerStore.setState({ positionMs: 5000 });
      usePlayerStore.getState().playPrevious();
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack2.id);
      expect(usePlayerStore.getState().positionMs).toBe(0);

      usePlayerStore.setState({ positionMs: 1000 });
      usePlayerStore.getState().playPrevious();
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack1.id);

      // At beginning of queue
      usePlayerStore.setState({ positionMs: 1000 });
      usePlayerStore.getState().playPrevious();
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack1.id);

      // Empty queue
      usePlayerStore.setState({ queue: [], currentTrack: null });
      usePlayerStore.getState().playPrevious();
    });

    it('MOB-STORE-011 onTrackEnded handles repeat one, repeat all, and end of queue', () => {
      usePlayerStore.getState().playTrack(mockTrack1, [mockTrack1, mockTrack2]);
      usePlayerStore.setState({ repeat: 'one', positionMs: 180000 });
      usePlayerStore.getState().onTrackEnded();
      expect(usePlayerStore.getState().positionMs).toBe(0);

      usePlayerStore.setState({ repeat: 'off', currentTrack: mockTrack2 });
      usePlayerStore.getState().onTrackEnded();
      expect(usePlayerStore.getState().isPlaying).toBe(false);

      usePlayerStore.setState({
        repeat: 'all',
        currentTrack: mockTrack2,
        isPlaying: true,
      });
      usePlayerStore.getState().onTrackEnded();
      expect(usePlayerStore.getState().currentTrack?.id).toBe(mockTrack1.id);
    });
  });

  describe('useDownloadsStore', () => {
    beforeEach(() => {
      useDownloadsStore.setState({
        ready: true,
        items: {},
        location: { label: 'Music/Sonare' },
      });
    });

    it('MOB-STORE-012 hydrate loads saved downloads list and location from AsyncStorage', async () => {
      await AsyncStorage.setItem(
        'sonare.downloads',
        JSON.stringify([
          {
            id: 'd1',
            title: 'Saved Song',
            artist: 'Artist',
            artistId: 'a1',
            album: null,
            albumId: null,
            durationMs: 120000,
            status: 'downloading',
            quality: 'high',
            format: 'opus',
            totalBytes: 5000,
            receivedBytes: 5000,
            addedAt: Date.now(),
          },
        ]),
      );
      await AsyncStorage.setItem(
        'sonare.downloadLocation',
        JSON.stringify({ treeUri: 'tree://folder', label: 'Custom' }),
      );

      await useDownloadsStore.getState().hydrate();
      expect(useDownloadsStore.getState().ready).toBe(true);
      expect(useDownloadsStore.getState().items.d1).toBeDefined();
      expect(useDownloadsStore.getState().location.label).toBe('Custom');
    });

    it('MOB-STORE-013 enqueue adds new server tracks and skips existing ones', () => {
      const added = useDownloadsStore
        .getState()
        .enqueue([mockTrack1, mockTrack2]);
      expect(added).toBe(2);
      expect(['queued', 'downloading']).toContain(
        useDownloadsStore.getState().items.t1.status,
      );

      const addedSecond = useDownloadsStore.getState().enqueue([mockTrack1]);
      expect(addedSecond).toBe(0);

      // Local track ignored
      const addedLocal = useDownloadsStore
        .getState()
        .enqueue([{ ...mockTrack1, id: 'local:1', source: 'local' }]);
      expect(addedLocal).toBe(0);
    });

    it('MOB-STORE-014 pause and resume toggle download states', async () => {
      useDownloadsStore.getState().enqueue([mockTrack1]);
      await useDownloadsStore.getState().pause('t1');
      expect(useDownloadsStore.getState().items.t1.status).toBe('paused');

      useDownloadsStore.getState().resume('t1');
      expect(['queued', 'downloading']).toContain(
        useDownloadsStore.getState().items.t1.status,
      );
    });

    it('MOB-STORE-015 pauseAll and resumeAll batch update active downloads', async () => {
      useDownloadsStore.getState().enqueue([mockTrack1, mockTrack2]);
      await useDownloadsStore.getState().pauseAll();
      expect(useDownloadsStore.getState().items.t1.status).toBe('paused');
      expect(useDownloadsStore.getState().items.t2.status).toBe('paused');

      useDownloadsStore.getState().resumeAll();
      expect(['queued', 'downloading']).toContain(
        useDownloadsStore.getState().items.t1.status,
      );
      expect(['queued', 'downloading']).toContain(
        useDownloadsStore.getState().items.t2.status,
      );
    });

    it('MOB-STORE-016 remove discards active download and deletes finished file', async () => {
      useDownloadsStore.getState().enqueue([mockTrack1]);
      const res = await useDownloadsStore.getState().remove('t1');
      expect(res.fileDeleted).toBe(true);
      expect(useDownloadsStore.getState().items.t1).toBeUndefined();

      // Non-existent item
      const emptyRes = await useDownloadsStore.getState().remove('missing');
      expect(emptyRes.fileDeleted).toBe(false);

      // Done item with delete error
      useDownloadsStore.setState({
        items: {
          d_err: {
            id: 'd_err',
            title: 'T',
            artist: 'A',
            artistId: 'a',
            album: null,
            albumId: null,
            durationMs: 100,
            status: 'done',
            quality: 'high',
            format: 'opus',
            uri: 'file:///d_err.opus',
            totalBytes: 100,
            receivedBytes: 100,
            addedAt: Date.now(),
          },
        },
      });
      jest
        .spyOn(SonareDownloads, 'deleteFile')
        .mockRejectedValueOnce({ code: 'E_MISSING' });
      const delFail = await useDownloadsStore.getState().remove('d_err');
      expect(delFail.fileDeleted).toBe(false);
      expect(delFail.reason).toContain('no longer where it was');
    });

    it('MOB-STORE-017 chooseLocation and resetLocation update download directory', async () => {
      const chosen = await useDownloadsStore.getState().chooseLocation();
      expect(chosen).toBe(true);
      expect(useDownloadsStore.getState().location.label).toBe('Music');

      jest.spyOn(SonareDownloads, 'pickFolder').mockResolvedValueOnce(null);
      const chosenNull = await useDownloadsStore.getState().chooseLocation();
      expect(chosenNull).toBe(false);

      await useDownloadsStore.getState().resetLocation();
      expect(useDownloadsStore.getState().location.label).toBe('Music/Sonare');
    });

    it('MOB-STORE-018 checkFiles checks existence of downloaded files on disk', async () => {
      useDownloadsStore.setState({
        items: {
          done1: {
            id: 'done1',
            title: 'Done 1',
            artist: 'A1',
            artistId: 'a1',
            album: null,
            albumId: null,
            durationMs: 1000,
            status: 'done',
            quality: 'high',
            format: 'opus',
            uri: 'file:///music/done1.opus',
            totalBytes: 1000,
            receivedBytes: 1000,
            addedAt: Date.now(),
            missing: true,
          },
        },
      });

      jest.spyOn(SonareDownloads, 'exists').mockResolvedValue(true);
      await useDownloadsStore.getState().checkFiles();
      expect(useDownloadsStore.getState().items.done1.missing).toBe(false);

      jest.spyOn(SonareDownloads, 'exists').mockResolvedValue(false);
      await useDownloadsStore.getState().checkFiles();
      expect(useDownloadsStore.getState().items.done1.missing).toBe(true);
    });

    it('MOB-STORE-019 localUriFor, downloadProgress, downloadTrack, downloadedTracks helper functions', () => {
      const item = {
        id: 'h1',
        title: 'Helper 1',
        artist: 'Artist',
        artistId: 'a1',
        album: null,
        albumId: null,
        durationMs: 120000,
        status: 'done' as const,
        quality: 'high' as const,
        format: 'opus' as const,
        uri: 'file:///music/h1.opus',
        totalBytes: 1000,
        receivedBytes: 500,
        addedAt: Date.now(),
      };

      useDownloadsStore.setState({ items: { h1: item } });
      expect(localUriFor('h1')).toBe('file:///music/h1.opus');
      expect(localUriFor('missing')).toBeNull();
      expect(downloadProgress(item)).toBe(0.5);
      expect(downloadProgress({ ...item, totalBytes: 0 })).toBeNull();
      const track = downloadTrack(item);
      expect(track.id).toBe('h1');
      const tracks = downloadedTracks({
        h1: item,
        h2: { ...item, id: 'h2', status: 'queued' },
      });
      expect(tracks.length).toBe(1);
    });
  });

  describe('useLibraryStore', () => {
    beforeEach(() => {
      useLibraryStore.setState({
        favouriteIds: {},
        playlists: [],
      });
    });

    it('MOB-STORE-020 load fetches favourites and user playlists from server', async () => {
      jest
        .spyOn(api, 'favourites')
        .mockResolvedValue({ items: [mockTrack1] } as any);
      jest.spyOn(api, 'myPlaylists').mockResolvedValue({
        items: [
          {
            id: 'sonare:1',
            name: 'Favorites',
            kind: 'synced',
            trackCount: 1,
            downloadedCount: 0,
            updatedAt: Date.now(),
          },
        ],
      } as any);

      await useLibraryStore.getState().load();
      expect(useLibraryStore.getState().isFavourite('t1')).toBe(true);
      expect(useLibraryStore.getState().playlists.length).toBe(1);
    });

    it('MOB-STORE-021 reset clears favourites and playlists', () => {
      useLibraryStore.setState({
        favouriteIds: { t1: true },
        playlists: [
          {
            id: 'p1',
            name: 'P1',
            kind: 'synced',
            trackCount: 0,
            downloadedCount: 0,
            updatedAt: Date.now(),
          },
        ],
      });
      useLibraryStore.getState().reset();
      expect(useLibraryStore.getState().favouriteIds).toEqual({});
      expect(useLibraryStore.getState().playlists).toEqual([]);
    });

    it('MOB-STORE-022 isFavourite checks presence in favouriteIds', () => {
      useLibraryStore.setState({ favouriteIds: { t1: true } });
      expect(useLibraryStore.getState().isFavourite('t1')).toBe(true);
      expect(useLibraryStore.getState().isFavourite('t2')).toBe(false);
    });

    it('MOB-STORE-023 toggleFavourite optimistically toggles and calls api.setFavourite', async () => {
      const setFavSpy = jest
        .spyOn(api, 'setFavourite')
        .mockResolvedValue({ ok: true });
      await useLibraryStore.getState().toggleFavourite(mockTrack1);
      expect(useLibraryStore.getState().isFavourite('t1')).toBe(true);
      expect(setFavSpy).toHaveBeenCalledWith('t1', true);

      await useLibraryStore.getState().toggleFavourite(mockTrack1);
      expect(useLibraryStore.getState().isFavourite('t1')).toBe(false);
      expect(setFavSpy).toHaveBeenCalledWith('t1', false);

      // Failure rollback
      jest
        .spyOn(api, 'setFavourite')
        .mockRejectedValueOnce(new Error('Network fail'));
      await expect(
        useLibraryStore.getState().toggleFavourite(mockTrack1),
      ).rejects.toThrow('Network fail');
      expect(useLibraryStore.getState().isFavourite('t1')).toBe(false);
    });

    it('MOB-STORE-024 reloadPlaylists, createPlaylist, deletePlaylist, addToPlaylist manage playlist state', async () => {
      jest.spyOn(api, 'myPlaylists').mockResolvedValue({
        items: [
          {
            id: 'sonare:2',
            name: 'Party',
            kind: 'synced',
            trackCount: 2,
            downloadedCount: 0,
            updatedAt: Date.now(),
          },
        ],
      } as any);
      jest.spyOn(api, 'createPlaylist').mockResolvedValue({
        id: 'sonare:3',
        name: 'Chill',
        kind: 'synced',
        trackCount: 0,
        downloadedCount: 0,
        updatedAt: Date.now(),
      });
      jest.spyOn(api, 'deletePlaylist').mockResolvedValue({ ok: true });
      jest.spyOn(api, 'addToPlaylist').mockResolvedValue({ ok: true });

      const created = await useLibraryStore.getState().createPlaylist('Chill');
      expect(created.id).toBe('sonare:3');
      expect(useLibraryStore.getState().playlists[0].id).toBe('sonare:3');

      await useLibraryStore.getState().deletePlaylist('sonare:3');
      expect(
        useLibraryStore.getState().playlists.find(p => p.id === 'sonare:3'),
      ).toBeUndefined();

      await useLibraryStore.getState().addToPlaylist('sonare:2', mockTrack1);
      expect(api.addToPlaylist).toHaveBeenCalledWith('sonare:2', ['t1']);
    });
  });

  describe('useModeStore', () => {
    it('MOB-STORE-025 setMode updates mode, userChangedMode flag, and triggers toast', () => {
      useModeStore
        .getState()
        .setMode('offline', { title: 'Switched', description: 'Offline mode' });
      expect(useModeStore.getState().mode).toBe('offline');
      expect(useModeStore.getState().toastVisible).toBe(true);
      expect(useModeStore.getState().toastInfo?.title).toBe('Switched');

      useModeStore.getState().setMode('online');
      expect(useModeStore.getState().mode).toBe('online');
      expect(useModeStore.getState().userChangedMode).toBe(true);
    });

    it('MOB-STORE-026 toggleMode toggles between online and offline', () => {
      useModeStore.setState({ mode: 'online' });
      useModeStore.getState().toggleMode();
      expect(useModeStore.getState().mode).toBe('offline');
      useModeStore.getState().toggleMode();
      expect(useModeStore.getState().mode).toBe('online');
    });

    it('MOB-STORE-027 hideToast dismisses mode toast', () => {
      useModeStore.setState({ toastVisible: true });
      useModeStore.getState().hideToast();
      expect(useModeStore.getState().toastVisible).toBe(false);
    });
  });

  describe('useTrackMenuStore', () => {
    it('MOB-STORE-028 open, setView, close manage track action sheet state', () => {
      const extraAction = { label: 'Remove', onPress: jest.fn() };
      useTrackMenuStore
        .getState()
        .open(mockTrack1, { view: 'menu', extraAction });
      expect(useTrackMenuStore.getState().track).toEqual(mockTrack1);
      expect(useTrackMenuStore.getState().view).toBe('menu');
      expect(useTrackMenuStore.getState().extraAction).toEqual(extraAction);

      useTrackMenuStore.getState().setView('playlists');
      expect(useTrackMenuStore.getState().view).toBe('playlists');

      useTrackMenuStore.getState().close();
      expect(useTrackMenuStore.getState().track).toBeNull();
      expect(useTrackMenuStore.getState().extraAction).toBeUndefined();
    });
  });
});
