import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Download,
  FolderOpen,
  HardDriveDownload,
  AudioLines,
  Languages,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../api/api';
import type { AppRelease } from '../types';
import { BrandMark } from '../components/ui/BrandMark';
import { PhoneFrame, WindowFrame } from '../components/landing/Frames';
import { Showcase } from '../components/landing/Showcase';
import { DownloadSection } from '../components/landing/DownloadSection';
import { DOWNLOADS, REPO_PAGE, detectOs, featuredDownload, latestDownloadUrl, releaseLabel } from '../lib/downloads';

/**
 * sonare.vip/ in the web build: what Sonare is, what it looks like, the downloads, and the
 * way into the web app (/home). The desktop window opens straight on Home instead.
 */

const TITLE = 'Sonare — music player for Android, Linux, Windows and the web';
const DESCRIPTION =
  'Sonare plays the YouTube Music catalogue with synced lyrics, offline downloads, an equalizer and your library on every device. Free for Android, Linux, Windows and the web.';

const OS_NAMES = { android: 'Android', linux: 'Linux', windows: 'Windows' } as const;

/** Green features stream from the server; gold ones live on the device (design rule). */
const FEATURES = [
  {
    icon: Languages,
    title: 'Lyrics that follow along',
    body: 'Line-by-line synced lyrics, in the script you read: Devanagari, Gurmukhi or Latin.',
    tone: 'acc',
  },
  {
    icon: HardDriveDownload,
    title: 'Offline downloads',
    body: 'Save songs to your device and keep listening with no connection at all.',
    tone: 'gold',
  },
  {
    icon: RefreshCw,
    title: 'Your library everywhere',
    body: 'Favourites, playlists and history follow your free account across phone, desktop and web.',
    tone: 'acc',
  },
  {
    icon: SlidersHorizontal,
    title: '8-band equalizer',
    body: 'Start from a preset or shape your own sound, applied right in the player.',
    tone: 'acc',
  },
  {
    icon: FolderOpen,
    title: 'Your own music too',
    body: 'On Android, Linux and Windows, play the music already on your device next to the catalogue.',
    tone: 'gold',
  },
  {
    icon: AudioLines,
    title: 'Gapless and crossfade',
    body: 'Albums play without a gap, and songs can fade into each other over six seconds.',
    tone: 'acc',
  },
] as const;

const primaryBtn =
  'focus-visible:focusring inline-flex items-center justify-center gap-2 rounded-full bg-acc px-6 py-3.5 text-title-m font-semibold text-tinv shadow-glow transition-colors hover:bg-acc2 active:bg-acc3';
const outlineBtn =
  'focus-visible:focusring inline-flex items-center justify-center gap-2 rounded-full border border-ln3 bg-bg/40 px-6 py-3.5 text-title-m font-semibold text-t1 backdrop-blur transition-colors hover:border-t3 hover:bg-s3';

/** GitHub's mark (lucide has no brand icons). */
const GitHubMark = ({ size = 18 }: { size?: number }) => {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
};

/** Fades and lifts its children in the first time they scroll into view. */
const Reveal = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
};

const SectionHeading = ({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) => {
  return (
    <Reveal className="mx-auto max-w-[760px] text-center">
      <p className="text-overline uppercase tracking-[0.12em] text-acc">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-bold leading-[36px] tracking-[-0.02em] text-t1 sm:text-[40px] sm:leading-[46px]">
        {title}
      </h2>
      <p className="mt-4 text-body-l text-t2">{body}</p>
    </Reveal>
  );
};

/** The logo's bars, bouncing like a level meter. */
const LevelBars = () => {
  const reduce = useReducedMotion();
  const bars = [
    [0.35, 0.8, 0.5],
    [0.7, 0.3, 0.9],
    [1, 0.55, 0.75],
    [0.6, 0.95, 0.4],
    [0.4, 0.65, 0.3],
  ];
  return (
    <span className="flex h-[14px] items-end gap-[2px]" aria-hidden="true">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-acc"
          style={{ height: '100%', scaleY: h[0] }}
          animate={reduce ? undefined : { scaleY: h }}
          transition={{ duration: 0.9, repeat: Infinity, repeatType: 'mirror', delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
};

const Landing = () => {
  const reduce = useReducedMotion();
  const [releases, setReleases] = useState<AppRelease[] | null>(null);
  const os = useMemo(() => detectOs(navigator as Navigator & { userAgentData?: { platform?: string } }), []);
  const featured = featuredDownload(os);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = TITLE;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const previousDescription = meta.content;
    meta.content = DESCRIPTION;
    return () => {
      document.title = previousTitle;
      if (created) meta.remove();
      else meta.content = previousDescription;
    };
  }, []);

  // Version and size labels only: the buttons work without them.
  useEffect(() => {
    let live = true;
    api
      .getReleases()
      .then(({ items }) => live && setReleases(items))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const featuredLabel = featured ? releaseLabel(releases, DOWNLOADS[featured]) : null;

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-bg font-sans text-t1">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ln/60 bg-bg/70 backdrop-blur-xl">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1180px] items-center gap-6 px-4 sm:px-6">
          <Link
            to="/"
            className="focus-visible:focusring flex items-center gap-2.5 rounded-sm"
            aria-label="Sonare home"
          >
            <BrandMark size={30} />
            <span className="text-[19px] font-bold tracking-[-0.01em]">Sonare</span>
          </Link>
          <div className="ml-auto hidden items-center gap-7 text-label-l text-t2 md:flex">
            <a className="focus-visible:focusring rounded-xs transition-colors hover:text-t1" href="#features">
              Features
            </a>
            <a className="focus-visible:focusring rounded-xs transition-colors hover:text-t1" href="#screenshots">
              Screenshots
            </a>
            <a className="focus-visible:focusring rounded-xs transition-colors hover:text-t1" href="#download">
              Download
            </a>
          </div>
          <Link
            to="/home"
            className="focus-visible:focusring ml-auto inline-flex items-center gap-1.5 rounded-full bg-s3 px-4 py-2 text-label-l font-semibold text-t1 transition-colors hover:bg-s4 md:ml-0"
          >
            Open web app
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,rgba(0,226,138,0.20),rgba(0,226,138,0)_70%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_10%,black,transparent)]"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-ln2 bg-s1/80 px-4 py-1.5 text-label-m text-t2"
            >
              <LevelBars />
              Free on Android, Linux, Windows and the web
            </motion.div>

            <motion.h1
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mx-auto mt-6 max-w-[860px] text-[42px] font-bold leading-[1.04] tracking-[-0.035em] sm:text-[64px] lg:text-[76px]"
            >
              All your music.
              <span className="block bg-[linear-gradient(100deg,#00e28a_10%,#7dffc8_55%,#00c074_90%)] bg-clip-text pb-[0.08em] text-transparent">
                Every screen.
              </span>
            </motion.h1>

            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mx-auto mt-6 max-w-[620px] text-[17px] leading-[27px] text-t2 sm:text-[19px] sm:leading-[30px]"
            >
              Sonare plays the YouTube Music catalogue with synced lyrics, offline downloads and an equalizer, and keeps
              your favourites and playlists with you on your phone, your computer and in the browser.
            </motion.p>

            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              {featured ? (
                <>
                  <a className={primaryBtn} href={latestDownloadUrl(DOWNLOADS[featured].file)} download>
                    <Download size={19} aria-hidden="true" />
                    Download for {OS_NAMES[os as keyof typeof OS_NAMES]}
                  </a>
                  <Link className={outlineBtn} to="/home">
                    Open in your browser
                  </Link>
                </>
              ) : (
                <>
                  <Link className={primaryBtn} to="/home">
                    Start listening
                    <ArrowRight size={19} aria-hidden="true" />
                  </Link>
                  <a className={outlineBtn} href="#download">
                    Get the apps
                  </a>
                </>
              )}
            </motion.div>
            <p className="mt-4 h-4 font-mono text-mono-s text-t3">
              {featured && featuredLabel
                ? `${DOWNLOADS[featured].file.replace(/^sonare-/, '')} · ${featuredLabel}`
                : ''}
            </p>
          </div>

          {/* The desktop window with the phone in front of it */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0, 0, 0.2, 1] }}
            className="relative mx-auto max-w-[1080px] px-4 pb-24 sm:px-10"
          >
            <div
              className="pointer-events-none absolute inset-x-[10%] top-[18%] -z-10 h-[60%] rounded-full bg-acc/20 blur-[90px]"
              aria-hidden="true"
            />
            <WindowFrame
              src="/landing/linux-home.webp"
              alt="Sonare on Linux: Home with the sidebar, search and trending songs"
              eager
              className="mr-[14%] sm:mr-[18%]"
            />
            <motion.div
              className="absolute bottom-10 right-4 w-[30%] max-w-[250px] sm:right-10"
              animate={reduce ? undefined : { y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PhoneFrame
                src="/landing/android-nowplaying.webp"
                alt="Sonare on Android: Now Playing with the waveform and controls"
                eager
              />
            </motion.div>
          </motion.div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-ln/60 py-24">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
            <SectionHeading
              eyebrow="Features"
              title="Made for listening, not for scrolling"
              body="The catalogue you know, with the things a music player should do well."
            />
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 0.08}>
                  <article className="group h-full rounded-xl border border-ln2 bg-s1 p-6 transition-colors hover:border-ln3 hover:bg-s2">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-md ${
                        f.tone === 'gold' ? 'bg-goldbg text-gold' : 'bg-accbg text-acc'
                      }`}
                      aria-hidden="true"
                    >
                      <f.icon size={22} />
                    </span>
                    <h3 className="mt-5 text-title-l text-t1">{f.title}</h3>
                    <p className="mt-2 text-body-m text-t2">{f.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Screenshots */}
        <section id="screenshots" className="scroll-mt-20 border-t border-ln/60 bg-s0 py-24">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
            <SectionHeading
              eyebrow="Screenshots"
              title="One look, on every device"
              body="The same player on your phone and your desktop: pick up where you left off on either."
            />
            <Reveal className="mt-12">
              <Showcase />
            </Reveal>
          </div>
        </section>

        {/* Downloads */}
        <section id="download" className="scroll-mt-20 border-t border-ln/60 py-24">
          <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
            <SectionHeading
              eyebrow="Download"
              title="Get Sonare"
              body="Free, with no ads and no account needed to start. Sign up when you want your library on every device."
            />
            <Reveal className="mt-12">
              <DownloadSection releases={releases} os={os} />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-ln/60 bg-s0">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span className="text-title-m font-semibold">Sonare</span>
          </div>
          <p className="text-body-s text-t3 sm:ml-6">
            © {new Date().getFullYear()} Sonare · MIT licence. Not affiliated with YouTube or Google.
          </p>
          <a
            className="focus-visible:focusring inline-flex items-center gap-2 rounded-xs text-label-l text-t2 transition-colors hover:text-t1 sm:ml-auto"
            href={REPO_PAGE}
            target="_blank"
            rel="noreferrer"
          >
            <GitHubMark />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
