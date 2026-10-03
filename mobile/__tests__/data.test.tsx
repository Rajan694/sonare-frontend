import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { API_BASE, API_ORIGIN, absoluteUrl, artworkUrl } from '../src/data/config';
import { httpRequest, NetworkError } from '../src/data/http';
import { useAuthStore } from '../src/data/auth';
import { api, ApiError, isOwnPlaylist } from '../src/data/api';
import { useSettingsStore, API_QUALITY } from '../src/data/settings';
import { queuePlay, startBackgroundSync, useSyncStatus, requestSync } from '../src/data/sync';
import { requireAccount, takePendingAction, clearPendingAction, navigationRef } from '../src/data/accountGate';
import { useAsync } from '../src/data/hooks';
import { artGradients } from '../src/data/gradients';
import { useModeStore } from '../src/store/mode';
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (cb: any) => {
      const React = require('react');
      React.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

describe('Data Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('config.ts', () => {
    it('MOB-DATA-001 formats API_BASE and API_ORIGIN for default dev environment', () => {
      expect(API_BASE).toContain('3010');
      expect(API_ORIGIN).toContain('10.0.2.2:3010');
    });

    it('MOB-DATA-002 absoluteUrl resolves relative paths and returns full URLs as-is; returns undefined for null', () => {
      expect(absoluteUrl('/api/v1/tracks/1')).toBe('http://10.0.2.2:3010/api/v1/tracks/1');
      expect(absoluteUrl('https://example.com/art.jpg')).toBe('https://example.com/art.jpg');
      expect(absoluteUrl(null)).toBeUndefined();
      expect(absoluteUrl(undefined)).toBeUndefined();
    });

    it('MOB-DATA-003 artworkUrl generates formatted artwork URL with size parameter', () => {
      expect(artworkUrl({ thumbnail: '/api/v1/tracks/1/artwork' }, 300)).toBe(
        'http://10.0.2.2:3010/api/v1/tracks/1/artwork?size=300',
      );
      expect(artworkUrl({ thumbnail: '/api/v1/tracks/1/artwork' })).toBe(
        'http://10.0.2.2:3010/api/v1/tracks/1/artwork?size=140',
      );
      expect(artworkUrl(null)).toBeUndefined();
      expect(artworkUrl({ thumbnail: 'https://cdn.example.com/art.png' }, 200 as any)).toBe(
        'https://cdn.example.com/art.png',
      );
    });
  });

  describe('http.ts', () => {
    it('MOB-DATA-004 httpRequest performs GET request and parses JSON response', async () => {
      const originalXHR = global.XMLHttpRequest;
      class SuccessXHR {
        url = '';
        method = '';
        headers: Record<string, string> = {};
        status = 200;
        responseText = JSON.stringify({ hello: 'world' });
        onload: (() => void) | null = null;
        open(m: string, u: string) {
          this.method = m;
          this.url = u;
        }
        setRequestHeader(k: string, v: string) {
          this.headers[k] = v;
        }
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = SuccessXHR as any;

      const res = await httpRequest('http://localhost:3000/test', {
        method: 'GET',
      });
      expect(res.status).toBe(200);
      expect(res.json).toEqual({ hello: 'world' });
      global.XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-005 httpRequest handles non-JSON response gracefully', async () => {
      const originalXHR = global.XMLHttpRequest;
      class NonJsonXHR {
        status = 204;
        responseText = 'not-json-content';
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = NonJsonXHR as any;

      const res = await httpRequest('http://localhost:3000/empty');
      expect(res.status).toBe(204);
      expect(res.json).toBeNull();
      global.XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-006 httpRequest attaches X-Sonare-Client header for API_ORIGIN requests', async () => {
      const originalXHR = global.XMLHttpRequest;
      let setHeaders: Record<string, string> = {};
      class OriginXHR {
        status = 200;
        responseText = '{}';
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader(k: string, v: string) {
          setHeaders[k] = v;
        }
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = OriginXHR as any;

      await httpRequest(`${API_ORIGIN}/api/v1/test`, {
        headers: { 'Custom-Header': 'val' },
      });
      expect(setHeaders['X-Sonare-Client']).toBe('mobile');
      expect(setHeaders['Custom-Header']).toBe('val');
      global.XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-007 httpRequest handles network error with NetworkError', async () => {
      const originalXHR = global.XMLHttpRequest;
      class ErrorXHR {
        onerror: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onerror?.(), 0);
        }
      }
      global.XMLHttpRequest = ErrorXHR as any;

      await expect(httpRequest('http://fail.test')).rejects.toThrow(NetworkError);
      global.XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-008 httpRequest handles timeout with NetworkError', async () => {
      const originalXHR = global.XMLHttpRequest;
      class TimeoutXHR {
        ontimeout: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.ontimeout?.(), 0);
        }
      }
      global.XMLHttpRequest = TimeoutXHR as any;

      await expect(httpRequest('http://timeout.test', { timeoutMs: 100 })).rejects.toThrow('Network request timed out');
      global.XMLHttpRequest = originalXHR;
    });
  });

  describe('auth.ts', () => {
    beforeEach(async () => {
      await Keychain.resetGenericPassword({ service: 'sonare.session' });
      await AsyncStorage.clear();
      useAuthStore.setState({
        status: 'guest',
        user: null,
        accessToken: null,
        refreshToken: null,
      });
    });

    it('MOB-DATA-009 hydrate restores session from Keychain, or migrates from AsyncStorage', async () => {
      const user = {
        id: 'u1',
        email: 'test@example.com',
        displayName: 'Tester',
        role: 'user' as const,
      };

      // Test migration from AsyncStorage when Keychain is empty
      await AsyncStorage.setItem(
        'sonare.session',
        JSON.stringify({
          accessToken: 'migrated_acc_tok',
          refreshToken: 'migrated_ref_tok',
          user,
        }),
      );

      await useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().accessToken).toBe('migrated_acc_tok');

      // Check migration moved it to keychain and removed from AsyncStorage
      const migratedKeychain = await Keychain.getGenericPassword({
        service: 'sonare.session',
      });
      expect(migratedKeychain).toBeTruthy();
      if (migratedKeychain) {
        expect(JSON.parse(migratedKeychain.password).accessToken).toBe('migrated_acc_tok');
      }
      expect(await AsyncStorage.getItem('sonare.session')).toBeNull();

      // Test restoring directly from Keychain
      useAuthStore.setState({
        status: 'loading',
        user: null,
        accessToken: null,
        refreshToken: null,
      });
      await useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(useAuthStore.getState().accessToken).toBe('migrated_acc_tok');
    });

    it('MOB-DATA-010 hydrate falls back to guest mode on corrupted session', async () => {
      useAuthStore.setState({
        status: 'loading',
        user: null,
        accessToken: null,
        refreshToken: null,
      });
      await Keychain.setGenericPassword('session', 'invalid json string', {
        service: 'sonare.session',
      });
      await useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().status).toBe('guest');
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('MOB-DATA-011 signIn authenticates user and saves session to keychain not AsyncStorage', async () => {
      const originalXHR = (globalThis as any).XMLHttpRequest;
      const user = {
        id: 'u2',
        email: 'login@test.com',
        displayName: 'Login User',
        role: 'user' as const,
      };
      class LoginXHR {
        status = 200;
        responseText = JSON.stringify({
          accessToken: 'new_acc',
          refreshToken: 'new_ref',
          user,
        });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      (globalThis as any).XMLHttpRequest = LoginXHR as any;

      await useAuthStore.getState().signIn('login@test.com', 'password123');
      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(useAuthStore.getState().accessToken).toBe('new_acc');

      // Verify saved to Keychain and NOT AsyncStorage
      const savedKeychain = await Keychain.getGenericPassword({
        service: 'sonare.session',
      });
      expect(savedKeychain).toBeTruthy();
      if (savedKeychain) {
        expect(JSON.parse(savedKeychain.password).accessToken).toBe('new_acc');
      }
      expect(await AsyncStorage.getItem('sonare.session')).toBeNull();

      // Failure path
      class FailLoginXHR {
        status = 400;
        responseText = JSON.stringify({
          error: { message: 'Invalid credentials' },
        });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      (globalThis as any).XMLHttpRequest = FailLoginXHR as any;
      await expect(useAuthStore.getState().signIn('bad', 'bad')).rejects.toThrow('Invalid credentials');

      (globalThis as any).XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-012 signUp registers user and saves session', async () => {
      const originalXHR = (globalThis as any).XMLHttpRequest;
      const user = {
        id: 'u3',
        email: 'signup@test.com',
        displayName: 'New User',
        role: 'user' as const,
      };
      class RegisterXHR {
        status = 200;
        responseText = JSON.stringify({
          accessToken: 'reg_acc',
          refreshToken: 'reg_ref',
          user,
        });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      (globalThis as any).XMLHttpRequest = RegisterXHR as any;

      await useAuthStore.getState().signUp('signup@test.com', 'password123', 'New User');
      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(useAuthStore.getState().user?.displayName).toBe('New User');

      const savedKeychain = await Keychain.getGenericPassword({
        service: 'sonare.session',
      });
      expect(savedKeychain).toBeTruthy();
      (globalThis as any).XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-013 signOut calls server logout and clears keychain and session', async () => {
      const originalXHR = (globalThis as any).XMLHttpRequest;
      class LogoutXHR {
        status = 200;
        responseText = JSON.stringify({ ok: true });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      (globalThis as any).XMLHttpRequest = LogoutXHR as any;

      await useAuthStore.getState().signOut();
      expect(useAuthStore.getState().status).toBe('guest');
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();

      const savedKeychain = await Keychain.getGenericPassword({
        service: 'sonare.session',
      });
      expect(savedKeychain).toBe(false);
      (globalThis as any).XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-014 refresh rotates refresh token and updates session', async () => {
      const originalXHR = global.XMLHttpRequest;
      useAuthStore.setState({
        status: 'signedIn',
        refreshToken: 'old_ref',
        user: {
          id: 'u4',
          email: 'u4@test.com',
          displayName: 'U4',
        },
      });

      class RefreshXHR {
        status = 200;
        responseText = JSON.stringify({
          accessToken: 'fresh_acc',
          refreshToken: 'fresh_ref',
        });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = RefreshXHR as any;

      const token = await useAuthStore.getState().refresh();
      expect(token).toBe('fresh_acc');
      expect(useAuthStore.getState().accessToken).toBe('fresh_acc');
      expect(useAuthStore.getState().refreshToken).toBe('fresh_ref');
      global.XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-015 refresh clears session on 401 response', async () => {
      const originalXHR = global.XMLHttpRequest;
      useAuthStore.setState({
        status: 'signedIn',
        refreshToken: 'invalid_ref',
        user: {
          id: 'u5',
          email: 'u5@test.com',
          displayName: 'U5',
        },
      });

      class FailRefreshXHR {
        status = 401;
        responseText = JSON.stringify({ error: { message: 'Unauthorized' } });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = FailRefreshXHR as any;

      const token = await useAuthStore.getState().refresh();
      expect(token).toBeNull();
      expect(useAuthStore.getState().status).toBe('guest');

      // Refresh without user or refreshToken
      useAuthStore.setState({ refreshToken: null, user: null });
      const emptyToken = await useAuthStore.getState().refresh();
      expect(emptyToken).toBeNull();

      global.XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-016 refresh deduplicates concurrent refresh calls', async () => {
      const originalXHR = global.XMLHttpRequest;
      let callCount = 0;
      useAuthStore.setState({
        status: 'signedIn',
        refreshToken: 'dedup_ref',
        user: {
          id: 'u6',
          email: 'u6@test.com',
          displayName: 'U6',
        },
      });

      class DedupRefreshXHR {
        status = 200;
        responseText = JSON.stringify({
          accessToken: 'dedup_acc',
          refreshToken: 'dedup_ref2',
        });
        onload: (() => void) | null = null;
        url = '';
        open(_method: string, url: string) {
          this.url = url;
        }
        setRequestHeader() {}
        send() {
          if (this.url.endsWith('/auth/refresh')) callCount++;
          setTimeout(() => this.onload?.(), 10);
        }
      }
      global.XMLHttpRequest = DedupRefreshXHR as any;

      const [r1, r2] = await Promise.all([useAuthStore.getState().refresh(), useAuthStore.getState().refresh()]);
      expect(r1).toBe('dedup_acc');
      expect(r2).toBe('dedup_acc');
      // Both callers shared one request, so the rotated refresh token was used once.
      expect(callCount).toBe(1);
      expect(useAuthStore.getState().refreshToken).toBe('dedup_ref2');
      global.XMLHttpRequest = originalXHR;
    });
  });

  describe('session storage (keychain)', () => {
    beforeEach(async () => {
      await Keychain.resetGenericPassword({ service: 'sonare.session' });
      await AsyncStorage.clear();
      useAuthStore.setState({
        status: 'guest',
        user: null,
        accessToken: null,
        refreshToken: null,
      });
    });

    it('MOB-DATA-049 signIn saves session to keychain and leaves AsyncStorage empty', async () => {
      const originalXHR = (globalThis as any).XMLHttpRequest;
      const user = {
        id: 'u-kc-1',
        email: 'kc_signin@test.com',
        displayName: 'Keychain User',
        role: 'user' as const,
      };
      class LoginXHR {
        status = 200;
        responseText = JSON.stringify({
          accessToken: 'acc_kc_123',
          refreshToken: 'ref_kc_123',
          user,
        });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      (globalThis as any).XMLHttpRequest = LoginXHR as any;

      await useAuthStore.getState().signIn('kc_signin@test.com', 'password123');

      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(useAuthStore.getState().accessToken).toBe('acc_kc_123');

      const keychainCreds = await Keychain.getGenericPassword({
        service: 'sonare.session',
      });
      expect(keychainCreds).toBeTruthy();
      if (keychainCreds) {
        expect(keychainCreds.username).toBe('session');
        const parsed = JSON.parse(keychainCreds.password);
        expect(parsed.accessToken).toBe('acc_kc_123');
        expect(parsed.refreshToken).toBe('ref_kc_123');
        expect(parsed.user.email).toBe('kc_signin@test.com');
      }

      const asyncStorageValue = await AsyncStorage.getItem('sonare.session');
      expect(asyncStorageValue).toBeNull();

      (globalThis as any).XMLHttpRequest = originalXHR;
    });

    it('MOB-DATA-050 hydrate migrates legacy AsyncStorage session to keychain', async () => {
      const user = {
        id: 'u-legacy',
        email: 'legacy@test.com',
        displayName: 'Legacy User',
        role: 'user' as const,
      };
      const sessionData = {
        accessToken: 'legacy_acc',
        refreshToken: 'legacy_ref',
        user,
      };

      await AsyncStorage.setItem('sonare.session', JSON.stringify(sessionData));
      expect(await Keychain.getGenericPassword({ service: 'sonare.session' })).toBe(false);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(useAuthStore.getState().accessToken).toBe('legacy_acc');
      expect(useAuthStore.getState().user).toEqual(user);

      const migratedCreds = await Keychain.getGenericPassword({
        service: 'sonare.session',
      });
      expect(migratedCreds).toBeTruthy();
      if (migratedCreds) {
        expect(JSON.parse(migratedCreds.password)).toEqual(sessionData);
      }

      expect(await AsyncStorage.getItem('sonare.session')).toBeNull();
    });

    it('MOB-DATA-051 hydrate with nothing stored defaults to guest status', async () => {
      useAuthStore.setState({
        status: 'loading',
        user: null,
        accessToken: null,
        refreshToken: null,
      });

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('guest');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().refreshToken).toBeNull();
    });

    it('MOB-DATA-052 signOut resets keychain credentials and reverts status to guest', async () => {
      const originalXHR = (globalThis as any).XMLHttpRequest;
      class LogoutXHR {
        status = 200;
        responseText = JSON.stringify({ ok: true });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      (globalThis as any).XMLHttpRequest = LogoutXHR as any;

      const user = {
        id: 'u-signout',
        email: 'signout@test.com',
        displayName: 'Signout User',
      };
      await Keychain.setGenericPassword(
        'session',
        JSON.stringify({ accessToken: 'so_acc', refreshToken: 'so_ref', user }),
        { service: 'sonare.session' },
      );
      useAuthStore.setState({
        status: 'signedIn',
        user,
        accessToken: 'so_acc',
        refreshToken: 'so_ref',
      });

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState().status).toBe('guest');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().refreshToken).toBeNull();

      const clearedCreds = await Keychain.getGenericPassword({
        service: 'sonare.session',
      });
      expect(clearedCreds).toBe(false);

      (globalThis as any).XMLHttpRequest = originalXHR;
    });

    /** Fakes XHR with a fixed response and records every request sent. */
    function recordXHR(status: number, body: unknown) {
      const sent: {
        url: string;
        headers: Record<string, string>;
        body: any;
      }[] = [];
      class RecordingXHR {
        status = status;
        responseText = JSON.stringify(body);
        onload: (() => void) | null = null;
        private req = { url: '', headers: {} as Record<string, string> };
        open(_m: string, url: string) {
          this.req.url = url;
        }
        setRequestHeader(k: string, v: string) {
          this.req.headers[k] = v;
        }
        send(data: string) {
          sent.push({ ...this.req, body: JSON.parse(data) });
          setTimeout(() => this.onload?.(), 0);
        }
      }
      const original = (globalThis as any).XMLHttpRequest;
      (globalThis as any).XMLHttpRequest = RecordingXHR;
      return {
        sent,
        restore: () => ((globalThis as any).XMLHttpRequest = original),
      };
    }

    it('MOB-DATA-053 requestPasswordReset posts the email; a server error is thrown with its message', async () => {
      const ok = recordXHR(200, { ok: true });
      await useAuthStore.getState().requestPasswordReset('alice@sonare.test');
      expect(ok.sent).toHaveLength(1);
      expect(ok.sent[0].url).toMatch(/\/auth\/forgot-password$/);
      expect(ok.sent[0].body).toEqual({ email: 'alice@sonare.test' });
      expect(ok.sent[0].headers.Authorization).toBeUndefined();
      ok.restore();

      const limited = recordXHR(429, {
        error: { code: 'RATE_LIMITED', message: 'Too many attempts' },
      });
      await expect(useAuthStore.getState().requestPasswordReset('alice@sonare.test')).rejects.toThrow(
        'Too many attempts',
      );
      limited.restore();
    });

    it('MOB-DATA-054 resendVerification sends the access token', async () => {
      useAuthStore.setState({ accessToken: 'acc-123' } as never);
      const rec = recordXHR(200, { ok: true });
      await useAuthStore.getState().resendVerification();
      expect(rec.sent[0].url).toMatch(/\/auth\/resend-verification$/);
      expect(rec.sent[0].headers.Authorization).toBe('Bearer acc-123');
      rec.restore();
    });
  });

  describe('api.ts', () => {
    const mockApiResponse = (status: number, data: any) => {
      class MockApiXHR {
        status = status;
        responseText = JSON.stringify(data);
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = MockApiXHR as any;
    };

    it('MOB-DATA-017 search queries catalog with query and type', async () => {
      mockApiResponse(200, {
        items: [{ id: 's1', type: 'song', title: 'Song 1' }],
        nextCursor: null,
      });
      const res = await api.search('test', 'songs');
      expect(res.items.length).toBe(1);
    });

    it('MOB-DATA-018 trending fetches trending tracks with limit and region', async () => {
      mockApiResponse(200, { items: [{ id: 't1', title: 'Trending 1' }] });
      const res = await api.trending(10);
      expect(res.items.length).toBe(1);
    });

    it('MOB-DATA-019 album and albumTracks fetch album details and tracklist', async () => {
      mockApiResponse(200, {
        id: 'alb1',
        title: 'Album 1',
        items: [{ id: 'tr1' }],
      });
      const album = await api.album('alb1');
      expect(album.id).toBe('alb1');
      const tracks = await api.albumTracks('alb1');
      expect(tracks.items.length).toBe(1);
    });

    it('MOB-DATA-020 artist, artistTopTracks, artistAlbums fetch artist metadata', async () => {
      mockApiResponse(200, { id: 'art1', name: 'Artist 1', items: [] });
      const artist = await api.artist('art1');
      expect(artist.id).toBe('art1');
      const top = await api.artistTopTracks('art1');
      expect(top.items).toEqual([]);
      const albums = await api.artistAlbums('art1');
      expect(albums.items).toEqual([]);
    });

    it('MOB-DATA-021 playlist and playlistTracks fetch public playlist data', async () => {
      mockApiResponse(200, { id: 'pl1', title: 'Playlist 1', items: [] });
      const playlist = await api.playlist('pl1');
      expect(playlist.id).toBe('pl1');
      const tracks = await api.playlistTracks('pl1');
      expect(tracks.items).toEqual([]);
    });

    it('MOB-DATA-022 stream fetches stream info with quality and format params', async () => {
      mockApiResponse(200, {
        url: 'http://audio.stream/1',
        mimeType: 'audio/webm',
        itag: 251,
      });
      const stream = await api.stream('tr1', 'high', 'opus');
      expect(stream.url).toBe('http://audio.stream/1');
    });

    it('MOB-DATA-023 peaks and lyrics fetch audio peaks and synced lyrics', async () => {
      mockApiResponse(200, {
        peaks: [1, 2, 3],
        lines: [{ time: 0, text: 'lyrics line' }],
      });
      const peaks = await api.peaks('tr1', 50);
      expect(peaks.peaks).toEqual([1, 2, 3]);
      const lyrics = await api.lyrics('tr1');
      expect(lyrics.lines?.length).toBe(1);
    });

    it('MOB-DATA-024 me, settings, and saveSettings manage user profile and preferences', async () => {
      mockApiResponse(200, { id: 'u1', email: 'test@example.com', ok: true });
      const me = await api.me();
      expect(me.id).toBe('u1');
      const settings = await api.settings();
      expect(settings).toBeDefined();
      const save = await api.saveSettings({ downloadQuality: 'high' });
      expect(save.ok).toBe(true);
    });

    it('MOB-DATA-025 libraryTracks, favourites, setFavourite, setFollowing manage library entities', async () => {
      mockApiResponse(200, { items: [], ok: true });
      const lib = await api.libraryTracks('title');
      expect(lib.items).toEqual([]);
      const favs = await api.favourites();
      expect(favs.items).toEqual([]);
      const setFav = await api.setFavourite('t1', true);
      expect(setFav.ok).toBe(true);
      const setFoll = await api.setFollowing('art1', true);
      expect(setFoll.ok).toBe(true);
      await api.setFavourite('t1', false);
      await api.setFollowing('art1', false);
    });

    it('MOB-DATA-026 recentlyPlayed and mostPlayed fetch listening history', async () => {
      mockApiResponse(200, { items: [{ id: 't1' }] });
      const recent = await api.recentlyPlayed(5);
      expect(recent.items.length).toBe(1);
      const most = await api.mostPlayed(5);
      expect(most.items.length).toBe(1);
    });

    it('MOB-DATA-027 reportPlays posts batch play events to /me/sync', async () => {
      mockApiResponse(200, { ok: true });
      const res = await api.reportPlays([{ trackRef: { kind: 'server', id: 't1' }, at: Date.now(), ms: 120000 }]);
      expect(res.ok).toBe(true);
    });

    it('MOB-DATA-028 user playlist methods manage personal playlists', async () => {
      mockApiResponse(200, {
        items: [{ id: 'sonare:1', title: 'My List' }],
        ok: true,
        id: 'sonare:1',
      });
      const lists = await api.myPlaylists();
      expect(lists.items.length).toBe(1);
      const single = await api.myPlaylist('sonare:1');
      expect(single.id).toBe('sonare:1');
      const plTracks = await api.myPlaylistTracks('sonare:1');
      expect(plTracks.items).toBeDefined();
      const created = await api.createPlaylist('New List');
      expect(created.id).toBe('sonare:1');
      const del = await api.deletePlaylist('sonare:1');
      expect(del.ok).toBe(true);
      const add = await api.addToPlaylist('sonare:1', ['t1']);
      expect(add.ok).toBe(true);
      const rem = await api.removeFromPlaylist('sonare:1', 0);
      expect(rem.ok).toBe(true);
    });

    it('MOB-DATA-029 auto-refreshes expired access token on 401 response', async () => {
      let attempts = 0;
      class RefreshOn401XHR {
        status = 200;
        responseText = '{}';
        onload: (() => void) | null = null;
        open() {
          attempts++;
          this.status = attempts === 1 ? 401 : 200;
          this.responseText =
            attempts === 1 ? JSON.stringify({ error: { message: 'Token expired' } }) : JSON.stringify({ ok: true });
        }
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = RefreshOn401XHR as any;
      jest.spyOn(useAuthStore.getState(), 'refresh').mockResolvedValue('new_token');

      const res = await api.me();
      expect(res).toEqual({ ok: true });
    });

    it('MOB-DATA-030 handles 204 No Content response', async () => {
      class NoContentXHR {
        status = 204;
        responseText = '';
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = NoContentXHR as any;

      const res = await api.setFavourite('t1', false);
      expect(res).toEqual({});
    });

    it('MOB-DATA-031 throws ApiError on non-2xx status with message and code', async () => {
      class ErrorStatusXHR {
        status = 404;
        responseText = JSON.stringify({
          error: { message: 'Not found', code: 'NOT_FOUND' },
        });
        onload: (() => void) | null = null;
        open() {}
        setRequestHeader() {}
        send() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.XMLHttpRequest = ErrorStatusXHR as any;

      await expect(api.album('missing')).rejects.toThrow(ApiError);
    });

    it('MOB-DATA-032 isOwnPlaylist identifies sonare-prefixed playlist IDs', () => {
      expect(isOwnPlaylist('sonare:pl-123')).toBe(true);
      expect(isOwnPlaylist('PL123456789')).toBe(false);
      expect(isOwnPlaylist('yt:PL123')).toBe(false);
    });
  });

  describe('settings.ts', () => {
    it('MOB-DATA-033 hydrate loads settings from storage and server', async () => {
      useAuthStore.setState({
        status: 'signedIn',
        user: { id: 'u1', email: 'a@b.com', displayName: 'A' },
      });
      jest.spyOn(api, 'settings').mockResolvedValue({ downloadQuality: 'high', downloadFormat: 'm4a' });
      await AsyncStorage.setItem(
        'sonare.settings',
        JSON.stringify({ downloadQuality: 'normal', downloadFormat: 'm4a' }),
      );

      await useSettingsStore.getState().hydrate();
      expect(useSettingsStore.getState().downloadQuality).toBe('high');
      expect(useSettingsStore.getState().downloadFormat).toBe('m4a');
      expect(API_QUALITY.high).toBe('high');
    });

    it('MOB-DATA-034 update saves settings locally and debounces server sync', async () => {
      useAuthStore.setState({ status: 'signedIn' });
      const saveSpy = jest.spyOn(api, 'saveSettings').mockResolvedValue({ ok: true });
      useSettingsStore.getState().update({ downloadQuality: 'low', downloadFormat: 'opus' });
      expect(useSettingsStore.getState().downloadQuality).toBe('low');

      await new Promise((r) => setTimeout(r, 500));
      expect(saveSpy).toHaveBeenCalledWith({
        downloadQuality: 'low',
        downloadFormat: 'opus',
      });

      // Offline/guest update
      useAuthStore.setState({ status: 'guest' });
      useSettingsStore.getState().update({ downloadQuality: 'high' });
      expect(useSettingsStore.getState().downloadQuality).toBe('high');
    });

    it('MOB-DATA-035 sanitizes invalid settings values with pick helper', async () => {
      useAuthStore.setState({ status: 'guest' });
      await AsyncStorage.setItem(
        'sonare.settings',
        JSON.stringify({
          downloadQuality: 'ultra_hd_invalid',
          downloadFormat: 'flac_invalid',
        }),
      );
      await useSettingsStore.getState().hydrate();
      expect(['low', 'normal', 'high']).toContain(useSettingsStore.getState().downloadQuality);
    });
  });

  describe('sync.ts', () => {
    it('MOB-DATA-036 queuePlay adds pending play and triggers background upload', async () => {
      useAuthStore.setState({
        status: 'signedIn',
        user: { id: 'u1', email: 'a@b.com', displayName: 'A' },
      });
      useModeStore.setState({ mode: 'online' });
      jest.spyOn(api, 'reportPlays').mockResolvedValue({ ok: true });

      queuePlay('yt:test-track', Date.now(), 45000);
      expect(useSyncStatus.getState()).toBeDefined();
      requestSync();
      await waitFor(() => {
        expect(useSyncStatus.getState().syncing).toBe(false);
      });
    });

    it('MOB-DATA-037 queuePlay stores a local file by fingerprint and a server song by bare id, for the signed-in user', async () => {
      useAuthStore.setState({
        user: { id: 'u-37', email: 'x@y.z', displayName: 'X' },
      } as never);
      queuePlay('local:fingerprint123', 1000, 60000.4);
      queuePlay('yt:abc', 2000, 45000);
      // They may be uploaded (and cleared) right away, so check what was written to storage.
      await waitFor(() => {
        const writes = (AsyncStorage.setItem as jest.Mock).mock.calls.filter((c) => c[0] === 'sonare.pendingPlays');
        const mine = writes.flatMap((c) => JSON.parse(c[1])).filter((p: any) => p.at === 1000 || p.at === 2000);
        expect(mine).toEqual(
          expect.arrayContaining([
            {
              trackRef: { kind: 'local', fingerprint: 'fingerprint123' },
              at: 1000,
              ms: 60000,
              userId: 'u-37',
            },
            {
              trackRef: { kind: 'server', id: 'abc' },
              at: 2000,
              ms: 45000,
              userId: 'u-37',
            },
          ]),
        );
      });
    });
    it('MOB-DATA-038 flush drops confirmed plays after successful reportPlays', async () => {
      jest.spyOn(api, 'reportPlays').mockResolvedValue({ ok: true });
      queuePlay('yt:track-flush', Date.now(), 30000);
      await waitFor(() => {
        expect(useSyncStatus.getState().syncing).toBe(false);
      });
    });

    it('MOB-DATA-039 flush schedules retry on network error and drops invalid 4xx errors', async () => {
      jest.spyOn(api, 'reportPlays').mockRejectedValueOnce(new ApiError('Not found', 404));
      queuePlay('yt:track-bad', Date.now(), 30000);
      await waitFor(() => {
        expect(useSyncStatus.getState().syncing).toBe(false);
      });

      jest.spyOn(api, 'reportPlays').mockRejectedValueOnce(new Error('Network offline'));
      queuePlay('yt:track-retry', Date.now(), 30000);
      requestSync();
      await waitFor(() => {
        expect(useSyncStatus.getState().syncing).toBe(false);
      });
    });

    it('MOB-DATA-040 startBackgroundSync wires its network and app-state triggers once, even if called twice', () => {
      const netSpy = jest.spyOn(NetInfo, 'addEventListener').mockImplementation(() => jest.fn());
      const appSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as any);

      startBackgroundSync();
      startBackgroundSync();

      expect(netSpy).toHaveBeenCalledTimes(1);
      expect(appSpy).toHaveBeenCalledTimes(1);
      expect(appSpy).toHaveBeenCalledWith('change', expect.any(Function));
      netSpy.mockRestore();
      appSpy.mockRestore();
    });
  });

  describe('accountGate.ts', () => {
    it('MOB-DATA-041 requireAccount executes immediately when signed in', () => {
      useAuthStore.setState({ status: 'signedIn' });
      const action = jest.fn();
      requireAccount('save playlist', action);
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('MOB-DATA-042 requireAccount stores pending action and navigates to SignIn when guest', () => {
      useAuthStore.setState({ status: 'guest' });
      const action = jest.fn();
      const navSpy = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
      jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);

      requireAccount('favourite track', action);
      expect(action).not.toHaveBeenCalled();
      expect(navSpy).toHaveBeenCalledWith('SignIn', {
        reason: 'favourite track',
      });
    });

    it('MOB-DATA-043 takePendingAction executes and clears pending action', () => {
      useAuthStore.setState({ status: 'guest' });
      const action = jest.fn();
      jest.spyOn(navigationRef, 'isReady').mockReturnValue(false);
      requireAccount('test', action);

      const pending = takePendingAction();
      expect(pending).toBe(action);
      expect(takePendingAction()).toBeNull();
    });

    it('MOB-DATA-044 clearPendingAction clears pending action without executing', () => {
      useAuthStore.setState({ status: 'guest' });
      const action = jest.fn();
      jest.spyOn(navigationRef, 'isReady').mockReturnValue(false);
      requireAccount('test', action);

      clearPendingAction();
      expect(takePendingAction()).toBeNull();
      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('hooks.ts', () => {
    it('MOB-DATA-045 useAsync executes promise and provides data, loading, error, refetch', async () => {
      const fetcher = jest.fn().mockResolvedValue('loaded data');
      const { result } = renderHook(() => useAsync(fetcher, [], { refetchOnFocus: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toBe('loaded data');
      expect(result.current.error).toBeNull();

      // Error case
      const errorFetcher = jest.fn().mockRejectedValue('String error message');
      const { result: errResult } = renderHook(() => useAsync(errorFetcher, []));
      await waitFor(() => {
        expect(errResult.current.loading).toBe(false);
      });
      expect(errResult.current.error?.message).toBe('String error message');
    });

    it('MOB-DATA-046 useAsync respects enabled flag', async () => {
      const fetcher = jest.fn().mockResolvedValue('disabled');
      const { result } = renderHook(() => useAsync(fetcher, [], { enabled: false }));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('MOB-DATA-047 useAsync re-runs when dependency changes or refetch is invoked', async () => {
      let count = 0;
      const fetcher = jest.fn().mockImplementation(() => Promise.resolve(++count));
      const { result, rerender } = renderHook(({ dep }: { dep: string }) => useAsync(fetcher, [dep]), {
        initialProps: { dep: 'a' },
      });

      await waitFor(() => expect(result.current.data).toBe(1));
      act(() => {
        result.current.refetch();
      });
      await waitFor(() => expect(result.current.data).toBe(2));

      rerender({ dep: 'b' });
      await waitFor(() => expect(result.current.data).toBe(3));
    });
  });

  describe('gradients.ts', () => {
    it('MOB-DATA-048 artGradients exports valid 3-color gradient arrays', () => {
      expect(Object.keys(artGradients).length).toBeGreaterThan(0);
      for (const [key, colors] of Object.entries(artGradients)) {
        expect(key).toMatch(/^a\d+$/);
        expect(colors).toHaveLength(3);
        colors.forEach((c) => expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/));
      }
    });
  });
});
