import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { API_BASE } from './config';
import { httpRequest } from './http';
import type { User } from './types';

const SESSION_KEY = 'sonare.session';

// Signed out is guest mode: the catalog and playback work, anything saved needs an account.
type Status = 'loading' | 'guest' | 'signedIn';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthStore {
  status: Status;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Restore the saved session on launch. */
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Swap the refresh token for a new pair; returns the new access token or null. */
  refresh: () => Promise<string | null>;
}

class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function authRequest<T>(path: string, body: unknown): Promise<T> {
  const { status, json } = await httpRequest(`${API_BASE}/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (status < 200 || status >= 300) throw new AuthError(json?.error?.message || `Request failed (${status})`, status);
  return json as T;
}

let refreshing: Promise<string | null> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => {
  const startSession = async (session: Session) => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    set({ status: 'signedIn', ...session });
  };

  const endSession = async () => {
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    set({ status: 'guest', user: null, accessToken: null, refreshToken: null });
  };

  return {
    status: 'loading',
    user: null,
    accessToken: null,
    refreshToken: null,

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        const session = raw ? (JSON.parse(raw) as Session) : null;
        if (session?.accessToken && session.refreshToken && session.user) {
          set({ status: 'signedIn', ...session });
          return;
        }
      } catch {
        // Unreadable session: fall through to guest mode.
      }
      set({ status: 'guest' });
    },

    signIn: async (email, password) => {
      await startSession(await authRequest<Session>('login', { email, password }));
    },

    signUp: async (email, password, displayName) => {
      await startSession(await authRequest<Session>('register', { email, password, displayName }));
    },

    signOut: async () => {
      const { refreshToken } = get();
      // Revoke server-side too, so the refresh token can't be reused from a backup.
      if (refreshToken) await authRequest('logout', { refreshToken }).catch(() => {});
      await endSession();
    },

    refresh: () => {
      if (refreshing) return refreshing;
      refreshing = (async () => {
        const { refreshToken, user } = get();
        if (!refreshToken || !user) {
          await endSession();
          return null;
        }
        try {
          const pair = await authRequest<{ accessToken: string; refreshToken: string }>('refresh', { refreshToken });
          await startSession({ ...pair, user });
          return pair.accessToken;
        } catch (e) {
          // Refresh tokens rotate, so a rejected one means the session is over. Anything
          // else (backend down, no network) keeps the session for the next attempt.
          if (e instanceof AuthError && e.status === 401) await endSession();
          return null;
        }
      })().finally(() => {
        refreshing = null;
      });
      return refreshing;
    },
  };
});
