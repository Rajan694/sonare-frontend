import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import ResetPassword from '../../src/screens/ResetPassword';
import VerifyEmail from '../../src/screens/VerifyEmail';
import { clearSession, getCurrentUser, setSession } from '../../src/api/auth';
import { renderWithProviders } from '../helpers/render';
import { API, apiError, http, HttpResponse, useMockServer, server } from '../helpers/server';
import { testUser } from '../helpers/fixtures';

useMockServer();
afterEach(() => clearSession());

describe('reset password link', () => {
  const fill = async (user: ReturnType<typeof renderWithProviders>['user'], a: string, b: string) => {
    await user.type(screen.getByLabelText('New password'), a);
    await user.type(screen.getByLabelText('Repeat new password'), b);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
  };

  it('WEB-EMAIL-001 sets the new password with the token from the link and signs this device out', async () => {
    setSession('acc', 'ref', testUser);
    let sent: unknown;
    server.use(
      http.post(`${API}/auth/reset-password`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user, location } = renderWithProviders(<ResetPassword />, { route: '/reset-password?token=abc123' });
    await fill(user, 'new-password-1', 'new-password-1');
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed');
    expect(sent).toEqual({ token: 'abc123', password: 'new-password-1' });
    expect(getCurrentUser()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(location()).toBe('/signin');
  });

  it('WEB-EMAIL-002 refuses mismatched passwords without calling the server', async () => {
    let called = false;
    server.use(http.post(`${API}/auth/reset-password`, () => ((called = true), HttpResponse.json({ ok: true }))));
    const { user } = renderWithProviders(<ResetPassword />, { route: '/reset-password?token=abc123' });
    await fill(user, 'new-password-1', 'new-password-2');
    expect(screen.getByRole('alert')).toHaveTextContent("The passwords don't match");
    expect(called).toBe(false);
  });

  it('WEB-EMAIL-003 shows the server error for an expired link', async () => {
    server.use(
      http.post(`${API}/auth/reset-password`, () =>
        apiError(400, 'INVALID_TOKEN', 'This link is invalid or has expired'),
      ),
    );
    const { user } = renderWithProviders(<ResetPassword />, { route: '/reset-password?token=old' });
    await fill(user, 'new-password-1', 'new-password-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('This link is invalid or has expired');
  });

  it('WEB-EMAIL-004 a link without a token says so and shows no form', () => {
    renderWithProviders(<ResetPassword />, { route: '/reset-password' });
    expect(screen.getByRole('alert')).toHaveTextContent('This link is incomplete');
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });
});

describe('verify email link', () => {
  it('WEB-EMAIL-005 verifies once and refreshes the signed-in user', async () => {
    setSession('acc', 'ref', { ...testUser, emailVerified: false });
    const verifyBodies: unknown[] = [];
    server.use(
      http.post(`${API}/auth/verify-email`, async ({ request }) => {
        verifyBodies.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
      http.get(`${API}/me`, () => HttpResponse.json({ ...testUser, emailVerified: true })),
    );
    renderWithProviders(
      <React.StrictMode>
        <VerifyEmail />
      </React.StrictMode>,
      { route: '/verify-email?token=tok1' },
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Your email is verified');
    expect(verifyBodies).toEqual([{ token: 'tok1' }]);
    await waitFor(() => expect(getCurrentUser()?.emailVerified).toBe(true));
  });

  it('WEB-EMAIL-006 shows the server error for a used or expired link', async () => {
    server.use(
      http.post(`${API}/auth/verify-email`, () =>
        apiError(400, 'INVALID_TOKEN', 'This link is invalid or has expired'),
      ),
    );
    renderWithProviders(<VerifyEmail />, { route: '/verify-email?token=used' });
    expect(await screen.findByRole('alert')).toHaveTextContent('This link is invalid or has expired');
  });

  it('WEB-EMAIL-007 a link without a token fails without calling the server', () => {
    renderWithProviders(<VerifyEmail />, { route: '/verify-email' });
    expect(screen.getByRole('alert')).toHaveTextContent('This link is incomplete');
  });
});
