import React, { useRef, useState } from 'react';
import { Download, FileUp, RefreshCw, Trash2, X } from 'lucide-react';
import Button from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';
import type { ReleasePlatform } from '../types';
import { adminApi, releaseDownloadUrl, type AdminRelease } from './api';
import { fmtDateTime, fmtInt, timeAgo } from './format';
import { useLoad } from './useLoad';
import { Notice } from './components/Notice';
import { PageHeader } from './components/PageHeader';
import { Panel } from './components/Panel';
import { TextInput } from './components/TextInput';

const PLATFORMS: { id: ReleasePlatform; label: string }[] = [
  { id: 'android', label: 'Android' },
  { id: 'linux', label: 'Linux' },
  { id: 'windows', label: 'Windows' },
];

// Until the list loads; the server's own list (accepts) wins after that.
const DEFAULT_ACCEPTS: Record<ReleasePlatform, string[]> = {
  android: ['.apk'],
  linux: ['.AppImage', '.deb', '.rpm', '.tar.gz', '.zip'],
  windows: ['.exe', '.msi', '.zip'],
};

/**
 * `sonare-1.2.0-linux-x64.tar.gz` → `1.2.0` and `sonare_1.2.0~dev_amd64.deb` → `1.2.0-dev`
 * (../buildFE.sh's names), so the usual case needs no typing.
 */
const versionFromName = (name: string): string => {
  const m = /(\d+\.\d+(?:\.\d+)?)(?:[-~]((?:dev|alpha|beta|rc)[0-9.]*))?/i.exec(name);
  return m ? (m[2] ? `${m[1]}-${m[2]}` : m[1]) : '';
};

/** The platform a file is obviously for, to save a click. */
const platformFromName = (name: string): ReleasePlatform | null => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.apk')) return 'android';
  if (/\.(exe|msi)$/.test(lower) || /win/.test(lower)) return 'windows';
  if (/\.(appimage|deb|rpm|tar\.gz)$/.test(lower) || /linux/.test(lower)) return 'linux';
  return null;
};

const Releases = () => {
  const { data, setData, error, loading, reload } = useLoad(() => adminApi.releases(), []);
  const [actionError, setActionError] = useState<string | null>(null);

  const accepts = data?.accepts ?? DEFAULT_ACCEPTS;
  const items = data?.items ?? [];
  // What GET /releases hands out: the newest upload of each platform and format.
  const offered = new Set<string>();
  const seen = new Set<string>();
  for (const r of [...items].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))) {
    const key = `${r.platform}/${r.format}`;
    if (!seen.has(key)) {
      seen.add(key);
      offered.add(r.id);
    }
  }

  const onUploaded = (r: AdminRelease) => {
    setData((d) => d && { ...d, items: [r, ...d.items.filter((x) => x.id !== r.id)] });
  };

  const remove = async (r: AdminRelease) => {
    const live = offered.has(r.id) ? ' People will get the previous upload of this type instead, if there is one.' : '';
    if (!window.confirm(`Delete ${r.fileName} (${r.version})?${live}`)) return;
    setActionError(null);
    try {
      await adminApi.deleteRelease(r.id);
      setData((d) => d && { ...d, items: d.items.filter((x) => x.id !== r.id) });
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Releases"
        subtitle="App builds offered under Settings → About on the web. People get the newest upload of each platform and file type."
      >
        <button type="button" className="chip" onClick={reload} aria-label="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </button>
      </PageHeader>

      {(error || actionError) && (
        <div className="mb-4">
          <Notice>{error ?? actionError}</Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">
        <UploadForm accepts={accepts} onUploaded={onUploaded} />

        <div className={cn('flex flex-col gap-4 min-w-0', loading && data && 'opacity-60 transition-opacity')}>
          {PLATFORMS.map((p) => {
            const rows = items.filter((r) => r.platform === p.id);
            return (
              <Panel
                key={p.id}
                title={p.label}
                subtitle={rows.length ? `${rows.length} build${rows.length === 1 ? '' : 's'}` : undefined}
              >
                {rows.length === 0 ? (
                  <p className="text-body-s text-t3">
                    {data ? `No ${p.label} build yet, so About doesn't offer one.` : 'Loading…'}
                  </p>
                ) : (
                  <ul className="-my-2">
                    {rows.map((r) => (
                      <ReleaseRow key={r.id} r={r} offered={offered.has(r.id)} onDelete={() => remove(r)} />
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>
      </div>
    </>
  );
};
export default Releases;

const ReleaseRow = ({ r, offered, onDelete }: { r: AdminRelease; offered: boolean; onDelete: () => void }) => {
  return (
    <li className="flex items-center gap-3 py-3 border-b border-ln last:border-0">
      <span className="badge bg-s3 text-t2 flex-none uppercase">{r.format}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-label-l text-t1 truncate" title={r.fileName}>
            {r.fileName}
          </span>
          {offered && <span className="badge bg-accbg text-acc flex-none">Offered</span>}
        </span>
        <span className="block text-label-m text-t3 mt-0.5 truncate">
          {[
            `v${r.version}`,
            formatBytes(r.sizeBytes),
            `${fmtInt(r.downloads)} download${r.downloads === 1 ? '' : 's'}`,
            r.notes,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span className="text-label-s text-t3 flex-none hidden sm:block" title={fmtDateTime(r.uploadedAt)}>
        {timeAgo(r.uploadedAt)}
      </span>
      <a
        href={releaseDownloadUrl(r.id)}
        className="ib ib-32 flex-none"
        aria-label={`Download ${r.fileName}`}
        data-tip="Download"
      >
        <Download size={15} aria-hidden />
      </a>
      <button type="button" className="ib ib-32 flex-none" onClick={onDelete} aria-label="Delete" data-tip="Delete">
        <Trash2 size={15} aria-hidden />
      </button>
    </li>
  );
};

const UploadForm = ({
  accepts,
  onUploaded,
}: {
  accepts: Record<ReleasePlatform, string[]>;
  onUploaded: (r: AdminRelease) => void;
}) => {
  const [platform, setPlatform] = useState<ReleasePlatform>('android');
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const types = accepts[platform];
  const uploading = progress !== null;
  const wrongType = file && !types.some((ext) => file.name.toLowerCase().endsWith(ext.toLowerCase()));

  const pick = (f: File | null) => {
    setFile(f);
    setError(null);
    setDone(null);
    if (!f) return;
    const guess = platformFromName(f.name);
    if (guess) setPlatform(guess);
    const v = versionFromName(f.name);
    if (v) setVersion(v);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || wrongType || !version.trim()) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setDone(null);
    setProgress(0);
    try {
      const r = await adminApi.uploadRelease(
        { platform, version: version.trim(), notes: notes.trim() || undefined, file },
        setProgress,
        controller.signal,
      );
      onUploaded(r);
      setDone(`${r.fileName} is up as ${PLATFORMS.find((p) => p.id === r.platform)?.label} v${r.version}.`);
      setFile(null);
      setNotes('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message);
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  return (
    <Panel title="Upload a build" subtitle="Uploading the same version and file type again replaces it.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Segmented
          options={PLATFORMS}
          value={platform}
          onChange={(id) => !uploading && setPlatform(id as ReleasePlatform)}
          className="self-start"
        />

        <label
          className={cn(
            'flex flex-col items-center justify-center gap-2 text-center rounded-lg border border-dashed px-4 py-6 cursor-pointer transition-colors',
            dragging ? 'border-acc bg-accbg' : 'border-ln2 bg-s0 hover:border-ln3',
            uploading && 'pointer-events-none opacity-60',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files[0] ?? null);
          }}
        >
          <FileUp size={22} className="text-t3" aria-hidden />
          {file ? (
            <>
              <span className="text-label-l text-t1 break-all">{file.name}</span>
              <span className="text-label-m text-t3">{formatBytes(file.size)} · click to choose another</span>
            </>
          ) : (
            <>
              <span className="text-label-l text-t1">Drop a file or click to choose</span>
              <span className="text-label-m text-t3">{types.join(', ')}</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            // Browsers only match the last extension, so .tar.gz is offered as .gz.
            accept={types.map((ext) => (ext === '.tar.gz' ? '.gz' : ext)).join(',')}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            disabled={uploading}
          />
        </label>
        {wrongType && (
          <Notice tone="warn">
            A {PLATFORMS.find((p) => p.id === platform)?.label} build must be {types.join(', ')}.
          </Notice>
        )}

        <TextInput
          label="Version"
          placeholder="1.2.0"
          required
          spellCheck={false}
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          disabled={uploading}
        />
        <TextInput
          label="Notes (optional)"
          placeholder="What changed"
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={uploading}
          hint="Shown next to the download in About."
        />

        {uploading && (
          <div className="flex items-center gap-3" role="status" aria-label="Upload progress">
            <div className="h-1.5 flex-1 rounded-full bg-s3 overflow-hidden">
              <div className="h-full bg-acc transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="text-label-m text-t2 tabular-nums w-10 text-right">{Math.round(progress * 100)}%</span>
          </div>
        )}
        {error && <Notice>{error}</Notice>}
        {done && (
          <p role="status" className="text-body-s text-acc">
            {done}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" variant="acc" disabled={uploading || !file || !!wrongType || !version.trim()}>
            {uploading ? (progress < 1 ? 'Uploading…' : 'Saving…') : 'Upload'}
          </Button>
          {uploading && (
            <Button type="button" variant="ghost" onClick={() => abortRef.current?.abort()}>
              <X size={15} aria-hidden /> Cancel
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
};
