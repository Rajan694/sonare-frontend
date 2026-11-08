import { IconButton } from '../ui/Button';
import { usePlayerStore } from '../../store/playerContext';
import { getPlaybackPosition } from '../../store/playbackPosition';
import { useDevicePrefs } from '../../storage/devicePrefs';
import { seekTarget } from '../../../../shared/player/seek';

interface SeekButtonProps {
  direction: 'back' | 'forward';
  size?: 28 | 32 | 40 | 44;
  className?: string;
}

/** Rewind or fast-forward by the step set in Settings → Playback; nothing when that is Off. */
const SeekButton = ({ direction, size = 32, className }: SeekButtonProps) => {
  const { seek, durationMs, currentTrack } = usePlayerStore();
  const { seekStep } = useDevicePrefs();
  if (!seekStep) return null;
  const back = direction === 'back';
  return (
    <IconButton
      icon={back ? 'rewind' : 'fast-forward'}
      label={`${back ? 'Back' : 'Forward'} ${seekStep} seconds`}
      size={size}
      onClick={() =>
        seek(
          seekTarget(
            getPlaybackPosition(),
            (back ? -seekStep : seekStep) * 1000,
            durationMs || currentTrack?.durationMs || 0,
          ),
        )
      }
      className={className}
    />
  );
};

export default SeekButton;
