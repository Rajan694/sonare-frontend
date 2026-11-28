import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PipedHosts, { PIPED_HOSTS_POLL } from '../../src/admin/PipedHosts';
import type { AdminPipedHost, AdminPipedHosts, PipedHostLive } from '../../src/admin/api';
import { fmtBytes } from '../../src/admin/format';
import { API, HttpResponse, apiError, http, recordRequests, server, useMockServer } from '../helpers/server';

// The admin page's Piped hosts screen (src/admin/PipedHosts.tsx): the backend's registry of
// phones, each phone's live status through /live, and the phone and registry buttons.

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

const host = (over: Partial<AdminPipedHost>): AdminPipedHost => ({
  uuid: A,
  name: 'realme-x2',
  apiUrl: 'https://sonare-host-realme-x2.tailb61775.ts.net',
  role: 'active',
  priority: 100,
  epoch: 1,
  version: '0.2.0',
  network: 'wifi',
  metered: false,
  status: 'ok',
  failures: 0,
  retryAt: null,
  lastRequestAt: Date.now() - 300_000,
  updatedAt: Date.now() - 300_000,
  lastCheckedAt: Date.now() - 30_000,
  lastError: null,
  latencyMs: 140,
  ...over,
});

const LIVE: PipedHostLive = {
  version: '0.2.0',
  host: { uuid: A, name: 'realme-x2', hostname: 'sonare-host-realme-x2', mode: 'handover', priority: 100 },
  phase: 'serving',
  serving: true,
  publicUrl: 'https://sonare-host-realme-x2.tailb61775.ts.net',
  tailscale: { state: 'Running', serving: true, certOk: true },
  gates: {
    api: { serving: true, requests: 120, bytesOut: 52_000 },
    media: { serving: true, requests: 30, bytesOut: 120_000_000 },
  },
  parts: [
    { name: 'bg-helper', state: 'running', pid: 101, restarts: 0, lastError: '' },
    { name: 'piped-proxy', state: 'running', pid: 102, restarts: 2, lastError: '' },
    { name: 'piped', state: 'failed', pid: 0, restarts: 5, lastError: 'exit status 1' },
  ],
  bundle: { ready: true, version: '0.1.1' },
  check: {
    at: new Date(Date.now() - 60_000).toISOString(),
    ok: false,
    steps: [
      { name: 'search', ok: true, detail: '20 results', ms: 870 },
      { name: 'streams', ok: false, detail: 'HTTP 500 from Piped', ms: 2_400 },
    ],
  },
  startedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  backend: { action: 'claim', at: new Date().toISOString(), reply: { ok: true, you: 'active', epoch: 1 } },
  device: {
    model: 'RMX1992',
    android: '11',
    battery: { level: 91, temperature: 33.1, charging: true, health: 'GOOD' },
    network: { type: 'mobile', metered: true },
    data: { month: '2026-11', wifiBytes: 120_000_000, mobileBytes: 2_500_000 },
  },
};

let list: AdminPipedHosts = { hosts: [], current: 'env', epoch: 0 };
const live = (body: PipedHostLive = LIVE) => HttpResponse.json({ live: body, fetchedAt: Date.now(), ms: 80 });

useMockServer(http.get(`${API}/admin/piped-hosts`, () => HttpResponse.json(list)));

const saved = { ...PIPED_HOSTS_POLL };
beforeEach(() => {
  // Slow enough that no test sees a second poll it didn't ask for.
  Object.assign(PIPED_HOSTS_POLL, { list: 60_000, live: 60_000, busy: 60_000, follow: 60_000 });
});
afterEach(() => {
  Object.assign(PIPED_HOSTS_POLL, saved);
  vi.restoreAllMocks();
});

describe('admin: Piped hosts', () => {
  it('WEB-PHADM-001 lists phones active first, with role, health, network, version and which one is in use', async () => {
    list = {
      hosts: [
        host({
          uuid: C,
          name: 'moto-g',
          role: 'released',
          status: 'unknown',
          apiUrl: 'https://sonare-host-motog.tailb61775.ts.net',
        }),
        host({
          uuid: B,
          name: 'pixel-6',
          role: 'standby',
          priority: 5,
          network: 'mobile',
          metered: true,
          status: 'down',
          failures: 3,
          retryAt: Date.now() + 120_000,
          lastError: 'ECONNREFUSED',
          version: null,
          apiUrl: 'https://sonare-host-pixel6.tailb61775.ts.net',
        }),
        host({}),
      ],
      current: { uuid: A, name: 'realme-x2' },
      epoch: 1,
    };
    render(<PipedHosts />);
    expect(await screen.findByText('Traffic is on realme-x2.')).toBeInTheDocument();
    expect(screen.getByText('Epoch 1')).toBeInTheDocument();

    const [first, second, third] = screen.getAllByRole('article');
    expect(first).toHaveAccessibleName('realme-x2');
    expect(within(first).getByText('Active')).toBeInTheDocument();
    expect(within(first).getByText('Piped up')).toBeInTheDocument();
    expect(within(first).getByText('In use')).toBeInTheDocument();
    expect(within(first).getByText(/Wi-Fi · hostd 0\.2\.0 · priority 100 · epoch 1/)).toBeInTheDocument();
    expect(within(first).getByText(/answered in 140 ms/)).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: /Make standby/ })).toBeInTheDocument();

    expect(second).toHaveAccessibleName('pixel-6');
    expect(within(second).getByText('Standby')).toBeInTheDocument();
    expect(within(second).getByText(/^Piped down, retry at/)).toBeInTheDocument();
    expect(within(second).getByText('Metered')).toBeInTheDocument();
    expect(within(second).getByText(/Mobile data/)).toBeInTheDocument();
    expect(within(second).getByText(/hostd unknown · priority 5/)).toBeInTheDocument();
    expect(within(second).getByText(/3 failures/)).toBeInTheDocument();
    expect(within(second).getByText('ECONNREFUSED')).toBeInTheDocument();
    expect(within(second).queryByText('In use')).not.toBeInTheDocument();
    expect(within(second).getByRole('button', { name: /Make active/ })).toBeInTheDocument();

    expect(third).toHaveAccessibleName('moto-g');
    expect(within(third).getByText('Released')).toBeInTheDocument();
    expect(within(third).queryByText('Not checked yet')).not.toBeInTheDocument();
    expect(within(third).queryByRole('button', { name: /Make (active|standby)/ })).not.toBeInTheDocument();
    expect(within(third).getByText('Released: not serving. Connect it to serve again.')).toBeInTheDocument();
  });

  it('WEB-PHADM-002 says when traffic is on the env fallback or the Settings pin, and when there are no phones', async () => {
    list = { hosts: [], current: 'env', epoch: 0 };
    const { unmount } = render(<PipedHosts />);
    expect(
      await screen.findByText('Traffic is on the server’s PIPED_API_URL: no phone has registered yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No phones yet. A phone shows up here once sonare-hostd on it registers with this server.'),
    ).toBeInTheDocument();
    unmount();

    list = { hosts: [host({ role: 'released' })], current: 'env', epoch: 2 };
    const second = render(<PipedHosts />);
    expect(
      await screen.findByText('No phone is serving: traffic is on the fallback, the server’s PIPED_API_URL.'),
    ).toBeInTheDocument();
    second.unmount();

    list = { hosts: [host({})], current: 'pin', epoch: 1 };
    render(<PipedHosts />);
    expect(await screen.findByText(/^Traffic is pinned to the Piped URL saved in Settings/)).toBeInTheDocument();
    expect(screen.queryByText('In use')).not.toBeInTheDocument();
  });

  it('WEB-PHADM-003 opening a phone shows its live status, and keeps polling it while open', async () => {
    list = { hosts: [host({})], current: { uuid: A, name: 'realme-x2' }, epoch: 1 };
    let reads = 0;
    server.use(
      http.get(`${API}/admin/piped-hosts/${A}/live`, () => {
        reads += 1;
        return live();
      }),
    );
    Object.assign(PIPED_HOSTS_POLL, { live: 30 });
    const user = userEvent.setup();
    render(<PipedHosts />);
    const card = await screen.findByRole('article', { name: 'realme-x2' });
    expect(reads).toBe(0);
    await user.click(within(card).getByRole('button', { name: 'Show live status of realme-x2' }));

    const panel = await within(card).findByRole('region', { name: 'Live status of realme-x2' });
    expect(await within(panel).findByText('91%, charging, 33.1 °C')).toBeInTheDocument();
    expect(within(panel).getByText('serving')).toBeInTheDocument();
    expect(within(panel).getByText('Serving')).toBeInTheDocument();
    expect(within(panel).getByText('Mobile data')).toBeInTheDocument();
    expect(within(panel).getByText('Metered')).toBeInTheDocument();
    expect(within(panel).getByText('Data this month (2026-11)')).toBeInTheDocument();
    expect(within(panel).getByText('Wi-Fi 120 MB · mobile 2.5 MB')).toBeInTheDocument();
    expect(within(panel).getByText(`${fmtBytes(120_052_000)} in 150 requests`)).toBeInTheDocument();
    expect(within(panel).getByText(/^2 h 0 min$/)).toBeInTheDocument();
    expect(within(panel).getByText(/hostd 0\.2\.0 · bundle 0\.1\.1/)).toBeInTheDocument();
    expect(within(panel).getByText('Running')).toBeInTheDocument();
    expect(within(panel).getByText('RMX1992 · Android 11')).toBeInTheDocument();
    expect(within(panel).getByText(/claim just now: active/)).toBeInTheDocument();

    const parts = within(panel).getByRole('table', { name: 'Parts' });
    const rows = within(parts).getAllByRole('row');
    expect(rows.map((r) => r.textContent)).toEqual([
      'PartStateRestartsSince',
      'bg-helperrunning0-',
      'piped-proxyrunning2-',
      'pipedexit status 1failed5-',
    ]);
    expect(within(panel).getByText('Last check 1 min ago:')).toBeInTheDocument();
    expect(within(panel).getByText('HTTP 500 from Piped')).toBeInTheDocument();
    expect(within(panel).getByLabelText('failed')).toBeInTheDocument();

    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(3));
    await user.click(within(card).getByRole('button', { name: 'Hide live status of realme-x2' }));
    expect(within(card).queryByRole('region')).not.toBeInTheDocument();
    const after = reads;
    await new Promise((r) => setTimeout(r, 120));
    expect(reads).toBe(after);
  });

  it('WEB-PHADM-004 a phone that can’t be reached shows its registry data and “offline”, not an error page', async () => {
    list = { hosts: [host({})], current: { uuid: A, name: 'realme-x2' }, epoch: 1 };
    server.use(
      http.get(`${API}/admin/piped-hosts/${A}/live`, () => apiError(502, 'UPSTREAM_UNAVAILABLE', 'No answer in 6 s')),
    );
    const user = userEvent.setup();
    render(<PipedHosts />);
    const card = await screen.findByRole('article', { name: 'realme-x2' });
    await user.click(within(card).getByRole('button', { name: /Show live status/ }));

    expect(await within(card).findByText('Offline')).toBeInTheDocument();
    expect(within(card).getByText(/^Offline: the phone can’t be reached \(No answer in 6 s\)/)).toBeInTheDocument();
    expect(within(card).getByText('https://sonare-host-realme-x2.tailb61775.ts.net')).toBeInTheDocument();
    expect(within(card).getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // An old sonare-hostd answers 404: a warning with the reason, still no error page.
    server.use(
      http.get(`${API}/admin/piped-hosts/${A}/live`, () =>
        apiError(502, 'UPSTREAM_ERROR', 'The phone answered HTTP 404: its sonare-hostd is too old for remote control'),
      ),
    );
    await user.click(within(card).getByRole('button', { name: /Hide live status/ }));
    await user.click(within(card).getByRole('button', { name: /Show live status/ }));
    expect(await within(card).findByText(/too old for remote control/)).toBeInTheDocument();
    expect(within(card).queryByText('Offline')).not.toBeInTheDocument();
  });

  it('WEB-PHADM-005 Connect, Disconnect, Run checks and Update parts call the phone and show its answer', async () => {
    list = { hosts: [host({ role: 'released' })], current: 'env', epoch: 1 };
    const actions: string[] = [];
    server.use(
      http.get(`${API}/admin/piped-hosts/${A}/live`, () => live({ ...LIVE, phase: 'starting', serving: false })),
      http.post(`${API}/admin/piped-hosts/${A}/actions/:action`, ({ params }) => {
        const action = String(params.action);
        actions.push(action);
        if (action === 'connect') return HttpResponse.json({ status: 'connecting' }, { status: 202 });
        if (action === 'disconnect') return HttpResponse.json({ status: 'stopped' });
        if (action === 'update') return HttpResponse.json({ status: 'updating' }, { status: 202 });
        return HttpResponse.json({ error: 'not serving' }, { status: 409 });
      }),
    );
    const requests = recordRequests();
    const user = userEvent.setup();
    render(<PipedHosts />);
    const card = await screen.findByRole('article', { name: 'realme-x2' });
    const phone = within(card).getByRole('group', { name: 'Phone controls for realme-x2' });

    await user.click(within(phone).getByRole('button', { name: 'Connect realme-x2' }));
    expect(
      await within(card).findByText('Connecting: the phone starts its parts, runs the checks, then takes traffic.'),
    ).toBeInTheDocument();
    // The action opens the phone's live status to follow it, and reloads the list.
    expect(await within(card).findByText('starting')).toBeInTheDocument();
    await waitFor(() =>
      expect(requests.paths().filter((p) => p === 'GET /admin/piped-hosts').length).toBeGreaterThanOrEqual(2),
    );

    await user.click(within(phone).getByRole('button', { name: 'Run checks realme-x2' }));
    expect(await within(card).findByText('not serving')).toBeInTheDocument();
    await user.click(within(phone).getByRole('button', { name: 'Update parts realme-x2' }));
    expect(await within(card).findByText(/^Updating: the phone downloads changed parts/)).toBeInTheDocument();
    await user.click(within(phone).getByRole('button', { name: 'Disconnect realme-x2' }));
    expect(await within(card).findByText('Disconnected: the phone stopped serving Piped.')).toBeInTheDocument();
    expect(actions).toEqual(['connect', 'check', 'update', 'disconnect']);
    requests.stop();
  });

  it('WEB-PHADM-006 a check run shows the failing steps; while it runs the buttons wait', async () => {
    list = { hosts: [host({})], current: { uuid: A, name: 'realme-x2' }, epoch: 1 };
    let finish: () => void = () => {};
    server.use(
      http.get(`${API}/admin/piped-hosts/${A}/live`, () => live()),
      http.post(`${API}/admin/piped-hosts/${A}/actions/check`, async () => {
        await new Promise<void>((r) => (finish = r));
        return HttpResponse.json({
          at: new Date().toISOString(),
          ok: false,
          steps: [
            { name: 'search', ok: true, ms: 800 },
            { name: 'streams', ok: false, detail: 'timeout', ms: 30_000 },
          ],
        });
      }),
    );
    const user = userEvent.setup();
    render(<PipedHosts />);
    const card = await screen.findByRole('article', { name: 'realme-x2' });
    await user.click(within(card).getByRole('button', { name: 'Run checks realme-x2' }));
    expect(await within(card).findByText(/^Running the Piped checks on the phone/)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Connect realme-x2' })).toBeDisabled();
    expect(within(card).getByRole('button', { name: /Health check/ })).toBeEnabled();
    finish();
    expect(await within(card).findByText('Checks failed: streams')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Connect realme-x2' })).toBeEnabled();
  });

  it('WEB-PHADM-007 Make active, Make standby, priority, health check and remove change the registry', async () => {
    list = {
      hosts: [host({}), host({ uuid: B, name: 'pixel-6', role: 'standby', priority: 100 })],
      current: { uuid: A, name: 'realme-x2' },
      epoch: 1,
    };
    const calls: string[] = [];
    server.use(
      http.patch(`${API}/admin/piped-hosts/:uuid`, async ({ params, request }) => {
        const body = (await request.json()) as Partial<AdminPipedHost>;
        calls.push(`patch ${params.uuid === B ? 'B' : 'A'} ${JSON.stringify(body)}`);
        const base = list.hosts.find((h) => h.uuid === params.uuid)!;
        return HttpResponse.json({ ...base, ...body });
      }),
      http.post(`${API}/admin/piped-hosts/${B}/check`, () => {
        calls.push('check B');
        return HttpResponse.json({
          ok: false,
          ms: 3000,
          error: 'UND_ERR_CONNECT_TIMEOUT',
          host: host({
            uuid: B,
            name: 'pixel-6',
            role: 'standby',
            status: 'down',
            lastError: 'UND_ERR_CONNECT_TIMEOUT',
          }),
        });
      }),
      http.delete(`${API}/admin/piped-hosts/${B}`, () => {
        calls.push('delete B');
        return HttpResponse.json({ ok: true });
      }),
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const user = userEvent.setup();
    render(<PipedHosts />);
    const a = await screen.findByRole('article', { name: 'realme-x2' });
    const b = screen.getByRole('article', { name: 'pixel-6' });

    await user.click(within(b).getByRole('button', { name: /Make active/ }));
    await waitFor(() => expect(calls).toEqual(['patch B {"role":"active"}']));
    await user.click(within(a).getByRole('button', { name: /Make standby/ }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toBe('patch A {"role":"standby"}');

    const pixel = screen.getByRole('article', { name: 'pixel-6' });
    await user.click(within(pixel).getByRole('button', { name: 'Priority 100' }));
    const input = within(pixel).getByLabelText('Priority of pixel-6');
    await user.clear(input);
    await user.type(input, '1001');
    expect(within(pixel).getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.clear(input);
    await user.type(input, '5');
    await user.click(within(pixel).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[2]).toBe('patch B {"priority":5}');

    await user.click(within(pixel).getByRole('button', { name: /Health check/ }));
    expect(await within(pixel).findByText('Piped: UND_ERR_CONNECT_TIMEOUT')).toBeInTheDocument();
    expect(calls[3]).toBe('check B');

    await user.click(within(pixel).getByRole('button', { name: /Remove/ }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(4);
    await user.click(within(pixel).getByRole('button', { name: /Remove/ }));
    await waitFor(() => expect(calls[4]).toBe('delete B'));
  });

  it('WEB-PHADM-008 a list that fails to load says so', async () => {
    server.use(http.get(`${API}/admin/piped-hosts`, () => apiError(500, 'INTERNAL', 'Something broke')));
    render(<PipedHosts />);
    expect(await screen.findByText('Something broke')).toBeInTheDocument();
    expect(screen.getByText('The phones could not be loaded.')).toBeInTheDocument();
  });
});
