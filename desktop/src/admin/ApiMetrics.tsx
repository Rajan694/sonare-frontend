import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { Segmented } from '../components/ui/Segmented';
import { cn } from '../lib/cn';
import { adminApi, type RouteStats } from './api';
import { bucketLabels, fmtCompact, fmtInt, fmtMs, fmtPct } from './format';
import { useLoad } from './useLoad';
import { ColumnChart } from './components/ColumnChart';
import { Notice } from './components/Notice';
import { PageHeader } from './components/PageHeader';
import { Panel } from './components/Panel';
import { StatTile } from './components/StatTile';

const RANGES = [
  { id: '1', label: '1 hour' },
  { id: '24', label: '24 hours' },
  { id: '168', label: '7 days' },
  { id: '720', label: '30 days' },
];

type SortKey = 'method' | 'route' | 'count' | 'avg' | 'p95' | 'clientErrors' | 'serverErrors';

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'method', label: 'Method', numeric: false },
  { key: 'route', label: 'Route', numeric: false },
  { key: 'count', label: 'Calls', numeric: true },
  { key: 'avg', label: 'Avg ms', numeric: true },
  { key: 'p95', label: 'p95', numeric: true },
  { key: 'clientErrors', label: '4xx', numeric: true },
  { key: 'serverErrors', label: '5xx', numeric: true },
];

const statusClassTone = (cls: string) => {
  if (cls.startsWith('5')) return 'text-red';
  if (cls.startsWith('4')) return 'text-gold';
  if (cls.startsWith('3')) return 'text-t2';
  return 'text-acc';
};

const ApiMetrics = () => {
  const [hours, setHours] = useState('24');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'count', desc: true });
  const { data, error, loading, reload } = useLoad(() => adminApi.requests(Number(hours)), [hours]);

  const topRoutes = useMemo(() => {
    const rows = [...(data?.routes ?? [])].slice(0, 15);
    rows.sort((a: RouteStats, b: RouteStats) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const c = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sort.desc ? -c : c;
    });
    return rows;
  }, [data, sort]);

  const series = (pick: (s: NonNullable<typeof data>['series'][number]) => number) =>
    (data?.series ?? []).map((s) => ({ key: s.at, ...bucketLabels(s.at, data!.unit), value: pick(s) }));
  const per = data?.unit === 'hour' ? 'hour' : 'day';

  return (
    <>
      <PageHeader
        title="API"
        subtitle="Every request the backend answered, except CORS preflights and this admin page."
      >
        <Segmented options={RANGES} value={hours} onChange={setHours} />
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
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4">
            <StatTile label="Requests" value={fmtCompact(data.summary.total)} />
            <StatTile
              label="Server errors (5xx)"
              value={fmtPct(data.summary.serverErrors, data.summary.total)}
              note={`${fmtInt(data.summary.serverErrors)} requests`}
            />
            <StatTile
              label="Client errors (4xx)"
              value={fmtPct(data.summary.clientErrors, data.summary.total)}
              note={`${fmtInt(data.summary.clientErrors)} requests`}
            />
            <StatTile label="Median latency" value={fmtMs(data.summary.p50)} note="time to response headers" />
            <StatTile label="p95 latency" value={fmtMs(data.summary.p95)} note="1 in 20 requests is slower" />
          </div>

          <Panel title="Most used APIs" subtitle="Top 15 routes by request volume in this range." className="mb-4">
            {topRoutes.length === 0 ? (
              <p className="text-body-s text-t3">No requests in this range.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-body-s min-w-[680px]">
                  <thead>
                    <tr className="border-b border-ln2">
                      {COLUMNS.map((c) => {
                        const on = sort.key === c.key;
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
                              onClick={() =>
                                setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.numeric }))
                              }
                            >
                              {c.label}
                              {on &&
                                (sort.desc ? <ArrowDown size={12} aria-hidden /> : <ArrowUp size={12} aria-hidden />)}
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {topRoutes.map((r) => (
                      <tr key={`${r.method} ${r.route}`} className="border-b border-ln last:border-0 hover:bg-s2">
                        <td className="py-2 pr-4 text-left">
                          <span className="badge bg-s3 text-t2 w-14 justify-center">{r.method}</span>
                        </td>
                        <td className="py-2 pr-4 text-left">
                          <span className="text-mono-m text-t1 break-all">{r.route}</span>
                        </td>
                        <td className="py-2 text-right text-t1 font-medium">{fmtInt(r.count)}</td>
                        <td className="py-2 text-right text-t2">{fmtMs(r.avg)}</td>
                        <td className="py-2 text-right text-t2">{fmtMs(r.p95)}</td>
                        <td className={cn('py-2 text-right', r.clientErrors ? 'text-gold' : 'text-t4')}>
                          {fmtInt(r.clientErrors)}
                        </td>
                        <td className={cn('py-2 text-right', r.serverErrors ? 'text-red' : 'text-t4')}>
                          {fmtInt(r.serverErrors)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-3 mb-4">
            <ColumnChart
              title={`Requests per ${per}`}
              points={series((s) => s.requests)}
              format={fmtCompact}
              empty="No requests in this range"
            />
            <ColumnChart
              title={`Server errors per ${per}`}
              subtitle="5xx responses"
              points={series((s) => s.serverErrors)}
              empty="No server errors"
            />
            <ColumnChart
              title={`p95 latency per ${per}`}
              points={series((s) => s.p95)}
              format={fmtMs}
              empty="No requests in this range"
            />
          </div>

          <div className="max-w-md mb-6">
            <Panel title="Status classes" subtitle="HTTP response status codes grouped by class.">
              {data.statusClasses.length === 0 ? (
                <p className="text-body-s text-t3">None yet.</p>
              ) : (
                <table className="w-full text-body-s tabular-nums">
                  <thead>
                    <tr className="border-b border-ln2 text-label-m text-t3">
                      <th scope="col" className="py-2 text-left font-medium">
                        Class
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Requests
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.statusClasses.map((s) => (
                      <tr key={s.class} className="border-b border-ln last:border-0">
                        <td className={cn('py-1.5 text-mono-m font-semibold', statusClassTone(s.class))}>{s.class}</td>
                        <td className="py-1.5 text-right text-t1">{fmtInt(s.count)}</td>
                        <td className="py-1.5 text-right text-t3 w-16">{fmtPct(s.count, data.summary.total)}</td>
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
  );
};
export default ApiMetrics;
