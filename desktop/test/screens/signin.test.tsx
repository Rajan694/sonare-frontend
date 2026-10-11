import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import SignIn from '../../src/screens/SignIn';
import { clearSession, getCurrentUser } from '../../src/api/auth';
import { requireAccount, takePendingAction } from '../../src/api/accountGate';
import { renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, useMockServer, server } from '../helpers/server';
import { testUser } from '../helpers/fixtures';

const toast = vi.hoisted(() => vi.fn());
vi.mock('../../src/store/toasts', () => ({ showToast: toast, dismissToast: () => {}, useToasts: () => [] }));

useMockServer();
afterEach(() => {
  clearSession();
  toast.mockClear();
});

const tokens = { accessToken: 'acc', refreshToken: 'ref', user: testUser };
const email = () => screen.getByRole('textbox', { name: 'Email' });
const password = () => screen.getByLabelText('Password');

const open = (state?: { reason?: string; mode?: 'signin' | 'signup' }) => {
  return renderWithProviders(<SignIn />, { route: { pathname: '/signin', state } });
};

describe('sign in screen', () => {
  it('WEB-SIGNIN-001 signs in with trimmed email, welcomes the user and goes home', async () => {
    let sent: unknown;
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(tokens);
      }),
    );
    const { user, location } = open();
    expect(screen.getByText('Your playlists, favourites and history sync to your Sonare account.')).toBeInTheDocument();
    await user.type(email(), '  listener@sonare.test ');
    await user.type(password(), 'hunter22');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(location()).toBe('/home'));
    expect(sent).toEqual({ email: 'listener@sonare.test', password: 'hunter22' });
    expect(getCurrentUser()).toEqual(testUser);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Welcome, Test Listener' }));
  });

  it('WEB-SIGNIN-002 shows the server error and stays on the form', async () => {
    server.use(http.post(`${API}/auth/login`, () => apiError(401, 'INVALID_CREDENTIALS', 'Wrong email or password')));
    const { user, location } = open();
    await user.type(email(), 'a@b.co');
    await user.type(password(), 'nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password');
    expect(location()).toBe('/signin');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('WEB-SIGNIN-003 cannot submit until both email and password are filled', async () => {
    const { user } = open();
    const submit = screen.getByRole('button', { name: 'Sign in' });
    expect(submit).toBeDisabled();
    await user.type(email(), 'a@b.co');
    expect(submit).toBeDisabled();
    await user.type(password(), 'x');
    expect(submit).toBeEnabled();
  });

  it('WEB-SIGNIN-004 shows "Please wait…" while the request is out', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.post(`${API}/auth/login`, async () => {
        await gate;
        return HttpResponse.json(tokens);
      }),
    );
    const { user } = open();
    await user.type(email(), 'a@b.co');
    await user.type(password(), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
    release();
    await waitFor(() => expect(getCurrentUser()).not.toBeNull());
  });
});

describe('create account', () => {
  it('WEB-SIGNIN-005 switching modes adds the display name field and clears the error', async () => {
    server.use(http.post(`${API}/auth/login`, () => apiError(401, 'X', 'Nope')));
    const { user } = open();
    await user.type(email(), 'a@b.co');
    await user.type(password(), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'New to Sonare? Create an account' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Display name' })).toBeInTheDocument();
    expect(password()).toHaveAttribute('minlength', '8');
    expect(password()).toHaveAttribute('autocomplete', 'new-password');
    await user.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
    expect(screen.queryByRole('textbox', { name: 'Display name' })).not.toBeInTheDocument();
  });

  it('WEB-SIGNIN-006 registers with the given name, or the email name when left blank', async () => {
    const bodies: any[] = [];
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(tokens, { status: 201 });
      }),
    );
    const { user, location } = open({ mode: 'signup' });
    expect(screen.getByText('Create account', { selector: 'span' })).toBeInTheDocument();
    await user.type(email(), 'nova@sonare.test');
    await user.type(password(), 'longpass1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(location()).toBe('/home'));
    expect(bodies[0]).toEqual({ email: 'nova@sonare.test', password: 'longpass1', displayName: 'nova' });
  });
});

describe('arriving from the account gate', () => {
  it("WEB-SIGNIN-007 shows why the account is needed and finishes the guest's action after signing up", async () => {
    server.use(http.post(`${API}/auth/register`, () => HttpResponse.json(tokens, { status: 201 })));
    const liked = vi.fn();
    requireAccount('Create a free account to save songs you love.', liked);
    const { user } = open({ reason: 'Create a free account to save songs you love.', mode: 'signup' });
    expect(screen.getByText('Create a free account to save songs you love.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Display name' }), 'Nova');
    await user.type(email(), 'nova@sonare.test');
    await user.type(password(), 'longpass1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(liked).toHaveBeenCalledTimes(1));
  });

  it("WEB-SIGNIN-008 leaving without signing in forgets the guest's action", () => {
    const liked = vi.fn();
    requireAccount('why', liked);
    const { unmount } = open({ reason: 'why', mode: 'signup' });
    unmount();
    expect(takePendingAction()).toBeNull();
    expect(liked).not.toHaveBeenCalled();
  });
});

describe('forgot password', () => {
  it('WEB-SIGNIN-009 sends a reset link for the trimmed email and says it is on its way', async () => {
    let sent: unknown;
    server.use(
      http.post(`${API}/auth/forgot-password`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByText('Reset password', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    await user.type(email(), ' listener@sonare.test ');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists for listener@sonare.test');
    expect(sent).toEqual({ email: 'listener@sonare.test' });
    expect(getCurrentUser()).toBeNull();
  });

  it('WEB-SIGNIN-010 shows a rate-limit error and goes back to sign in', async () => {
    server.use(http.post(`${API}/auth/forgot-password`, () => apiError(429, 'RATE_LIMITED', 'Too many attempts')));
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await user.type(email(), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts');
    await user.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(password()).toBeInTheDocument();
  });
});
