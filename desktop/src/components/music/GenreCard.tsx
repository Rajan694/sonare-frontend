import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

type ArtVariant = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9' | 'a10' | 'a11' | 'a12';

export interface Genre {
  id: string;
  name: string;
  /** What opening the card searches for (GET /genres); the name when missing. */
  query?: string;
}

/** Shown until GET /genres answers (or when it can't). Matches the server's list. */
export const DEFAULT_GENRES: Genre[] = [
  { id: 'popular', name: 'Popular', query: 'popular hindi songs' },
  { id: 'top-this-year', name: 'Top this year', query: `top songs ${new Date().getFullYear()}` },
  { id: 'bollywood', name: 'Bollywood', query: 'bollywood hits' },
  { id: 'punjabi', name: 'Punjabi', query: 'punjabi songs' },
  { id: 'bhojpuri', name: 'Bhojpuri', query: 'bhojpuri songs' },
  { id: 'devotional', name: 'Devotional', query: 'devotional bhajan songs' },
  { id: 'party', name: 'Party', query: 'party songs' },
  { id: 'romantic', name: 'Romantic', query: 'romantic songs' },
  { id: 'sad', name: 'Sad', query: 'sad songs' },
  { id: 'lofi', name: 'Lo-fi', query: 'lofi songs' },
  { id: 'workout', name: 'Workout', query: 'workout songs' },
  { id: 'ghazal', name: 'Ghazal', query: 'ghazal' },
];

export function genreQuery(g: Genre): string {
  return g.query || g.name;
}

/** Genres have no cover art, so the whole card carries the generated gradient (`.gcard`). */

export function genreVariant(i: number): ArtVariant {
  return `a${(i % 12) + 1}` as ArtVariant;
}

const cardClass = 'gcard art art-rings no-underline border-0 cursor-pointer text-left hover:brightness-110';

export function GenreCard({
  name,
  variant,
  to,
  onClick,
}: {
  name: string;
  variant: ArtVariant;
  to?: string;
  onClick?: () => void;
}) {
  const label = <span className="text-title-l text-t1 font-semibold relative z-[1]">{name}</span>;
  return to ? (
    <Link to={to} className={cn(cardClass, variant)}>
      {label}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cn(cardClass, variant)}>
      {label}
    </button>
  );
}
