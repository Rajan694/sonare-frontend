import React, { useState } from 'react';
import Button from '../ui/Button';
import { Field } from '../ui/Field';
import { AuthRequestError, requestPasswordReset, resetPassword, verifyResetCode } from '../../api/auth';

type Step = 'email' | 'code' | 'password';

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message) || fallback;

const linkClass = 'text-body-s bg-transparent border-0 cursor-pointer p-0';

/**
 * Forgot password, all in the app: the email gets a 6-digit code, the code is checked here, and
 * then the new password is set. `onDone` gets the email back so sign-in can be filled in.
 */
export const ForgotPassword = ({ initialEmail, onDone }: { initialEmail: string; onDone: (email: string) => void }) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState<'send' | 'verify' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const address = email.trim().toLowerCase();
  const digits = code.replace(/\D/g, '');

  const sendCode = async (again = false) => {
    setBusy('send');
    setError(null);
    try {
      await requestPasswordReset(address);
      setCode('');
      setResent(again);
      setStep('code');
    } catch (err) {
      setError(messageOf(err, 'Could not send the email'));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setBusy('verify');
    setError(null);
    try {
      setResetToken(await verifyResetCode(address, digits));
      setStep('password');
    } catch (err) {
      setError(messageOf(err, 'Could not check the code'));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (password.length < 8) return setError('Use at least 8 characters for your password');
    if (confirm !== password) return setError("The passwords don't match");
    setBusy('save');
    setError(null);
    try {
      await resetPassword(resetToken, password);
      onDone(address);
    } catch (err) {
      if (err instanceof AuthRequestError && err.code === 'INVALID_TOKEN') {
        // The 15 minutes after the code ran out: start again with a new code.
        setStep('email');
        setError('That took too long. Ask for a new code.');
      } else {
        setError(messageOf(err, 'Could not set the password'));
      }
    } finally {
      setBusy(null);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (step === 'email') void sendCode();
    else if (step === 'code') void verify();
    else void save();
  };

  const errorText = error && (
    <span className="text-body-s text-red" role="alert">
      {error}
    </span>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {step === 'email' && (
        <>
          <Field
            icon="info"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            autoComplete="email"
            required
          />
          {errorText}
          <Button type="submit" variant="acc" disabled={busy !== null || !address}>
            {busy === 'send' ? 'Please wait…' : 'Send code'}
          </Button>
        </>
      )}
      {step === 'code' && (
        <>
          <span className="text-body-m text-t2" role="status">
            {resent
              ? `A new code is on its way to ${address}. Only the newest one works.`
              : `If an account exists for ${address}, a 6-digit code is on its way. It works for 30 minutes.`}
          </span>
          <Field
            icon="check"
            placeholder="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7));
              setError(null);
            }}
            aria-label="Reset code"
          />
          {errorText}
          <Button type="submit" variant="acc" disabled={busy !== null || digits.length !== 6}>
            {busy === 'verify' ? 'Please wait…' : 'Check code'}
          </Button>
          <span className="flex justify-between">
            <button
              type="button"
              className={`${linkClass} text-acc`}
              disabled={busy !== null}
              onClick={() => void sendCode(true)}
            >
              {busy === 'send' ? 'Sending…' : 'Send a new code'}
            </button>
            <button
              type="button"
              className={`${linkClass} text-t3 hover:text-t1`}
              onClick={() => {
                setStep('email');
                setError(null);
              }}
            >
              Use another email
            </button>
          </span>
        </>
      )}
      {step === 'password' && (
        <>
          <span className="text-body-m text-t2">Choose a new password for {address}.</span>
          <Field
            icon="settings"
            type="password"
            placeholder="New password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="New password"
            autoComplete="new-password"
            required
          />
          <Field
            icon="settings"
            type="password"
            placeholder="New password again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-label="Repeat new password"
            autoComplete="new-password"
            required
          />
          {errorText}
          <Button type="submit" variant="acc" disabled={busy !== null}>
            {busy === 'save' ? 'Please wait…' : 'Set new password'}
          </Button>
        </>
      )}
    </form>
  );
};
