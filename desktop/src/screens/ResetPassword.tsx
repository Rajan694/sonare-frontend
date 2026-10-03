import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { resetPassword } from '../api/auth';

/** Opened from the emailed reset link: /reset-password?token=… */
export default function ResetPassword() {
  const navigate = useNavigate();
  const token = useSearchParams()[0].get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The passwords don't match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password');
    } finally {
      setBusy(false);
    }
  }

  const goToSignIn = () => navigate('/signin', { replace: true, state: { mode: 'signin' } });

  return (
    <div className="flex items-center justify-center h-full p-8">
      <form onSubmit={submit} className="surf flex flex-col gap-4 p-8 w-full max-w-[400px]">
        <span className="text-h1 text-t1">Set a new password</span>
        {!token ? (
          <span className="text-body-m text-t2" role="alert">
            This link is incomplete. Open the link from the email again, or ask for a new one.
          </span>
        ) : done ? (
          <>
            <span className="text-body-m text-t2" role="status">
              Password changed. You've been signed out everywhere; sign in with the new password.
            </span>
            <Button type="button" variant="acc" onClick={goToSignIn}>
              Sign in
            </Button>
          </>
        ) : (
          <>
            <Field
              icon="settings"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="New password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Field
              icon="settings"
              type="password"
              placeholder="Repeat new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-label="Repeat new password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {error && (
              <span className="text-body-s text-red" role="alert">
                {error}
              </span>
            )}
            <Button type="submit" variant="acc" disabled={busy || !password || !confirm}>
              {busy ? 'Please wait…' : 'Change password'}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
