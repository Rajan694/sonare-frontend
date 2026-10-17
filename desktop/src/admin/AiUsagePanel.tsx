import React from 'react';
import { adminApi, type AiFeature, type AiUsageTotals } from './api';
import { bucketLabels, fmtCompact, fmtInt } from './format';
import { useLoad } from './useLoad';
import { ColumnChart } from './components/ColumnChart';
import { Notice } from './components/Notice';
import { Panel } from './components/Panel';
import { StatTile } from './components/StatTile';

const FEATURE_NAMES: Record<AiFeature, string> = {
  'you-may-like': 'You may like',
  search: 'AI search',
  playlist: 'AI playlists',
  titles: 'Title cleanup',
  health: 'Health checks',
};

const UsageTable = ({ rows }: { rows: (AiUsageTotals & { key: string; label: string })[] }) => (
  <table className="w-full text-body-s tabular-nums">
    <thead>
      <tr className="border-b border-ln text-label-m text-t3">
        <th scope="col" className="py-2 text-left font-medium" />
        <th scope="col" className="py-2 text-right font-medium">
          Calls
        </th>
        <th scope="col" className="py-2 text-right font-medium">
          Failed
        </th>
        <th scope="col" className="py-2 text-right font-medium">
          Tokens in
        </th>
        <th scope="col" className="py-2 text-right font-medium">
          Tokens out
        </th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r) => (
        <tr key={r.key} className="border-b border-ln last:border-0">
          <td className="py-1.5 pr-3 text-t1">{r.label}</td>
          <td className="py-1.5 text-right text-t1">{fmtInt(r.calls)}</td>
          <td className={r.failures ? 'py-1.5 text-right text-red' : 'py-1.5 text-right text-t4'}>
            {fmtInt(r.failures)}
          </td>
          <td className="py-1.5 text-right text-t2">{fmtCompact(r.promptTokens)}</td>
          <td className="py-1.5 text-right text-t2">{fmtCompact(r.completionTokens)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** The analytics page's AI section: calls and tokens in and out, following its date range. */
export const AiUsagePanel = ({ days }: { days: number }) => {
  const { data, error } = useLoad(() => adminApi.aiUsage(days), [days]);

  if (error) return <Notice>AI usage didn't load: {error}</Notice>;
  if (!data) return null;

  const series = (pick: (d: AiUsageTotals) => number) =>
    data.series.map((d) => ({ key: d.day, ...bucketLabels(d.day, 'day'), value: pick(d) }));
  const t = data.totals;

  return (
    <section className="flex flex-col gap-4" aria-label="AI usage">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-title-m text-t1">AI usage</h2>
        <span className="text-label-m text-t3">By UTC day. Health checks count too.</span>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile label="AI calls" value={fmtCompact(t.calls)} note={`in ${data.days} days`} />
        <StatTile label="Failed calls" value={fmtCompact(t.failures)} note="rate limits, quotas, outages" />
        <StatTile label="Tokens in" value={fmtCompact(t.promptTokens)} note="prompts sent" />
        <StatTile label="Tokens out" value={fmtCompact(t.completionTokens)} note="answers received" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ColumnChart
          title="Tokens in per day"
          points={series((d) => d.promptTokens)}
          format={fmtCompact}
          empty="No AI calls yet"
        />
        <ColumnChart
          title="Tokens out per day"
          points={series((d) => d.completionTokens)}
          format={fmtCompact}
          empty="No AI calls yet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="By provider">
          {data.byProvider.length ? (
            <UsageTable rows={data.byProvider.map((p) => ({ ...p, key: p.providerId, label: p.name }))} />
          ) : (
            <p className="text-body-s text-t3">No AI calls in this range.</p>
          )}
        </Panel>
        <Panel title="By feature">
          {data.byFeature.length ? (
            <UsageTable
              rows={data.byFeature.map((f) => ({ ...f, key: f.feature, label: FEATURE_NAMES[f.feature] ?? f.feature }))}
            />
          ) : (
            <p className="text-body-s text-t3">No AI calls in this range.</p>
          )}
        </Panel>
      </div>
    </section>
  );
};
