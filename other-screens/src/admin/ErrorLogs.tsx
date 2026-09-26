import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Search, Trash2 } from 'lucide-react'
import { Segmented } from '../components/ui/Segmented'
import { cn } from '../lib/utils'
import { adminApi, type ErrorFilter, type ErrorLog, type ErrorSource } from './api'
import { fmtDateTime, fmtInt, Notice, PageHeader, Panel, timeAgo, useLoad } from './ui'

const SOURCE_NAMES: Record<ErrorSource, string> = {
  backend: 'Backend',
  web: 'Web',
  linux: 'Linux',
  mobile: 'Mobile',
}
const PAGE = 50

export default function ErrorLogs() {
  const [source, setSource] = useState<'all' | ErrorSource>('all')
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [more, setMore] = useState<ErrorLog[]>([])

  // Search as you type, once typing pauses.
  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const filter: ErrorFilter = { source: source === 'all' ? undefined : source, q: q || undefined }
  const { data, setData, error, loading, reload } = useLoad(() => adminApi.errors(filter), [source, q])
  // Rows from "Show more" belong to the list they were loaded under.
  useEffect(() => setMore([]), [source, q])
  const refresh = () => {
    setMore([])
    reload()
  }

  const items = [...(data?.items ?? []), ...more]
  const counts = new Map((data?.bySource ?? []).map(s => [s.source, s.groups]))
  const allGroups = (data?.bySource ?? []).reduce((n, s) => n + s.groups, 0)
  const sourceOptions = [
    { id: 'all', label: `All ${allGroups}` },
    ...(Object.keys(SOURCE_NAMES) as ErrorSource[]).map(s => ({ id: s, label: `${SOURCE_NAMES[s]} ${counts.get(s) ?? 0}` })),
  ]

  async function remove(e: ErrorLog) {
    setActionError(null)
    try {
      await adminApi.deleteError(e.id)
      setMore(m => m.filter(x => x.id !== e.id))
      setData(d => d && { ...d, items: d.items.filter(x => x.id !== e.id), total: d.total - 1 })
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  async function clearMatching() {
    const n = data?.total ?? 0
    const from = source === 'all' ? '' : ` from ${SOURCE_NAMES[source]}`
    const matching = q ? ` matching "${q}"` : ''
    if (!window.confirm(`Delete ${n} error group${n === 1 ? '' : 's'}${from}${matching}? This can't be undone.`)) return
    setActionError(null)
    try {
      await adminApi.clearErrors(filter)
      refresh()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  async function loadMore() {
    try {
      const page = await adminApi.errors(filter, items.length, PAGE)
      setMore(m => [...m, ...page.items])
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="Errors"
        subtitle="Backend 5xx errors and crash reports from the apps. Repeats of one error are counted on one row; kept 90 days after they were last seen."
      >
        <button type="button" className="chip" onClick={refresh} aria-label="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Segmented options={sourceOptions} value={source} onChange={id => setSource(id as 'all' | ErrorSource)} />
        <label className="field h-9 w-full sm:w-72">
          <Search size={15} className="text-t3 flex-none" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages"
            aria-label="Search error messages"
            className="border-0 bg-transparent outline-0 text-t1 text-body-s w-full p-0 placeholder:text-t3"
          />
        </label>
        <button type="button" className="chip ml-auto" onClick={clearMatching} disabled={!data?.total}>
          <Trash2 size={14} aria-hidden /> Clear {source === 'all' && !q ? 'all' : 'these'}
        </button>
      </div>

      {(error || actionError) && <div className="mb-4"><Notice>{error ?? actionError}</Notice></div>}

      {data && (
        <Panel className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {items.length === 0 ? (
            <p className="text-body-s text-t3 py-6 text-center">
              {q || source !== 'all' ? 'No errors match.' : 'No errors logged.'}
            </p>
          ) : (
            <ul className="-my-2">
              {items.map(e => (
                <ErrorRow key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(o => (o === e.id ? null : e.id))} onDelete={() => remove(e)} />
              ))}
            </ul>
          )}
          {items.length < data.total && (
            <div className="pt-4 text-center">
              <button type="button" className="chip" onClick={loadMore}>
                Show more ({fmtInt(data.total - items.length)} left)
              </button>
            </div>
          )}
        </Panel>
      )}
    </>
  )
}

function ErrorRow({ e, open, onToggle, onDelete }: { e: ErrorLog; open: boolean; onToggle: () => void; onDelete: () => void }) {
  const where = [e.method, e.route].filter(Boolean).join(' ')
  const page = typeof e.context?.page === 'string' ? e.context.page : null
  const context = Object.entries(e.context ?? {}).filter(([, v]) => v !== null && v !== '')

  return (
    <li className="border-b border-ln last:border-0">
      <div className="flex items-start gap-3 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-start gap-3 min-w-0 flex-1 text-left"
        >
          {open ? <ChevronDown size={16} className="text-t3 mt-0.5 flex-none" aria-hidden /> : <ChevronRight size={16} className="text-t3 mt-0.5 flex-none" aria-hidden />}
          <span className={cn('badge flex-none mt-px', e.source === 'backend' ? 'bg-s3 text-t2' : 'bg-accbg text-acc')}>{SOURCE_NAMES[e.source]}</span>
          <span className="min-w-0 flex-1">
            <span className={cn('block text-mono-m text-t1 break-words', !open && 'line-clamp-2')}>{e.message}</span>
            <span className="block text-label-m text-t3 mt-1 truncate">
              {[where || page, e.status && `HTTP ${e.status}`, e.code].filter(Boolean).join(' · ') || 'No request context'}
            </span>
          </span>
        </button>
        <div className="flex-none text-right">
          <div className="text-label-l text-t1 tabular-nums">×{fmtInt(e.count)}</div>
          <div className="text-label-s text-t3" title={fmtDateTime(e.lastSeenAt)}>{timeAgo(e.lastSeenAt)}</div>
        </div>
        <button type="button" className="ib ib-32 flex-none" onClick={onDelete} aria-label="Delete this error" data-tip="Delete">
          <Trash2 size={15} aria-hidden />
        </button>
      </div>

      {open && (
        <div className="pb-4 pl-7 flex flex-col gap-3">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-body-s">
            <dt className="text-t3">First seen</dt><dd className="text-t2">{fmtDateTime(e.firstSeenAt)}</dd>
            <dt className="text-t3">Last seen</dt><dd className="text-t2">{fmtDateTime(e.lastSeenAt)}</dd>
            {e.userId && (<><dt className="text-t3">Account</dt><dd className="text-mono-s text-t2 break-all">{e.userId}</dd></>)}
            {e.userAgent && (<><dt className="text-t3">User agent</dt><dd className="text-t2 break-all">{e.userAgent}</dd></>)}
            {context.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-t3">{k}</dt>
                <dd className="text-mono-s text-t2 break-all">{typeof v === 'string' ? v : JSON.stringify(v)}</dd>
              </React.Fragment>
            ))}
          </dl>
          {e.stack ? (
            <pre className="text-mono-s text-t2 bg-s0 border border-ln rounded-md p-3 overflow-x-auto max-h-80 whitespace-pre">{e.stack}</pre>
          ) : (
            <p className="text-label-m text-t3">No stack trace was sent.</p>
          )}
        </div>
      )}
    </li>
  )
}
