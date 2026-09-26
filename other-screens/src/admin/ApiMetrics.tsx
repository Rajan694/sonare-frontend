import React, { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import { Segmented } from '../components/ui/Segmented'
import { cn } from '../lib/utils'
import { adminApi, type RouteStats } from './api'
import {
  bucketLabels, ColumnChart, fmtCompact, fmtInt, fmtMs, fmtPct, Notice, PageHeader, Panel, StatTile, useLoad,
} from './ui'

const RANGES = [
  { id: '1', label: '1 hour' },
  { id: '24', label: '24 hours' },
  { id: '168', label: '7 days' },
  { id: '720', label: '30 days' },
]

type SortKey = 'route' | 'count' | 'serverErrors' | 'clientErrors' | 'p50' | 'p95' | 'max'

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'route', label: 'Endpoint', numeric: false },
  { key: 'count', label: 'Requests', numeric: true },
  { key: 'serverErrors', label: '5xx', numeric: true },
  { key: 'clientErrors', label: '4xx', numeric: true },
  { key: 'p50', label: 'p50', numeric: true },
  { key: 'p95', label: 'p95', numeric: true },
  { key: 'max', label: 'Slowest', numeric: true },
]

function statusTone(status: number) {
  if (status >= 500) return 'text-red'
  if (status >= 400) return 'text-gold'
  return 'text-t1'
}

export default function ApiMetrics() {
  const [hours, setHours] = useState('24')
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'count', desc: true })
  const { data, error, loading, reload } = useLoad(() => adminApi.requests(Number(hours)), [hours])

  const routes = useMemo(() => {
    const rows = [...(data?.routes ?? [])]
    rows.sort((a: RouteStats, b: RouteStats) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const c = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.desc ? -c : c
    })
    return rows
  }, [data, sort])

  const series = (pick: (s: NonNullable<typeof data>['series'][number]) => number) =>
    (data?.series ?? []).map(s => ({ key: s.at, ...bucketLabels(s.at, data!.unit), value: pick(s) }))
  const per = data?.unit === 'hour' ? 'hour' : 'day'

  return (
    <>
      <PageHeader title="API" subtitle="Every request the backend answered, except CORS preflights and this admin page.">
        <Segmented options={RANGES} value={hours} onChange={setHours} />
        <button type="button" className="chip" onClick={reload} aria-label="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </button>
      </PageHeader>

      {error && <div className="mb-4"><Notice>{error}</Notice></div>}

      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4">
            <StatTile label="Requests" value={fmtCompact(data.summary.total)} />
            <StatTile label="Server errors (5xx)" value={fmtPct(data.summary.serverErrors, data.summary.total)} note={`${fmtInt(data.summary.serverErrors)} requests`} />
            <StatTile label="Client errors (4xx)" value={fmtPct(data.summary.clientErrors, data.summary.total)} note={`${fmtInt(data.summary.clientErrors)} requests`} />
            <StatTile label="Median latency" value={fmtMs(data.summary.p50)} note="time to response headers" />
            <StatTile label="p95 latency" value={fmtMs(data.summary.p95)} note="1 in 20 requests is slower" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3 mb-4">
            <ColumnChart title={`Requests per ${per}`} points={series(s => s.requests)} format={fmtCompact} empty="No requests in this range" />
            <ColumnChart title={`Server errors per ${per}`} subtitle="5xx responses" points={series(s => s.serverErrors)} empty="No server errors" />
            <ColumnChart title={`p95 latency per ${per}`} points={series(s => s.p95)} format={fmtMs} empty="No requests in this range" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_260px] items-start">
            <Panel title="Endpoints" subtitle={routes.length === 100 ? 'The 100 busiest' : `${routes.length} endpoints`}>
              {routes.length === 0 ? (
                <p className="text-body-s text-t3">No requests in this range.</p>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-body-s min-w-[680px]">
                    <thead>
                      <tr className="border-b border-ln2">
                        {COLUMNS.map(c => {
                          const on = sort.key === c.key
                          return (
                            <th
                              key={c.key}
                              scope="col"
                              aria-sort={on ? (sort.desc ? 'descending' : 'ascending') : undefined}
                              className={cn('py-2 font-medium text-label-m', c.numeric ? 'text-right' : 'text-left')}
                            >
                              <button
                                type="button"
                                className={cn('inline-flex items-center gap-1 hover:text-t1', on ? 'text-t1' : 'text-t3')}
                                onClick={() => setSort(s => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.numeric }))}
                              >
                                {c.label}
                                {on && (sort.desc ? <ArrowDown size={12} aria-hidden /> : <ArrowUp size={12} aria-hidden />)}
                              </button>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {routes.map(r => (
                        <tr key={`${r.method} ${r.route}`} className="border-b border-ln last:border-0 hover:bg-s2">
                          <td className="py-2 pr-4">
                            <span className="badge bg-s3 text-t2 mr-2 w-14 justify-center">{r.method}</span>
                            <span className="text-mono-m text-t1 break-all">{r.route}</span>
                          </td>
                          <td className="py-2 text-right text-t1">{fmtInt(r.count)}</td>
                          <td className={cn('py-2 text-right', r.serverErrors ? 'text-red' : 'text-t4')}>{fmtInt(r.serverErrors)}</td>
                          <td className={cn('py-2 text-right', r.clientErrors ? 'text-gold' : 'text-t4')}>{fmtInt(r.clientErrors)}</td>
                          <td className="py-2 text-right text-t2">{fmtMs(r.p50)}</td>
                          <td className="py-2 text-right text-t2">{fmtMs(r.p95)}</td>
                          <td className="py-2 text-right text-t3">{fmtMs(r.max)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Status codes">
              {data.statuses.length === 0 ? (
                <p className="text-body-s text-t3">None yet.</p>
              ) : (
                <table className="w-full text-body-s tabular-nums">
                  <tbody>
                    {data.statuses.map(s => (
                      <tr key={s.status} className="border-b border-ln last:border-0">
                        <td className={cn('py-1.5 text-mono-m', statusTone(s.status))}>{s.status}</td>
                        <td className="py-1.5 text-right text-t1">{fmtInt(s.count)}</td>
                        <td className="py-1.5 text-right text-t3 w-14">{fmtPct(s.count, data.summary.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}
