import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';
import { apiBase } from './config';
import { httpRequest } from './http';
import type { User } from './types';

const SESSION_KEY = 'sonare.session';
const KEYCHAIN_SERVICE = 'sonare.session';

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
  /**
   * The access token to send: refreshed first when it has already run out (they last 15
   * minutes), so a launch doesn't send every call once to be refused and then again.
   */
  usableAccessToken: () => Promise<string | null>;
  /** Emails a reset code (and link); the server answers ok whether or not the account exists. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Swaps the emailed reset code for a token that sets the new password (15 minutes). */
  verifyResetCode: (email: string, code: string) => Promise<string>;
  /** Sets a new password with a reset token; every device is signed out. */
  resetPassword: (resetToken: string, password: string) => Promise<void>;
  /** Signed in: a new password; this phone gets a fresh session, other devices are signed out. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  /** Deletes the account and everything saved to it, then carries on as a guest. */
  deleteAccount: (password: string) => Promise<void>;
  /** Emails a new verification code and link. */
  resendVerification: () => Promise<void>;
  /** The 6-digit code from the verification email; marks the account verified. */
  verifyEmailCode: (code: string) => Promise<void>;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

const serverRequest = async <T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  accessToken?: string | null,
): Promise<T> => {
  const { status, json } = await httpRequest(`${apiBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: JSON.stringify(body),
  });
  if (status < 200 || status >= 300)
    throw new AuthError(json?.error?.message || `Request failed (${status})`, status, json?.error?.code);
  return json as T;
};

const authRequest = <T>(path: string, body: unknown, accessToken?: string | null): Promise<T> =>
  serverRequest<T>('POST', `/auth/${path}`, body, accessToken);

let refreshing: Promise<string | null> | null = null;

/** The access token's expiry has passed (or is under 30 s away). False when it can't be read. */
export const accessTokenExpired = (token: string, now = Date.now()): boolean => {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
    return typeof exp === 'number' && exp * 1000 < now + 30_000;
  } catch {
    return false;
  }
};

export const useAuthStore = create<AuthStore>((set, get) => {
  const startSession = async (session: Session) => {
    await Keychain.setGenericPassword('session', JSON.stringify(session), {
      service: KEYCHAIN_SERVICE,
    });
    set({ status: 'signedIn', ...session });
  };

  /** A call as the signed-in account; an expired access token is refreshed once. */
  const asAccount = async <T>(
    path: string,
    body: unknown,
    method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  ): Promise<T> => {
    const fullPath = path.startsWith('/') ? path : `/auth/${path}`;
    const sent = await get().usableAccessToken();
    try {
      return await serverRequest<T>(method, fullPath, body, sent);
    } catch (e) {
      if (!(e instanceof AuthError) || e.status !== 401) throw e;
      // Another call may have refreshed while this one was out: use that token, don't rotate again.
      const current = get().accessToken;
      const token = current && current !== sent ? current : await get().refresh();
      if (!token) throw e;
      return serverRequest<T>(method, fullPath, body, token);
    }
  };

  const endSession = async () => {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE }).catch(() => {});
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
        const credentials = await Keychain.getGenericPassword({
          service: KEYCHAIN_SERVICE,
        });
        if (credentials && credentials.password) {
          const session = JSON.parse(credentials.password) as Session;
          if (session?.accessToken && session.refreshToken && session.user) {
            set({ status: 'signedIn', ...session });
            return;
          }
        }

        // Migration: check old AsyncStorage location
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const session = JSON.parse(raw) as Session;
          if (session?.accessToken && session.refreshToken && session.user) {
            await Keychain.setGenericPassword('session', raw, {
              service: KEYCHAIN_SERVICE,
            });
            await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
            set({ status: 'signedIn', ...session });
            return;
          }
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
      await startSession(
        await authRequest<Session>('register', {
          email,
          password,
          displayName,
        }),
      );
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
          const pair = await authRequest<{
            accessToken: string;
            refreshToken: string;
          }>('refresh', { refreshToken });
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

    usableAccessToken: async () => {
      const { accessToken } = get();
      if (!accessToken || !accessTokenExpired(accessToken)) return accessToken;
      // Offline or the backend is down: send the old one, and the call fails as it would have.
      return (await get().refresh()) ?? get().accessToken;
    },

    requestPasswordReset: async (email) => {
      await authRequest('forgot-password', { email });
    },

    verifyResetCode: async (email, code) => {
      const { resetToken } = await authRequest<{ resetToken: string }>('verify-reset-code', { email, code });
      return resetToken;
    },

    resetPassword: async (resetToken, password) => {
      await authRequest('reset-password', { token: resetToken, password });
    },

    changePassword: async (currentPassword, newPassword) => {
      const pair = await asAccount<{ accessToken: string; refreshToken: string }>('change-password', {
        currentPassword,
        newPassword,
      });
      const { user } = get();
      if (user) await startSession({ ...pair, user });
    },

    updateDisplayName: async (displayName) => {
      const user = await asAccount<User>('/me', { displayName }, 'PATCH');
      const { accessToken, refreshToken } = get();
      if (accessToken && refreshToken)
        await startSession({ accessToken, refreshToken, user: { ...get().user, ...user } });
    },

    deleteAccount: async (password) => {
      await asAccount('/me', { password }, 'DELETE');
      await endSession();
    },

    resendVerification: async () => {
      await asAccount('resend-verification', {});
    },

    verifyEmailCode: async (code) => {
      await asAccount('verify-email-code', { code });
      const { accessToken, refreshToken, user } = get();
      if (accessToken && refreshToken && user) {
        await startSession({ accessToken, refreshToken, user: { ...user, emailVerified: true } });
      }
    },
  };
});
