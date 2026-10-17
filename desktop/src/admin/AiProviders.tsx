import React, { useEffect, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, Check, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import Button from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { cn } from '../lib/cn';
import { adminApi, type AdminAiProvider, type AiProviderInput } from './api';
import { useLoad } from './useLoad';
import { Notice } from './components/Notice';
import { PageHeader } from './components/PageHeader';
import { Panel } from './components/Panel';
import { TextInput } from './components/TextInput';
import { fmtMs, timeAgo } from './format';

// The AI providers behind the apps' AI features (sonare-backend/src/services/ai). Any
// OpenAI-compatible chat-completions endpoint works; they're tried top to bottom, and one that
// fails (rate limit, used-up quota, bad key) is skipped until its retry time.

const EMPTY: AiProviderInput = { name: '', baseUrl: '', apiKey: '', model: '' };

const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

const StatusBadge = ({ p }: { p: AdminAiProvider }) => {
  if (!p.enabled) return <span className="badge bg-s3 text-t3">Disabled</span>;
  if (p.status === 'ok') return <span className="badge bg-accbg text-acc">Answering</span>;
  if (p.status === 'down') {
    return (
      <span className="badge bg-red/10 text-red">
        Down{p.retryAt && p.retryAt > Date.now() ? `, retry at ${clock(p.retryAt)}` : ', retrying'}
      </span>
    );
  }
  return <span className="badge bg-s3 text-t2">Not checked yet</span>;
};

/** Name, URL, key and model; the key may stay empty when editing (keeps the current one). */
const ProviderFields = ({
  value,
  onChange,
  editing,
  disabled,
}: {
  value: AiProviderInput;
  onChange: (v: AiProviderInput) => void;
  editing?: boolean;
  disabled?: boolean;
}) => {
  const set = (k: keyof AiProviderInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 @[560px]:grid-cols-2 gap-3">
      <TextInput
        label="Name"
        value={value.name}
        onChange={set('name')}
        placeholder="OpenRouter"
        maxLength={60}
        disabled={disabled}
      />
      <TextInput
        label="Model"
        value={value.model}
        onChange={set('model')}
        placeholder="openrouter/free"
        spellCheck={false}
        disabled={disabled}
      />
      <TextInput
        className="@[560px]:col-span-2"
        label="Chat completions URL"
        value={value.baseUrl}
        onChange={set('baseUrl')}
        placeholder="https://openrouter.ai/api/v1/chat/completions"
        spellCheck={false}
        disabled={disabled}
        hint={
          value.baseUrl.trim() && !isHttpUrl(value.baseUrl) ? (
            <span className="text-red">Must be an http or https URL</span>
          ) : undefined
        }
      />
      <TextInput
        className="@[560px]:col-span-2"
        label="API key"
        type="password"
        autoComplete="off"
        value={value.apiKey}
        onChange={set('apiKey')}
        placeholder={editing ? 'Leave empty to keep the current key' : 'sk-…'}
        disabled={disabled}
      />
    </div>
  );
};

const ProviderCard = ({
  p,
  first,
  last,
  onChanged,
  onMove,
  onDeleted,
}: {
  p: AdminAiProvider;
  first: boolean;
  last: boolean;
  onChanged: (p: AdminAiProvider) => void;
  onMove: (dir: -1 | 1) => void;
  onDeleted: () => void;
}) => {
  const [busy, setBusy] = useState<null | 'check' | 'toggle' | 'save' | 'delete'>(null);
  const [check, setCheck] = useState<{ ok: boolean; ms: number; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<AiProviderInput | null>(null);

  const run = async (kind: NonNullable<typeof busy>, work: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const checkNow = () =>
    run('check', async () => {
      setCheck(null);
      const r = await adminApi.checkAiProvider(p.id);
      setCheck({ ok: r.ok, ms: r.ms, error: r.error });
      onChanged(r.provider);
    });

  const toggle = (enabled: boolean) =>
    run('toggle', async () => onChanged(await adminApi.updateAiProvider(p.id, { enabled })));

  const save = () =>
    run('save', async () => {
      if (!edit) return;
      const update: Partial<AiProviderInput> = {};
      if (edit.name.trim() !== p.name) update.name = edit.name.trim();
      if (edit.baseUrl.trim() !== p.baseUrl) update.baseUrl = edit.baseUrl.trim();
      if (edit.model.trim() !== p.model) update.model = edit.model.trim();
      if (edit.apiKey.trim()) update.apiKey = edit.apiKey.trim();
      if (Object.keys(update).length > 0) onChanged(await adminApi.updateAiProvider(p.id, update));
      setEdit(null);
    });

  const remove = () => {
    if (!window.confirm(`Delete ${p.name}? Its usage history stays in the analytics.`)) return;
    void run('delete', async () => {
      await adminApi.deleteAiProvider(p.id);
      onDeleted();
    });
  };

  const canSave =
    !!edit && edit.name.trim() !== '' && edit.model.trim() !== '' && isHttpUrl(edit.baseUrl) && busy === null;

  return (
    <article
      className={cn('@container border border-ln rounded-md bg-s2 p-4 flex flex-col gap-3', !p.enabled && 'opacity-75')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-m text-t4 w-4">{p.position + 1}.</span>
            <span className="text-title-m text-t1">{p.name}</span>
            <StatusBadge p={p} />
          </div>
          <span className="font-mono text-label-s text-t2 truncate" title={p.baseUrl}>
            {p.model} · {p.baseUrl}
          </span>
          <span className="text-label-m text-t3">
            Key {p.keyHint || 'not set'} · checked {timeAgo(iso(p.lastCheckedAt))}
            {p.latencyMs !== null && ` · answered in ${fmtMs(p.latencyMs)}`}
          </span>
          {p.lastError && <span className="text-label-m text-red break-words">{p.lastError}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="ib ib-28 text-t3 hover:text-t1 disabled:opacity-30"
            onClick={() => onMove(-1)}
            disabled={first}
            aria-label={`Move ${p.name} up`}
          >
            <ArrowUp size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="ib ib-28 text-t3 hover:text-t1 disabled:opacity-30"
            onClick={() => onMove(1)}
            disabled={last}
            aria-label={`Move ${p.name} down`}
          >
            <ArrowDown size={14} aria-hidden />
          </button>
          <Switch
            checked={p.enabled}
            onCheckedChange={(on) => void toggle(on)}
            disabled={busy !== null}
            aria-label={`${p.enabled ? 'Disable' : 'Enable'} ${p.name}`}
          />
        </div>
      </div>

      {check && (
        <div
          role="status"
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-body-s',
            check.ok ? 'bg-accbg text-acc' : 'bg-red/10 text-red',
          )}
        >
          {check.ok ? <Check size={15} aria-hidden /> : <Activity size={15} aria-hidden />}
          <span>{check.ok ? `Answered in ${fmtMs(check.ms)}` : (check.error ?? 'No answer')}</span>
        </div>
      )}
      {error && <Notice>{error}</Notice>}

      {edit ? (
        <div className="flex flex-col gap-3 pt-3 border-t border-ln">
          <ProviderFields value={edit} onChange={setEdit} editing disabled={busy !== null} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="acc" size="sm" onClick={() => void save()} disabled={!canSave}>
              {busy === 'save' ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEdit(null)}>
              <X size={14} aria-hidden /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-ln">
          <Button type="button" variant="out" size="sm" onClick={() => void checkNow()} disabled={busy !== null}>
            <Activity size={14} className={busy === 'check' ? 'animate-pulse' : undefined} aria-hidden />
            {busy === 'check' ? 'Checking…' : 'Check now'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEdit({ name: p.name, baseUrl: p.baseUrl, model: p.model, apiKey: '' })}
            disabled={busy !== null}
          >
            <Pencil size={14} aria-hidden /> Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:text-red"
            onClick={remove}
            disabled={busy !== null}
          >
            <Trash2 size={14} aria-hidden /> Delete
          </Button>
        </div>
      )}
    </article>
  );
};

const AiProviders = () => {
  const { data, setData, error, loading, reload } = useLoad(() => adminApi.aiProviders(), []);
  const [draft, setDraft] = useState<AiProviderInput>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Status changes as the backend calls and checks providers: keep it current while open.
  useEffect(() => {
    const timer = setInterval(reload, 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providers = data?.providers ?? [];
  const answering = providers.filter((p) => p.enabled && p.status !== 'down').length;

  const replace = (next: AdminAiProvider) => {
    if (!data) return;
    const list = data.providers.map((p) => (p.id === next.id ? next : p));
    setData({ providers: list, available: list.some((p) => p.enabled && p.status !== 'down') });
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ids = providers.map((p) => p.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + dir, 0, moved);
    setActionError(null);
    try {
      setData(await adminApi.orderAiProviders(ids));
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const canAdd =
    draft.name.trim() !== '' &&
    draft.model.trim() !== '' &&
    draft.apiKey.trim() !== '' &&
    isHttpUrl(draft.baseUrl) &&
    !adding;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    setAdding(true);
    setActionError(null);
    try {
      await adminApi.addAiProvider({
        name: draft.name.trim(),
        baseUrl: draft.baseUrl.trim(),
        apiKey: draft.apiKey.trim(),
        model: draft.model.trim(),
      });
      setDraft(EMPTY);
      reload();
      // The backend checks a new provider at once; show the answer when it's in.
      setTimeout(reload, 4000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <PageHeader
        title="AI"
        subtitle="The AI providers behind You may like, AI search, AI playlists and title cleanup."
      >
        <button type="button" className="chip" onClick={reload} aria-label="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </button>
      </PageHeader>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      <div className="max-w-[720px] flex flex-col gap-6">
        {data && (
          <div
            role="status"
            className={cn(
              'flex items-start gap-2 rounded-md px-3.5 py-3 text-body-s',
              data.available ? 'bg-accbg text-acc' : 'bg-goldbg text-gold',
            )}
          >
            {data.available ? (
              <span>
                AI is on: {answering} of {providers.length} {providers.length === 1 ? 'provider' : 'providers'}{' '}
                answering.
              </span>
            ) : (
              <span>AI is off: no enabled provider is answering, so the AI features are hidden in the apps.</span>
            )}
          </div>
        )}

        <Panel
          title="Providers"
          subtitle="Tried top to bottom. One that fails is skipped until its retry time and checked again then."
        >
          {actionError && (
            <div className="mb-4">
              <Notice>{actionError}</Notice>
            </div>
          )}
          {providers.length === 0 ? (
            <p className="text-body-s text-t3">{loading ? 'Loading…' : 'No providers yet. Add one below.'}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {providers.map((p, i) => (
                <ProviderCard
                  key={p.id}
                  p={p}
                  first={i === 0}
                  last={i === providers.length - 1}
                  onChanged={replace}
                  onMove={(dir) => void move(i, dir)}
                  onDeleted={reload}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Add provider"
          subtitle="Any OpenAI-compatible chat completions endpoint. The key is stored on the server and never shown again."
        >
          <form onSubmit={add} className="@container flex flex-col gap-4">
            <ProviderFields value={draft} onChange={setDraft} disabled={adding} />
            <div className="text-label-m text-t3 flex flex-col gap-1">
              <span>Examples:</span>
              <span className="font-mono text-label-s">
                OpenRouter · https://openrouter.ai/api/v1/chat/completions · openrouter/free
              </span>
              <span className="font-mono text-label-s">
                Google AI Studio · https://generativelanguage.googleapis.com/v1beta/openai/chat/completions ·
                gemini-3.1-flash-lite
              </span>
            </div>
            <div className="pt-2 border-t border-ln">
              <Button type="submit" variant="acc" disabled={!canAdd}>
                <Plus size={15} aria-hidden /> {adding ? 'Adding…' : 'Add provider'}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
};

export default AiProviders;
