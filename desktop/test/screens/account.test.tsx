import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { AccountDetails } from '../../src/components/account/AccountDetails';
import { clearSession, getAccessToken, getCurrentUser, getRefreshToken, setSession } from '../../src/api/auth';
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

const open = () => {
  setSession('acc-1', 'ref-1', testUser);
  return renderWithProviders(<AccountDetails user={testUser} />);
};

describe('account details', () => {
  it('WEB-ACCT-001 saves a new name to the account', async () => {
    let sent: { auth: string | null; body: unknown } | undefined;
    server.use(
      http.patch(`${API}/me`, async ({ request }) => {
        sent = { auth: request.headers.get('authorization'), body: await request.json() };
        return HttpResponse.json({ ...testUser, displayName: 'Ally' });
      }),
    );
    const { user } = open();
    const save = screen.getByRole('button', { name: 'Save name' });
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText('Your name'));
    await user.type(screen.getByLabelText('Your name'), '  Ally ');
    await user.click(save);
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(sent).toEqual({ auth: 'Bearer acc-1', body: { displayName: 'Ally' } });
    expect(getCurrentUser()?.displayName).toBe('Ally');
  });

  it('WEB-ACCT-002 changes the password: a wrong one is refused, then this device keeps a fresh session', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${API}/auth/change-password`, async ({ request }) => {
        const body = (await request.json()) as { currentPassword: string };
        bodies.push(body);
        return body.currentPassword === 'oldpass12'
          ? HttpResponse.json({ accessToken: 'acc-2', refreshToken: 'ref-2' })
          : apiError(400, 'WRONG_PASSWORD', "That isn't your current password");
      }),
    );
    const { user } = open();
    await user.type(screen.getByLabelText('Current password'), 'guess');
    await user.type(screen.getByLabelText('New password'), 'newpass12');
    await user.type(screen.getByLabelText('Repeat new password'), 'newpass1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByRole('alert')).toHaveTextContent("The new passwords don't match");
    expect(bodies).toHaveLength(0);

    await user.type(screen.getByLabelText('Repeat new password'), '2');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("That isn't your current password");

    await user.clear(screen.getByLabelText('Current password'));
    await user.type(screen.getByLabelText('Current password'), 'oldpass12');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Password changed. Your other devices are signed out.')).toBeInTheDocument();
    expect(bodies.at(-1)).toEqual({ currentPassword: 'oldpass12', newPassword: 'newpass12' });
    expect(getAccessToken()).toBe('acc-2');
    expect(getRefreshToken()).toBe('ref-2');
    expect(getCurrentUser()?.email).toBe(testUser.email);
    expect(screen.getByLabelText('Current password')).toHaveValue('');
  });

  it('WEB-ACCT-003 deleting needs the password and a confirmation, then carries on as a guest', async () => {
    let sent: unknown;
    server.use(
      http.delete(`${API}/me`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = open();
    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your password to delete the account');

    await user.type(screen.getByLabelText('Password to delete the account'), 'oldpass12');
    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    let dialog = await screen.findByRole('alertdialog', { name: 'Delete your account?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(sent).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    dialog = await screen.findByRole('alertdialog', { name: 'Delete your account?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));
    await waitFor(() => expect(getCurrentUser()).toBeNull());
    expect(sent).toEqual({ password: 'oldpass12' });
    expect(getAccessToken()).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Account deleted' }));
  });
});
