import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useAuthStore } from '../src/data/auth';
import { AccountScreen } from '../src/screens/Account';
import { alice, nav } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const alert = Alert.alert as jest.Mock;

/** Records each XHR request and answers it with the given status and body. */
const recordXHR = (status: number, body: unknown) => {
  const sent: { method: string; url: string; headers: Record<string, string>; body: any }[] = [];
  class RecordingXHR {
    status = status;
    responseText = JSON.stringify(body);
    onload: (() => void) | null = null;
    private req = { method: '', url: '', headers: {} as Record<string, string> };
    open(method: string, url: string) {
      this.req.method = method;
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
  return { sent, restore: () => ((globalThis as any).XMLHttpRequest = original) };
};

const signedIn = () =>
  useAuthStore.setState({
    status: 'signedIn',
    user: { ...alice, emailVerified: true },
    accessToken: 'acc-1',
    refreshToken: 'ref-1',
  } as never);

const pressAlertButton = (label: string) => {
  const buttons = alert.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === label)!.onPress?.();
};

const realStore = useAuthStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState(realStore, true);
  signedIn();
});

describe('forgotten password and account calls', () => {
  it('MOB-ACCT-001 the reset code is swapped for a token, and the token sets the new password', async () => {
    const verify = recordXHR(200, { resetToken: 'tok-9' });
    await expect(useAuthStore.getState().verifyResetCode('alice@sonare.test', '123456')).resolves.toBe('tok-9');
    expect(verify.sent[0].url).toMatch(/\/auth\/verify-reset-code$/);
    expect(verify.sent[0].body).toEqual({ email: 'alice@sonare.test', code: '123456' });
    verify.restore();

    const reset = recordXHR(200, { ok: true });
    await useAuthStore.getState().resetPassword('tok-9', 'brandnew1');
    expect(reset.sent[0].url).toMatch(/\/auth\/reset-password$/);
    expect(reset.sent[0].body).toEqual({ token: 'tok-9', password: 'brandnew1' });
    reset.restore();

    const expired = recordXHR(400, {
      error: { code: 'INVALID_TOKEN', message: 'This link is invalid or has expired' },
    });
    await expect(useAuthStore.getState().resetPassword('tok-9', 'brandnew1')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
    expired.restore();
  });

  it('MOB-ACCT-002 changing the password keeps this phone signed in with the new session; name and delete go to /me', async () => {
    const change = recordXHR(200, { accessToken: 'acc-2', refreshToken: 'ref-2' });
    await useAuthStore.getState().changePassword('oldpass12', 'newpass12');
    expect(change.sent[0]).toMatchObject({
      method: 'POST',
      body: { currentPassword: 'oldpass12', newPassword: 'newpass12' },
      headers: { Authorization: 'Bearer acc-1' },
    });
    expect(change.sent[0].url).toMatch(/\/auth\/change-password$/);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', accessToken: 'acc-2', refreshToken: 'ref-2' });
    change.restore();

    const rename = recordXHR(200, { ...alice, displayName: 'Ally' });
    await useAuthStore.getState().updateDisplayName('Ally');
    expect(rename.sent[0]).toMatchObject({ method: 'PATCH', body: { displayName: 'Ally' } });
    expect(rename.sent[0].url).toMatch(/\/me$/);
    expect(useAuthStore.getState().user?.displayName).toBe('Ally');
    rename.restore();

    const remove = recordXHR(200, { ok: true });
    await useAuthStore.getState().deleteAccount('newpass12');
    expect(remove.sent[0]).toMatchObject({ method: 'DELETE', body: { password: 'newpass12' } });
    expect(remove.sent[0].url).toMatch(/\/me$/);
    expect(useAuthStore.getState()).toMatchObject({ status: 'guest', user: null, accessToken: null });
    remove.restore();
  });
});

describe('Account screen', () => {
  it('MOB-ACCT-003 saves a new name, and changes the password after checking the fields', async () => {
    const updateDisplayName = jest.fn(async () => {});
    const changePassword = jest
      .fn()
      .mockRejectedValueOnce(new Error("That isn't your current password"))
      .mockResolvedValueOnce(undefined);
    useAuthStore.setState({ updateDisplayName, changePassword } as never);
    const { getByLabelText, getByText, findByText } = render(<AccountScreen />);
    expect(getByText('alice@sonare.test')).toBeTruthy();

    fireEvent.changeText(getByLabelText('Your name'), '  Ally  ');
    await act(async () => fireEvent.press(getByText('Save name')));
    expect(updateDisplayName).toHaveBeenCalledWith('Ally');
    expect(await findByText('Saved')).toBeTruthy();

    fireEvent.changeText(getByLabelText('Current password'), 'oldpass12');
    fireEvent.changeText(getByLabelText('New password'), 'short');
    await act(async () => fireEvent.press(getByText('Change password')));
    expect(getByText('Use at least 8 characters for the new password')).toBeTruthy();
    fireEvent.changeText(getByLabelText('New password'), 'newpass12');
    fireEvent.changeText(getByLabelText('Repeat new password'), 'newpass12');
    await act(async () => fireEvent.press(getByText('Change password')));
    expect(await findByText("That isn't your current password")).toBeTruthy();
    await act(async () => fireEvent.press(getByText('Change password')));
    expect(changePassword).toHaveBeenLastCalledWith('oldpass12', 'newpass12');
    expect(await findByText('Password changed. Your other devices are signed out.')).toBeTruthy();
    expect(getByLabelText('Current password').props.value).toBe('');
  });

  it('MOB-ACCT-004 deleting asks for the password and a confirmation, then leaves; a refusal is shown', async () => {
    const deleteAccount = jest
      .fn()
      .mockRejectedValueOnce(new Error("That isn't your password"))
      .mockImplementationOnce(async () => {
        useAuthStore.setState({ status: 'guest', user: null } as never);
      });
    useAuthStore.setState({ deleteAccount } as never);
    const { getByLabelText, getByText, findByText } = render(<AccountScreen />);
    fireEvent.press(getByLabelText('Delete account'));
    expect(getByText('Enter your password to delete the account')).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();

    fireEvent.changeText(getByLabelText('Password to delete the account'), 'wrong');
    fireEvent.press(getByLabelText('Delete account'));
    expect(alert.mock.calls.at(-1)![0]).toBe('Delete your account?');
    await act(async () => pressAlertButton('Delete account'));
    expect(await findByText("That isn't your password")).toBeTruthy();
    expect(nav.goBack).not.toHaveBeenCalled();

    fireEvent.press(getByLabelText('Delete account'));
    await act(async () => pressAlertButton('Delete account'));
    expect(deleteAccount).toHaveBeenLastCalledWith('wrong');
    expect(nav.goBack).toHaveBeenCalled();
  });
});
