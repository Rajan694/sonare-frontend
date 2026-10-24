import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '../components/ui/BrandMark';
import { CONTACT_EMAIL, SiteFooter } from '../components/landing/SiteFooter';

/**
 * sonare.vip/privacy in the web build: what Sonare stores and who else sees it. Keep it in step
 * with the backend (sonare-backend/src/db/schema.ts, services/telemetry.ts) when that changes.
 */

const UPDATED = '15 October 2026';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <section className="mt-10">
      <h2 className="text-h2 text-t1">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-body-l text-t2">{children}</div>
    </section>
  );
};

const List = ({ children }: { children: React.ReactNode }) => {
  return <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-t3">{children}</ul>;
};

const Strong = ({ children }: { children: React.ReactNode }) => {
  return <strong className="font-semibold text-t1">{children}</strong>;
};

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <a
      className="focus-visible:focusring rounded-xs text-acc underline-offset-2 hover:underline"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
};

const Privacy = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Privacy policy — Sonare';
    window.scrollTo(0, 0);
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-bg font-sans text-t1">
      <header className="sticky top-0 z-30 border-b border-ln/60 bg-bg/70 backdrop-blur-xl">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1180px] items-center gap-6 px-4 sm:px-6">
          <a href="/" className="focus-visible:focusring flex items-center gap-2.5 rounded-sm" aria-label="Sonare home">
            <BrandMark size={30} />
            <span className="text-[19px] font-bold tracking-[-0.01em]">Sonare</span>
          </a>
          <a
            href="/"
            className="focus-visible:focusring ml-auto inline-flex items-center gap-1.5 rounded-full bg-s3 px-4 py-2 text-label-l font-semibold text-t1 transition-colors hover:bg-s4"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Sonare
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-[760px] px-4 pb-24 pt-14 sm:px-6">
        <p className="text-overline uppercase tracking-[0.12em] text-acc">Privacy</p>
        <h1 className="mt-3 text-[34px] font-bold leading-[40px] tracking-[-0.02em] sm:text-[44px] sm:leading-[50px]">
          Privacy policy
        </h1>
        <p className="mt-3 text-body-m text-t3">Last updated {UPDATED}</p>

        <div className="mt-8 rounded-lg border border-ln/60 bg-s1 p-5 text-body-l text-t2">
          <Strong>The short version:</Strong> Sonare has no ads, no third-party analytics and no tracking cookies, and
          never sells or shares your data for marketing. You can use it without an account. With one, Sonare keeps only
          what it needs to sync your library, and you can delete all of it at any time.
        </div>

        <Section title="Without an account">
          <p>
            You can browse, search and play as a guest. Nothing on Sonare&apos;s server is linked to you; your settings,
            queue and downloads stay on your device.
          </p>
        </Section>

        <Section title="With an account">
          <p>When you sign up, Sonare stores:</p>
          <List>
            <li>
              <Strong>Your account:</Strong> email address, display name, and your password as a bcrypt hash (never the
              password itself), whether your email is verified, and when you signed up and last signed in.
            </li>
            <li>
              <Strong>Your library:</Strong> favourite songs and albums, followed artists, your playlists, and lyrics
              corrections you save.
            </li>
            <li>
              <Strong>Your listening:</Strong> play history (what you played, when, and for how long), your settings,
              and the player&apos;s queue and position, so you can carry on from another device.
            </li>
          </List>
          <p>
            This is used only to run Sonare for you: syncing your devices, and showing your recently and most played
            music.
          </p>
        </Section>

        <Section title="Music on your device">
          <p>
            Your music files never leave your device. If you&apos;re signed in, playing one adds it to your play history
            with its title and artist, like any other song.
          </p>
        </Section>

        <Section title="Logs and crash reports">
          <List>
            <li>
              Each request to Sonare&apos;s server is logged with its route, result, duration, which app made it, and
              your account if you&apos;re signed in. These logs feed a usage dashboard, store no IP addresses, and are
              deleted after 30 days.
            </li>
            <li>
              When something breaks, the apps send an error report: the error, technical details, and the app or browser
              version. Reports are deleted 90 days after the error last happened.
            </li>
            <li>
              Your IP address is used briefly to limit repeated requests (for example, guessing passwords), and
              isn&apos;t stored with your account.
            </li>
          </List>
        </Section>

        <Section title="Services Sonare uses">
          <List>
            <li>
              <Strong>Render</Strong> hosts the website and the server, and <Strong>Neon</Strong> hosts the database,
              both in Singapore. They may keep their own short-term access logs.
            </li>
            <li>
              <Strong>Resend</Strong> sends account emails (verification codes and password resets), so it receives your
              email address. Sonare sends no newsletters or marketing.
            </li>
            <li>
              <Strong>YouTube:</Strong> the desktop and Android apps fetch music from YouTube directly, so YouTube sees
              your IP address as with any visit. The web app, and the apps when that fails, go through Sonare&apos;s own
              server instead, and YouTube sees that server.
            </li>
            <li>
              <Strong>LRCLIB</Strong> provides lyrics. Sonare&apos;s server looks up the song&apos;s title and artist;
              nothing about you is sent.
            </li>
            <li>
              <Strong>GitHub</Strong> hosts the app downloads and the release list the apps check for updates.
            </li>
          </List>
        </Section>

        <Section title="On your device">
          <p>
            Sonare doesn&apos;t use cookies. The apps and the website keep your sign-in, settings, queue and downloads
            in local storage on your device. Signing out removes the sign-in.
          </p>
          <p>
            The app also stores a random install id (not linked to you, no personal data) so Sonare can count how many
            devices use it. It is never shared with third parties.
          </p>
        </Section>

        <Section title="Your choices">
          <List>
            <li>
              Change your display name or password, or <Strong>delete your account</Strong>, in Settings → Account
              (desktop and web) or on the Account screen (Android).
            </li>
            <li>
              Deleting your account immediately removes it and everything linked to it: library, playlists, history and
              settings. Log entries that mention it age out within 30 to 90 days, as above.
            </li>
            <li>
              To ask what Sonare holds about you, or for anything else, email{' '}
              <ExternalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</ExternalLink>.
            </li>
          </List>
        </Section>

        <Section title="Children">
          <p>Sonare isn&apos;t aimed at children under 13 and doesn&apos;t knowingly hold their data.</p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes, the new version goes on this page with a new date. Sonare is open source, so you can
            also check what it does in the{' '}
            <ExternalLink href="https://github.com/Rajan694/sonare">code on GitHub</ExternalLink>.
          </p>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Privacy;
