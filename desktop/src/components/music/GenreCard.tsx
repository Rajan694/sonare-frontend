import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

type ArtVariant = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9' | 'a10' | 'a11' | 'a12';

/** Genres have no cover art, so the whole card carries the generated gradient (`.gcard`). */
export const DEFAULT_GENRES = ['Ambient', 'Electronica', 'Post-rock', 'Indie', 'Jazz', 'Classical', 'Hip-hop', 'Folk'];

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
