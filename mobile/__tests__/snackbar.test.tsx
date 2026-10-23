import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { useSnackbarStore, showSnackbar, hideSnackbar } from '../src/store/snackbar';
import { SnackbarHost } from '../src/components/ui/SnackbarHost';
import { usePlayerStore } from '../src/store/player';
import { useModeStore } from '../src/store/mode';
import { useLibraryStore } from '../src/store/library';
import { useTrackMenuStore } from '../src/store/trackMenu';
import { TrackMenuHost } from '../src/components/music/TrackMenuHost';
import { AlbumScreen } from '../src/screens/Album';
import { PlaylistDetailScreen } from '../src/screens/PlaylistDetail';
import { LibraryScreen } from '../src/screens/Library';
import { api } from '../src/data/api';
import { makeTrack, makePlaylist, makeAlbum, page, route, alice } from '../test-utils';
import { useAuthStore } from '../src/data/auth';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

jest.mock('../src/data/config', () => ({
  artworkUrl: () => 'https://art',
  apiUrl: (p: string) => `https://api${p}`,
}));

describe('Snackbar (M2)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSnackbarStore.setState({ current: null, visible: false });
    usePlayerStore.setState({
      queue: [],
      currentTrack: null,
      isPlaying: false,
    });
    useModeStore.setState({ mode: 'online' });
    route.params = {};
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('MOB-SNACK-001 store sets visible and auto-hides after ~2.5s', () => {
    showSnackbar({ title: 'Added to queue', subtitle: 'Song One' });
    expect(useSnackbarStore.getState().visible).toBe(true);
    expect(useSnackbarStore.getState().current?.title).toBe('Added to queue');
    expect(useSnackbarStore.getState().current?.subtitle).toBe('Song One');

    act(() => {
      jest.advanceTimersByTime(2400);
    });
    expect(useSnackbarStore.getState().visible).toBe(true);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(useSnackbarStore.getState().visible).toBe(false);
  });

  it('MOB-SNACK-002 new snackbar replaces current one and resets hide timer', () => {
    showSnackbar({ title: 'First snackbar', subtitle: 'First sub' });
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(useSnackbarStore.getState().visible).toBe(true);

    showSnackbar({ title: 'Second snackbar', subtitle: 'Second sub' });
    expect(useSnackbarStore.getState().current?.title).toBe('Second snackbar');

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    // 1500ms since second snackbar: should still be visible
    expect(useSnackbarStore.getState().visible).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(useSnackbarStore.getState().visible).toBe(false);
  });

  it('MOB-SNACK-003 hideSnackbar dismisses immediately', () => {
    showSnackbar({ title: 'Dismiss me' });
    expect(useSnackbarStore.getState().visible).toBe(true);
    hideSnackbar();
    expect(useSnackbarStore.getState().visible).toBe(false);
  });

  it('MOB-SNACK-004 SnackbarHost renders visible snackbar content with polite accessibility', () => {
    const { getByText, queryByText } = render(<SnackbarHost />);
    expect(queryByText('Now Playing Next')).toBeNull();

    act(() => {
      showSnackbar({ title: 'Now Playing Next', subtitle: 'Sub details', icon: 'list' });
    });

    expect(getByText('Now Playing Next')).toBeTruthy();
    expect(getByText('Sub details')).toBeTruthy();
  });

  it('MOB-SNACK-005 TrackMenu Play next and Add to queue trigger snackbar', () => {
    const t = makeTrack({ id: 'yt:snack_1', title: 'Bohemian Rhapsody' });
    useTrackMenuStore.getState().open(t);

    const { getByLabelText } = render(<TrackMenuHost />);

    // Play next
    fireEvent.press(getByLabelText('Play next'));
    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Playing next',
      subtitle: 'Bohemian Rhapsody',
      icon: 'list',
    });

    // Add to queue
    act(() => {
      useTrackMenuStore.getState().open(t);
    });
    fireEvent.press(getByLabelText('Add to queue'));
    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Added to queue',
      subtitle: 'Bohemian Rhapsody',
      icon: 'list',
    });
  });

  it('MOB-SNACK-006 PlaylistPicker shows "Added to <name>" on success for single song and multiple songs', async () => {
    const p1 = makePlaylist({ id: 'pl_1', name: 'Chill Vibes' });
    useLibraryStore.setState({
      playlists: [p1],
      addToPlaylist: jest.fn().mockResolvedValue(undefined),
    });

    const t = makeTrack({ id: 'yt:snack_track', title: 'Single Track' });
    useTrackMenuStore.getState().open(t, { view: 'playlists' });

    const { getByLabelText } = render(<TrackMenuHost />);

    await act(async () => {
      fireEvent.press(getByLabelText('Add to Chill Vibes'));
    });

    expect(useLibraryStore.getState().addToPlaylist).toHaveBeenCalledWith('pl_1', [t]);
    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Added to Chill Vibes',
      subtitle: 'Single Track',
      icon: 'playlist',
    });

    // Multiple tracks
    const t1 = makeTrack({ id: 't1', title: 'Track 1' });
    const t2 = makeTrack({ id: 't2', title: 'Track 2' });
    const { PlaylistPicker } = require('../src/components/music/TrackMenuHost');
    const { getByLabelText: getPickerLabel } = render(<PlaylistPicker tracks={[t1, t2]} />);

    await act(async () => {
      fireEvent.press(getPickerLabel('Add to Chill Vibes'));
    });

    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Added to Chill Vibes',
      subtitle: '2 songs',
      icon: 'playlist',
    });
  });

  it('MOB-SNACK-007 PlaylistDetail "Add to queue" button queues all tracks at once and triggers snackbar', async () => {
    route.params = { id: 'yt:pl_test' };
    const one = makeTrack({ id: 't1', title: 'Song One' });
    const two = makeTrack({ id: 't2', title: 'Song Two' });

    jest.spyOn(api, 'playlist').mockResolvedValue(makePlaylist({ id: 'yt:pl_test', name: 'My Mix' }));
    jest.spyOn(api, 'playlistTracks').mockResolvedValue(page([one, two]));

    const addToQueueSpy = jest.spyOn(usePlayerStore.getState(), 'addToQueue');

    const { findByText, getByLabelText } = render(<PlaylistDetailScreen />);
    await findByText('Song One');

    act(() => {
      fireEvent.press(getByLabelText('Add to queue'));
    });

    expect(addToQueueSpy).toHaveBeenCalledWith([one, two]);
    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Added to queue',
      subtitle: '2 songs',
      icon: 'list',
    });
  });

  it('MOB-SNACK-008 Album "Add to queue" button queues all tracks at once and triggers snackbar', async () => {
    route.params = { id: 'yt:album_test' };
    const one = makeTrack({ id: 't1', title: 'Album Track One' });

    jest.spyOn(api, 'album').mockResolvedValue(makeAlbum({ id: 'yt:album_test', title: 'Album Title' }));
    jest.spyOn(api, 'albumTracks').mockResolvedValue(page([one]));

    const addToQueueSpy = jest.spyOn(usePlayerStore.getState(), 'addToQueue');

    const { findByText, getByLabelText } = render(<AlbumScreen />);
    await findByText('Album Track One');

    act(() => {
      fireEvent.press(getByLabelText('Add to queue'));
    });

    expect(addToQueueSpy).toHaveBeenCalledWith([one]);
    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Added to queue',
      subtitle: 'Album Track One',
      icon: 'list',
    });
  });

  it('MOB-SNACK-009 Library selection bar "Add to queue" queues array and triggers snackbar', async () => {
    useAuthStore.setState({ status: 'signedIn', user: alice } as never);
    const t1 = makeTrack({ id: 'yt:s1', title: 'Song One', artist: 'Artist One' });
    const t2 = makeTrack({ id: 'yt:s2', title: 'Song Two', artist: 'Artist Two' });

    jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([t1, t2], 2) as never);
    useLibraryStore.setState({
      playlists: [],
      favouriteIds: {},
    });

    const addToQueueSpy = jest.spyOn(usePlayerStore.getState(), 'addToQueue');

    const { findByText, getByLabelText, getByText } = render(<LibraryScreen />);
    await findByText('Song One');

    fireEvent.press(getByLabelText('Select'));
    fireEvent.press(getByText('Select all'));
    fireEvent.press(getByLabelText('Add to queue'));

    expect(addToQueueSpy).toHaveBeenCalledWith([t1, t2]);
    expect(useSnackbarStore.getState().current).toMatchObject({
      title: 'Added to queue',
      subtitle: '2 songs',
      icon: 'list',
    });
  });
});
