import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { signIn, signUp } from '../api/auth';
import { clearPendingAction, takePendingAction } from '../api/accountGate';
import { showToast } from '../store/toasts';
import { VerifyEmailCode } from '../components/account/VerifyEmailCode';
import { ForgotPassword } from '../components/account/ForgotPassword';

type Mode = 'signin' | 'signup' | 'forgot';

const TITLES: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Reset password',
};

/**
 * Sign in, create an account, or set a new password with an emailed code. Reached from Settings / the
 * top bar, or from the account gate when a guest tries something that saves to an account —
 * then `reason` says why, and what they were doing finishes once they're in. Uses the existing
 * surface / field / button primitives only; the design system has no login screen yet.
 */
const SignIn = () => {
  const navigate = useNavigate();
  const state = useLocation().state as { reason?: string; mode?: 'signin' | 'signup' } | null;
  const [mode, setMode] = useState<Mode>(state?.mode === 'signup' ? 'signup' : 'signin');
  const succeeded = useRef(false);

  // Leaving without signing in abandons the guest's pending action.
  useEffect(
    () => () => {
      if (!succeeded.current) clearPendingAction();
    },
    [],
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Said after a forgotten password was replaced.
  const [notice, setNotice] = useState<string | null>(null);
  // A new account's email gets a code; it can be typed here before carrying on.
  const [verifying, setVerifying] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user =
        mode === 'signup'
          ? await signUp(email.trim(), password, name.trim() || email.split('@')[0])
          : await signIn(email.trim(), password);
      succeeded.current = true;
      showToast({ title: `Welcome, ${user.displayName}`, icon: 'check', variant: 'acc' });
      if (mode === 'signup' && user.emailVerified === false) setVerifying(user.email);
      else await carryOn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  // Back to where they were (a direct visit has nowhere to go back to), then finish
  // whatever they tried as a guest — the like, the new playlist.
  const carryOn = async () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/home', { replace: true });
    await takePendingAction()?.();
  };

  if (verifying) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="surf flex flex-col gap-4 p-8 w-full max-w-[400px]">
          <div className="flex flex-col gap-1">
            <span className="text-h1 text-t1">Verify your email</span>
            <span className="text-body-m text-t2">
              We sent a 6-digit code to {verifying}. Enter it here, or open the link in that email.
            </span>
          </div>
          <VerifyEmailCode email={verifying} onVerified={() => void carryOn()} />
          <Button variant="ghost" onClick={() => void carryOn()}>
            Skip for now
          </Button>
        </div>
      </div>
    );
  }

  const subtitle =
    mode === 'forgot'
      ? "Enter your account's email and we'll send a code to set a new password."
      : (state?.reason ?? 'Your playlists, favourites and history sync to your Sonare account.');

  if (mode === 'forgot') {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="surf flex flex-col gap-4 p-8 w-full max-w-[400px]">
          <div className="flex flex-col gap-1">
            <span className="text-h1 text-t1">{TITLES.forgot}</span>
            <span className="text-body-m text-t2">{subtitle}</span>
          </div>
          <ForgotPassword
            initialEmail={email}
            onDone={(address) => {
              setEmail(address);
              setPassword('');
              switchMode('signin');
              setNotice('Password changed. Sign in with your new password.');
            }}
          />
          <button
            type="button"
            className="text-body-s text-t3 bg-transparent border-0 cursor-pointer hover:text-t1"
            onClick={() => switchMode('signin')}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      <form onSubmit={submit} className="surf flex flex-col gap-4 p-8 w-full max-w-[400px]">
        <div className="flex flex-col gap-1">
          <span className="text-h1 text-t1">{TITLES[mode]}</span>
          <span className="text-body-m text-t2">{subtitle}</span>
        </div>
        {mode === 'signup' && (
          <Field
            icon="info"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Display name"
            autoComplete="nickname"
          />
        )}
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
        <Field
          icon="settings"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          required
        />
        {error && (
          <span className="text-body-s text-red" role="alert">
            {error}
          </span>
        )}
        {notice && (
          <span className="text-body-s text-acc" role="status">
            {notice}
          </span>
        )}
        <Button type="submit" variant="acc" disabled={busy || !email || !password}>
          {busy ? 'Please wait…' : TITLES[mode]}
        </Button>
        {mode === 'signin' && (
          <button
            type="button"
            className="text-body-s text-t3 bg-transparent border-0 cursor-pointer hover:text-t1"
            onClick={() => switchMode('forgot')}
          >
            Forgot password?
          </button>
        )}
        <button
          type="button"
          className="text-body-s text-t3 bg-transparent border-0 cursor-pointer hover:text-t1"
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'New to Sonare? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
};
export default SignIn;
