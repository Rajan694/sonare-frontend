import React from 'react';
import { Alert, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { BrandMark } from '../src/components/ui/BrandMark';
import Icon from '../src/components/ui/Icon';
import { GuestPrompt } from '../src/components/ui/GuestPrompt';
import { Sheet } from '../src/components/ui/Sheet';
import { Toast } from '../src/components/ui/Toast';
import { Artwork } from '../src/components/music/Artwork';
import { MiniPlayer } from '../src/components/music/MiniPlayer';
import { TrackMenuHost } from '../src/components/music/TrackMenuHost';
import { Waveform } from '../src/components/music/Waveform';
import { EqualizerBars } from '../src/components/music/EqualizerBars';
import { SourceGlyph } from '../src/components/music/SourceGlyph';
import { DownloadAllButton } from '../src/components/music/DownloadAllButton';
import { TrackDownloadButton } from '../src/components/music/TrackDownloadButton';
import { useAuthStore } from '../src/data/auth';
import { navigationRef } from '../src/data/accountGate';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useTrackMenuStore } from '../src/store/trackMenu';
import { alice, makeDownload, makePlaylist, makeTrack, nav } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const song = makeTrack({ title: 'Reckoner', artist: 'Radiohead' });
const later = makeTrack({ title: 'Later' });

/** A downloads store whose actions are spies. */
function downloadsWith(items: Record<string, ReturnType<typeof makeDownload>>) {
  const actions = {
    enqueue: jest.fn(() => 1),
    pause: jest.fn(async () => {}),
    resume: jest.fn(),
    remove: jest.fn(async () => ({ fileDeleted: true })),
  };
  useDownloadsStore.setState({
    items,
    location: { label: 'Music/Sonare' } as never,
    ...actions,
  } as never);
  return actions;
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  useAuthStore.setState({ status: 'guest', user: null } as never);
  useModeStore.setState({ mode: 'online' });
  usePlayerStore.setState({
    currentTrack: song,
    queue: [song, later],
    isPlaying: true,
    positionMs: 50_000,
    durationMs: 200_000,
  });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  useTrackMenuStore.setState({
    track: null,
    view: 'menu',
    extraAction: undefined,
  });
  downloadsWith({});
});

describe('small pieces', () => {
  it('MOB-COMP-002 BrandMark is decorative and drawn at the requested size', () => {
    const { toJSON } = render(<BrandMark size={56} />);
    const root = toJSON() as { props: Record<string, unknown> };
    expect(root.props).toMatchObject({
      width: 56,
      height: 56,
      accessibilityElementsHidden: true,
    });
  });

  it('MOB-COMP-007 Icon draws the mapped glyph at its size and colour, and nothing for an unknown name', () => {
    const { toJSON, rerender } = render(<Icon name="play" size={24} color="#00E28A" />);
    const el = toJSON() as { type: string; props: Record<string, unknown> };
    // The design's own glyph: play is a solid shape, so the colour is its fill.
    expect(el.type).toBe('Svg');
    expect(el.props).toMatchObject({ testID: 'icon-play', width: 24, height: 24, fill: '#00E28A', stroke: 'none' });
    rerender(<Icon name="search" size={20} color="#9A9AA8" />);
    expect((toJSON() as { props: Record<string, unknown> }).props).toMatchObject({
      testID: 'icon-search',
      fill: 'none',
      stroke: '#9A9AA8',
    });
    rerender(<Icon name={'no-such-icon' as never} />);
    expect(toJSON()).toBeNull();
  });

  it('MOB-COMP-022 EqualizerBars draws three bars in the given colour', () => {
    const { toJSON } = render(<EqualizerBars isPlaying color="#00E28A" />);
    const bars = (toJSON() as unknown as { children: { props: { style: object[] } }[] }).children;
    expect(bars).toHaveLength(3);
    for (const bar of bars)
      expect(bar.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#00E28A' })]),
      );
  });

  it('MOB-COMP-023 SourceGlyph shows a gold phone for local files and a green cloud for the server', () => {
    const local = render(<SourceGlyph source="local" />);
    expect(JSON.stringify(local.toJSON())).toMatch(/icon-smartphone.*#FFC24D/);
    const server = render(<SourceGlyph source="server" size={20} />);
    expect(JSON.stringify(server.toJSON())).toMatch(/icon-cloud.*#00E28A/);
    expect(JSON.stringify(server.toJSON())).toContain('"width":12');
  });

  it('MOB-COMP-013 Toast shows its message and detail, and fades out when hidden', () => {
    const { getByText, rerender, toJSON } = render(
      <Toast visible message="Offline Mode enabled" subtext="Showing music on this phone" mode="offline" />,
    );
    expect(getByText('Offline Mode enabled')).toBeTruthy();
    expect(getByText('Showing music on this phone')).toBeTruthy();
    rerender(<Toast visible={false} message="Offline Mode enabled" />);
    expect(JSON.stringify(toJSON())).toContain('"opacity":0');
  });
});

describe('artwork', () => {
  it('MOB-COMP-017 shows the image, falls back to the second url, then to a plain tile', () => {
    const { UNSAFE_queryAllByType, toJSON } = render(
      <Artwork uri="https://img/a-640.jpg" fallbackUri="https://img/a-300.jpg" size={84} />,
    );
    const img = () => UNSAFE_queryAllByType('Image' as never)[0];
    expect(img().props.source).toEqual({ uri: 'https://img/a-640.jpg' });
    act(() => img().props.onError());
    expect(img().props.source).toEqual({ uri: 'https://img/a-300.jpg' });
    act(() => img().props.onError());
    expect(UNSAFE_queryAllByType('Image' as never)).toHaveLength(0);
    expect((toJSON() as unknown as { props: { style: object } }).props.style).toEqual({
      width: 84,
      height: 84,
    });
  });

  it('MOB-COMP-036 without an image, a gradient is drawn, with rings when asked', () => {
    const { UNSAFE_queryAllByType } = render(<Artwork gradient={['#111111', '#222222']} size={124} rings />);
    expect(UNSAFE_queryAllByType('Stop' as never).map((s) => s.props.stopColor)).toEqual(['#111111', '#222222']);
    expect(UNSAFE_queryAllByType('Circle' as never)).toHaveLength(3);
  });
});

describe('account prompts and sheets', () => {
  it('MOB-COMP-006 GuestPrompt offers to create an account or sign in', () => {
    const { getByText } = render(
      <GuestPrompt icon="user" title="Sign in to save" body="Create playlists across devices" />,
    );
    expect(getByText('Sign in to save')).toBeTruthy();
    fireEvent.press(getByText('Create account'));
    fireEvent.press(getByText('Sign in'));
    expect(nav.navigate.mock.calls).toEqual([
      ['SignIn', { mode: 'signup' }],
      ['SignIn', { mode: 'signin' }],
    ]);
  });

  it('MOB-COMP-010 Sheet shows its content, closes from the backdrop or back button, and unmounts when closed', () => {
    const onClose = jest.fn();
    const { getByText, getByLabelText, UNSAFE_getByType, rerender, queryByText } = render(
      <Sheet visible onClose={onClose}>
        <Text>Sheet Content</Text>
      </Sheet>,
    );
    expect(getByText('Sheet Content')).toBeTruthy();
    fireEvent.press(getByLabelText('Close'));
    UNSAFE_getByType('Modal' as never).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(2);
    rerender(
      <Sheet visible={false} onClose={onClose}>
        <Text>Sheet Content</Text>
      </Sheet>,
    );
    expect(queryByText('Sheet Content')).toBeNull();
  });
});

describe('mini player', () => {
  it('MOB-COMP-019 shows the song, pauses, skips, hearts, and opens Now Playing', () => {
    const toggle = jest.spyOn(useLibraryStore.getState(), 'toggleFavourite').mockResolvedValue();
    const { getByLabelText, getByText } = render(<MiniPlayer />);
    expect(getByText('Reckoner')).toBeTruthy();
    fireEvent.press(getByLabelText('Pause'));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    fireEvent.press(getByLabelText('Add to favourites'));
    expect(toggle).toHaveBeenCalledWith(song);
    fireEvent.press(getByLabelText('Next track'));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(later.id);
    fireEvent.press(getByLabelText('Open now playing'));
    expect(nav.navigate).toHaveBeenCalledWith('NowPlaying');
  });

  it('MOB-COMP-037 is hidden when nothing is loaded, and shows a saved song as on the phone', () => {
    usePlayerStore.setState({ currentTrack: null });
    const empty = render(<MiniPlayer />);
    expect(empty.toJSON()).toBeNull();
    usePlayerStore.setState({ currentTrack: song });
    useDownloadsStore.setState({ items: { [song.id]: makeDownload(song) } });
    const saved = render(<MiniPlayer />);
    expect(JSON.stringify(saved.toJSON())).toContain('icon-smartphone');
  });
});

describe('song menu', () => {
  const open = (options?: Parameters<ReturnType<typeof useTrackMenuStore.getState>['open']>[1]) => {
    const utils = render(<TrackMenuHost />);
    act(() => useTrackMenuStore.getState().open(song, options));
    return utils;
  };

  it('MOB-COMP-020 "Play next" and "Add to queue" go to the player and close the menu', () => {
    usePlayerStore.setState({ currentTrack: later, queue: [later] });
    const { getByLabelText } = open();
    fireEvent.press(getByLabelText('Add to queue'));
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([later.id, song.id]);
    expect(useTrackMenuStore.getState().track).toBeNull();
    act(() => useTrackMenuStore.getState().open(song));
    fireEvent.press(getByLabelText('Play next'));
    expect(usePlayerStore.getState().queue[1].id).toBe(song.id);
  });

  it('MOB-COMP-038 a guest choosing favourites or playlists is asked to create an account', () => {
    const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
    const { getByLabelText } = open();
    fireEvent.press(getByLabelText('Add to favourites'));
    expect(navigate).toHaveBeenLastCalledWith('SignIn', {
      reason: 'Create a free account to save songs you love.',
    });
    act(() => useTrackMenuStore.getState().open(song));
    fireEvent.press(getByLabelText('Add to playlist'));
    expect(navigate).toHaveBeenLastCalledWith('SignIn', {
      reason: 'Create a free account to make playlists.',
    });
  });

  it('MOB-COMP-039 a signed-in user picks a playlist, or names a new one, to add the song to', async () => {
    useAuthStore.setState({ status: 'signedIn', user: alice } as never);
    useLibraryStore.setState({
      playlists: [makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: 3 })],
    });
    const add = jest.spyOn(useLibraryStore.getState(), 'addToPlaylist').mockResolvedValue();
    const create = jest
      .spyOn(useLibraryStore.getState(), 'createPlaylist')
      .mockResolvedValue(makePlaylist({ id: 'sonare:new' }));
    const { getByLabelText } = open();
    fireEvent.press(getByLabelText('Add to playlist'));
    await act(async () => fireEvent.press(getByLabelText('Add to Gym')));
    expect(add).toHaveBeenCalledWith('sonare:gym', song);
    expect(useTrackMenuStore.getState().track).toBeNull();

    act(() => useTrackMenuStore.getState().open(song, { view: 'playlists' }));
    fireEvent.changeText(getByLabelText('New playlist name'), '  Late ');
    await act(async () => fireEvent.press(getByLabelText('Create playlist')));
    expect(create).toHaveBeenCalledWith('Late');
    expect(add).toHaveBeenLastCalledWith('sonare:new', song);
  });

  it('MOB-COMP-040 a playlist that cannot be updated shows why and stays open', async () => {
    useAuthStore.setState({ status: 'signedIn', user: alice } as never);
    useLibraryStore.setState({
      playlists: [makePlaylist({ id: 'sonare:gym', name: 'Gym' })],
    });
    jest.spyOn(useLibraryStore.getState(), 'addToPlaylist').mockRejectedValue(new Error('Playlist is full'));
    const { getByLabelText, findByText } = open({ view: 'playlists' });
    await act(async () => fireEvent.press(getByLabelText('Add to Gym')));
    expect(await findByText('Playlist is full')).toBeTruthy();
    expect(useTrackMenuStore.getState().track?.id).toBe(song.id);
  });

  it("MOB-COMP-041 the download item follows the song's download state, and hides offline", () => {
    const dl = downloadsWith({});
    const { getByLabelText, queryByLabelText } = open();
    fireEvent.press(getByLabelText('Download'));
    expect(dl.enqueue).toHaveBeenCalledWith([song]);
    downloadsWith({ [song.id]: makeDownload(song, { status: 'downloading' }) });
    act(() => useTrackMenuStore.getState().open(song));
    expect(getByLabelText('Pause download')).toBeTruthy();
    downloadsWith({ [song.id]: makeDownload(song, { status: 'paused' }) });
    act(() => useTrackMenuStore.getState().open(song));
    expect(getByLabelText('Resume download')).toBeTruthy();
    downloadsWith({});
    useModeStore.setState({ mode: 'offline' });
    act(() => useTrackMenuStore.getState().open(song));
    expect(queryByLabelText('Download')).toBeNull();
  });

  it('MOB-COMP-042 a screen can add its own action, e.g. "Remove from playlist"', () => {
    const onPress = jest.fn();
    const { getByLabelText } = open({
      extraAction: { label: 'Remove from playlist', onPress },
    });
    fireEvent.press(getByLabelText('Remove from playlist'));
    expect(onPress).toHaveBeenCalled();
    expect(useTrackMenuStore.getState().track).toBeNull();
  });
});

describe('waveform', () => {
  it('MOB-COMP-021 tapping seeks to that fraction; played bars are coloured by mode', () => {
    const onSeek = jest.fn();
    const { getByLabelText, UNSAFE_getAllByType } = render(
      <Waveform trackId="t" progress={0.5} mode="offline" peaks={[1, 2, 3, 4]} onSeek={onSeek} />,
    );
    const wave = getByLabelText('Seek');
    expect(wave.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 50,
    });
    fireEvent(wave, 'layout', { nativeEvent: { layout: { width: 200 } } });
    fireEvent.press(wave, { nativeEvent: { locationX: 150 } });
    fireEvent.press(wave, { nativeEvent: { locationX: 999 } });
    expect(onSeek.mock.calls.map((c) => c[0])).toEqual([0.75, 1]);
    const bars = UNSAFE_getAllByType('View' as never).filter((v) => v.props.style?.width);
    expect(bars.map((b) => b.props.className)).toEqual([
      expect.stringContaining('bg-gold'),
      expect.stringContaining('bg-gold'),
      expect.stringContaining('bg-white'),
      expect.stringContaining('bg-ln3'),
    ]);
  });

  it('MOB-COMP-043 without a seek handler the waveform cannot be tapped', () => {
    const { getByLabelText } = render(<Waveform trackId="t" progress={0} mode="online" />);
    expect(getByLabelText('Seek').props.disabled).toBe(true);
  });
});

describe('download buttons', () => {
  it('MOB-COMP-025 one song: download, pause while running, resume, delete once saved; nothing for local files', async () => {
    let dl = downloadsWith({});
    const { getByLabelText, rerender, toJSON } = render(<TrackDownloadButton track={song} />);
    fireEvent.press(getByLabelText('Download'));
    expect(dl.enqueue).toHaveBeenCalledWith([song]);

    dl = downloadsWith({
      [song.id]: makeDownload(song, {
        status: 'downloading',
        receivedBytes: 250,
        totalBytes: 1000,
      }),
    });
    rerender(<TrackDownloadButton track={song} />);
    fireEvent.press(getByLabelText('Downloading 25%, pause'));
    expect(dl.pause).toHaveBeenCalledWith(song.id);

    dl = downloadsWith({ [song.id]: makeDownload(song, { status: 'failed' }) });
    rerender(<TrackDownloadButton track={song} />);
    fireEvent.press(getByLabelText('Download failed, retry'));
    expect(dl.resume).toHaveBeenCalledWith(song.id);

    dl = downloadsWith({ [song.id]: makeDownload(song) });
    rerender(<TrackDownloadButton track={song} />);
    const alert = jest.spyOn(Alert, 'alert');
    fireEvent.press(getByLabelText('Downloaded, delete download'));
    expect(alert.mock.calls[0][0]).toBe('Delete "Reckoner"?');

    rerender(<TrackDownloadButton track={makeTrack({ source: 'local' })} />);
    expect(toJSON()).toBeNull();
  });

  it('MOB-COMP-024 a whole album: download the server songs, show progress, offer delete when all are saved', () => {
    const tracks = [song, later, makeTrack({ source: 'local' })];
    let dl = downloadsWith({});
    const alert = jest.spyOn(Alert, 'alert');
    const { getByLabelText, rerender, toJSON } = render(<DownloadAllButton tracks={tracks} />);
    fireEvent.press(getByLabelText('Download all'));
    expect(dl.enqueue).toHaveBeenCalledWith([song, later]);
    expect(alert).toHaveBeenCalledWith('Added to downloads', '2 songs will be saved to Music/Sonare.');

    downloadsWith({ [song.id]: makeDownload(song, { status: 'downloading' }) });
    rerender(<DownloadAllButton tracks={tracks} />);
    fireEvent.press(getByLabelText('Downloading, open Downloads'));
    expect(nav.navigate).toHaveBeenCalledWith('Downloads');

    dl = downloadsWith({
      [song.id]: makeDownload(song),
      [later.id]: makeDownload(later),
    });
    rerender(<DownloadAllButton tracks={tracks} />);
    fireEvent.press(getByLabelText('Delete downloads'));
    expect(alert).toHaveBeenLastCalledWith(
      'Delete 2 downloads?',
      'The file is deleted from the folder it was saved to.',
      expect.any(Array),
    );

    // Offline with nothing saved there is nothing to offer.
    downloadsWith({});
    useModeStore.setState({ mode: 'offline' });
    rerender(<DownloadAllButton tracks={tracks} />);
    expect(toJSON()).toBeNull();
  });
});
