import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { NowPlayingScreen } from '../src/screens/NowPlaying';
import { QueueScreen } from '../src/screens/Queue';
import { LyricsScreen } from '../src/screens/Lyrics';
import { EqualizerScreen } from '../src/screens/Equalizer';
import { DownloadsScreen } from '../src/screens/Downloads';
import { SettingsScreen } from '../src/screens/Settings';
import { SignInScreen } from '../src/screens/SignIn';
import { ModeSwitchScreen } from '../src/screens/ModeSwitch';
import { FoldersScreen } from '../src/screens/Folders';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useSettingsStore } from '../src/data/settings';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useTrackMenuStore } from '../src/store/trackMenu';
import { navigationRef } from '../src/data/accountGate';
import { alice, makeDownload, makePlaylist, makeTrack, nav, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);
const guest = () => useAuthStore.setState({ status: 'guest', user: null } as never);
const song = makeTrack({
  title: 'Nude',
  artist: 'Radiohead',
  album: 'In Rainbows',
  codec: 'opus',
  bitrateKbps: 160,
});
const next1 = makeTrack({ title: 'Next one' });
const next2 = makeTrack({ title: 'Next two', source: 'local' });

/** Press a button in the last Alert.alert call. */
async function pressAlertButton(text: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as {
    text: string;
    onPress?: () => unknown;
  }[];
  await act(async () => {
    await buttons.find((b) => b.text === text)!.onPress?.();
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  guest();
  useModeStore.setState({ mode: 'online' });
  usePlayerStore.setState({
    currentTrack: song,
    queue: [song, next1, next2],
    isPlaying: true,
    positionMs: 60_000,
    durationMs: 240_000,
    buffering: false,
    error: null,
    shuffle: false,
    repeat: 'off',
    seekRequest: null,
  });
  useDownloadsStore.setState({ items: {}, ready: true });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  useTrackMenuStore.setState({ track: null });
  jest.spyOn(api, 'peaks').mockResolvedValue({ peaks: [1, 2, 3] } as never);
});

describe('Now Playing', () => {
  it('MOB-NP-001 shows the song, where it plays from, its quality and the time left', () => {
    const { getByText } = render(<NowPlayingScreen />);
    expect(getByText('Nude')).toBeTruthy();
    expect(getByText('In Rainbows')).toBeTruthy();
    expect(getByText('STREAMING')).toBeTruthy();
    expect(getByText(/160 kbps/)).toBeTruthy();
    expect(getByText('1:00')).toBeTruthy();
    expect(getByText('-3:00')).toBeTruthy();
  });

  it('MOB-NP-002 a downloaded song is shown as on this device', () => {
    useDownloadsStore.setState({ items: { [song.id]: makeDownload(song) } });
    const { getByText } = render(<NowPlayingScreen />);
    expect(getByText('ON THIS DEVICE')).toBeTruthy();
  });

  it('MOB-NP-003 transport buttons drive the player', () => {
    const { getByLabelText } = render(<NowPlayingScreen />);
    fireEvent.press(getByLabelText('Pause'));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    fireEvent.press(getByLabelText('Next track'));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(next1.id);
    fireEvent.press(getByLabelText('Toggle shuffle'));
    expect(usePlayerStore.getState().shuffle).toBe(true);
    fireEvent.press(getByLabelText('Toggle repeat'));
    expect(usePlayerStore.getState().repeat).toBe('all');
  });

  it('MOB-NP-004 tapping the waveform seeks to that point', () => {
    const { getByLabelText } = render(<NowPlayingScreen />);
    const wave = getByLabelText('Seek');
    fireEvent(wave, 'layout', { nativeEvent: { layout: { width: 400 } } });
    fireEvent.press(wave, { nativeEvent: { locationX: 100 } });
    expect(usePlayerStore.getState().seekRequest?.ms).toBe(60_000);
  });

  it('MOB-NP-005 a guest hearting the song is asked to sign up; a signed-in user saves it', async () => {
    const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
    const toggle = jest.spyOn(useLibraryStore.getState(), 'toggleFavourite').mockResolvedValue();
    const { getByLabelText } = render(<NowPlayingScreen />);
    fireEvent.press(getByLabelText('Add to favourites'));
    expect(navigate).toHaveBeenCalledWith('SignIn', {
      reason: 'Create a free account to save songs you love.',
    });
    expect(toggle).not.toHaveBeenCalled();
    signIn();
    fireEvent.press(getByLabelText('Add to favourites'));
    expect(toggle).toHaveBeenCalledWith(song);
  });

  it('MOB-NP-006 playback errors are shown; lyrics, queue, equalizer and the song menu are one tap away', () => {
    usePlayerStore.setState({ error: 'Playback failed' });
    const { getByText, getByLabelText } = render(<NowPlayingScreen />);
    expect(getByText('Playback failed')).toBeTruthy();
    fireEvent.press(getByLabelText('Lyrics'));
    fireEvent.press(getByLabelText('Queue'));
    fireEvent.press(getByLabelText('Equalizer'));
    expect(nav.navigate.mock.calls.map((c) => c[0])).toEqual(['Lyrics', 'Queue', 'Equalizer']);
    fireEvent.press(getByLabelText('More options'));
    expect(useTrackMenuStore.getState().track?.id).toBe(song.id);
  });

  it('MOB-NP-007 with nothing playing it says so and can be closed', () => {
    usePlayerStore.setState({ currentTrack: null });
    const { getByText, getByLabelText } = render(<NowPlayingScreen />);
    expect(getByText('Nothing playing')).toBeTruthy();
    fireEvent.press(getByLabelText('Close now playing'));
    expect(nav.goBack).toHaveBeenCalled();
  });
});

describe('Queue', () => {
  it('MOB-Q-001 shows what is next, counts server songs, and plays a tapped song', () => {
    const { getByText, getByLabelText } = render(<QueueScreen />);
    expect(getByText('ONLINE QUEUE')).toBeTruthy();
    expect(getByText(/· 2 from server/)).toBeTruthy();
    fireEvent.press(getByLabelText(`Next two by ${next2.artist}`));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(next2.id);
  });

  it('MOB-Q-002 "Clear queue" keeps only the current song; then it says the queue has ended', () => {
    const { getByText, queryByText } = render(<QueueScreen />);
    fireEvent.press(getByText('Clear queue'));
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([song.id]);
    expect(getByText('End of queue')).toBeTruthy();
    expect(queryByText('Next one')).toBeNull();
  });

  it("MOB-Q-003 a song's menu can remove it from the queue", () => {
    // The row passes "Remove from queue" to the shared song menu.
    const { getByLabelText } = render(<QueueScreen />);
    fireEvent.press(getByLabelText('More options for Next one'));
    const extra = useTrackMenuStore.getState().extraAction!;
    expect(extra.label).toBe('Remove from queue');
    act(() => extra.onPress());
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([song.id, next2.id]);
  });

  it('MOB-Q-004 saving the queue creates a playlist with every queued song', async () => {
    signIn();
    const create = jest
      .spyOn(useLibraryStore.getState(), 'createPlaylist')
      .mockResolvedValue(makePlaylist({ id: 'sonare:q' }));
    jest.spyOn(useLibraryStore.getState(), 'reloadPlaylists').mockResolvedValue();
    const add = jest.spyOn(api, 'addToPlaylist').mockResolvedValue({ ok: true } as never);
    const { getByText, findByText } = render(<QueueScreen />);
    fireEvent.press(getByText('Save as playlist'));
    expect(await findByText(/Saved as "Queue · /)).toBeTruthy();
    expect(create).toHaveBeenCalledWith(expect.stringMatching(/^Queue · /));
    expect(add).toHaveBeenCalledWith('sonare:q', [song.id, next1.id, next2.id]);
  });

  it('MOB-Q-005 a failed save says why; shuffle and repeat work from here', async () => {
    signIn();
    jest.spyOn(useLibraryStore.getState(), 'createPlaylist').mockRejectedValue(new Error('Server is busy'));
    const { getByText, findByText, getByLabelText } = render(<QueueScreen />);
    fireEvent.press(getByText('Save as playlist'));
    expect(await findByText(/Server is busy/)).toBeTruthy();
    fireEvent.press(getByLabelText('Shuffle queue'));
    fireEvent.press(getByLabelText('Repeat: off'));
    expect(usePlayerStore.getState()).toMatchObject({
      shuffle: true,
      repeat: 'all',
    });
  });

  it('MOB-Q-006 an empty queue says so', () => {
    usePlayerStore.setState({ currentTrack: null, queue: [] });
    const { getByText } = render(<QueueScreen />);
    expect(getByText('Queue is empty')).toBeTruthy();
  });
});

describe('Lyrics', () => {
  const lines = [
    { atMs: 0, text: 'First line' },
    { atMs: 50_000, text: 'Second line' },
    { atMs: 90_000, text: 'Third line' },
  ];

  it('MOB-LYR-001 highlights the line being sung and taps jump to a line', async () => {
    jest.spyOn(api, 'lyrics').mockResolvedValue({
      synced: true,
      lines,
      offsetMs: 0,
      provider: 'lrclib',
    } as never);
    const { findByText, getByText } = render(<LyricsScreen />);
    expect(await findByText('Second line')).toBeTruthy();
    expect(getByText('Second line').props.className).toContain('text-t1');
    expect(getByText('First line').props.className).toContain('text-t3');
    fireEvent.press(getByText('Third line'));
    expect(usePlayerStore.getState().seekRequest?.ms).toBe(90_000);
  });

  it('MOB-LYR-002 the offset shifts which line is current and where taps land', async () => {
    jest.spyOn(api, 'lyrics').mockResolvedValue({
      synced: true,
      lines,
      offsetMs: -15_000,
      provider: 'lrclib',
    } as never);
    const { findByText, getByText } = render(<LyricsScreen />);
    await findByText('Second line');
    // 60 s - 15 s = 45 s: still on the first line.
    expect(getByText('First line').props.className).toContain('text-t1');
    fireEvent.press(getByText('Second line'));
    expect(usePlayerStore.getState().seekRequest?.ms).toBe(65_000);
  });

  it('MOB-LYR-003 plain text view shows the words without timing', async () => {
    jest.spyOn(api, 'lyrics').mockResolvedValue({
      synced: true,
      lines,
      offsetMs: 0,
      provider: 'lrclib',
    } as never);
    const { findByText, getByText } = render(<LyricsScreen />);
    fireEvent.press(await findByText('Plain text'));
    expect(getByText('First line\nSecond line\nThird line')).toBeTruthy();
  });

  it('MOB-LYR-004 no lyrics, or a local file, says none were found without asking the server for local files', async () => {
    const lyrics = jest.spyOn(api, 'lyrics').mockRejectedValue(new Error('Lyrics not found'));
    const { findByText, unmount } = render(<LyricsScreen />);
    expect(await findByText('No lyrics found for this song.')).toBeTruthy();
    unmount();
    lyrics.mockClear();
    usePlayerStore.setState({
      currentTrack: makeTrack({ id: 'local:f', source: 'local' }),
    });
    const local = render(<LyricsScreen />);
    expect(await local.findByText('No lyrics found for this song.')).toBeTruthy();
    expect(lyrics).not.toHaveBeenCalled();
  });
});

describe('Equalizer', () => {
  const selected = (el: { props: { className?: string } }) => (el.props.className ?? '').includes('text-acc');

  it('MOB-EQ-001 presets and switches respond to taps', () => {
    const { getByText, getByLabelText } = render(<EqualizerScreen />);
    expect(selected(getByText('Sonare'))).toBe(true);
    fireEvent.press(getByText('Bass'));
    expect(selected(getByText('Bass'))).toBe(true);
    expect(selected(getByText('Sonare'))).toBe(false);
    expect(getByLabelText('Gapless playback').props.accessibilityState.checked).toBe(true);
    fireEvent.press(getByLabelText('Gapless playback'));
    expect(getByLabelText('Gapless playback').props.accessibilityState.checked).toBe(false);
  });

  it('MOB-EQ-002 a chosen preset is still selected when the screen is opened again', () => {
    const first = render(<EqualizerScreen />);
    fireEvent.press(first.getByText('Bass'));
    first.unmount();
    const again = render(<EqualizerScreen />);
    expect(selected(again.getByText('Bass'))).toBe(true);
  });
});

describe('Downloads', () => {
  const d = (title: string, over: Parameters<typeof makeDownload>[1]) => makeDownload(makeTrack({ title }), over);

  it('MOB-DL-S-001 with nothing downloaded it says so', () => {
    const { getByText } = render(<DownloadsScreen />);
    expect(getByText('No downloads yet')).toBeTruthy();
  });

  it('MOB-DL-S-002 shows progress for running downloads and lets them be paused, resumed or retried', () => {
    const pause = jest.fn(async () => {});
    const resume = jest.fn();
    const items = {
      a: d('Going', {
        status: 'downloading',
        receivedBytes: 1_500_000,
        totalBytes: 3_000_000,
      }),
      b: d('Held', {
        status: 'paused',
        receivedBytes: 2_000_000,
        totalBytes: 0,
      }),
      c: d('Broken', {
        status: 'failed',
        error: 'Only a video stream is available',
      }),
    };
    useDownloadsStore.setState({ items, pause, resume } as never);
    const { getByText, getByLabelText } = render(<DownloadsScreen />);
    expect(getByText('1.5 MB of 3.0 MB · 50%')).toBeTruthy();
    fireEvent.press(getByLabelText('Pause Going'));
    expect(pause).toHaveBeenCalledWith(items.a.id);
    fireEvent.press(getByLabelText('Resume Held'));
    fireEvent.press(getByLabelText('Retry Broken'));
    expect(resume.mock.calls.map((c) => c[0])).toEqual([items.b.id, items.c.id]);
  });

  it('MOB-DL-S-003 finished songs play as a queue of downloads; a moved file is marked', () => {
    const items = { a: d('Kept', {}), b: d('Moved', { missing: true }) };
    useDownloadsStore.setState({ items });
    const { getByText } = render(<DownloadsScreen />);
    expect(getByText('File moved or deleted outside Sonare')).toBeTruthy();
    fireEvent.press(getByText('Kept'));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(items.a.id);
  });

  it('MOB-DL-S-004 deleting asks first and deletes the file; a moved file is only taken off the list', async () => {
    const remove = jest.fn(async () => ({
      fileDeleted: false,
      reason: 'The file is no longer there',
    }));
    const items = { a: d('Old song', {}) };
    useDownloadsStore.setState({ items, remove } as never);
    const alert = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(<DownloadsScreen />);
    fireEvent.press(getByLabelText('Delete Old song'));
    expect(alert).toHaveBeenCalledWith(
      'Delete "Old song"?',
      'The file is deleted from the folder it was saved to.',
      expect.any(Array),
    );
    expect(remove).not.toHaveBeenCalled();
    await pressAlertButton('Delete');
    expect(remove).toHaveBeenCalledWith(items.a.id);
    expect(alert).toHaveBeenLastCalledWith(
      'Removed from downloads',
      'The file is no longer there, so it was only removed from the list.',
    );
  });

  it('MOB-DL-S-005 "Delete all" removes every finished download after asking', async () => {
    const remove = jest.fn(async () => ({ fileDeleted: true }));
    const items = {
      a: d('One', {}),
      b: d('Two', {}),
      c: d('Running', { status: 'downloading' }),
    };
    useDownloadsStore.setState({ items, remove } as never);
    const alert = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(<DownloadsScreen />);
    fireEvent.press(getByLabelText('Delete all downloads'));
    expect(alert.mock.calls[0][0]).toBe('Delete 2 downloads?');
    await pressAlertButton('Delete');
    expect((remove.mock.calls as any[]).map((c) => c[0]).sort()).toEqual([items.a.id, items.b.id].sort());
  });
});

describe('Settings', () => {
  it('MOB-SET-S-001 a guest is offered sign-in and sign-up', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Listening as a guest')).toBeTruthy();
    fireEvent.press(getByText('Create account'));
    expect(nav.navigate).toHaveBeenCalledWith('SignIn', { mode: 'signup' });
  });

  it('MOB-SET-S-002 signing out asks first', async () => {
    signIn();
    const signOut = jest.fn(async () => {});
    useAuthStore.setState({ signOut } as never);
    const alert = jest.spyOn(Alert, 'alert');
    const { getByText, getByLabelText } = render(<SettingsScreen />);
    expect(getByText('Alice Walker')).toBeTruthy();
    expect(getByText('alice@sonare.test')).toBeTruthy();
    fireEvent.press(getByLabelText('Sign out'));
    expect(alert.mock.calls[0][0]).toBe('Sign out?');
    expect(signOut).not.toHaveBeenCalled();
    await pressAlertButton('Sign out');
    expect(signOut).toHaveBeenCalled();
  });

  it('MOB-SET-S-003 the download format changes the quality description and is saved', () => {
    const update = jest.fn();
    useSettingsStore.setState({
      downloadFormat: 'opus',
      downloadQuality: 'high',
      update,
    } as never);
    const { getByText, rerender } = render(<SettingsScreen />);
    expect(getByText('Low ≈ 60 kbps · Normal ≈ 75 kbps · High ≈ 150 kbps')).toBeTruthy();
    fireEvent.press(getByText('AAC (.m4a)'));
    expect(update).toHaveBeenCalledWith({ downloadFormat: 'm4a' });
    useSettingsStore.setState({ downloadFormat: 'm4a' });
    rerender(<SettingsScreen />);
    expect(getByText('Low ≈ 50 kbps · Normal and High = 128 kbps (AAC has two steps)')).toBeTruthy();
  });

  it('MOB-SET-S-004 the download location can be changed or reset', async () => {
    const chooseLocation = jest.fn(async () => true);
    const resetLocation = jest.fn(async () => {});
    useDownloadsStore.setState({
      location: {
        label: 'SD card/Songs',
        treeUri: 'content://tree/sd',
      } as never,
      chooseLocation,
      resetLocation,
    } as never);
    const alert = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(<SettingsScreen />);
    fireEvent.press(getByLabelText('Download location'));
    expect(alert.mock.calls[0].slice(0, 2)).toEqual([
      'Download location',
      'New downloads are saved to SD card/Songs. Songs already downloaded stay where they are.',
    ]);
    await pressAlertButton('Choose folder');
    expect(chooseLocation).toHaveBeenCalled();
    fireEvent.press(getByLabelText('Download location'));
    await pressAlertButton('Use Music/Sonare');
    expect(resetLocation).toHaveBeenCalled();
  });

  it('MOB-SET-S-005 a folder that cannot be used is reported', async () => {
    useDownloadsStore.setState({
      chooseLocation: jest.fn(async () => {
        throw new Error('No write access');
      }),
    } as never);
    const alert = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(<SettingsScreen />);
    fireEvent.press(getByLabelText('Download location'));
    await pressAlertButton('Choose folder');
    expect(alert).toHaveBeenLastCalledWith('Could not change the folder', 'No write access');
  });

  it('MOB-SET-S-006 an unverified account can resend the link; verified accounts see no prompt', async () => {
    const resendVerification = jest.fn(async () => {});
    useAuthStore.setState({
      status: 'signedIn',
      user: { ...alice, emailVerified: false },
      resendVerification,
    } as never);
    const alert = jest.spyOn(Alert, 'alert');
    const { getByText, queryByText, rerender } = render(<SettingsScreen />);
    expect(getByText('Email not verified')).toBeTruthy();
    await act(async () => fireEvent.press(getByText('Resend link')));
    expect(resendVerification).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenLastCalledWith('Verification email sent', 'Check alice@sonare.test.');

    useAuthStore.setState({ user: { ...alice, emailVerified: true } } as never);
    rerender(<SettingsScreen />);
    expect(queryByText('Email not verified')).toBeNull();
  });
});

describe('Sign in', () => {
  it('MOB-SIGNIN-001 checks the form before sending anything', () => {
    const signInFn = jest.fn();
    useAuthStore.setState({ signIn: signInFn } as never);
    const { getByLabelText, getByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText('Email'), 'not-an-email');
    fireEvent.press(getByLabelText('Sign in'));
    expect(getByText('Enter a valid email address')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Email'), 'alice@sonare.test');
    fireEvent.press(getByLabelText('Sign in'));
    expect(getByText('Enter your password')).toBeTruthy();
    expect(signInFn).not.toHaveBeenCalled();
  });

  it('MOB-SIGNIN-002 signs in with a normalised email and goes back', async () => {
    const signInFn = jest.fn(async () => {});
    useAuthStore.setState({ signIn: signInFn } as never);
    const { getByLabelText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText('Email'), '  Alice@Sonare.TEST ');
    fireEvent.changeText(getByLabelText('Password'), 'hunter22');
    await act(async () => fireEvent.press(getByLabelText('Sign in')));
    expect(signInFn).toHaveBeenCalledWith('alice@sonare.test', 'hunter22');
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('MOB-SIGNIN-003 a gate visit opens on sign-up, needs a name and 8+ character password', async () => {
    route.params = { reason: 'Create a free account to save songs you love.' };
    const signUpFn = jest.fn(async () => {});
    useAuthStore.setState({ signUp: signUpFn } as never);
    const { getByText, getByLabelText } = render(<SignInScreen />);
    expect(getByText('Create your account')).toBeTruthy();
    expect(getByText('Create a free account to save songs you love.')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Email'), 'nova@sonare.test');
    fireEvent.changeText(getByLabelText('Password'), 'short');
    fireEvent.press(getByLabelText('Create account'));
    expect(getByText('Tell us what to call you')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Your name'), 'Nova');
    fireEvent.press(getByLabelText('Create account'));
    expect(getByText('Use at least 8 characters for your password')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Password'), 'longenough');
    await act(async () => fireEvent.press(getByLabelText('Create account')));
    expect(signUpFn).toHaveBeenCalledWith('nova@sonare.test', 'longenough', 'Nova');
  });

  it('MOB-SIGNIN-004 server and network failures are shown plainly', async () => {
    const signInFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Wrong email or password'))
      .mockRejectedValueOnce(new Error('Network request failed'));
    useAuthStore.setState({ signIn: signInFn } as never);
    const { getByLabelText, findByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText('Email'), 'a@b.co');
    fireEvent.changeText(getByLabelText('Password'), 'x');
    await act(async () => fireEvent.press(getByLabelText('Sign in')));
    expect(await findByText('Wrong email or password')).toBeTruthy();
    await act(async () => fireEvent.press(getByLabelText('Sign in')));
    expect(await findByText("Can't reach the Sonare server")).toBeTruthy();
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  it('MOB-SIGNIN-005 "keep listening" leaves without an account', () => {
    const { getByLabelText, getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Create an account'));
    expect(getByText('Create your account')).toBeTruthy();
    fireEvent.press(getByLabelText('Keep listening without an account'));
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('MOB-SIGNIN-006 "Forgot password?" emails a reset link and says so', async () => {
    const requestPasswordReset = jest.fn(async () => {});
    const signInFn = jest.fn();
    useAuthStore.setState({ requestPasswordReset, signIn: signInFn } as never);
    const { getByText, getByLabelText, queryByLabelText, findByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Forgot password?'));
    expect(getByText('Reset your password')).toBeTruthy();
    expect(queryByLabelText('Password')).toBeNull();
    fireEvent.changeText(getByLabelText('Email'), 'nope');
    fireEvent.press(getByLabelText('Send reset link'));
    expect(getByText('Enter a valid email address')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Email'), ' Alice@Sonare.test ');
    await act(async () => fireEvent.press(getByLabelText('Send reset link')));
    expect(requestPasswordReset).toHaveBeenCalledWith('alice@sonare.test');
    expect(await findByText(/If an account exists for Alice@Sonare.test/)).toBeTruthy();
    expect(signInFn).not.toHaveBeenCalled();
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  it('MOB-SIGNIN-007 a reset request error shows, and "Sign in" goes back to the form', async () => {
    useAuthStore.setState({
      requestPasswordReset: jest.fn(async () => {
        throw new Error('Too many attempts. Try again in 60 min.');
      }),
    } as never);
    const { getByText, getByLabelText, findByText, queryByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Forgot password?'));
    fireEvent.changeText(getByLabelText('Email'), 'alice@sonare.test');
    await act(async () => fireEvent.press(getByLabelText('Send reset link')));
    expect(await findByText('Too many attempts. Try again in 60 min.')).toBeTruthy();
    fireEvent.press(getByText('Sign in'));
    expect(queryByText('Too many attempts. Try again in 60 min.')).toBeNull();
    expect(getByLabelText('Password')).toBeTruthy();
  });
});

describe('Mode switch', () => {
  it('MOB-MODE-001 confirming switches to Offline Mode and goes back', () => {
    route.params = { targetMode: 'offline' };
    const { getByText } = render(<ModeSwitchScreen />);
    expect(getByText('Switch to Offline Mode?')).toBeTruthy();
    fireEvent.press(getByText('Go offline'));
    expect(useModeStore.getState().mode).toBe('offline');
  });

  it('MOB-MODE-002 cancelling keeps the current mode', () => {
    route.params = { targetMode: 'offline' };
    const { getByText } = render(<ModeSwitchScreen />);
    fireEvent.press(getByText('Cancel'));
    expect(nav.goBack).toHaveBeenCalled();
    expect(useModeStore.getState().mode).toBe('online');
  });

  // BUG: "Stay offline automatically" is local state that nothing reads, so turning it off
  // changes nothing. Remove `.failing` once the choice is stored and honoured.
  test.failing('MOB-MODE-003 turning off "stay offline automatically" is remembered', () => {
    route.params = { targetMode: 'offline' };
    const first = render(<ModeSwitchScreen />);
    expect(first.getByLabelText('Stay offline automatically').props.accessibilityState.checked).toBe(true);
    fireEvent.press(first.getByLabelText('Stay offline automatically'));
    fireEvent.press(first.getByText('Go offline'));
    first.unmount();
    const again = render(<ModeSwitchScreen />);
    expect(again.getByLabelText('Stay offline automatically').props.accessibilityState.checked).toBe(false);
  });
});

describe('Music folders', () => {
  // BUG: the mobile Folders screen is the design mockup: hard-coded folders ("WhatsApp Audio",
  // "842 songs", "Last scan 12 min ago") and buttons that do nothing. Every user sees them.
  test.failing('MOB-FOLD-001 a phone with no scanned folders shows no made-up folders', () => {
    const { queryByText } = render(<FoldersScreen />);
    expect(queryByText('WhatsApp Audio')).toBeNull();
    expect(queryByText('Last scan 12 min ago')).toBeNull();
  });
});
