import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Download,
  ListChecks,
  Pause,
  Pencil,
  Plug,
  RefreshCw,
  Trash2,
  Unplug,
  X,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { cn } from '../lib/cn';
import {
  adminApi,
  type AdminApiError,
  type AdminPipedHost,
  type PipedHostAction,
  type PipedHostCheckResult,
  type PipedHostCurrent,
  type PipedHostLive,
  type PipedHostLiveReply,
  type PipedHostRole,
} from './api';
import { useLoad } from './useLoad';
import { Notice } from './components/Notice';
import { PageHeader } from './components/PageHeader';
import { Panel } from './components/Panel';
import { fmtBytes, fmtDuration, fmtInt, fmtMs, timeAgo } from './format';

// The phones hosting Piped (sonare-piped-host's sonare-hostd). The list is the backend's
// registry (/admin/piped-hosts); opening a phone reads its live status through the backend
// (/live, the phone's /_sonare/status) and its buttons tell the phone what to do (/actions/*).
// Page-local state like the other admin pages: nothing here is shared with another screen.

/** How often to reload, in ms. Mutable so the tests can shorten them. */
export const PIPED_HOSTS_POLL = { list: 10_000, live: 5_000, busy: 2_000, follow: 90_000 };

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`;

const ROLE_ORDER: Record<PipedHostRole, number> = { active: 0, standby: 1, released: 2 };
const sortHosts = (hosts: AdminPipedHost[]) =>
  [...hosts].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.priority - b.priority || a.name.localeCompare(b.name),
  );

const NETWORK_LABEL: Record<string, string> = { wifi: 'Wi-Fi', mobile: 'Mobile data', unknown: 'Network unknown' };
/** Phases that end on their own: poll faster to follow them. */
const MOVING_PHASES = new Set(['updating', 'starting', 'stopping']);

const RoleBadge = ({ role }: { role: PipedHostRole }) => {
  if (role === 'active') return <span className="badge bg-accbg text-acc">Active</span>;
  if (role === 'standby') return <span className="badge bg-blue/10 text-blue">Standby</span>;
  return <span className="badge bg-s3 text-t3">Released</span>;
};

const HealthBadge = ({ h }: { h: AdminPipedHost }) => {
  if (h.status === 'ok') return <span className="badge bg-accbg text-acc">Piped up</span>;
  if (h.status === 'down') {
    return (
      <span className="badge bg-red/10 text-red">
        Piped down{h.retryAt && h.retryAt > Date.now() ? `, retry at ${clock(h.retryAt)}` : ''}
      </span>
    );
  }
  return <span className="badge bg-s3 text-t2">Not checked yet</span>;
};

const CurrentBanner = ({ current, phones, epoch }: { current: PipedHostCurrent; phones: number; epoch: number }) => {
  const onPhone = typeof current === 'object';
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-start justify-between gap-2 rounded-md px-3.5 py-3 text-body-s',
        onPhone ? 'bg-accbg text-acc' : 'bg-goldbg text-gold',
      )}
    >
      <span>
        {onPhone
          ? `Traffic is on ${current.name}.`
          : current === 'pin'
            ? 'Traffic is pinned to the Piped URL saved in Settings, so no phone is used. Clear it there to use the phones.'
            : phones > 0
              ? 'No phone is serving: traffic is on the fallback, the server’s PIPED_API_URL.'
              : 'Traffic is on the server’s PIPED_API_URL: no phone has registered yet.'}
      </span>
      {epoch > 0 && <span className="text-label-m opacity-80">Epoch {epoch}</span>}
    </div>
  );
};

// ---- Live status ----

interface LiveState {
  reply: PipedHostLiveReply | null;
  /** offline: the phone can't be reached; otherwise it answered with something unusable. */
  error: { offline: boolean; message: string } | null;
}

/** Polls the phone's live status while `on`; every `fast ? busy : live` ms. */
const useLiveStatus = (uuid: string, on: boolean, fast: boolean) => {
  const [state, setState] = useState<LiveState>({ reply: null, error: null });
  const [nonce, setNonce] = useState(0);
  const fastRef = useRef(fast);
  useEffect(() => {
    fastRef.current = fast;
  }, [fast]);

  useEffect(() => {
    if (!on) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const reply = await adminApi.pipedHostLive(uuid);
        if (live) setState({ reply, error: null });
      } catch (e) {
        const err = e as AdminApiError;
        const offline = err.code === 'UPSTREAM_UNAVAILABLE' || err.status === 0;
        if (live) setState((s) => ({ reply: s.reply, error: { offline, message: err.message } }));
      }
      if (live) timer = setTimeout(tick, fastRef.current ? PIPED_HOSTS_POLL.busy : PIPED_HOSTS_POLL.live);
    };
    void tick();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [uuid, on, nonce]);

  return { ...state, refresh: () => setNonce((n) => n + 1) };
};

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <dt className="text-label-s text-t3">{label}</dt>
    <dd className="text-body-s text-t1 break-words">{children}</dd>
  </div>
);

const partTone = (state = '') => {
  if (state === 'running') return 'bg-accbg text-acc';
  if (/fail|crash|error|exit/.test(state)) return 'bg-red/10 text-red';
  if (state === 'starting' || state === 'downloading' || state === 'stopping') return 'bg-goldbg text-gold';
  return 'bg-s3 text-t2';
};

const battery = (b: NonNullable<PipedHostLive['device']>['battery']) => {
  if (!b || b.level === undefined) return 'Unknown';
  return [
    `${Math.round(b.level)}%`,
    b.charging ? 'charging' : b.charging === false ? 'not charging' : null,
    b.temperature !== undefined ? `${b.temperature.toFixed(1)} °C` : null,
    b.health && b.health !== 'GOOD' ? `health ${b.health.toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(', ');
};

const uptimeSec = (startedAt: string) => Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 1000);

const CheckSteps = ({ check, title }: { check: PipedHostCheckResult; title: string }) => (
  <div className="flex flex-col gap-1.5">
    <div className="text-label-l text-t2">
      {title}
      {check.at ? ` ${timeAgo(check.at)}` : ''}:{' '}
      <span className={check.ok ? 'text-acc' : 'text-red'}>{check.ok ? 'passed' : 'failed'}</span>
    </div>
    {(check.steps ?? []).length > 0 && (
      <ul className="flex flex-col gap-1">
        {(check.steps ?? []).map((s) => (
          <li key={s.name} className="flex items-start gap-2 text-body-s min-w-0">
            {s.ok ? (
              <Check size={14} className="text-acc flex-none mt-0.5" aria-label="passed" />
            ) : (
              <X size={14} className="text-red flex-none mt-0.5" aria-label="failed" />
            )}
            <span className="text-t1 flex-none">{s.name}</span>
            {s.ms !== undefined && <span className="text-t3 flex-none tabular-nums">{fmtMs(s.ms)}</span>}
            {s.detail && <span className={cn('min-w-0 break-words', s.ok ? 'text-t3' : 'text-red')}>{s.detail}</span>}
          </li>
        ))}
      </ul>
    )}
  </div>
);

const LiveDetails = ({ reply, stale }: { reply: PipedHostLiveReply; stale: boolean }) => {
  const s = reply.live;
  const device = s.device ?? undefined;
  const api = s.gates?.api;
  const media = s.gates?.media;
  const served = (api?.bytesOut ?? 0) + (media?.bytesOut ?? 0);
  const requests = (api?.requests ?? 0) + (media?.requests ?? 0);
  const net = device?.network;
  const data = device?.data;
  const downloads = Object.entries(s.progress ?? {}).filter((e): e is [string, [number, number]] => !!e[1]);

  return (
    <div className={cn('flex flex-col gap-4', stale && 'opacity-60')}>
      <div className="flex flex-wrap items-center gap-2">
        {s.phase && <span className={cn('badge', s.serving ? 'bg-accbg text-acc' : partTone(s.phase))}>{s.phase}</span>}
        <span className="text-body-s text-t1">
          {s.serving === true ? 'Serving' : s.serving === false ? 'Not serving' : 'Serving: unknown'}
        </span>
        <span className="text-label-m text-t3">
          {stale ? 'Last seen' : 'Updated'} {timeAgo(iso(reply.fetchedAt))}
        </span>
      </div>
      {s.lastError && <span className="text-label-m text-red break-words">{s.lastError}</span>}

      <dl className="grid grid-cols-1 @[560px]:grid-cols-2 @[820px]:grid-cols-3 gap-x-6 gap-y-3">
        <Fact label="Battery">{battery(device?.battery)}</Fact>
        <Fact label="Network">
          {net?.type ? (NETWORK_LABEL[net.type] ?? net.type) : 'Unknown'}
          {net?.metered && <span className="badge bg-goldbg text-gold ml-1.5">Metered</span>}
        </Fact>
        <Fact label={`Data this month${data?.month ? ` (${data.month})` : ''}`}>
          {data ? `Wi-Fi ${fmtBytes(data.wifiBytes ?? 0)} · mobile ${fmtBytes(data.mobileBytes ?? 0)}` : 'Unknown'}
        </Fact>
        <Fact label="Served since start">
          {s.gates ? `${fmtBytes(served)} in ${plural(requests, 'request')}` : 'Unknown'}
        </Fact>
        <Fact label="Uptime">{s.startedAt ? fmtDuration(uptimeSec(s.startedAt)) : 'Not started'}</Fact>
        <Fact label="Versions">
          hostd {s.version ?? 'unknown'} · bundle {s.bundle?.version ?? 'unknown'}
          {s.bundle?.ready === false && <span className="text-gold"> (not ready)</span>}
        </Fact>
        <Fact label="Tailscale">
          {s.tailscale?.state ?? 'Unknown'}
          {s.tailscale?.serving === false && <span className="text-gold">, Funnel off</span>}
          {s.tailscale?.certOk === false && <span className="text-red">, no certificate</span>}
        </Fact>
        <Fact label="Device">
          {[device?.model, device?.android ? `Android ${device.android}` : null].filter(Boolean).join(' · ') ||
            'Unknown'}
        </Fact>
        <Fact label="Last told the server">
          {s.backend?.action ? (
            <>
              {s.backend.action}
              {s.backend.at && ` ${timeAgo(s.backend.at)}`}
              {s.backend.reply?.you && `: ${s.backend.reply.you}`}
              {s.backend.lastError && <span className="block text-red">{s.backend.lastError}</span>}
            </>
          ) : (
            'Nothing yet'
          )}
        </Fact>
      </dl>

      {downloads.length > 0 && (
        <div className="flex flex-col gap-2">
          {downloads.map(([name, [done, total]]) => (
            <div key={name} className="flex flex-col gap-1">
              <div className="flex justify-between gap-3 text-label-m text-t2">
                <span>Downloading {name}</span>
                <span className="tabular-nums">
                  {fmtBytes(done)} of {fmtBytes(total)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-s3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-acc"
                  style={{ width: `${total > 0 ? Math.min(100, (done / total) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {(s.parts ?? []).length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-body-s">
            <caption className="sr-only">Parts</caption>
            <thead>
              <tr className="border-b border-ln text-label-s text-t3">
                <th className="py-1 text-left font-medium">Part</th>
                <th className="py-1 text-left font-medium">State</th>
                <th className="py-1 text-right font-medium">Restarts</th>
                <th className="py-1 pl-4 text-left font-medium">Since</th>
              </tr>
            </thead>
            <tbody>
              {(s.parts ?? []).map((p) => (
                <tr key={p.name} className="border-b border-ln last:border-0 align-top">
                  <td className="py-1.5 text-t1">
                    {p.name}
                    {p.lastError && <span className="block text-label-m text-red break-words">{p.lastError}</span>}
                  </td>
                  <td className="py-1.5">
                    <span className={cn('badge', partTone(p.state))}>{p.state ?? 'unknown'}</span>
                  </td>
                  <td className="py-1.5 text-right text-t2 tabular-nums">{fmtInt(p.restarts ?? 0)}</td>
                  <td className="py-1.5 pl-4 text-t3">{p.since ? timeAgo(p.since) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {s.check && <CheckSteps check={s.check} title="Last check" />}
    </div>
  );
};

// ---- One phone ----

const ACTION_DONE: Record<Exclude<PipedHostAction, 'check'>, string> = {
  connect: 'Connecting: the phone starts its parts, runs the checks, then takes traffic.',
  disconnect: 'Disconnected: the phone stopped serving Piped.',
  update: 'Updating: the phone downloads changed parts and restarts them if it is serving.',
};

const HostCard = ({
  h,
  inUse,
  onChanged,
  onReload,
}: {
  h: AdminPipedHost;
  inUse: boolean;
  onChanged: (h: AdminPipedHost) => void;
  onReload: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | 'health' | 'active' | 'standby' | 'priority' | 'remove'>(null);
  const [phoneBusy, setPhoneBusy] = useState<PipedHostAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; ms: number; error?: string } | null>(null);
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string; check?: PipedHostCheckResult } | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  // Bumped by each phone action: the live status is polled fast for a while after it.
  const [follow, setFollow] = useState(0);
  useEffect(() => {
    if (!follow) return;
    const timer = setTimeout(() => setFollow(0), PIPED_HOSTS_POLL.follow);
    return () => clearTimeout(timer);
  }, [follow]);

  const live = useLiveStatus(h.uuid, open, phoneBusy !== null || follow > 0);
  const moving = MOVING_PHASES.has(live.reply?.live.phase ?? '');
  useEffect(() => {
    // A phase that ends on its own: keep following it.
    if (moving) setFollow((n) => n || 1);
  }, [moving]);
  const offline = open && !!live.error?.offline;

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

  const act = async (action: PipedHostAction) => {
    setOpen(true);
    setPhoneBusy(action);
    setOutcome(null);
    try {
      const r = await adminApi.pipedHostAction(h.uuid, action);
      if (action === 'check') {
        const failed = (r.steps ?? []).filter((s) => !s.ok).map((s) => s.name);
        setOutcome({
          ok: r.ok !== false,
          text: r.ok === false ? `Checks failed${failed.length ? `: ${failed.join(', ')}` : ''}` : 'Checks passed',
          check: r,
        });
      } else {
        setOutcome({ ok: true, text: ACTION_DONE[action] });
      }
    } catch (err) {
      setOutcome({ ok: false, text: (err as Error).message });
    } finally {
      setPhoneBusy(null);
      setFollow((n) => n + 1);
      live.refresh();
      onReload();
    }
  };

  const healthCheck = () =>
    run('health', async () => {
      setHealth(null);
      const r = await adminApi.checkPipedHost(h.uuid);
      setHealth({ ok: r.ok, ms: r.ms, error: r.error });
      onChanged(r.host);
    });

  const setRole = (role: 'active' | 'standby') =>
    run(role, async () => {
      onChanged(await adminApi.updatePipedHost(h.uuid, { role }));
      // Making one phone active steps the previous one down.
      onReload();
    });

  const priorityValue = priority === null ? NaN : Number(priority.trim());
  const priorityValid =
    priority !== null && priority.trim() !== '' && Number.isInteger(priorityValue) && priorityValue >= 0;
  const savePriority = () =>
    run('priority', async () => {
      if (!priorityValid) return;
      if (priorityValue !== h.priority) onChanged(await adminApi.updatePipedHost(h.uuid, { priority: priorityValue }));
      setPriority(null);
      onReload();
    });

  const remove = () => {
    if (
      !window.confirm(
        `Remove ${h.name}? The server forgets it until the phone registers again (the next time it connects).`,
      )
    ) {
      return;
    }
    void run('remove', async () => {
      await adminApi.deletePipedHost(h.uuid);
      onReload();
    });
  };

  const phoneButton = (action: PipedHostAction, label: string, pending: string, Glyph: typeof Plug) => (
    <Button
      type="button"
      variant="out"
      size="sm"
      onClick={() => void act(action)}
      disabled={phoneBusy !== null}
      aria-label={`${label} ${h.name}`}
    >
      <Glyph size={14} className={phoneBusy === action ? 'animate-pulse' : undefined} aria-hidden />
      {phoneBusy === action ? pending : label}
    </Button>
  );

  return (
    <article
      aria-label={h.name}
      className={cn(
        '@container border border-ln rounded-md bg-s2 p-4 flex flex-col gap-3',
        h.role === 'released' && 'opacity-90',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-title-m text-t1">{h.name}</span>
            <RoleBadge role={h.role} />
            {h.role !== 'released' && <HealthBadge h={h} />}
            {inUse && <span className="badge bg-acc text-tinv">In use</span>}
            {offline && <span className="badge bg-red/10 text-red">Offline</span>}
          </div>
          <span className="font-mono text-label-s text-t2 truncate" title={h.apiUrl}>
            {h.apiUrl}
          </span>
          <span className="text-label-m text-t3">
            {NETWORK_LABEL[h.network] ?? h.network}
            {h.metered && <span className="badge bg-goldbg text-gold ml-1.5">Metered</span>} · hostd{' '}
            {h.version ?? 'unknown'} · priority {h.priority} · epoch {h.epoch}
          </span>
          <span className="text-label-m text-t3">
            Checked {timeAgo(iso(h.lastCheckedAt))}
            {h.latencyMs !== null && ` · answered in ${fmtMs(h.latencyMs)}`}
            {h.failures > 0 && ` · ${plural(h.failures, 'failure')}`} · last heard from {timeAgo(iso(h.lastRequestAt))}
          </span>
          {h.lastError && <span className="text-label-m text-red break-words">{h.lastError}</span>}
        </div>
        <button
          type="button"
          className="chip"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} live status of ${h.name}`}
        >
          {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />} Live status
        </button>
      </div>

      {open && (
        <section aria-label={`Live status of ${h.name}`} className="flex flex-col gap-3 pt-3 border-t border-ln">
          {live.error?.offline && (
            <div role="status" className="rounded-md bg-s3 px-3 py-2 text-body-s text-t2">
              Offline: the phone can’t be reached ({live.error.message}). Above is what the server last heard from it.
            </div>
          )}
          {live.error && !live.error.offline && <Notice tone="warn">{live.error.message}</Notice>}
          {!live.reply && !live.error && <p className="text-body-s text-t3">Loading live status…</p>}
          {live.reply && <LiveDetails reply={live.reply} stale={!!live.error} />}
        </section>
      )}

      {/* Answers to the buttons, next to them (the live status above can be long). */}
      {health && (
        <div
          role="status"
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-body-s',
            health.ok ? 'bg-accbg text-acc' : 'bg-red/10 text-red',
          )}
        >
          {health.ok ? <Check size={15} aria-hidden /> : <Activity size={15} aria-hidden />}
          <span>{health.ok ? `Piped answered in ${fmtMs(health.ms)}` : `Piped: ${health.error ?? 'no answer'}`}</span>
        </div>
      )}
      {error && <Notice>{error}</Notice>}
      {phoneBusy && (
        <div role="status" className="text-body-s text-t2">
          {phoneBusy === 'check'
            ? 'Running the Piped checks on the phone. This can take up to 3 minutes…'
            : `Sending ${phoneBusy} to the phone…`}
        </div>
      )}
      {outcome && (
        <div
          role="status"
          className={cn('rounded-md px-3 py-2 text-body-s', outcome.ok ? 'bg-accbg text-acc' : 'bg-red/10 text-red')}
        >
          {outcome.text}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-3 border-t border-ln">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Phone controls for ${h.name}`}>
          {phoneButton('connect', 'Connect', 'Connecting…', Plug)}
          {phoneButton('disconnect', 'Disconnect', 'Disconnecting…', Unplug)}
          {phoneButton('check', 'Run checks', 'Running checks…', ListChecks)}
          {phoneButton('update', 'Update parts', 'Updating…', Download)}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Server controls for ${h.name}`}>
          <Button type="button" variant="ghost" size="sm" onClick={() => void healthCheck()} disabled={busy !== null}>
            <Activity size={14} className={busy === 'health' ? 'animate-pulse' : undefined} aria-hidden />
            {busy === 'health' ? 'Checking…' : 'Health check'}
          </Button>
          {h.role === 'standby' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void setRole('active')}
              disabled={busy !== null}
            >
              <Crown size={14} aria-hidden /> {busy === 'active' ? 'Making active…' : 'Make active'}
            </Button>
          )}
          {h.role === 'active' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void setRole('standby')}
              disabled={busy !== null}
            >
              <Pause size={14} aria-hidden /> {busy === 'standby' ? 'Making standby…' : 'Make standby'}
            </Button>
          )}
          {priority === null ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPriority(String(h.priority))}
              disabled={busy !== null}
            >
              <Pencil size={14} aria-hidden /> Priority {h.priority}
            </Button>
          ) : (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void savePriority();
              }}
            >
              <label className="sr-only" htmlFor={`priority-${h.uuid}`}>
                Priority of {h.name}
              </label>
              <input
                id={`priority-${h.uuid}`}
                type="number"
                min={0}
                max={1000}
                step={1}
                autoFocus
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-8 w-20 px-2 bg-s1 border border-ln2 rounded-md text-t1 text-body-s outline-none focus:border-acc"
              />
              <Button
                type="submit"
                variant="acc"
                size="sm"
                disabled={!priorityValid || priorityValue > 1000 || busy !== null}
              >
                {busy === 'priority' ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPriority(null)}>
                <X size={14} aria-hidden /> Cancel
              </Button>
            </form>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:text-red"
            onClick={remove}
            disabled={busy !== null}
          >
            <Trash2 size={14} aria-hidden /> Remove
          </Button>
        </div>
        {h.role === 'released' && (
          <span className="text-label-m text-t3">Released: not serving. Connect it to serve again.</span>
        )}
      </div>
    </article>
  );
};

// ---- The page ----

const PipedHosts = () => {
  const { data, setData, error, loading, reload } = useLoad(() => adminApi.pipedHosts(), []);

  // Roles and health change as phones connect and the backend checks them: keep it current.
  useEffect(() => {
    const timer = setInterval(reload, PIPED_HOSTS_POLL.list);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hosts = sortHosts(data?.hosts ?? []);
  const inUse = data && typeof data.current === 'object' ? data.current.uuid : null;

  const replace = (next: AdminPipedHost) => {
    if (!data) return;
    setData({ ...data, hosts: data.hosts.map((h) => (h.uuid === next.uuid ? next : h)) });
  };

  return (
    <>
      <PageHeader
        title="Piped hosts"
        subtitle="The phones serving Piped to the apps. Traffic goes to the active phone, then to healthy standbys, then to the server’s PIPED_API_URL."
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

      <div className="max-w-[960px] flex flex-col gap-6">
        {data && <CurrentBanner current={data.current} phones={hosts.length} epoch={data.epoch} />}

        <Panel
          title="Phones"
          subtitle="Standbys are tried by priority, lowest first, unmetered before metered. Open a phone for its live status."
        >
          {hosts.length === 0 ? (
            <p className="text-body-s text-t3">
              {loading && !data
                ? 'Loading…'
                : data
                  ? 'No phones yet. A phone shows up here once sonare-hostd on it registers with this server.'
                  : 'The phones could not be loaded.'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {hosts.map((h) => (
                <HostCard key={h.uuid} h={h} inUse={h.uuid === inUse} onChanged={replace} onReload={reload} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
};

export default PipedHosts;
