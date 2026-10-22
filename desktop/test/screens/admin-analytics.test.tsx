import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Overview from '../../src/admin/Overview';
import ApiMetrics from '../../src/admin/ApiMetrics';
import type { Overview as OverviewType, RequestMetrics } from '../../src/admin/api';
import { API, HttpResponse, http, server, useMockServer } from '../helpers/server';

const mockOverview: OverviewType = {
  days: 14,
  totals: {
    users: 25,
    newUsers: 4,
    activeUsers: 8,
    activeGuests: 4,
    requests: 5200,
    plays: 150,
    listeningHours: 8.5,
    playlists: 12,
    favouriteTracks: 88,
    errorGroups: 2,
  },
  active: {
    dau: { users: 2, guests: 1 },
    wau: { users: 6, guests: 3 },
    mau: { users: 10, guests: 5 },
  },
  daily: [
    {
      day: '2026-10-21',
      users: 2,
      activeUsers: 2,
      guests: 1,
      signups: 1,
      plays: 15,
      requests: 2100,
      serverErrors: 0,
    },
    {
      day: '2026-10-22',
      users: 2,
      activeUsers: 2,
      guests: 1,
      signups: 2,
      plays: 25,
      requests: 3100,
      serverErrors: 1,
    },
  ],
  clients: [
    { client: 'web', users: 7, guests: 2 },
    { client: 'mobile', users: 5, guests: 3 },
    { client: 'other', users: 3, guests: 4 },
    { client: 'linux', users: 2, guests: 1 },
  ],
  signupsByClient: [
    { client: 'web', count: 7 },
    { client: 'mobile', count: 5 },
    { client: 'linux', count: 2 },
  ],
  health: {
    piped: { up: true, url: 'https://piped.video' },
    database: true,
    redis: true,
    uptimeSec: 3600,
    node: 'v20.0.0',
    memoryMb: 128,
  },
};

const mockRequests: RequestMetrics = {
  hours: 24,
  unit: 'hour',
  summary: {
    total: 4070,
    serverErrors: 2,
    clientErrors: 10,
    p50: 15,
    p95: 45,
  },
  series: [
    { at: '2026-10-22T00:00:00Z', requests: 2000, serverErrors: 1, p95: 40 },
    { at: '2026-10-22T01:00:00Z', requests: 2070, serverErrors: 1, p95: 50 },
  ],
  routes: [
    {
      method: 'GET',
      route: '/api/v1/tracks/:id/artwork',
      count: 4070,
      avg: 18,
      p50: 15,
      p95: 45,
      max: 120,
      clientErrors: 10,
      serverErrors: 2,
    },
    ...Array.from({ length: 20 }, (_, i) => ({
      method: 'GET',
      route: `/api/v1/resource/${i + 1}`,
      count: 100 - i,
      avg: 25,
      p50: 20,
      p95: 60,
      max: 150,
      clientErrors: 0,
      serverErrors: 0,
    })),
  ],
  statusClasses: [
    { class: '2xx', count: 4000 },
    { class: '3xx', count: 58 },
    { class: '4xx', count: 10 },
    { class: '5xx', count: 2 },
  ],
};

useMockServer(
  http.get(`${API}/admin/analytics/overview`, () => HttpResponse.json(mockOverview)),
  http.get(`${API}/admin/analytics/requests`, () => HttpResponse.json(mockRequests)),
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin: Analytics Overview and ApiMetrics', () => {
  it('WEB-ANL-001: Overview renders DAU/WAU/MAU tiles with users and guests, and active in window', async () => {
    render(<Overview />);

    // DAU tile: 2 users + 1 guest = 3
    expect(await screen.findByText('DAU (today)')).toBeInTheDocument();
    expect(screen.getByText('2 users · 1 guests')).toBeInTheDocument();

    // WAU tile: 6 users + 3 guests = 9
    expect(screen.getByText('WAU (7 days)')).toBeInTheDocument();
    expect(screen.getByText('6 users · 3 guests')).toBeInTheDocument();

    // MAU tile: 10 users + 5 guests = 15
    expect(screen.getByText('MAU (30 days)')).toBeInTheDocument();
    expect(screen.getByText('10 users · 5 guests')).toBeInTheDocument();

    // Active in window: 8 users + 4 guests = 12
    expect(screen.getByText('Active (14d)')).toBeInTheDocument();
    expect(screen.getByText('8 users · 4 guests')).toBeInTheDocument();
  });

  it('WEB-ANL-002: Overview renders dual-series active users chart with users and guests', async () => {
    render(<Overview />);

    expect(await screen.findByText('Active users per day')).toBeInTheDocument();
    expect(screen.getByText('Signed-in users and guests')).toBeInTheDocument();
    expect(screen.getAllByText('Users').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Guests').length).toBeGreaterThan(0);
  });

  it('WEB-ANL-003: Overview renders active users by app and new users by app tables', async () => {
    render(<Overview />);

    expect(await screen.findByText('Active users by app')).toBeInTheDocument();
    expect(screen.getByText('New users by app')).toBeInTheDocument();

    // Check client names from dev sanity numbers
    const activeSection = screen.getByText('Active users by app').closest('section')!;
    expect(within(activeSection).getByText('Web')).toBeInTheDocument();
    expect(within(activeSection).getByText('Mobile app')).toBeInTheDocument();
    expect(within(activeSection).getByText('Audio, artwork and other')).toBeInTheDocument();
    expect(within(activeSection).getByText('Linux app')).toBeInTheDocument();

    // Check active counts for Web: users 7, guests 2, total 9
    expect(within(activeSection).getByText('9')).toBeInTheDocument();

    // Check signups section
    const signupsSection = screen.getByText('New users by app').closest('section')!;
    expect(within(signupsSection).getByText('Web')).toBeInTheDocument();
    expect(within(signupsSection).getByText('7')).toBeInTheDocument();
  });

  it('WEB-ANL-004: ApiMetrics renders top 15 most used APIs table with method, route, calls, avg ms, p95', async () => {
    render(<ApiMetrics />);

    expect(await screen.findByText('Most used APIs')).toBeInTheDocument();
    const tableSection = screen.getByText('Most used APIs').closest('section')!;
    expect(within(tableSection).getByText('/api/v1/tracks/:id/artwork')).toBeInTheDocument();
    expect(within(tableSection).getByText('4,070')).toBeInTheDocument();

    // Check table headers
    expect(within(tableSection).getByRole('button', { name: /Method/i })).toBeInTheDocument();
    expect(within(tableSection).getByRole('button', { name: /Route/i })).toBeInTheDocument();
    expect(within(tableSection).getByRole('button', { name: /Calls/i })).toBeInTheDocument();
    expect(within(tableSection).getByRole('button', { name: /Avg ms/i })).toBeInTheDocument();
    expect(within(tableSection).getByRole('button', { name: /p95/i })).toBeInTheDocument();
    expect(within(tableSection).getByRole('button', { name: /4xx/i })).toBeInTheDocument();
    expect(within(tableSection).getByRole('button', { name: /5xx/i })).toBeInTheDocument();

    // Check top 15 limitation: route 14 is rendered, but route 16+ should not be in the top 15
    expect(within(tableSection).getByText('/api/v1/resource/14')).toBeInTheDocument();
    expect(within(tableSection).queryByText('/api/v1/resource/16')).not.toBeInTheDocument();
  });

  it('WEB-ANL-005: ApiMetrics renders requests, errors, latency charts and status classes table', async () => {
    render(<ApiMetrics />);

    expect(await screen.findByText('Requests per hour')).toBeInTheDocument();
    expect(screen.getByText('Server errors per hour')).toBeInTheDocument();
    expect(screen.getByText('p95 latency per hour')).toBeInTheDocument();

    // Status classes panel
    const statusPanel = screen.getByText('Status classes').closest('section')!;
    expect(within(statusPanel).getByText('2xx')).toBeInTheDocument();
    expect(within(statusPanel).getByText('3xx')).toBeInTheDocument();
    expect(within(statusPanel).getByText('4xx')).toBeInTheDocument();
    expect(within(statusPanel).getByText('5xx')).toBeInTheDocument();
    expect(within(statusPanel).getByText('4,000')).toBeInTheDocument();
  });

  it('WEB-ANL-006: Overview and ApiMetrics display empty state messages when data is empty', async () => {
    server.use(
      http.get(`${API}/admin/analytics/overview`, () =>
        HttpResponse.json({
          ...mockOverview,
          clients: [],
          signupsByClient: [],
        }),
      ),
      http.get(`${API}/admin/analytics/requests`, () =>
        HttpResponse.json({
          ...mockRequests,
          routes: [],
          statusClasses: [],
        }),
      ),
    );

    const { unmount } = render(<Overview />);
    expect(await screen.findByText('No active users logged yet.')).toBeInTheDocument();
    expect(screen.getByText('No new users in this range.')).toBeInTheDocument();
    unmount();

    render(<ApiMetrics />);
    expect(await screen.findByText('No requests in this range.')).toBeInTheDocument();
    expect(screen.getByText('None yet.')).toBeInTheDocument();
  });
});
