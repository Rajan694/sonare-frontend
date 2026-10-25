import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LibraryScreen } from '../src/screens/Library';
import { PlaylistsScreen } from '../src/screens/Playlists';
import { TrackListScreen } from '../src/screens/TrackList';
import { HomeScreen } from '../src/screens/Home';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { useDownloadsStore } from '../src/store/downloads';
import { useLibraryStore } from '../src/store/library';
import { useLocalMusicStore } from '../src/store/localMusic';
import { alice, makeDownload, makePlaylist, makeTrack, nav, page, route } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const signIn = () => useAuthStore.setState({ status: 'signedIn', user: alice } as never);
const guest = () => useAuthStore.setState({ status: 'guest', user: null } as never);

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  route.params = {};
  signIn();
  useModeStore.setState({ mode: 'online' });
  usePlayerStore.setState({ currentTrack: null, queue: [], isPlaying: false, shuffle: false });
  useDownloadsStore.setState({ items: {} });
  useLibraryStore.setState({ favouriteIds: {}, playlists: [] });
  useLocalMusicStore.setState({ songs: [], hidden: [] });
  jest.spyOn(api, 'libraryTracks').mockResolvedValue(page([]) as never);
});

describe('Phase M5 — Library tabs, TrackList screen, Playlists pinned rows', () => {
  describe('Library Tabs', () => {
    it('MOB-TRKL-001 renders exactly 4 tabs: Songs, Albums, Artists, Downloads', () => {
      const { getByText, queryByText } = render(<LibraryScreen />);
      expect(getByText('Songs')).toBeTruthy();
      expect(getByText('Albums')).toBeTruthy();
      expect(getByText('Artists')).toBeTruthy();
      expect(getByText('Downloads')).toBeTruthy();
      expect(queryByText('Favourites')).toBeNull();
      expect(queryByText('Most played')).toBeNull();
      expect(queryByText('Playlists')).toBeNull();
    });

    it('MOB-TRKL-002 Downloads tab renders DownloadsView inline without header download button', async () => {
      const dlTrack = makeTrack({ title: 'Local Song', artist: 'Local Artist' });
      useDownloadsStore.setState({
        items: { [dlTrack.id]: makeDownload(dlTrack) },
      });

      const { getByText, findByText, queryByLabelText } = render(<LibraryScreen />);
      expect(queryByLabelText('Downloads')).toBeNull(); // No download button in header track controls

      fireEvent.press(getByText('Downloads'));
      expect(await findByText('Local Song')).toBeTruthy();
    });
  });

  describe('Playlists Screen Pinned Rows', () => {
    it('MOB-TRKL-003 shows pinned Liked Songs and Most played rows at top in online mode', async () => {
      const pl = makePlaylist({ id: 'p1', name: 'My Playlist' });
      useLibraryStore.setState({ playlists: [pl] });
      jest.spyOn(useLibraryStore.getState(), 'reloadPlaylists').mockResolvedValue();

      const { findByLabelText, getByLabelText } = render(<PlaylistsScreen />);
      expect(await findByLabelText('Liked Songs')).toBeTruthy();
      expect(getByLabelText('Most played')).toBeTruthy();
      expect(getByLabelText('My Playlist')).toBeTruthy();

      // Navigating to Liked Songs
      fireEvent.press(getByLabelText('Liked Songs'));
      expect(nav.navigate).toHaveBeenCalledWith('TrackList', { kind: 'liked' });

      // Navigating to Most played
      fireEvent.press(getByLabelText('Most played'));
      expect(nav.navigate).toHaveBeenCalledWith('TrackList', { kind: 'mostPlayed' });
    });

    it('MOB-TRKL-004 hides Most played pinned row when offline but keeps Liked Songs', async () => {
      useModeStore.setState({ mode: 'offline' });
      const { queryByLabelText } = render(<PlaylistsScreen />);
      expect(queryByLabelText('Liked Songs')).toBeTruthy();
      expect(queryByLabelText('Most played')).toBeNull();
    });
  });

  describe('TrackList Screen', () => {
    it('MOB-TRKL-005 renders Liked Songs screen with back button and fetches liked tracks', async () => {
      const likedTrack = makeTrack({ title: 'Loved Song', artist: 'Band' });
      jest.spyOn(api, 'libraryTracks').mockImplementation(async (opts: any) => {
        if (opts?.filter === 'liked') return page([likedTrack]) as never;
        return page([]) as never;
      });

      route.params = { kind: 'liked' };
      const { findByText, getByLabelText } = render(<TrackListScreen />);
      expect(await findByText('Loved Song')).toBeTruthy();
      expect(await findByText('Liked Songs')).toBeTruthy();

      fireEvent.press(getByLabelText('Go back'));
      expect(nav.goBack).toHaveBeenCalled();
    });

    it('MOB-TRKL-006 renders Most played screen with "N plays" counter on rows', async () => {
      const hotTrack = makeTrack({ title: 'Top Hit', artist: 'Pop Star', playCount: 42 });
      jest.spyOn(api, 'mostPlayed').mockResolvedValue(page([hotTrack]) as never);

      route.params = { kind: 'mostPlayed' };
      const { findByText } = render(<TrackListScreen />);
      expect(await findByText('Top Hit')).toBeTruthy();
      expect(await findByText('Most played')).toBeTruthy();
      expect(await findByText(/42 plays/)).toBeTruthy();
    });

    it('MOB-TRKL-007 does not display "N plays" in Liked Songs screen', async () => {
      const likedTrack = makeTrack({ title: 'Quiet Love', artist: 'Singer', playCount: 50 });
      jest.spyOn(api, 'libraryTracks').mockImplementation(async (opts: any) => {
        if (opts?.filter === 'liked') return page([likedTrack]) as never;
        return page([]) as never;
      });

      route.params = { kind: 'liked' };
      const { findByText, queryByText } = render(<TrackListScreen />);
      expect(await findByText('Quiet Love')).toBeTruthy();
      expect(queryByText(/50 plays/)).toBeNull();
    });

    it('MOB-TRKL-008 prompts guest users to sign in', () => {
      guest();
      route.params = { kind: 'liked' };
      const { getByText } = render(<TrackListScreen />);
      expect(getByText('Your liked songs live in your account')).toBeTruthy();
    });

    it('MOB-TRKL-010 renders folder tracks from phone songs when kind is folder', async () => {
      useLocalMusicStore.setState({
        songs: [
          {
            mediaId: '10',
            uri: 'content://10',
            title: 'Folder Track A',
            artist: 'Folder Artist',
            album: null,
            durationMs: 150000,
            folder: 'Audiobooks',
            fileName: 'a.mp3',
            size: 2000,
            modifiedAt: 10,
          },
          {
            mediaId: '11',
            uri: 'content://11',
            title: 'Other Track',
            artist: 'Other Artist',
            album: null,
            durationMs: 150000,
            folder: 'Music',
            fileName: 'b.mp3',
            size: 2000,
            modifiedAt: 10,
          },
        ],
      });

      route.params = { kind: 'folder', folder: 'Audiobooks', title: 'Audiobooks' };
      const { findByText, queryByText } = render(<TrackListScreen />);
      expect(await findByText('Audiobooks')).toBeTruthy();
      expect(await findByText('Folder Track A')).toBeTruthy();
      expect(queryByText('Other Track')).toBeNull();
    });
  });

  describe('Home Screen Navigation', () => {
    it('MOB-TRKL-009 favourites shelf "See all" navigates to TrackList with kind: liked', async () => {
      const fav = makeTrack({ title: 'Favorite 1' });
      jest.spyOn(api, 'recentlyPlayed').mockResolvedValue(page([]) as never);
      jest.spyOn(api, 'favourites').mockResolvedValue(page([fav]) as never);
      jest.spyOn(api, 'notPlayedLately').mockResolvedValue(page([]) as never);

      const { findByLabelText } = render(<HomeScreen />);
      const seeAll = await findByLabelText('See all favourites');
      fireEvent.press(seeAll);
      expect(nav.navigate).toHaveBeenCalledWith('TrackList', { kind: 'liked' });
    });
  });
});
