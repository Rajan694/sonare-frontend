import type { User } from '../types';
import { CLIENT } from '../lib/caps';
import { API_BASE } from './server';

// Signed out is guest mode: catalog and playback work, saving needs an account (accountGate.ts).
// In dev, VITE_DEV_EMAIL / VITE_DEV_PASSWORD sign in automatically — until someone signs out.

const ACCESS_TOKEN_KEY = 'sonare_access_token';
const REFRESH_TOKEN_KEY = 'sonare_refresh_token';
const USER_KEY = 'sonare_user';
/** Set by an explicit sign-out so dev auto-login doesn't sign straight back in on reload. */
const SIGNED_OUT_KEY = 'sonare_signed_out';

export { API_BASE };
const JSON_HEADERS = { 'Content-Type': 'application/json', 'X-Sonare-Client': CLIENT };

let currentAccessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);
let currentRefreshToken: string | null = localStorage.getItem(REFRESH_TOKEN_KEY);
let currentUser: User | null = (() => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

let isAuthSettled = !import.meta.env.VITE_DEV_EMAIL || !!currentAccessToken || !!localStorage.getItem(SIGNED_OUT_KEY);
let authSettlePromise: Promise<void> | null = null;

type AuthListener = (user: User | null) => void;
const listeners = new Set<AuthListener>();
const authSettleListeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((fn) => fn(currentUser));
};

export const isAuthReady = (): boolean => {
  return isAuthSettled;
};

export const onAuthReady = (fn: () => void): (() => void) => {
  if (isAuthSettled) {
    fn();
    return () => {};
  }
  authSettleListeners.add(fn);
  return () => {
    authSettleListeners.delete(fn);
  };
};

const markAuthSettled = () => {
  isAuthSettled = true;
  authSettleListeners.forEach((fn) => fn());
  authSettleListeners.clear();
};

export const onAuthChange = (fn: AuthListener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getAccessToken = (): string | null => {
  return currentAccessToken;
};

export const getRefreshToken = (): string | null => {
  return currentRefreshToken;
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const isAuthenticated = (): boolean => {
  return !!currentAccessToken;
};

export const setSession = (accessToken: string, refreshToken: string, user: User) => {
  currentAccessToken = accessToken;
  currentRefreshToken = refreshToken;
  currentUser = user;

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(SIGNED_OUT_KEY);

  notifyListeners();
};

export const clearSession = () => {
  currentAccessToken = null;
  currentRefreshToken = null;
  currentUser = null;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  notifyListeners();
};

/** POSTs to /auth/<path>; throws the server's message on an error status. */
const postAuth = async <T>(path: string, body: unknown, accessToken?: string | null): Promise<T> => {
  const res = await fetch(`${API_BASE}/auth/${path}`, {
    method: 'POST',
    headers: accessToken ? { ...JSON_HEADERS, Authorization: `Bearer ${accessToken}` } : JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message || `Request failed with status ${res.status}`);
  }
  return json as T;
};

interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const signIn = async (email: string, password: string): Promise<User> => {
  const json = await postAuth<SessionResponse>('login', { email, password });
  setSession(json.accessToken, json.refreshToken, json.user);
  return json.user;
};

export const signUp = async (email: string, password: string, displayName: string): Promise<User> => {
  const json = await postAuth<SessionResponse>('register', { email, password, displayName });
  setSession(json.accessToken, json.refreshToken, json.user);
  return json.user;
};

/** The server answers ok whether or not the address has an account. */
export const requestPasswordReset = async (email: string): Promise<void> => {
  await postAuth('forgot-password', { email });
};

/** Every device is signed out by the server, this one included. */
export const resetPassword = async (token: string, password: string): Promise<void> => {
  await postAuth('reset-password', { token, password });
  clearSession();
};

export const verifyEmail = async (token: string): Promise<void> => {
  await postAuth('verify-email', { token });
  // The link may belong to another account than the one signed in here, so ask the server.
  if (!currentAccessToken) return;
  const res = await fetch(`${API_BASE}/me`, {
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${currentAccessToken}` },
  }).catch(() => null);
  if (res?.ok) setCurrentUser(await res.json());
};

export const resendVerification = async (): Promise<void> => {
  await postAuth('resend-verification', {}, currentAccessToken);
};

const setCurrentUser = (user: User) => {
  currentUser = user;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyListeners();
};

export const signOut = async (): Promise<void> => {
  try {
    if (currentAccessToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          ...JSON_HEADERS,
          Authorization: `Bearer ${currentAccessToken}`,
        },
        // The server revokes by refresh token; without it the session stays usable.
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
    }
  } catch {
    // Ignore network error on logout
  } finally {
    clearSession();
    localStorage.setItem(SIGNED_OUT_KEY, '1');
  }
};

let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  if (!currentRefreshToken) {
    clearSession();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!res.ok) {
        clearSession();
        return null;
      }

      const json = await res.json();
      currentAccessToken = json.accessToken;
      currentRefreshToken = json.refreshToken || currentRefreshToken;

      localStorage.setItem(ACCESS_TOKEN_KEY, currentAccessToken!);
      if (json.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, currentRefreshToken!);
      }

      return currentAccessToken;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const initDevAuth = async (): Promise<void> => {
  // Someone who signed out stays a guest; dev auto-login is only for a fresh start.
  if (currentAccessToken || localStorage.getItem(SIGNED_OUT_KEY)) {
    markAuthSettled();
    return;
  }

  const devEmail = import.meta.env.VITE_DEV_EMAIL;
  const devPassword = import.meta.env.VITE_DEV_PASSWORD;

  if (!devEmail || !devPassword) {
    markAuthSettled();
    return;
  }

  if (authSettlePromise) return authSettlePromise;

  authSettlePromise = (async () => {
    try {
      // 1. Attempt signIn first
      await signIn(devEmail, devPassword);
    } catch {
      // 2. If signIn fails, attempt signUp
      try {
        await signUp(devEmail, devPassword, 'Rajan');
      } catch {
        // 3. If signUp returned 409 / conflict, retry signIn once more
        try {
          await signIn(devEmail, devPassword);
        } catch (finalErr) {
          console.warn('[Auth] Dev auto-login failed:', finalErr);
        }
      }
    } finally {
      markAuthSettled();
      authSettlePromise = null;
    }
  })();

  return authSettlePromise;
};
