import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Segmented } from '../components/ui/Segmented'
import { adminApi } from './api'
import {
  bucketLabels, ColumnChart, fmtCompact, fmtDuration, fmtInt, Notice, PageHeader, Panel, ShareBars,
  StatTile, StatusLine, useLoad,
} from './ui'

const RANGES = [
  { id: '7', label: '7 days' },
  { id: '14', label: '14 days' },
  { id: '30', label: '30 days' },
]

const CLIENT_NAMES: Record<string, string> = {
  web: 'Web',
  linux: 'Linux app',
  mobile: 'Mobile app',
  // <audio> and <img> requests can't carry the X-Sonare-Client header.
  other: 'Audio, artwork and untagged',
}

export default function Overview() {
  const [days, setDays] = useState('14')
  const { data, error, loading, reload } = useLoad(() => adminApi.overview(Number(days)), [days])

  const daily = (pick: (d: NonNullable<typeof data>['daily'][number]) => number) =>
    (data?.daily ?? []).map(d => ({ key: d.day, ...bucketLabels(d.day, 'day'), value: pick(d) }))

  return (
    <>
      <PageHeader title="Overview" subtitle="Usage across every app, from the backend's request log.">
        <Segmented options={RANGES} value={days} onChange={setDays} />
        <button type="button" className="chip" onClick={reload} aria-label="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </button>
      </PageHeader>

      {error && <div className="mb-4"><Notice>{error}</Notice></div>}

      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Panel className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatusLine ok={data.health.piped.up} label="Piped" detail={data.health.piped.url} />
              <StatusLine ok={data.health.database} label="Postgres" />
              <StatusLine ok={data.health.redis} label="Redis" detail={data.health.redis ? undefined : 'cache bypassed'} />
              <div className="text-label-m text-t3 flex items-center gap-3 flex-wrap">
                <span>Backend up {fmtDuration(data.health.uptimeSec)}</span>
                <span>{data.health.memoryMb} MB</span>
                <span>Node {data.health.node}</span>
              </div>
            </div>
          </Panel>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 mb-4">
            <StatTile label="Accounts" value={fmtCompact(data.totals.users)} note={`${fmtInt(data.totals.newUsers)} new in ${data.days} days`} />
            <StatTile label="Active accounts" value={fmtCompact(data.totals.activeUsers)} note="signed in and used the API" />
            <StatTile label="Plays" value={fmtCompact(data.totals.plays)} note={`${data.totals.listeningHours} hours listened`} />
            <StatTile label="API requests" value={fmtCompact(data.totals.requests)} note="guests included" />
            <StatTile label="Playlists" value={fmtCompact(data.totals.playlists)} note={`${fmtCompact(data.totals.favouriteTracks)} liked songs`} />
            <StatTile label="Error groups" value={fmtCompact(data.totals.errorGroups)} note={`seen in ${data.days} days`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 mb-4">
            <ColumnChart title="API requests per day" points={daily(d => d.requests)} format={fmtCompact} empty="No requests logged yet" />
            <ColumnChart title="Active accounts per day" subtitle="Signed-in accounts that used the API" points={daily(d => d.activeUsers)} empty="No signed-in activity yet" />
            <ColumnChart title="Plays per day" subtitle="Listens that counted (30 s or half the track)" points={daily(d => d.plays)} empty="No plays yet" />
            <ColumnChart title="Sign-ups per day" points={daily(d => d.signups)} empty="No sign-ups in this range" />
          </div>

          <Panel title="Requests by app" subtitle={`Last ${data.days} days. Request logs are kept for 30 days.`}>
            {data.clients.length ? (
              <ShareBars
                format={fmtCompact}
                rows={data.clients.map(c => ({
                  key: c.client,
                  label: CLIENT_NAMES[c.client] ?? c.client,
                  value: c.requests,
                  detail: `${fmtInt(c.users)} account${c.users === 1 ? '' : 's'}`,
                }))}
              />
            ) : (
              <p className="text-body-s text-t3">No requests logged yet.</p>
            )}
          </Panel>
        </div>
      )}
    </>
  )
}
