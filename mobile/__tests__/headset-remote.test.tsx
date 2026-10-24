import React from 'react';
import { AppState, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AudioEngine } from '../src/components/music/AudioEngine';
import { PlayerSheetsHost, usePlayerSheets } from '../src/components/music/PlayerSheets';
import { SettingsScreen } from '../src/screens/Settings';
import {
  DEFAULT_HEADSET_ACTIONS,
  sanitizeHeadsetAction,
  sanitizeHeadsetActions,
  useDevicePrefsStore,
} from '../src/store/devicePrefs';
import { usePlayerStore } from '../src/store/player';
import { useLibraryStore } from '../src/store/library';
import { useAuthStore } from '../src/data/auth';
import { navigationRef } from '../src/data/accountGate';
import { useSnackbarStore } from '../src/store/snackbar';
import { api } from '../src/data/api';
import { alice, makeTrack } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const native = NativeModules.SonarePlayer as Record<string, jest.Mock>;
const { mockEventEmitter } = require('../jest.setup');

const track1 = makeTrack({ id: 'yt:t1', title: 'First Song', artist: 'Artist One' });
const track2 = makeTrack({ id: 'yt:t2', title: 'Second Song', artist: 'Artist Two' });

describe('Headset buttons, remote commands and liked state sync (Phase M2)', () => {
  beforeAll(() => {
    jest.spyOn(api, 'stream').mockImplementation(async (id: string) => ({ url: `/api/v1/stream/${id}` }) as never);
    jest.spyOn(api, 'setFavourite').mockResolvedValue({ ok: true });
    render(<AudioEngine />);
  });

  beforeEach(async () => {
    AppState.currentState = 'active';
    await AsyncStorage.clear();
    act(() => {
      useAuthStore.setState({ status: 'signedIn', user: alice } as never);
      useDevicePrefsStore.setState({ headsetActions: { ...DEFAULT_HEADSET_ACTIONS } });
      usePlayerStore.setState({ currentTrack: null, queue: [], isPlaying: false, index: 0, playId: 0 });
      useLibraryStore.setState({ favouriteIds: {}, playlists: [], followingArtistIds: {} });
      useSnackbarStore.setState({ current: null, visible: false });
      usePlayerSheets.setState({ open: null });
    });
    native.setHeadsetActions.mockClear();
    native.setLiked.mockClear();
    native.load.mockClear();
  });

  it('MOB-HEADSET-001 devicePrefs sanitizes and persists headset button actions to AsyncStorage with default fallback', async () => {
    expect(DEFAULT_HEADSET_ACTIONS).toEqual({
      single: 'playPause',
      double: 'next',
      triple: 'previous',
    });

    expect(sanitizeHeadsetAction('invalid', 'playPause')).toBe('playPause');
    expect(sanitizeHeadsetAction('like', 'playPause')).toBe('like');
    expect(sanitizeHeadsetAction('none', 'playPause')).toBe('none');

    const sanitized = sanitizeHeadsetActions({
      single: 'like',
      double: 'invalid' as never,
    });
    expect(sanitized).toEqual({
      single: 'like',
      double: 'next',
      triple: 'previous',
    });

    await AsyncStorage.setItem(
      'sonare.devicePrefs',
      JSON.stringify({
        headsetActions: { single: 'none', double: 'like', triple: 'next' },
      }),
    );

    await act(async () => {
      await useDevicePrefsStore.getState().hydrate();
    });

    expect(useDevicePrefsStore.getState().headsetActions).toEqual({
      single: 'none',
      double: 'like',
      triple: 'next',
    });

    act(() => {
      useDevicePrefsStore.getState().setHeadsetAction('single', 'like');
    });
    expect(useDevicePrefsStore.getState().headsetActions.single).toBe('like');
    expect(native.setHeadsetActions).toHaveBeenCalledWith(
      expect.objectContaining({ single: 'like', double: 'like', triple: 'next' }),
    );

    const stored = JSON.parse((await AsyncStorage.getItem('sonare.devicePrefs')) || '{}');
    expect(stored.headsetActions.single).toBe('like');
  });

  it('MOB-HEADSET-002 PlayerSheets HeadsetSheet lets user select single/double/triple click action and calls SonarePlayer.setHeadsetActions', async () => {
    const { getByText } = render(<PlayerSheetsHost />);

    act(() => {
      usePlayerSheets.getState().show('headset');
    });

    expect(getByText('Headset buttons')).toBeTruthy();
    expect(getByText('Press once')).toBeTruthy();
    expect(getByText('Press twice')).toBeTruthy();
    expect(getByText('Press three times')).toBeTruthy();

    fireEvent.press(getByText('Press twice'));
    expect(getByText('Like')).toBeTruthy();

    fireEvent.press(getByText('Like'));

    expect(useDevicePrefsStore.getState().headsetActions.double).toBe('like');
    expect(native.setHeadsetActions).toHaveBeenCalledWith({
      single: 'playPause',
      double: 'like',
      triple: 'previous',
    });
  });

  it('MOB-HEADSET-003 Settings screen shows Headset buttons row with summary and opens the headset action sheet', () => {
    const { getByText, getByLabelText } = render(<SettingsScreen />);

    expect(getByText('Headset buttons')).toBeTruthy();
    expect(getByText('Play/pause · Next · Previous')).toBeTruthy();

    const row = getByLabelText('Headset buttons');
    expect(row).toBeTruthy();

    fireEvent.press(row);
    expect(usePlayerSheets.getState().open).toBe('headset');
  });

  it('MOB-HEADSET-004 AudioEngine pushes headset button actions on start and when device preferences change', () => {
    native.setHeadsetActions.mockClear();

    act(() => {
      useDevicePrefsStore.getState().setHeadsetAction('triple', 'like');
    });

    expect(native.setHeadsetActions).toHaveBeenCalledWith({
      single: 'playPause',
      double: 'next',
      triple: 'like',
    });
  });

  it('MOB-HEADSET-005 AudioEngine pushes liked state via SonarePlayer.setLiked when song changes or favourite toggles', async () => {
    native.setLiked.mockClear();

    act(() => {
      usePlayerStore.setState({ currentTrack: track1, playId: 1 });
    });
    expect(native.setLiked).toHaveBeenCalledWith(false);

    native.setLiked.mockClear();
    act(() => {
      useLibraryStore.setState({ favouriteIds: { [track1.id]: true } });
    });
    expect(native.setLiked).toHaveBeenCalledWith(true);

    native.setLiked.mockClear();
    act(() => {
      usePlayerStore.setState({ currentTrack: track2, playId: 2 });
    });
    expect(native.setLiked).toHaveBeenCalledWith(false);
  });

  it('MOB-HEADSET-006 remote like command toggles favourite and displays snackbar in foreground', async () => {
    act(() => {
      usePlayerStore.setState({ currentTrack: track1, playId: 1 });
    });

    act(() => {
      mockEventEmitter.emit('SonarePlayer.remote', { command: 'like' });
    });

    await waitFor(() => {
      expect(useLibraryStore.getState().favouriteIds[track1.id]).toBe(true);
    });

    expect(native.setLiked).toHaveBeenCalledWith(true);
    expect(useSnackbarStore.getState().visible).toBe(true);
    expect(useSnackbarStore.getState().current?.title).toBe('Added to Liked Songs');
    expect(useSnackbarStore.getState().current?.subtitle).toBe('First Song');

    act(() => {
      mockEventEmitter.emit('SonarePlayer.remote', { command: 'like' });
    });

    await waitFor(() => {
      expect(useLibraryStore.getState().favouriteIds[track1.id]).toBeUndefined();
    });

    expect(native.setLiked).toHaveBeenCalledWith(false);
    expect(useSnackbarStore.getState().visible).toBe(true);
    expect(useSnackbarStore.getState().current?.title).toBe('Removed from Liked Songs');
  });

  it('MOB-HEADSET-007 remote like command does not display snackbar when app is in background', async () => {
    AppState.currentState = 'background';
    act(() => {
      usePlayerStore.setState({ currentTrack: track1, playId: 1 });
    });

    act(() => {
      mockEventEmitter.emit('SonarePlayer.remote', { command: 'like' });
    });

    await waitFor(() => {
      expect(useLibraryStore.getState().favouriteIds[track1.id]).toBe(true);
    });

    expect(useSnackbarStore.getState().visible).toBe(false);
    expect(useSnackbarStore.getState().current).toBeNull();
  });

  it('MOB-HEADSET-008 remote like command gates guest users with requireAccount', async () => {
    act(() => {
      useAuthStore.setState({ status: 'guest', user: null } as never);
      usePlayerStore.setState({ currentTrack: track1, playId: 1 });
    });

    const navigateSpy = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);

    act(() => {
      mockEventEmitter.emit('SonarePlayer.remote', { command: 'like' });
    });

    expect(useLibraryStore.getState().favouriteIds[track1.id]).toBeUndefined();
    expect(navigateSpy).toHaveBeenCalledWith('SignIn', {
      reason: 'Create a free account to save songs you love.',
    });
    expect(useSnackbarStore.getState().visible).toBe(false);
  });

  it('MOB-HEADSET-009 remote next and previous commands advance and rewind player queue', () => {
    act(() => {
      usePlayerStore.setState({
        currentTrack: track1,
        queue: [track1, track2],
        index: 0,
        playId: 1,
      });
    });

    act(() => {
      mockEventEmitter.emit('SonarePlayer.remote', { command: 'next' });
    });
    expect(usePlayerStore.getState().index).toBe(1);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(track2.id);

    act(() => {
      mockEventEmitter.emit('SonarePlayer.remote', { command: 'previous' });
    });
    expect(usePlayerStore.getState().index).toBe(0);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(track1.id);
  });
});
