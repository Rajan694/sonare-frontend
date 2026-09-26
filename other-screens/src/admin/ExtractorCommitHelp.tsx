import React, { useState } from 'react'
import { Check, ChevronDown, ChevronRight, Copy, ExternalLink, HelpCircle } from 'lucide-react'

const REPO = 'https://github.com/TeamNewPipe/NewPipeExtractor'
const LATEST_COMMAND = `git ls-remote ${REPO} refs/heads/dev`

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-acc hover:underline">
      {children}
      <ExternalLink size={12} aria-hidden />
    </a>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-none w-6 h-6 rounded-full bg-s4 text-t1 text-label-m flex items-center justify-center" aria-hidden>{n}</span>
      <div className="min-w-0 pt-0.5">
        <div className="text-label-l text-t1">{title}</div>
        <div className="text-body-s text-t2 mt-0.5">{children}</div>
      </div>
    </li>
  )
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 bg-s0 border border-ln rounded-md pl-3 pr-1 py-1 mt-2">
      <code className="text-mono-s text-t1 flex-1 min-w-0 overflow-x-auto whitespace-nowrap no-scrollbar">{command}</code>
      <button
        type="button"
        className="ib ib-28 flex-none"
        aria-label={copied ? 'Copied' : 'Copy command'}
        data-tip={copied ? 'Copied' : 'Copy'}
        onClick={() => {
          navigator.clipboard?.writeText(command).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }, () => {})
        }}
      >
        {copied ? <Check size={14} className="text-acc" aria-hidden /> : <Copy size={14} aria-hidden />}
      </button>
    </div>
  )
}

/** How to find a NewPipeExtractor commit hash for the piped.extractorCommit setting. */
export default function ExtractorCommitHelp({ current }: { current: string | null }) {
  const [open, setOpen] = useState(false)
  const pinned = current && /^[0-9a-f]{7,40}$/.test(current) ? current : null

  return (
    <div className="bg-s2 border border-ln rounded-md">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-label-l text-t1 hover:text-acc"
      >
        <HelpCircle size={16} className="text-acc flex-none" aria-hidden />
        <span className="flex-1">Where do I get this hash?</span>
        {open ? <ChevronDown size={16} className="text-t3" aria-hidden /> : <ChevronRight size={16} className="text-t3" aria-hidden />}
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-ln pt-4">
          <p className="text-body-s text-t2">
            Piped reads YouTube through <Link href={REPO}>NewPipeExtractor</Link>. When YouTube changes something and
            search, playlists or playback stop working, the fix usually lands on NewPipeExtractor's{' '}
            <code className="text-mono-s text-t1">dev</code> branch first. Pinning a newer commit here is how Sonare
            picks that fix up.
          </p>

          <p className="text-body-s text-t2">
            The quickest way: <span className="text-t1">Fill in latest</span> puts the newest commit on dev in the
            field for you. To choose a commit yourself:
          </p>

          <ol className="flex flex-col gap-3.5">
            <Step n={1} title="Open the list of commits">
              <Link href={`${REPO}/commits/dev`}>NewPipeExtractor commits on dev</Link> - newest first.
              {pinned && (
                <>
                  {' '}To see what changed since the commit Piped has now, open{' '}
                  <Link href={`${REPO}/compare/${pinned}...dev`}>{pinned.slice(0, 8)}…dev</Link>.
                </>
              )}
            </Step>
            <Step n={2} title="Pick a commit">
              Usually the newest one. Prefer a commit with a green check mark (its tests passed). If you are after a
              particular fix, look for its message, for example <span className="text-t1">[YouTube] Fix …</span>.
            </Step>
            <Step n={3} title="Copy the full hash">
              Click the copy button next to the commit's short hash. It copies all 40 characters, like{' '}
              <code className="text-mono-s text-t1 break-all">13a655fe53e0c3065f88725fc1fb594c3ede0169</code>. The
              7-character short hash is not accepted.
            </Step>
            <Step n={4} title="Paste it above and save">
              Sonare checks with GitHub that the commit exists before saving it.
            </Step>
            <Step n={5} title="Apply it">
              Run <code className="text-mono-s text-t1">./runPiped.sh</code> in{' '}
              <code className="text-mono-s text-t1">sonare-piped-backend</code>. It writes the hash into build.gradle
              and rebuilds Piped, which takes a few minutes. If that build fails, Piped keeps running the previous
              build and the script says so: pick an older commit, or click <span className="text-t1">Use default</span>.
            </Step>
          </ol>

          <div className="border-t border-ln pt-4 flex flex-col gap-3">
            <div className="text-label-l text-t1">Other ways to get a hash</div>
            <div className="text-body-s text-t2">
              <span className="text-t1">A stable release.</span> On{' '}
              <Link href={`${REPO}/releases`}>NewPipeExtractor releases</Link>, click the short commit hash under a
              release's tag and copy the full hash from that page. Safer, but releases can be weeks behind the latest
              YouTube fixes.
            </div>
            <div className="text-body-s text-t2">
              <span className="text-t1">From a terminal.</span> This prints the newest commit on dev; the hash is the
              first thing on the line.
              <CopyCommand command={LATEST_COMMAND} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
