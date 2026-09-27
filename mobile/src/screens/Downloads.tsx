import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { Artwork } from '../components/music/Artwork';
import Icon from '../components/ui/Icon';
import { artworkUrl } from '../data/config';
import { usePlayerStore } from '../store/player';
import { useModeStore } from '../store/mode';
import {
  useDownloadsStore,
  downloadProgress,
  downloadTrack,
  downloadedTracks,
  type DownloadItem,
} from '../store/downloads';
import { cn } from '../lib/cn';
import { confirmRemoveDownloads } from '../lib/confirmRemoveDownloads';

/**
 * Downloads (M-downloads): what's in progress, with pause / resume / delete, and what is on
 * the phone. Deleting a finished song deletes its file from the folder it was saved to; if
 * the file has moved (or can't be deleted), it is only taken off this list.
 */

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

function statusLine(d: DownloadItem): string {
  const pct = downloadProgress(d);
  const size =
    d.totalBytes > 0
      ? `${formatBytes(d.receivedBytes)} of ${formatBytes(
          d.totalBytes,
        )} · ${Math.round((pct ?? 0) * 100)}%`
      : d.receivedBytes > 0
      ? formatBytes(d.receivedBytes)
      : '';
  switch (d.status) {
    case 'queued':
      return size ? `Waiting · ${size}` : 'Waiting';
    case 'downloading':
      return size || 'Starting…';
    case 'paused':
      return size ? `Paused · ${size}` : 'Paused';
    case 'failed':
      return d.error ? `Failed · ${d.error}` : 'Failed';
    default:
      return '';
  }
}

function fileLine(d: DownloadItem): string {
  return [
    d.codec && d.bitrateKbps ? `${d.codec} ${d.bitrateKbps} kbps` : d.codec,
    d.totalBytes ? formatBytes(d.totalBytes) : null,
    d.completedAt ? new Date(d.completedAt).toLocaleDateString() : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Row({
  d,
  children,
  sub,
  subClass,
  onPress,
}: {
  d: DownloadItem;
  children: React.ReactNode;
  sub: React.ReactNode;
  subClass?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 px-3 py-2.5"
    >
      <Artwork
        uri={artworkUrl(
          { thumbnail: d.thumbnail ?? `/api/v1/tracks/${d.id}/artwork` },
          64,
        )}
        size={44}
      />
      <View className="flex-1 min-w-0 gap-0.5">
        <Text className="text-t1 text-tm font-medium" numberOfLines={1}>
          {d.title}
        </Text>
        <Text className="text-t2 text-bs" numberOfLines={1}>
          {d.artist}
        </Text>
        <View>
          {typeof sub === 'string' ? (
            <Text
              className={cn('text-bs', subClass ?? 'text-t3')}
              numberOfLines={2}
            >
              {sub}
            </Text>
          ) : (
            sub
          )}
        </View>
      </View>
      <View className="flex-row items-center gap-1">{children}</View>
    </Pressable>
  );
}

export function DownloadsScreen() {
  const navigation = useNavigation<any>();
  const items = useDownloadsStore(s => s.items);
  const location = useDownloadsStore(s => s.location);
  const ready = useDownloadsStore(s => s.ready);
  const { pause, resume, pauseAll, resumeAll } = useDownloadsStore.getState();
  const mode = useModeStore(s => s.mode);
  const currentId = usePlayerStore(s => s.currentTrack?.id);

  useEffect(() => {
    void useDownloadsStore.getState().checkFiles();
  }, []);

  const list = useMemo(
    () => Object.values(items).sort((a, b) => b.addedAt - a.addedAt),
    [items],
  );
  const active = list.filter(d => d.status !== 'done');
  const done = list.filter(d => d.status === 'done');
  const running = active.filter(
    d => d.status === 'queued' || d.status === 'downloading',
  );
  const stopped = active.filter(
    d => d.status === 'paused' || d.status === 'failed',
  );
  const doneBytes = done.reduce((n, d) => n + d.totalBytes, 0);

  const play = (d: DownloadItem) => {
    const queue = downloadedTracks(items);
    const track =
      queue.find(t => t.id === d.id) ??
      (mode === 'online' ? downloadTrack(d) : null);
    if (track)
      usePlayerStore
        .getState()
        .playTrack(track, queue.some(t => t.id === track.id) ? queue : [track]);
  };

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header
        title="Downloads"
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
        right={
          <IconButton
            icon={<Icon name="settings" size={20} color="#FFFFFF" />}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Download settings"
          />
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 140,
          gap: 18,
        }}
      >
        <View className="gap-1 pt-1">
          <Text className="text-t2 text-bm">
            {done.length} {done.length === 1 ? 'song' : 'songs'}
            {doneBytes > 0 ? ` · ${formatBytes(doneBytes)}` : ''}
          </Text>
          <Text className="text-t3 text-bs" numberOfLines={1}>
            Saving to {location.label}
          </Text>
        </View>

        {(running.length > 0 || stopped.length > 0) && (
          <View className="flex-row gap-2.5">
            {running.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onPress={() => void pauseAll()}
                icon={<Icon name="pause" size={15} color="#FFFFFF" />}
              >
                Pause all
              </Button>
            )}
            {stopped.length > 0 && (
              <Button
                variant="gold"
                size="sm"
                className="flex-1"
                onPress={resumeAll}
                icon={<Icon name="play" size={15} color="#000000" />}
              >
                Resume all
              </Button>
            )}
          </View>
        )}

        {ready && list.length === 0 && (
          <View className="items-center justify-center py-16 gap-2">
            <Icon name="download" size={32} color="#5A5A66" />
            <Text className="text-t1 text-tl">No downloads yet</Text>
            <Text className="text-t3 text-bm text-center max-w-[300px]">
              Long-press a song and choose Download, or use the download button
              on an album or playlist.
            </Text>
          </View>
        )}

        {active.length > 0 && (
          <View className="gap-2">
            <Text className="text-t3 text-ov uppercase ml-1">In progress</Text>
            <View className="bg-s1 border border-ln rounded-xl overflow-hidden">
              {active.map((d, i) => {
                const pct = downloadProgress(d) ?? 0;
                const isRunning =
                  d.status === 'queued' || d.status === 'downloading';
                return (
                  <View
                    key={d.id}
                    className={cn(i > 0 && 'border-t border-ln')}
                  >
                    <Row
                      d={d}
                      sub={
                        <View className="gap-1.5">
                          <Text
                            className={cn(
                              'text-bs',
                              d.status === 'failed' ? 'text-red' : 'text-t3',
                            )}
                            numberOfLines={2}
                          >
                            {statusLine(d)}
                          </Text>
                          {d.status !== 'failed' && (
                            <View className="h-[3px] bg-ln2 rounded-full overflow-hidden">
                              <View
                                className={cn(
                                  'h-full',
                                  d.status === 'downloading'
                                    ? 'bg-acc'
                                    : 'bg-gold opacity-70',
                                )}
                                style={{ width: `${Math.round(pct * 100)}%` }}
                              />
                            </View>
                          )}
                        </View>
                      }
                    >
                      {isRunning ? (
                        <IconButton
                          icon={<Icon name="pause" size={18} color="#FFFFFF" />}
                          size={40}
                          onPress={() => void pause(d.id)}
                          accessibilityLabel={`Pause ${d.title}`}
                        />
                      ) : (
                        <IconButton
                          icon={
                            <Icon
                              name={d.status === 'failed' ? 'refresh' : 'play'}
                              size={18}
                              color="#FFFFFF"
                            />
                          }
                          size={40}
                          onPress={() => resume(d.id)}
                          accessibilityLabel={`${
                            d.status === 'failed' ? 'Retry' : 'Resume'
                          } ${d.title}`}
                        />
                      )}
                      <IconButton
                        icon={<Icon name="close" size={18} color="#9A9AA8" />}
                        size={40}
                        onPress={() => confirmRemoveDownloads([d])}
                        accessibilityLabel={`Cancel ${d.title}`}
                      />
                    </Row>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {done.length > 0 && (
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-t3 text-ov uppercase ml-1">Downloaded</Text>
              <Pressable
                onPress={() => confirmRemoveDownloads(done)}
                accessibilityRole="button"
                accessibilityLabel="Delete all downloads"
                className="px-2 py-1"
              >
                <Text className="text-t2 text-bs">Delete all</Text>
              </Pressable>
            </View>
            <View className="bg-s1 border border-ln rounded-xl overflow-hidden">
              {done.map((d, i) => (
                <View key={d.id} className={cn(i > 0 && 'border-t border-ln')}>
                  <Row
                    d={d}
                    onPress={
                      !d.missing || mode === 'online'
                        ? () => play(d)
                        : undefined
                    }
                    subClass={
                      d.missing
                        ? 'text-gold'
                        : currentId === d.id
                        ? 'text-acc'
                        : undefined
                    }
                    sub={
                      d.missing
                        ? 'File moved or deleted outside Sonare'
                        : fileLine(d)
                    }
                  >
                    <IconButton
                      icon={<Icon name="trash" size={18} color="#9A9AA8" />}
                      size={40}
                      onPress={() => confirmRemoveDownloads([d])}
                      accessibilityLabel={`Delete ${d.title}`}
                    />
                  </Row>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
