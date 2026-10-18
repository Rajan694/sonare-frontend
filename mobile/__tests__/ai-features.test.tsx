import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/Home';
import { SearchScreen } from '../src/screens/Search';
import { PlaylistsScreen } from '../src/screens/Playlists';
import { api, ApiError, onAiUnavailable } from '../src/data/api';
import * as http from '../src/data/http';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useLibraryStore } from '../src/store/library';
import { useRecentSearchesStore } from '../src/store/recentSearches';
import { useAiStore } from '../src/store/ai';
import { setAppConfig } from '../src/youtube/appConfig';
import * as NetInfo from '@react-native-community/netinfo';
import type { AiPick } from '../../shared/apiTypes';
import { alice, makePlaylist, makeTrack, nav, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const stub = <K extends keyof typeof api>(name: K, impl: (...args: any[]) => any) =>
  jest.spyOn(api, name).mockImplementation(impl as never);

/** Search answers by query: "Kesariya Arijit Singh" finds that song. */
let catalog: Record<string, { title: string; artist: string }[]> = {};
const songFor = (title: string, artist: string) =>
  makeTrack({ id: `yt:${title.replace(/\W/g, '').toLowerCase()}`, title, artist });

const PICKS: AiPick[] = [
  { title: 'Channa Mereya', artist: 'Arijit Singh', reason: 'Because you play Arijit Singh' },
  { title: 'Lut Gaye', artist: 'Jubin Nautiyal' },
  { title: 'Made Up Song', artist: 'Nobody' },
  { title: 'Kesariya', artist: 'Arijit Singh', reason: 'A Brahmastra favourite' },
];
const searchable = (picks: AiPick[]) => {
  for (const p of picks) if (p.artist !== 'Nobody') catalog[`${p.title} ${p.artist}`] = [p];
};

const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  catalog = {};
  useModeStore.setState({ mode: 'online' });
  useAuthStore.setState({ status: 'guest', user: null } as never);
  useAiStore.setState({ available: true, youMayLike: null });
  usePlayerStore.setState({ currentTrack: null, queue: [], index: 0, isPlaying: false, positionMs: 0, durationMs: 0 });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  useRecentSearchesStore.setState({ searches: [] });
  (NetInfo.useNetInfo as jest.Mock).mockReturnValue({ isConnected: true, isInternetReachable: true });
  stub('trending', async () => page([]));
  stub('recentlyPlayed', async () => page([]));
  stub('favourites', async () => page([]));
  stub('suggestions', async () => []);
  stub('myPlaylists', async () => page([]));
  stub('search', async (q: string) =>
    page((catalog[q] ?? []).map((s) => ({ ...songFor(s.title, s.artist), kind: 'track' }))),
  );
});

describe('AI features: hidden unless available', () => {
  it('MOB-AI-001 with AI off, signed out, or offline there is no AI on Home or Playlists, and nothing asks the AI', async () => {
    const ymal = stub('aiYouMayLike', async () => ({ picks: PICKS, basedOn: [], generatedAt: 1 }));
    for (const setup of [
      () => {
        signIn();
        useAiStore.setState({ available: false });
      },
      () => useAuthStore.setState({ status: 'guest', user: null } as never),
      () => {
        signIn();
        useModeStore.setState({ mode: 'offline' });
      },
    ]) {
      setup();
      const home = render(<HomeScreen />);
      const lists = render(<PlaylistsScreen />);
      await act(async () => {});
      expect(home.queryByLabelText('You may like')).toBeNull();
      expect(lists.queryByLabelText('Create with AI')).toBeNull();
      home.unmount();
      lists.unmount();
    }
    expect(ymal).not.toHaveBeenCalled();
  });

  it('MOB-AI-002 the store follows app-config, and an AI_UNAVAILABLE answer turns AI off', async () => {
    useAiStore.setState({ available: false });
    act(() => {
      setAppConfig({ ai: true });
    });
    expect(useAiStore.getState().available).toBe(true);

    onAiUnavailable(() => useAiStore.getState().setAvailable(false));
    jest.spyOn(http, 'httpRequest').mockResolvedValue({
      status: 503,
      json: { error: { code: 'AI_UNAVAILABLE', message: "AI isn't available right now." } },
    } as never);
    await expect(api.aiSearchPlan('anything')).rejects.toBeInstanceOf(ApiError);
    expect(useAiStore.getState().available).toBe(false);
    act(() => {
      setAppConfig({ ai: false });
    });
  });
});

describe('You may like', () => {
  it('MOB-AI-003 shows the songs found for the picks, with their reasons, once per session', async () => {
    signIn();
    searchable(PICKS);
    const ymal = stub('aiYouMayLike', async () => ({
      picks: PICKS,
      basedOn: ['Arijit Singh', 'Jubin Nautiyal'],
      generatedAt: 1,
    }));
    const playTrack = jest.spyOn(usePlayerStore.getState(), 'playTrack');
    const first = render(<HomeScreen />);
    expect(await first.findByText('Based on Arijit Singh and Jubin Nautiyal')).toBeTruthy();
    expect(first.getByText('Because you play Arijit Singh')).toBeTruthy();
    // No reason: the artist instead. A pick no search finds is left out.
    expect(first.getByText('Jubin Nautiyal')).toBeTruthy();
    expect(first.queryByText('Made Up Song')).toBeNull();

    fireEvent.press(first.getByLabelText('Play Lut Gaye'));
    const queue = playTrack.mock.calls[0][1]!;
    expect(queue.map((t) => t.title)).toEqual(['Channa Mereya', 'Lut Gaye', 'Kesariya']);
    expect(playTrack.mock.calls[0][2]).toEqual({ kind: 'Home', name: 'You may like' });
    first.unmount();

    const searches = (api.search as jest.Mock).mock.calls.length;
    const again = render(<HomeScreen />);
    expect(await again.findByText('Based on Arijit Singh and Jubin Nautiyal')).toBeTruthy();
    expect(ymal).toHaveBeenCalledTimes(1);
    expect((api.search as jest.Mock).mock.calls.length).toBe(searches);
  });

  it('MOB-AI-004 shows nothing for no picks, an error, or fewer than 3 songs found', async () => {
    signIn();
    catalog['Channa Mereya Arijit Singh'] = [PICKS[0]];
    catalog['Lut Gaye Jubin Nautiyal'] = [PICKS[1]];
    for (const answer of [
      async () => ({ picks: [], basedOn: [], generatedAt: 1 }),
      async () => {
        throw new ApiError('boom', 500);
      },
      async () => ({ picks: PICKS, basedOn: ['X'], generatedAt: 2 }),
    ]) {
      useAiStore.setState({ youMayLike: null });
      const ymal = stub('aiYouMayLike', answer);
      const home = render(<HomeScreen />);
      await waitFor(() => expect(ymal).toHaveBeenCalled());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      expect(home.queryByLabelText('You may like')).toBeNull();
      home.unmount();
    }
  });
});

describe('Ask AI on the search screen', () => {
  const typeQuery = async (screen: ReturnType<typeof render>, text: string) => {
    fireEvent.changeText(screen.getByPlaceholderText(/Search/), text);
    // The screen searches 350 ms after the last keystroke.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
  };

  it('MOB-AI-005 asks only when tapped, runs the plan’s searches and lists their songs once each', async () => {
    signIn();
    catalog['Soch Hardy Sandhu'] = [{ title: 'Soch', artist: 'Hardy Sandhu' }];
    catalog['Qismat Ammy Virk'] = [
      { title: 'Qismat', artist: 'Ammy Virk' },
      { title: 'Soch', artist: 'Hardy Sandhu' },
    ];
    const plan = stub('aiSearchPlan', async () => ({
      summary: 'Sad Punjabi songs',
      queries: ['Soch Hardy Sandhu', 'Qismat Ammy Virk'],
    }));
    const playTrack = jest.spyOn(usePlayerStore.getState(), 'playTrack');
    const screen = render(<SearchScreen />);
    await typeQuery(screen, 'sad punjabi songs');
    const ask = await screen.findByLabelText('Ask AI about sad punjabi songs');
    expect(plan).not.toHaveBeenCalled();

    fireEvent.press(ask);
    expect(await screen.findByText('Sad Punjabi songs')).toBeTruthy();
    expect(plan).toHaveBeenCalledWith('sad punjabi songs');
    const picks = screen.getByLabelText('AI picks');
    expect(picks).toBeTruthy();
    expect(screen.getAllByText('Qismat')).toHaveLength(1);
    fireEvent.press(screen.getAllByText('Qismat')[0]);
    expect(playTrack.mock.calls[0][1]!.map((t) => t.title)).toEqual(['Soch', 'Qismat']);
    expect(playTrack.mock.calls[0][2]).toEqual({ kind: 'Search', name: 'AI picks' });
  });

  it('MOB-AI-006 a failed AI search says so in one line', async () => {
    signIn();
    stub('aiSearchPlan', async () => {
      throw new ApiError('Too many AI requests.', 429, 'RATE_LIMITED');
    });
    const screen = render(<SearchScreen />);
    await typeQuery(screen, 'late night drive');
    fireEvent.press(await screen.findByLabelText('Ask AI about late night drive'));
    expect(await screen.findByText('AI is busy right now. Try again later.')).toBeTruthy();
  });
});

describe('Create with AI', () => {
  const openSheet = async () => {
    signIn();
    const screen = render(<PlaylistsScreen />);
    fireEvent.press(await screen.findByLabelText('Create with AI'));
    fireEvent.changeText(screen.getByLabelText('Describe the playlist'), 'Rainy evening, Hindi acoustic');
    return screen;
  };

  it('MOB-AI-007 makes the playlist from the songs found and opens it', async () => {
    searchable(PICKS);
    const draft = stub('aiPlaylistDraft', async () => ({
      name: 'Rainy Evening',
      description: 'Soft songs.',
      picks: PICKS,
    }));
    const create = stub('createPlaylist', async (name: string) => makePlaylist({ id: 'sonare:rain', name }));
    const describe = stub('updatePlaylist', async () => makePlaylist({ id: 'sonare:rain' }));
    const add = stub('addToPlaylist', async () => ({ ok: true }));
    const screen = await openSheet();
    fireEvent.press(screen.getByText('15'));
    fireEvent.press(screen.getByText('Create'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('Playlist', { id: 'sonare:rain' }));
    expect(draft).toHaveBeenCalledWith({ prompt: 'Rainy evening, Hindi acoustic', count: 15 });
    expect(create).toHaveBeenCalledWith('Rainy Evening');
    expect(describe).toHaveBeenCalledWith('sonare:rain', { description: 'Soft songs.' });
    expect(add.mock.calls[0][0]).toBe('sonare:rain');
    expect((add.mock.calls[0][1] as { id: string }[]).map((t) => t.id)).toEqual([
      'yt:channamereya',
      'yt:lutgaye',
      'yt:kesariya',
    ]);
  });

  it('MOB-AI-008 too few songs found: says so and makes nothing', async () => {
    catalog['Channa Mereya Arijit Singh'] = [PICKS[0]];
    stub('aiPlaylistDraft', async () => ({ name: 'X', description: '', picks: PICKS }));
    const create = stub('createPlaylist', async () => makePlaylist());
    const screen = await openSheet();
    fireEvent.press(screen.getByText('Create'));
    expect(await screen.findByText("Couldn't find enough of those songs. Try describing it differently.")).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('MOB-AI-009 Cancel while the AI is thinking makes nothing', async () => {
    searchable(PICKS);
    let answer: (() => void) | null = null;
    stub(
      'aiPlaylistDraft',
      () =>
        new Promise((resolve) => {
          answer = () => resolve({ name: 'X', description: '', picks: PICKS });
        }),
    );
    const create = stub('createPlaylist', async () => makePlaylist());
    const screen = await openSheet();
    fireEvent.press(screen.getByText('Create'));
    expect(await screen.findByText('Asking AI…')).toBeTruthy();
    fireEvent.press(screen.getByText('Cancel'));
    await act(async () => {
      answer!();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(api.search).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
