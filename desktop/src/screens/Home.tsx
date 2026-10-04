import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CAPS } from '../lib/caps';
import { useModeStore } from '../store/modeContext';
import { usePlayerStore } from '../store/playerContext';
import { useTrending, useRecentlyPlayed, useAuth } from '../api/hooks';
import { loadErrorMessage } from '../api/api';
import { useLocalLibrary, resolveLocalRefs } from '../storage/local';
import Icon from '../components/ui/Icon';
import SongRow, { SongTableHeader } from '../components/music/SongRow';
import { trackArtwork } from '../components/music/Artwork';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tile } from '../components/ui/Tile';
import { EmptyState } from '../components/ui/EmptyState';
import { staggerContainer, staggerItem, transition } from '../lib/motion';
import { useLayout } from '../lib/layout';
import { usePlaybackPosition } from '../store/playbackPosition';
import { formatDuration } from '../lib/format';
import Artwork from '../components/music/Artwork';
import { cn } from '../lib/cn';
import type { Track } from '../types';

export default function Home() {
  const { mode, setMode } = useModeStore();
  const isOnline = mode === 'online';
  const { currentTrack, playTrack, isPlaying, togglePlay } = usePlayerStore();
  const { user } = useAuth();
  const layout = useLayout();

  const {
    data: trendingData,
    loading: trendingLoading,
    error: trendingError,
    refetch: refetchTrending,
  } = useTrending('IN', 20);
  const [allTrending, setAllTrending] = useState(false);
  const [allRecent, setAllRecent] = useState(false);
  const { data: recentData, error: recentError, refetch: refetchRecent } = useRecentlyPlayed(allRecent ? 50 : 10);

  const local = useLocalLibrary();
  const trendingTracks = isOnline ? trendingData?.items || [] : local.tracks;

  const hasRealRecent = !!(recentData?.items && recentData.items.length > 0);
  const recentTracks = !isOnline
    ? local.tracks.slice(6, 26)
    : hasRealRecent
      ? resolveLocalRefs(recentData.items, local).filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i)
      : [];

  const trendingFailed = isOnline && !!trendingError && trendingTracks.length === 0;
  // Signed in, online, the request failed and there is nothing from an earlier load to show.
  const recentFailed = isOnline && !!user && !!recentError && recentTracks.length === 0;

  const retry = () => {
    refetchTrending();
    refetchRecent();
  };
  const retryButton = (
    <Button variant="out" size="sm" icon="sync" onClick={retry}>
      Try again
    </Button>
  );

  const tiles = trendingTracks.slice(0, 6).map((t, i) => ({
    title: t.title,
    subtitle: t.artist,
    artVariant: `a${(i % 12) + 1}` as const,
    to: t.albumId ? `/album/${t.albumId}` : undefined,
    track: t,
  }));

  const trendingCards = trendingTracks.slice(0, allTrending ? undefined : 10).map((t, i) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    artVariant: `a${((i + 6) % 12) + 1}` as const,
    to: t.albumId ? `/album/${t.albumId}` : undefined,
    track: t,
  }));

  const handlePlay = (track: Track, queue: Track[]) => {
    playTrack(track, queue);
  };

  // Greeting based on real user or generic
  const userName = user?.displayName || user?.email?.split('@')[0] || '';
  const greeting = isOnline ? (userName ? `Welcome back, ${userName}` : 'Welcome back') : 'Your device library';

  // Phones get the M01 / M02 composition rather than the desktop one squeezed down.
  if (layout === 'phone') {
    return (
      <PhoneHome
        isOnline={isOnline}
        userName={user ? userName.split(' ')[0] : null}
        trending={trendingTracks}
        trendingLoading={trendingLoading}
        trendingFailed={trendingFailed}
        recent={recentTracks}
        localCount={local.tracks.length}
        onPlay={handlePlay}
        retry={retryButton}
        trendingError={trendingError}
      />
    );
  }

  return (
    <motion.div
      className="@container flex flex-col gap-7 p-4 @[480px]:p-8 pb-8 overflow-auto h-full"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header row */}
      <motion.div
        className="flex flex-col @[480px]:flex-row @[480px]:items-center justify-between gap-4"
        variants={staggerItem}
        transition={transition.normal}
      >
        <div className="flex flex-col gap-1">
          {isOnline ? (
            <span className="text-body-s text-t3">Online mode · Connected to Sonare API</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-label-s text-gold font-semibold uppercase">
              <span className="w-2 h-2 rounded-full bg-gold" />
              <span>OFFLINE MODE</span>
            </span>
          )}
          <span className="text-display-m text-t1 font-semibold">{greeting}</span>
          {!isOnline && local.tracks.length > 0 && (
            <span className="text-body-m text-t2">{local.tracks.length.toLocaleString()} songs on this device</span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {!isOnline && CAPS.localLibrary && (
            <Link to="/folders" className="btn btn-out">
              <Icon name="folder" size={16} />
              <span>Scan folders</span>
            </Link>
          )}
          {currentTrack ? (
            <Button variant={isOnline ? 'acc' : 'gold'} icon={isPlaying ? 'pause' : 'play'} onClick={togglePlay}>
              {isPlaying ? 'Pause' : 'Resume'}
            </Button>
          ) : (
            trendingTracks.length > 0 && (
              <Button
                variant={isOnline ? 'acc' : 'gold'}
                icon="play"
                onClick={() => handlePlay(trendingTracks[0], trendingTracks)}
              >
                {isOnline ? 'Play trending' : 'Play all'}
              </Button>
            )
          )}
        </div>
      </motion.div>

      {/* Guest Banner */}
      {isOnline && !user && (
        <motion.div className="onstrip gap-3" variants={staggerItem} transition={transition.normal}>
          <Icon name="info" size={16} className="text-acc flex-none" />
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-acc">You're listening as a guest</span>
            <span className="text-body-s text-t2">
              Create a free account to save songs you love, build playlists and keep your history across devices.
            </span>
          </span>
          <Link to="/signin" state={{ mode: 'signup' }} className="no-underline">
            <Button variant="acc" size="sm">
              Create account
            </Button>
          </Link>
          <Link to="/signin" state={{ mode: 'signin' }} className="no-underline">
            <Button variant="out" size="sm">
              Sign in
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Offline banner (matching D02) */}
      {!isOnline && (
        <motion.div className="offstrip gap-3" variants={staggerItem} transition={transition.normal}>
          <Icon name="smartphone" size={16} className="text-gold flex-none" />
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-gold">You're offline — showing music available on this device.</span>
            <span className="text-body-s text-t3">
              Recommendations, trending and server search are hidden until you go online.
            </span>
          </span>
          <button className="btn btn-sm btn-out flex-none" onClick={() => setMode('online')}>
            <Icon name="cloud" size={14} />
            <span>Go online</span>
          </button>
        </motion.div>
      )}

      {/* Quick Access Tiles: 2 cols on phone/web/tablet, 3 cols at desktop (@[960px]:) */}
      {(tiles.length > 0 || (isOnline && trendingLoading)) && (
        <motion.div
          className="grid gap-3 grid-cols-1 @[480px]:grid-cols-2 @[960px]:grid-cols-3"
          variants={staggerItem}
          transition={transition.normal}
        >
          {isOnline && trendingLoading && tiles.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tile animate-pulse opacity-50 h-14 bg-s2/40" />
              ))
            : tiles.map((tile, i) => (
                <Tile
                  key={i}
                  title={tile.title}
                  subtitle={tile.subtitle}
                  artVariant={tile.artVariant}
                  to={tile.to}
                  thumbnail={trackArtwork(tile.track, 64)}
                  onPlay={() => handlePlay(tile.track, trendingTracks)}
                />
              ))}
        </motion.div>
      )}

      {/* Recently played / Jump back in shelf */}
      {(recentTracks.length > 0 || (!isOnline && local.tracks.length > 6) || recentFailed) && (
        <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1 font-semibold">{!isOnline ? 'Jump back in' : 'Recently played'}</span>
            {recentTracks.length > 6 && (
              <button
                className="text-label-l text-t3 bg-transparent border-0 cursor-pointer hover:text-t1 inline-flex items-center gap-1"
                onClick={() => setAllRecent((v) => !v)}
              >
                <span>{allRecent ? 'Show less' : 'See all'}</span>
                <Icon name="chevron-right" size={14} />
              </button>
            )}
          </div>
          {recentFailed ? (
            <EmptyState
              icon="wifi-off"
              title="Could not load recently played"
              description={loadErrorMessage(recentError)}
              action={retryButton}
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {recentTracks.slice(0, allRecent ? undefined : 8).map((track, i) => (
                <Card
                  key={track.id}
                  title={track.title}
                  subtitle={track.artist}
                  artVariant={`a${((i % 12) + 1) as 1}`}
                  thumbnail={trackArtwork(track, 140)}
                  to={track.albumId ? `/album/${track.albumId}` : undefined}
                  onPlay={() => handlePlay(track, recentTracks)}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Trending shelf (Square cards) - Online only */}
      {isOnline && (
        <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1 font-semibold">Trending locally this week</span>
            {trendingTracks.length > 6 && (
              <button
                className="text-label-l text-t3 bg-transparent border-0 cursor-pointer hover:text-t1 inline-flex items-center gap-1"
                onClick={() => setAllTrending((v) => !v)}
              >
                <span>{allTrending ? 'Show less' : 'See all'}</span>
                <Icon name="chevron-right" size={14} />
              </button>
            )}
          </div>
          {trendingFailed ? (
            <EmptyState
              icon="wifi-off"
              title="Could not load trending"
              description={loadErrorMessage(trendingError)}
              action={retryButton}
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {trendingLoading && trendingCards.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="acard w-[160px] h-[210px] animate-pulse bg-s2/40 rounded-md flex-none" />
                  ))
                : trendingCards.map((card) => (
                    <Card
                      key={card.id}
                      title={card.title}
                      subtitle={card.artist}
                      artVariant={card.artVariant}
                      to={card.to}
                      thumbnail={trackArtwork(card.track, 140)}
                      onPlay={() => handlePlay(card.track, trendingTracks)}
                    />
                  ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Song Table */}
      <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
        <div className="shead">
          <span className="text-h2 text-t1 font-semibold">{isOnline ? 'Trending tracks' : 'Songs on device'}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <SongTableHeader />
          {trendingTracks.slice(0, 10).map((track, i) => (
            <SongRow
              key={track.id}
              track={track}
              index={i + 1}
              isActive={currentTrack?.id === track.id}
              onClick={() => handlePlay(track, trendingTracks)}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Thursday evening", the line above the M01 greeting. */
function dayPart(now = new Date()) {
  const h = now.getHours();
  const part = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  return `${DAYS[now.getDay()]} ${part}`;
}

/** Design M01 (online) / M02 (offline) at phone width. */
function PhoneHome({
  isOnline,
  userName,
  trending,
  trendingLoading,
  trendingFailed,
  trendingError,
  recent,
  localCount,
  onPlay,
  retry,
}: {
  isOnline: boolean;
  userName: string | null;
  trending: Track[];
  trendingLoading: boolean;
  trendingFailed: boolean;
  trendingError: unknown;
  recent: Track[];
  localCount: number;
  onPlay: (track: Track, queue: Track[]) => void;
  retry: React.ReactNode;
}) {
  const { currentTrack, isPlaying, togglePlay, durationMs } = usePlayerStore();
  const position = usePlaybackPosition();
  const resume = currentTrack ?? recent[0] ?? null;
  const progress = currentTrack && durationMs ? Math.min(1, position / durationMs) : 0;
  const gold = !isOnline || resume?.source === 'local';
  const jumpBackIn = recent.slice(0, 4);
  const shelf = recent.slice(4, 14);

  return (
    <motion.div
      className="flex flex-col gap-[22px] px-5 pt-1 pb-8 overflow-auto h-full"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {isOnline ? (
        <motion.div className="flex flex-col gap-0.5" variants={staggerItem} transition={transition.normal}>
          <span className="text-body-s text-t3">{dayPart()}</span>
          <span className="text-h1 text-t1 font-semibold">
            {userName ? `Welcome back, ${userName}` : 'Welcome to Sonare'}
          </span>
        </motion.div>
      ) : (
        <motion.div className="offstrip gap-2.5" variants={staggerItem} transition={transition.normal}>
          <Icon name="wifi-off" size={18} className="text-gold flex-none" />
          <span className="flex flex-col gap-px">
            <span className="text-label-l text-gold">You&apos;re offline</span>
            <span className="text-body-s text-t2">
              {localCount
                ? `Showing the ${localCount.toLocaleString()} songs stored on this device.`
                : 'No music stored on this device yet.'}
            </span>
          </span>
        </motion.div>
      )}

      {resume && (
        <motion.button
          className="surf flex items-center gap-3.5 p-3 text-left cursor-pointer"
          variants={staggerItem}
          transition={transition.normal}
          onClick={() => (currentTrack ? togglePlay() : onPlay(resume, recent))}
          aria-label={`${currentTrack && isPlaying ? 'Pause' : 'Play'} ${resume.title}`}
        >
          <Artwork src={trackArtwork(resume, 140)} size={68} radius="sm" rings alt="" />
          <span className="flex flex-col gap-1.5 grow min-w-0">
            <span className="text-overline text-t3 uppercase">
              {isOnline ? 'Continue listening' : 'Resume · On device'}
            </span>
            <span className="text-title-m text-t1 truncate">{resume.title}</span>
            <span className="flex items-center gap-2">
              <span className={cn('track', gold && 'track-gold')}>
                <i style={{ width: `${progress * 100}%` }} />
                <b style={{ left: `${progress * 100}%` }} />
              </span>
              <span className="text-mono-s font-mono text-t3 flex-none">
                {currentTrack ? formatDuration(position) : resume.artist}
              </span>
            </span>
          </span>
          <span className={cn('playbtn-fab flex-none', gold && 'bg-gold')}>
            <Icon name={currentTrack && isPlaying ? 'pause' : 'play'} size={22} />
          </span>
        </motion.button>
      )}

      {isOnline && jumpBackIn.length > 1 && (
        <motion.div className="flex flex-col gap-3" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1 font-semibold">Jump back in</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {jumpBackIn.map((t) => (
              <button
                key={t.id}
                className="tile text-left cursor-pointer min-w-0"
                onClick={() => onPlay(t, recent)}
                aria-label={`Play ${t.title}`}
              >
                <Artwork src={trackArtwork(t, 64)} size={40} radius="sm" alt="" />
                <span className="flex flex-col gap-px grow min-w-0">
                  <span className="text-label-l text-t1 truncate">{t.title}</span>
                  <span className="text-label-s text-t3 truncate">{t.artist}</span>
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {isOnline && shelf.length > 0 && (
        <motion.div className="flex flex-col gap-3" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1 font-semibold">Recently played</span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {shelf.map((t, i) => (
              <Card
                key={t.id}
                title={t.title}
                subtitle={t.artist}
                width={132}
                artVariant={`a${((i % 12) + 1) as 1}`}
                thumbnail={trackArtwork(t, 300)}
                onPlay={() => onPlay(t, recent)}
              />
            ))}
          </div>
        </motion.div>
      )}

      <motion.div className="flex flex-col gap-3" variants={staggerItem} transition={transition.normal}>
        <div className="shead">
          <span className="text-h2 text-t1 font-semibold">{isOnline ? 'Trending now' : 'On this device'}</span>
        </div>
        {trendingFailed ? (
          <EmptyState
            icon="wifi-off"
            title="Could not load trending"
            description={loadErrorMessage(trendingError)}
            action={retry}
          />
        ) : trendingLoading && trending.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-md bg-s2/40 animate-pulse" />)
        ) : (
          <div className="flex flex-col gap-0.5 -mx-2.5">
            {trending.slice(0, isOnline ? 10 : 50).map((track, i) => (
              <SongRow
                key={track.id}
                track={track}
                index={i + 1}
                isActive={currentTrack?.id === track.id}
                onClick={() => onPlay(track, trending)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
