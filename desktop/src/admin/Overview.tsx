import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Segmented } from '../components/ui/Segmented';
import { adminApi } from './api';
import { bucketLabels, fmtCompact, fmtDuration, fmtInt } from './format';
import { useLoad } from './useLoad';
import { ColumnChart } from './components/ColumnChart';
import { Notice } from './components/Notice';
import { PageHeader } from './components/PageHeader';
import { Panel } from './components/Panel';
import { StatTile } from './components/StatTile';
import { StatusLine } from './components/StatusLine';
import { AiUsagePanel } from './AiUsagePanel';

const RANGES = [
  { id: '7', label: '7 days' },
  { id: '14', label: '14 days' },
  { id: '30', label: '30 days' },
];

const CLIENT_NAMES: Record<string, string> = {
  web: 'Web',
  linux: 'Linux app',
  windows: 'Windows app',
  mobile: 'Mobile app',
  other: 'Audio, artwork and other',
  unknown: 'Unknown',
};

const Overview = () => {
  const [days, setDays] = useState('14');
  const { data, error, loading, reload } = useLoad(() => adminApi.overview(Number(days)), [days]);

  const daily = (pick: (d: NonNullable<typeof data>['daily'][number]) => number) =>
    (data?.daily ?? []).map((d) => ({ key: d.day, ...bucketLabels(d.day, 'day'), value: pick(d) }));

  return (
    <>
      <PageHeader title="Overview" subtitle="Usage across every app, from daily activity and API telemetry.">
        <Segmented options={RANGES} value={days} onChange={setDays} />
        <button type="button" className="chip" onClick={reload} aria-label="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </button>
      </PageHeader>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Panel className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatusLine ok={data.health.piped.up} label="Piped" detail={data.health.piped.url} />
              <StatusLine ok={data.health.database} label="Postgres" />
              <StatusLine
                ok={data.health.redis}
                label="Redis"
                detail={data.health.redis ? undefined : 'cache bypassed'}
              />
              <div className="text-label-m text-t3 flex items-center gap-3 flex-wrap">
                <span>Backend up {fmtDuration(data.health.uptimeSec)}</span>
                <span>{data.health.memoryMb} MB</span>
                <span>Node {data.health.node}</span>
              </div>
            </div>
          </Panel>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-4">
            <StatTile
              label="DAU (today)"
              value={fmtCompact((data.active?.dau?.users ?? 0) + (data.active?.dau?.guests ?? 0))}
              note={`${fmtInt(data.active?.dau?.users ?? 0)} users · ${fmtInt(data.active?.dau?.guests ?? 0)} guests`}
            />
            <StatTile
              label="WAU (7 days)"
              value={fmtCompact((data.active?.wau?.users ?? 0) + (data.active?.wau?.guests ?? 0))}
              note={`${fmtInt(data.active?.wau?.users ?? 0)} users · ${fmtInt(data.active?.wau?.guests ?? 0)} guests`}
            />
            <StatTile
              label="MAU (30 days)"
              value={fmtCompact((data.active?.mau?.users ?? 0) + (data.active?.mau?.guests ?? 0))}
              note={`${fmtInt(data.active?.mau?.users ?? 0)} users · ${fmtInt(data.active?.mau?.guests ?? 0)} guests`}
            />
            <StatTile
              label={`Active (${data.days}d)`}
              value={fmtCompact(data.totals.activeUsers + (data.totals.activeGuests ?? 0))}
              note={`${fmtInt(data.totals.activeUsers)} users · ${fmtInt(data.totals.activeGuests ?? 0)} guests`}
            />
            <StatTile
              label="Accounts"
              value={fmtCompact(data.totals.users)}
              note={`${fmtInt(data.totals.newUsers)} new in ${data.days} days`}
            />
            <StatTile
              label="Plays"
              value={fmtCompact(data.totals.plays)}
              note={`${data.totals.listeningHours} hours listened`}
            />
            <StatTile label="API requests" value={fmtCompact(data.totals.requests)} note="total calls" />
            <StatTile
              label="Playlists"
              value={fmtCompact(data.totals.playlists)}
              note={`${fmtCompact(data.totals.favouriteTracks)} liked songs`}
            />
            <StatTile
              label="Error groups"
              value={fmtCompact(data.totals.errorGroups)}
              note={`seen in ${data.days} days`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 mb-4">
            <ColumnChart
              title="API requests per day"
              points={daily((d) => d.requests)}
              format={fmtCompact}
              empty="No requests logged yet"
            />
            <ColumnChart
              title="Active users per day"
              subtitle="Signed-in users and guests"
              points={daily((d) => d.users ?? d.activeUsers)}
              secondaryPoints={daily((d) => d.guests ?? 0)}
              seriesNames={['Users', 'Guests']}
              empty="No active users in this range"
            />
            <ColumnChart
              title="Plays per day"
              subtitle="Listens that counted (30 s or half the track)"
              points={daily((d) => d.plays)}
              empty="No plays yet"
            />
            <ColumnChart title="Sign-ups per day" points={daily((d) => d.signups)} empty="No sign-ups in this range" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <Panel title="Active users by app" subtitle={`Last ${data.days} days.`}>
              {data.clients.length ? (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-body-s">
                    <thead>
                      <tr className="border-b border-ln2 text-label-m text-t3">
                        <th scope="col" className="py-2 text-left font-medium">
                          App
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Users
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Guests
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Total active
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.clients.map((c) => {
                        const total = c.users + c.guests;
                        return (
                          <tr key={c.client} className="border-b border-ln last:border-0">
                            <td className="py-2 text-t1 font-medium">{CLIENT_NAMES[c.client] ?? c.client}</td>
                            <td className="py-2 text-right text-t2 tabular-nums">{fmtInt(c.users)}</td>
                            <td className="py-2 text-right text-t2 tabular-nums">{fmtInt(c.guests)}</td>
                            <td className="py-2 text-right text-t1 tabular-nums font-medium">{fmtInt(total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-body-s text-t3">No active users logged yet.</p>
              )}
            </Panel>

            <Panel title="New users by app" subtitle={`Last ${data.days} days.`}>
              {data.signupsByClient && data.signupsByClient.length > 0 ? (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-body-s">
                    <thead>
                      <tr className="border-b border-ln2 text-label-m text-t3">
                        <th scope="col" className="py-2 text-left font-medium">
                          App
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          New accounts
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.signupsByClient.map((s) => (
                        <tr key={s.client} className="border-b border-ln last:border-0">
                          <td className="py-2 text-t1 font-medium">{CLIENT_NAMES[s.client] ?? s.client}</td>
                          <td className="py-2 text-right text-t1 tabular-nums font-medium">{fmtInt(s.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-body-s text-t3">No new users in this range.</p>
              )}
            </Panel>
          </div>

          <AiUsagePanel days={data.days} />
        </div>
      )}
    </>
  );
};
export default Overview;
