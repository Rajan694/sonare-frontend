import React, { useState } from 'react';
import Button from '../ui/Button';
import { Field } from '../ui/Field';
import { changePassword, deleteAccount, updateDisplayName } from '../../api/auth';
import { api } from '../../api/api';
import { dropPendingPlays } from '../../api/plays';
import { updateSyncStatus } from '../../api/sync';
import { clearRecentPlays } from '../../storage/recentPlays';
import { notifyHistoryCleared } from '../../api/hooks';
import { useAppDispatch } from '../../store';
import { setYouMayLike } from '../../store/aiSlice';
import { confirmDialog } from '../../store/dialogs';
import { showToast } from '../../store/toasts';
import type { User } from '../../types';

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message) || fallback;

const Status = ({ error, done }: { error: string | null; done?: string | null }) =>
  error ? (
    <span className="text-body-s text-red" role="alert">
      {error}
    </span>
  ) : done ? (
    <span className="text-body-s text-acc" role="status">
      {done}
    </span>
  ) : null;

const Card = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <div className="surf flex flex-col gap-3 p-5 rounded-2xl">
    <div className="flex flex-col gap-0.5">
      <span className="text-title-m text-t1">{title}</span>
      {description && <span className="text-body-s text-t3">{description}</span>}
    </div>
    {children}
  </div>
);

const NameCard = ({ user }: { user: User }) => {
  const [name, setName] = useState(user.displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const trimmed = name.trim();
  const changed = trimmed !== user.displayName;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || !changed) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await updateDisplayName(trimmed);
      setDone('Saved');
    } catch (err) {
      setError(messageOf(err, 'Could not save the name'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Name" description="How Sonare greets you.">
      <form onSubmit={save} className="flex flex-col gap-3">
        <Field
          icon="user"
          value={name}
          maxLength={100}
          onChange={(e) => {
            setName(e.target.value);
            setDone(null);
            setError(null);
          }}
          aria-label="Your name"
          autoComplete="name"
        />
        <Status error={error} done={done} />
        <Button type="submit" variant="solid" className="self-start" disabled={busy || !trimmed || !changed}>
          {busy ? 'Saving…' : 'Save name'}
        </Button>
      </form>
    </Card>
  );
};

const PasswordCard = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setDone(null);
    if (next.length < 8) return setError('Use at least 8 characters for the new password');
    if (confirm !== next) return setError("The new passwords don't match");
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone('Password changed. Your other devices are signed out.');
    } catch (err) {
      setError(messageOf(err, 'Could not change the password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Password" description="Changing it signs you out everywhere else.">
      <form onSubmit={save} className="flex flex-col gap-3">
        <Field
          icon="settings"
          type="password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          aria-label="Current password"
          autoComplete="current-password"
          required
        />
        <Field
          icon="settings"
          type="password"
          placeholder="New password (8+ characters)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
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
        <Status error={error} done={done} />
        <Button type="submit" variant="solid" className="self-start" disabled={busy}>
          {busy ? 'Please wait…' : 'Change password'}
        </Button>
      </form>
    </Card>
  );
};

const HistoryCard = ({ userId }: { userId: string }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const clear = async () => {
    setError(null);
    const ok = await confirmDialog({
      title: 'Clear play history?',
      description:
        'Recently played, Most played, play counts and suggestions start fresh on all your devices. Liked songs and playlists stay.',
      confirmLabel: 'Clear',
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    try {
      await api.clearHistory();
      clearRecentPlays();
      dropPendingPlays(userId);
      updateSyncStatus();
      dispatch(setYouMayLike(null));
      notifyHistoryCleared();
      showToast({ title: 'Play history cleared', icon: 'trash' });
    } catch (err) {
      setError(messageOf(err, 'Could not clear play history'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Play history"
      description="Clear recently played, most played and suggestions across all your devices. Liked songs and playlists stay."
    >
      <div className="flex flex-col gap-3">
        <Status error={error} />
        <Button
          type="button"
          variant="out"
          icon="trash"
          className="self-start text-red"
          disabled={busy}
          onClick={clear}
        >
          {busy ? 'Clearing…' : 'Clear play history'}
        </Button>
      </div>
    </Card>
  );
};

const DeleteCard = () => {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setError('Enter your password to delete the account');
    const ok = await confirmDialog({
      title: 'Delete your account?',
      description: "Your favourites, playlists, history and settings are deleted for good. This can't be undone.",
      confirmLabel: 'Delete account',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      showToast({ title: 'Account deleted', description: "You're listening as a guest", icon: 'logout' });
    } catch (err) {
      setError(messageOf(err, 'Could not delete the account'));
      setBusy(false);
    }
  };

  return (
    <Card
      title="Delete account"
      description="Deletes your account and everything saved to it. Downloaded songs stay on this device."
    >
      <form onSubmit={remove} className="flex flex-col gap-3">
        <Field
          icon="settings"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          aria-label="Password to delete the account"
          autoComplete="current-password"
        />
        <Status error={error} />
        <Button type="submit" variant="out" icon="trash" className="self-start text-red" disabled={busy}>
          {busy ? 'Deleting…' : 'Delete account'}
        </Button>
      </form>
    </Card>
  );
};

/** Settings > Account for a signed-in user: name, password, play history, and deleting the account. */
export const AccountDetails = ({ user }: { user: User }) => (
  <>
    <NameCard user={user} />
    <PasswordCard />
    <HistoryCard userId={user.id} />
    <DeleteCard />
  </>
);
