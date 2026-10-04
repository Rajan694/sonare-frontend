import React, { useState } from 'react';
import Button from '../components/ui/Button';
import { adminApi, type AdminAccount } from './api';
import { fmtDateTime } from './format';
import { Notice } from './components/Notice';
import { PageHeader } from './components/PageHeader';
import { Panel } from './components/Panel';
import { TextInput } from './components/TextInput';

export default function Account({
  account,
  onChange,
}: {
  account: AdminAccount | null;
  onChange: (a: AdminAccount) => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm !== '' && confirm !== next;
  const tooShort = next !== '' && next.length < 8;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch || tooShort || !current || !next) return;
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      onChange(await adminApi.changePassword(current, next));
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Account" subtitle="The admin sign-in. It can't be used to sign in to the apps." />
      <div className="flex flex-col gap-4 max-w-[576px]">
        <Panel>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-body-m">
            <dt className="text-t3">Email</dt>
            <dd className="text-t1">{account?.email ?? '…'}</dd>
            <dt className="text-t3">Signed in</dt>
            <dd className="text-t1">{fmtDateTime(account?.lastLoginAt ?? null)}</dd>
            <dt className="text-t3">Password changed</dt>
            <dd className={account?.passwordChangedAt ? 'text-t1' : 'text-gold'}>
              {account?.passwordChangedAt
                ? fmtDateTime(account.passwordChangedAt)
                : 'Never - still the initial password'}
            </dd>
          </dl>
        </Panel>

        <Panel title="Change password" subtitle="Every other admin session is signed out; this one stays signed in.">
          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* Lets password managers file the new password under the right account. */}
            <input type="text" name="username" autoComplete="username" value={account?.email ?? ''} readOnly hidden />
            <TextInput
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <TextInput
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
              hint={<span className={tooShort ? 'text-gold' : undefined}>At least 8 characters.</span>}
            />
            <TextInput
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              hint={mismatch ? <span className="text-gold">Doesn't match the new password.</span> : undefined}
            />
            {error && <Notice>{error}</Notice>}
            {done && (
              <p role="status" className="text-body-s text-acc">
                Password changed. Other admin sessions were signed out.
              </p>
            )}
            <div>
              <Button
                type="submit"
                variant="acc"
                disabled={saving || mismatch || tooShort || !current || !next || !confirm}
              >
                {saving ? 'Changing…' : 'Change password'}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
