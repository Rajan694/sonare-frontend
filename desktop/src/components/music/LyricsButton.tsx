import { Link } from 'react-router-dom';
import { useLyricsAvailability } from '../../api/lyricsAvailability';
import { cn } from '../../lib/cn';
import Icon from '../ui/Icon';
import type { Track } from '../../types';

export const LYRICS_UNAVAILABLE = "Lyrics aren't available for this song right now";

/**
 * The Lyrics button of the player bar and Now Playing. A song whose lyrics can't be found (no
 * lyrics, or the lyrics site down) gets a disabled button whose tooltip says so; while that's
 * unknown the button works.
 */
const LyricsButton = ({
  track,
  className,
  iconSize,
}: {
  track: Track | null | undefined;
  className: string;
  iconSize: number;
}) => {
  const unavailable = useLyricsAvailability(track) === 'unavailable';
  if (unavailable) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label="Lyrics"
        tabIndex={0}
        data-tip={LYRICS_UNAVAILABLE}
        className={cn(className, 'opacity-40 cursor-not-allowed')}
      >
        <Icon name="lyrics" size={iconSize} />
      </span>
    );
  }
  return (
    <Link to="/lyrics" className={className} aria-label="Lyrics" data-tip="Lyrics">
      <Icon name="lyrics" size={iconSize} />
    </Link>
  );
};

export default LyricsButton;
