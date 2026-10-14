import React, { useState } from 'react';
import Button from '../ui/Button';
import { Field } from '../ui/Field';
import { resendVerification, verifyEmailCode } from '../../api/auth';
import { showToast } from '../../store/toasts';

/**
 * The 6-digit code from the verification email, typed in here, and a way to send a new one.
 * The email's link does the same from a browser; the code works in any app.
 */
export const VerifyEmailCode = ({ email, onVerified }: { email: string; onVerified?: () => void }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'verify' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const digits = code.replace(/\D/g, '');

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('verify');
    setError(null);
    try {
      await verifyEmailCode(digits);
      showToast({ title: 'Email verified', description: email, icon: 'check', variant: 'acc' });
      onVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code');
    } finally {
      setBusy(null);
    }
  };

  const sendNew = async () => {
    setBusy('send');
    setError(null);
    try {
      await resendVerification();
      setCode('');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the email');
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={verify} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Field
          icon="check"
          className="grow"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7));
            setError(null);
          }}
          placeholder="6-digit code"
          aria-label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        <Button type="submit" variant="acc" disabled={digits.length !== 6 || busy !== null}>
          {busy === 'verify' ? 'Checking…' : 'Verify'}
        </Button>
      </div>
      {error && (
        <span className="text-body-s text-red" role="alert">
          {error}
        </span>
      )}
      {sent && !error && (
        <span className="text-body-s text-t2" role="status">
          A new code is on its way to {email}. Only the newest one works.
        </span>
      )}
      <button
        type="button"
        className="self-start text-body-s text-t3 bg-transparent border-0 p-0 cursor-pointer hover:text-t1 disabled:opacity-50"
        onClick={() => void sendNew()}
        disabled={busy !== null}
      >
        {busy === 'send' ? 'Sending…' : 'Send a new code'}
      </button>
    </form>
  );
};
