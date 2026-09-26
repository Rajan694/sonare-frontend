import React, { useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import { cn } from '../lib/utils'
import { adminApi, AdminApiError, type Setting } from './api'
import { fmtDateTime, Notice, PageHeader, Panel, useLoad } from './ui'

export default function Configuration() {
  const { data, setData, error } = useLoad(() => adminApi.config(), [])

  const replace = (s: Setting) =>
    setData(d => d && { settings: d.settings.map(x => (x.key === s.key ? s : x)) })

  return (
    <>
      <PageHeader
        title="Configuration"
        subtitle="System-wide settings, stored in the system_configuration table. Leave one empty to use its default."
      />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      <div className="flex flex-col gap-4 max-w-3xl">
        {data?.settings.map(s => <SettingCard key={s.key} setting={s} onSaved={replace} />)}
        {data && (
          <p className="text-body-s text-t3">
            Settings marked <span className="text-gold">Next Piped deploy</span> are read by Piped only when it is built
            and started. <code className="text-mono-s text-t2">sonare-piped-backend/runPiped.sh</code> (and{' '}
            <code className="text-mono-s text-t2">installPiped.sh</code>) copies them into build.gradle and
            config.properties before it starts; a new extractor commit makes it rebuild the Piped image, which takes a
            few minutes.
          </p>
        )}
      </div>
    </>
  )
}

function SettingCard({ setting: s, onSaved }: { setting: Setting; onSaved: (s: Setting) => void }) {
  const [draft, setDraft] = useState(s.value ?? '')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<{ message: string; canForce: boolean } | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => setDraft(s.value ?? ''), [s.value])

  const next = draft.trim() === '' ? null : draft.trim()
  const dirty = next !== s.value
  const live = s.applies === 'live'

  async function save(value: string | null, force = false) {
    setSaving(true)
    setProblem(null)
    setSaved(false)
    try {
      onSaved(await adminApi.saveSetting(s.key, value, force))
      setSaved(true)
    } catch (e) {
      const err = e as AdminApiError
      setProblem({ message: err.message, canForce: err.code === 'CHECK_FAILED' })
    } finally {
      setSaving(false)
    }
  }

  let inUse: React.ReactNode
  if (s.effective) {
    inUse = live
      ? (s.value ? 'saved here' : `from ${s.fallbackSource}`)
      : `in ${s.fallbackSource.replace(/^.* in /, '')}`
  } else {
    inUse = live ? 'not set' : 'config.properties not found - run ./installPiped.sh'
  }

  return (
    <Panel>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (dirty) void save(next)
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-title-m text-t1">{s.label}</h2>
            <code className="text-mono-s text-t3">{s.key}</code>
          </div>
          <span className={cn('badge', live ? 'bg-accbg text-acc' : 'bg-goldbg text-gold')}>
            {live ? 'Applies now' : 'Next Piped deploy'}
          </span>
        </div>
        {s.description && <p className="text-body-s text-t2 -mt-2">{s.description}</p>}

        <div className="text-body-s flex flex-wrap gap-x-2 gap-y-1 items-baseline">
          <span className="text-t3">{live ? 'In use:' : 'Piped has:'}</span>
          {s.effective && <code className="text-mono-m text-t1 break-all">{s.effective}</code>}
          <span className="text-t3">({inUse})</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="text-label-l text-t2">Value</span>
            <input
              value={draft}
              onChange={e => {
                setDraft(e.target.value)
                setProblem(null)
                setSaved(false)
              }}
              placeholder={s.fallback ?? ''}
              spellCheck={false}
              autoComplete="off"
              className="h-11 px-4 bg-s2 border border-ln2 rounded-md text-t1 text-mono-m outline-none focus:border-acc placeholder:text-t4"
            />
          </label>
          <div className="flex gap-2 flex-none">
            <Button type="submit" variant="acc" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</Button>
            {s.value !== null && (
              <Button type="button" variant="out" disabled={saving} onClick={() => void save(null)}>Use default</Button>
            )}
          </div>
        </div>

        {problem && (
          <Notice>
            {problem.message}
            {problem.canForce && (
              <>
                {' '}
                <button type="button" className="underline font-semibold" onClick={() => void save(next, true)}>
                  Save anyway
                </button>
              </>
            )}
          </Notice>
        )}
        {s.pending && (
          <Notice tone="warn">
            Saved, not applied yet: {s.fallbackSource.replace(/^.* in /, '')} still has{' '}
            <code className="text-mono-s">{s.effective ?? 'nothing'}</code>. It takes effect the next time{' '}
            <code className="text-mono-s">./runPiped.sh</code> runs.
          </Notice>
        )}
        {saved && !s.pending && !problem && (
          <p role="status" className="text-label-m text-acc">
            {live ? 'Saved. The backend is using it now.' : s.value === null ? 'Saved. Piped keeps its current value.' : 'Saved.'}
          </p>
        )}

        <p className="text-label-s text-t4">
          {s.updatedBy === 'migration' || !s.updatedBy
            ? 'Not changed since setup'
            : `Last changed ${fmtDateTime(s.updatedAt)} by ${s.updatedBy}`}
        </p>
      </form>
    </Panel>
  )
}
