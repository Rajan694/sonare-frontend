import React from 'react';
import { motion } from 'motion/react';
import Icon from '../ui/Icon';
import { Card } from '../ui/Card';
import { trackArtwork } from '../music/Artwork';
import { staggerItem, transition } from '../../lib/motion';
import { cn } from '../../lib/cn';
import { joinNames, useYouMayLike } from './useAi';
import type { Track } from '../../types';

interface YouMayLikeProps {
  /** Songs Home already shows (recently and most played), so they aren't suggested again. */
  exclude: readonly Track[];
  onPlay: (track: Track, queue: Track[]) => void;
  /** The phone layout's narrower cards and edge-to-edge shelf. */
  phone?: boolean;
}

/** Home's "You may like" shelf: songs the AI picked from the listening history. Nothing until found. */
export const YouMayLike = ({ exclude, onPlay, phone = false }: YouMayLikeProps) => {
  const found = useYouMayLike(exclude);
  if (!found) return null;
  const queue = found.songs.map((s) => s.track);

  return (
    <motion.section
      className={cn('flex flex-col', phone ? 'gap-3' : 'gap-3.5')}
      variants={staggerItem}
      transition={transition.normal}
      aria-label="You may like"
    >
      <div className="shead">
        <span className="flex flex-col gap-px min-w-0">
          <span className="inline-flex items-center gap-2 text-h2 text-t1 font-semibold">
            <Icon name="sparkles" size={18} className="text-acc flex-none" />
            You may like
          </span>
          {found.basedOn.length > 0 && (
            <span className="text-body-s text-t3 truncate">Based on {joinNames(found.basedOn)}</span>
          )}
        </span>
      </div>
      <div className={cn('flex overflow-x-auto no-scrollbar', phone ? 'gap-3 -mx-5 px-5' : 'gap-4 pb-2')}>
        {found.songs.map(({ track, reason }, i) => (
          <Card
            key={track.id}
            title={track.title}
            subtitle={reason ?? track.artist}
            width={phone ? 132 : 160}
            artVariant={`a${((i % 12) + 1) as 1}`}
            thumbnail={trackArtwork(track, phone ? 300 : 140)}
            onPlay={() => onPlay(track, queue)}
          />
        ))}
      </div>
    </motion.section>
  );
};
