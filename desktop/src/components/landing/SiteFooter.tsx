import { Bug, Mail, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../ui/BrandMark';
import { REPO_PAGE } from '../../lib/downloads';

/**
 * Where people reach the project (the privacy page uses it too). Resend receives mail for
 * sonare.vip (its MX record); it shows up under Emails → Receiving in the Resend dashboard.
 */
export const CONTACT_EMAIL = 'contact@sonare.vip';
export const ISSUES_URL = `${REPO_PAGE}/issues/new`;

/** The open-source projects Sonare is built on, credited in the footer. */
const CREDITS = [
  { name: 'Piped', href: 'https://github.com/TeamPiped/Piped' },
  { name: 'NewPipeExtractor', href: 'https://github.com/TeamNewPipe/NewPipeExtractor' },
  { name: 'youtubei.js', href: 'https://github.com/LuanRT/YouTube.js' },
  { name: 'LRCLIB', href: 'https://lrclib.net' },
  { name: 'NeutralinoJS', href: 'https://neutralino.js.org' },
  { name: 'React Native', href: 'https://reactnative.dev' },
  { name: 'Lucide', href: 'https://lucide.dev' },
] as const;

/** GitHub's mark (lucide has no brand icons). */
const GitHubMark = ({ size = 18 }: { size?: number }) => {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
};

const linkClass =
  'focus-visible:focusring inline-flex items-center gap-2 rounded-xs text-label-l text-t2 transition-colors hover:text-t1';
const creditClass =
  'focus-visible:focusring rounded-xs underline-offset-2 transition-colors hover:text-t2 hover:underline';

/** The footer of the intro page and the privacy page (web build only). */
export const SiteFooter = () => {
  return (
    <footer className="border-t border-ln/60 bg-s0">
      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span className="text-title-m font-semibold">Sonare</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:ml-auto">
            <a className={linkClass} href={`mailto:${CONTACT_EMAIL}`} title={CONTACT_EMAIL}>
              <Mail size={18} aria-hidden="true" />
              Contact
            </a>
            <a className={linkClass} href={ISSUES_URL} target="_blank" rel="noreferrer">
              <Bug size={18} aria-hidden="true" />
              Report a bug
            </a>
            <a className={linkClass} href="/privacy">
              <ShieldCheck size={18} aria-hidden="true" />
              Privacy
            </a>
            <a className={linkClass} href={REPO_PAGE} target="_blank" rel="noreferrer">
              <GitHubMark />
              GitHub
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-ln/40 pt-6 text-body-s text-t3">
          <p>
            Built on{' '}
            {CREDITS.map((credit, i) => (
              <span key={credit.name}>
                <a className={creditClass} href={credit.href} target="_blank" rel="noreferrer">
                  {credit.name}
                </a>
                {i < CREDITS.length - 2 ? ', ' : i === CREDITS.length - 2 ? ' and ' : '.'}
              </span>
            ))}{' '}
            Tray icon by{' '}
            <a className={creditClass} href="https://www.flaticon.com" target="_blank" rel="noreferrer">
              Freepik from Flaticon
            </a>
            .
          </p>
          <p>© {new Date().getFullYear()} Sonare · MIT licence. Not affiliated with YouTube or Google.</p>
        </div>
      </div>
    </footer>
  );
};
