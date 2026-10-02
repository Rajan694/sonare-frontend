import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { requestPasswordReset, signIn, signUp } from '../data/auth';
import { clearPendingAction, takePendingAction } from '../data/accountGate';
import { showToast } from '../store/toastStore';

type Mode = 'signin' | 'signup' | 'forgot';

const TITLES: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Reset password',
};

/**
 * Sign in, create an account, or ask for a password reset link. Reached from Settings / the
 * top bar, or from the account gate when a guest tries something that saves to an account —
 * then `reason` says why, and what they were doing finishes once they're in. Uses the existing
 * surface / field / button primitives only; the design system has no login screen yet.
 */
export default function SignIn() {
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
  const [resetSent, setResetSent] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResetSent(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email.trim());
        setResetSent(true);
        return;
      }
      const user =
        mode === 'signup'
          ? await signUp(email.trim(), password, name.trim() || email.split('@')[0])
          : await signIn(email.trim(), password);
      succeeded.current = true;
      showToast({ title: `Welcome, ${user.displayName}`, icon: 'check', variant: 'acc' });
      // Back to where they were (a direct visit has nowhere to go back to), then finish
      // whatever they tried as a guest — the like, the new playlist.
      if (window.history.state?.idx > 0) navigate(-1);
      else navigate('/home', { replace: true });
      await takePendingAction()?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    mode === 'forgot'
      ? "Enter your account's email and we'll send a link to set a new password."
      : (state?.reason ?? 'Your playlists, favourites and history sync to your Sonare account.');

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
        {mode !== 'forgot' && (
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
        )}
        {error && (
          <span className="text-body-s text-red" role="alert">
            {error}
          </span>
        )}
        {resetSent && (
          <span className="text-body-s text-t2" role="status">
            If an account exists for {email.trim()}, a reset link is on its way. It works for one hour.
          </span>
        )}
        <Button type="submit" variant="acc" disabled={busy || !email || (mode !== 'forgot' && !password)}>
          {busy ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : TITLES[mode]}
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
}
