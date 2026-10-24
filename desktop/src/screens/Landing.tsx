import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { API_BASE } from '../api/server';
import type { AppRelease } from '../types';
import { BrandMark } from '../components/ui/BrandMark';
import { PhoneFrame, WindowFrame } from '../components/landing/Frames';
import { Showcase } from '../components/landing/Showcase';
import { DownloadSection } from '../components/landing/DownloadSection';
import { SiteFooter } from '../components/landing/SiteFooter';
import { useReveal, isReducedMotion } from '../components/landing/useReveal';
import { DOWNLOADS, detectOs, featuredDownload, latestDownloadUrl, releaseLabel } from '../lib/downloads';

/**
 * sonare.vip/ in the web build: what Sonare is, what it looks like, the downloads, and the
 * way into the web app (/home). The desktop window opens straight on Home instead.
 */

const TITLE = 'Sonare';
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

/** Fades and lifts its children in the first time they scroll into view (CSS). */
const Reveal = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const { ref, isVisible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      className={`landing-reveal ${isVisible ? 'visible' : ''} ${className}`}
    >
      {children}
    </div>
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

/** The logo's bars, bouncing like a level meter (CSS keyframes). */
const LevelBars = () => {
  return (
    <span className="flex h-[14px] items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`landing-bar landing-bar-${i} w-[3px] origin-bottom rounded-full bg-acc`}
          style={{ height: '100%' }}
        />
      ))}
    </span>
  );
};

const Landing = () => {
  const heroRef = useRef<HTMLElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [releases, setReleases] = useState<AppRelease[] | null>(null);
  const os = useMemo(() => detectOs(navigator as Navigator & { userAgentData?: { platform?: string } }), []);
  const featured = featuredDownload(os);

  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // The header and hero links jump to #features / #screenshots / #download: glide there instead.
  // Scoped to this page so the app's own scroll restoration stays instant.
  useEffect(() => {
    if (isReducedMotion()) return;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'smooth';
    return () => {
      root.style.scrollBehavior = previous;
    };
  }, []);

  // Version and size labels only: the buttons work without them.
  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/releases`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { items?: AppRelease[] }) => {
        if (live && Array.isArray(data.items)) {
          setReleases(data.items);
        }
      })
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
          <a href="/" className="focus-visible:focusring flex items-center gap-2.5 rounded-sm" aria-label="Sonare home">
            <BrandMark size={30} />
            <span className="text-[19px] font-bold tracking-[-0.01em]">Sonare</span>
          </a>
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
          <a
            href="/home"
            className="focus-visible:focusring ml-auto inline-flex items-center gap-1.5 rounded-full bg-s3 px-4 py-2 text-label-l font-semibold text-t1 transition-colors hover:bg-s4 md:ml-0"
          >
            Open web app
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section ref={heroRef} className={`relative isolate ${heroVisible ? '' : 'landing-anim-paused'}`}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,rgba(0,226,138,0.20),rgba(0,226,138,0)_70%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_10%,black,transparent)]"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
            <div className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-ln2 bg-s1/80 px-4 py-1.5 text-label-m text-t2">
              <LevelBars />
              Free on Android, Linux, Windows and the web
            </div>

            <h1 className="mx-auto mt-6 max-w-[860px] text-[42px] font-bold leading-[1.04] tracking-[-0.035em] sm:text-[64px] lg:text-[76px]">
              All your music.
              <span className="block bg-[linear-gradient(100deg,#00e28a_10%,#7dffc8_55%,#00c074_90%)] bg-clip-text pb-[0.08em] text-transparent">
                Every screen.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-[620px] text-[17px] leading-[27px] text-t2 sm:text-[19px] sm:leading-[30px]">
              Sonare plays the YouTube Music catalogue with synced lyrics, offline downloads and an equalizer, and keeps
              your favourites and playlists with you on your phone, your computer and in the browser.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {featured ? (
                <>
                  <a className={primaryBtn} href={latestDownloadUrl(DOWNLOADS[featured].file)} download>
                    <Download size={19} aria-hidden="true" />
                    Download for {OS_NAMES[os as keyof typeof OS_NAMES]}
                  </a>
                  <a className={outlineBtn} href="/home">
                    Open in your browser
                  </a>
                </>
              ) : (
                <>
                  <a className={primaryBtn} href="/home">
                    Start listening
                    <ArrowRight size={19} aria-hidden="true" />
                  </a>
                  <a className={outlineBtn} href="#download">
                    Get the apps
                  </a>
                </>
              )}
            </div>
            <p className="mt-4 h-4 font-mono text-mono-s text-t3">
              {featured && featuredLabel
                ? `${DOWNLOADS[featured].file.replace(/^sonare-/, '')} · ${featuredLabel}`
                : ''}
            </p>
          </div>

          {/* The desktop window with the phone in front of it */}
          <div className="relative mx-auto max-w-[1080px] px-4 pb-24 sm:px-10">
            <div
              className="pointer-events-none absolute inset-x-[10%] top-[18%] -z-10 h-[60%] rounded-full bg-acc/20 blur-[90px]"
              aria-hidden="true"
            />
            <WindowFrame
              src="/landing/linux-home.webp"
              alt="Sonare on Linux: Home with the sidebar, search and trending songs"
              eager
              priority
              className="mr-[14%] sm:mr-[18%]"
            />
            <div className="landing-float-device absolute bottom-10 right-4 w-[30%] max-w-[250px] sm:right-10">
              <PhoneFrame
                src="/landing/android-nowplaying.webp"
                alt="Sonare on Android: Now Playing with the waveform and controls"
                eager
              />
            </div>
          </div>
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

      <SiteFooter />
    </div>
  );
};

export default Landing;
