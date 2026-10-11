import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { IconButton } from '../ui/IconButton';
import Icon from '../ui/Icon';
import { downloadProgress, useDownloadsStore } from '../../store/downloads';
import { useModeStore } from '../../store/mode';
import { confirmRemoveDownloads } from '../../lib/confirmRemoveDownloads';
import type { Track } from '../../data/types';

const GOLD = '#FFC24D';

/**
 * One song's download control for Now Playing: Download → progress ring (tap pauses) →
 * gold check (tap deletes, after asking). Paused or failed shows a gold Download that
 * resumes. Nothing for local files, or offline when the song isn't on the phone.
 */
export const TrackDownloadButton = ({ track }: { track: Track }) => {
  const item = useDownloadsStore((s) => s.items[track.id]);
  const online = useModeStore((s) => s.mode) === 'online';
  if (track.source !== 'server') return null;

  if (item?.status === 'done') {
    return (
      <IconButton
        icon={<Icon name="check" size={22} color={GOLD} />}
        size={44}
        onPress={() => confirmRemoveDownloads([item])}
        accessibilityLabel="Downloaded, delete download"
      />
    );
  }

  if (item?.status === 'queued' || item?.status === 'downloading') {
    const ratio = downloadProgress(item) ?? 0;
    const r = 13;
    const circ = 2 * Math.PI * r;
    return (
      <IconButton
        icon={
          <View className="items-center justify-center w-[30px] h-[30px]">
            <Svg
              width={30}
              height={30}
              style={{
                position: 'absolute',
                transform: [{ rotate: '-90deg' }],
              }}
            >
              <Circle cx={15} cy={15} r={r} stroke="#2A2A31" strokeWidth={2} fill="none" />
              <Circle
                cx={15}
                cy={15}
                r={r}
                stroke={GOLD}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circ}`}
                strokeDashoffset={circ * (1 - ratio)}
              />
            </Svg>
            <Icon name="pause" size={12} color={GOLD} />
          </View>
        }
        size={44}
        onPress={() => useDownloadsStore.getState().pause(track.id)}
        accessibilityLabel={`Downloading ${Math.round(ratio * 100)}%, pause`}
      />
    );
  }

  if (item) {
    return (
      <IconButton
        icon={<Icon name="download" size={22} color={GOLD} />}
        size={44}
        onPress={() => useDownloadsStore.getState().resume(track.id)}
        accessibilityLabel={item.status === 'failed' ? 'Download failed, retry' : 'Resume download'}
      />
    );
  }

  if (!online) return null;
  return (
    <IconButton
      icon={<Icon name="download" size={22} color="#9A9AA8" />}
      size={44}
      onPress={() => useDownloadsStore.getState().enqueue([track])}
      accessibilityLabel="Download"
    />
  );
};
