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

export const genreQuery = (g: Genre): string => {
  return g.query || g.name;
};

/**
 * A photo per genre id (shared/assets/genres, sources in its CREDITS.md). Genres without one -
 * the server can add more - keep the generated gradient across the whole card (`.gcard`).
 */
const GENRE_PHOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../../../shared/assets/genres/*.webp', { eager: true, import: 'default' }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.webp'.length), url]),
);

export const genreVariant = (i: number): ArtVariant => {
  return `a${(i % 12) + 1}` as ArtVariant;
};

const cardClass = 'gcard art art-rings no-underline border-0 cursor-pointer text-left hover:brightness-110';
const photoCardClass = 'gcard group no-underline border-0 cursor-pointer text-left';
// Darkens the photo towards the label so white text reads on any of them.
const photoShade = { background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.12) 75%)' };

export const GenreCard = ({
  id,
  name,
  variant,
  to,
  onClick,
}: {
  /** The genre id, which picks its photo. */
  id?: string;
  name: string;
  variant: ArtVariant;
  to?: string;
  onClick?: () => void;
}) => {
  const photo = id ? GENRE_PHOTOS[id] : undefined;
  const content = (
    <>
      {photo && (
        <>
          <img
            src={photo}
            alt=""
            loading="lazy"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute inset-0" style={photoShade} />
        </>
      )}
      <span className="text-title-l text-t1 font-semibold relative z-[1]">{name}</span>
    </>
  );
  // The variant's gradient stays underneath a photo, showing while it loads.
  const className = cn(photo ? photoCardClass : cardClass, variant);
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
};
