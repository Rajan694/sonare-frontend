import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Globe, Monitor, Smartphone, Terminal } from 'lucide-react';
import type { AppRelease } from '../../types';
import {
  DOWNLOADS,
  LINUX_DOWNLOADS,
  RELEASES_PAGE,
  latestDownloadUrl,
  releaseLabel,
  type DownloadKey,
  type VisitorOs,
} from '../../lib/downloads';

const primaryBtn =
  'focus-visible:focusring inline-flex items-center justify-center gap-2 rounded-full bg-acc px-5 py-3 text-label-l font-semibold text-tinv shadow-glow transition-colors hover:bg-acc2 active:bg-acc3';
const outlineBtn =
  'focus-visible:focusring inline-flex items-center justify-center gap-2 rounded-full border border-ln3 px-5 py-3 text-label-l font-semibold text-t1 transition-colors hover:border-t3 hover:bg-s3';

const Meta = ({ releases, k }: { releases: AppRelease[] | null; k: DownloadKey }) => {
  const label = releaseLabel(releases, DOWNLOADS[k]);
  return label ? <span className="mt-1 block font-mono text-mono-s text-t3">{label}</span> : null;
};

const Card = ({
  icon: CardIcon,
  title,
  subtitle,
  featured,
  children,
}: {
  icon: typeof Smartphone;
  title: string;
  subtitle: string;
  featured: boolean;
  children: React.ReactNode;
}) => {
  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-6 transition-colors ${
        featured
          ? 'border-acc/50 bg-[linear-gradient(180deg,rgba(0,226,138,0.08),rgba(0,226,138,0)_60%)]'
          : 'border-ln2 bg-s1'
      }`}
    >
      {featured && (
        <span className="absolute right-5 top-5 rounded-full bg-accbg2 px-2.5 py-1 text-overline uppercase text-acc">
          Best for you
        </span>
      )}
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-s3 text-acc" aria-hidden="true">
        <CardIcon size={22} />
      </span>
      <h3 className="mt-5 text-h2 text-t1">{title}</h3>
      <p className="mt-1 text-body-m text-t2">{subtitle}</p>
      <div className="mt-6 flex flex-1 flex-col justify-end gap-3">{children}</div>
    </article>
  );
};

/** Android, Linux (three formats), Windows and the web app, the visitor's own first. */
export const DownloadSection = ({ releases, os }: { releases: AppRelease[] | null; os: VisitorOs }) => {
  const cards: { key: VisitorOs | 'web'; node: React.ReactNode }[] = [
    {
      key: 'android',
      node: (
        <Card icon={Smartphone} title="Android" subtitle={DOWNLOADS.apk.hint} featured={os === 'android'}>
          <a className={primaryBtn} href={latestDownloadUrl(DOWNLOADS.apk.file)} download>
            <Download size={18} aria-hidden="true" />
            {DOWNLOADS.apk.label}
          </a>
          <Meta releases={releases} k="apk" />
        </Card>
      ),
    },
    {
      key: 'linux',
      node: (
        <Card
          icon={Terminal}
          title="Linux"
          subtitle="64-bit. Needs GTK 3 and WebKitGTK, which most desktops already have."
          featured={os === 'linux'}
        >
          <ul className="flex flex-col gap-2">
            {LINUX_DOWNLOADS.map((k, i) => (
              <li key={k}>
                <a
                  className={`focus-visible:focusring group flex items-center gap-3 rounded-md border px-4 py-3 transition-colors ${
                    i === 0 ? 'border-acc/40 bg-accbg hover:bg-accbg2' : 'border-ln2 hover:border-ln3 hover:bg-s3'
                  }`}
                  href={latestDownloadUrl(DOWNLOADS[k].file)}
                  download
                >
                  <Download size={18} className={i === 0 ? 'text-acc' : 'text-t2'} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-title-m text-t1">{DOWNLOADS[k].label}</span>
                      {i === 0 && <span className="text-overline uppercase text-acc">Recommended</span>}
                    </span>
                    <span className="block text-body-s text-t2">{DOWNLOADS[k].hint}</span>
                    <Meta releases={releases} k={k} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ),
    },
    {
      key: 'windows',
      node: (
        <Card icon={Monitor} title="Windows" subtitle={DOWNLOADS.exe.hint} featured={os === 'windows'}>
          <a className={primaryBtn} href={latestDownloadUrl(DOWNLOADS.exe.file)} download>
            <Download size={18} aria-hidden="true" />
            {DOWNLOADS.exe.label}
          </a>
          <Meta releases={releases} k="exe" />
        </Card>
      ),
    },
    {
      key: 'web',
      node: (
        <Card
          icon={Globe}
          title="Web"
          subtitle="Nothing to install. Runs in Chrome, Firefox, Edge and Safari."
          featured={os === 'other'}
        >
          <Link className={os === 'other' ? primaryBtn : outlineBtn} to="/home">
            Open in your browser
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </Card>
      ),
    },
  ];
  // The visitor's platform first; the rest keep their order.
  const ordered = [
    ...cards.filter((c) => c.key === os || (os === 'other' && c.key === 'web')),
    ...cards.filter((c) => !(c.key === os || (os === 'other' && c.key === 'web'))),
  ];

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {ordered.map((c) => (
          <React.Fragment key={c.key}>{c.node}</React.Fragment>
        ))}
      </div>
      <p className="mt-8 text-center text-body-m text-t2">
        Every build is also on{' '}
        <a
          className="focus-visible:focusring rounded-xs text-acc underline-offset-4 hover:underline"
          href={RELEASES_PAGE}
          target="_blank"
          rel="noreferrer"
        >
          GitHub Releases
        </a>
        , with its checksum and release notes.
      </p>
    </div>
  );
};
