// In-process YouTube catalog service - port of backend/src/routes/catalog.routes.ts and media.routes.ts
// Pure TypeScript: no Express, no undici, no Redis, no DOM, no Node APIs.

import type { Album, Artist, Page, Playlist, SearchItem, StreamInfo, Track } from '../apiTypes.js';
import type { ChannelTabItem, StreamItem } from './pipedTypes.js';
import type { YouTubeSource } from './source.js';
import { SourceError } from './source.js';
import { CatalogInputError, idHelpers } from './ids.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import {
  normalizeChannelTabAlbum,
  normalizeChannelToArtist,
  normalizePlaylistToAlbum,
  normalizeStreamItemToAlbum,
  normalizeStreamItemToArtist,
  normalizeStreamItemToTrack,
  normalizeStreamToTrack,
} from './normalize.js';
import { selectBestAudioStream, toStreamInfo } from './streams.js';

// Input validators mirroring backend zod schemas

const validateSearchText = (q: unknown): string => {
  if (typeof q !== 'string' || !q.trim()) {
    throw new CatalogInputError('Missing query parameter: q');
  }
  const trimmed = q.trim();
  if (trimmed.length > 200) {
    throw new CatalogInputError('Search text must be at most 200 characters');
  }
  return trimmed;
};

const ALLOWED_SEARCH_TYPES = ['songs', 'albums', 'artists', 'playlists', 'all'] as const;
type SearchType = (typeof ALLOWED_SEARCH_TYPES)[number];

const validateSearchType = (type: string = 'all'): SearchType => {
  if (!ALLOWED_SEARCH_TYPES.includes(type as SearchType)) {
    throw new CatalogInputError(`Invalid search type: ${type}`);
  }
  return type as SearchType;
};

const validateRegion = (region: string = 'IN'): string => {
  if (!/^[A-Za-z]{2}$/.test(region)) {
    throw new CatalogInputError('region must be a two-letter country code');
  }
  return region;
};

const validateLimit = (limit: number = 50, defaultVal: number = 50): number => {
  if (limit === undefined || limit === null) return defaultVal;
  if (typeof limit !== 'number' || isNaN(limit) || !Number.isInteger(limit)) {
    throw new CatalogInputError('Expected a whole number');
  }
  if (limit < 1) {
    throw new CatalogInputError('Must be at least 1');
  }
  if (limit > 100) {
    throw new CatalogInputError('Must be at most 100');
  }
  return limit;
};

/**
 * Auto-generated "- Topic" artist channels come back from the extractor with no videos
 * and no tabs, so pull the artist's catalog from YouTube Music search instead, keeping
 * only results credited to this exact channel.
 */
const searchArtistCatalog = async (
  source: YouTubeSource,
  channelId: string,
  channelName: string | undefined,
  filter: 'music_songs' | 'music_albums',
): Promise<StreamItem[]> => {
  const name = (channelName || '').replace(/\s+-\s+Topic$/i, '').trim();
  if (!name) return [];
  const page = await source.search(name, filter);
  return (page.items || []).filter((i) => i.uploaderUrl === `/channel/${channelId}`);
};

export const createCatalog = (source: YouTubeSource) => {
  return {
    /**
     * Search suggestions (/search/suggestions).
     * @param q Query text (trimmed 1–200 characters)
     */
    async suggestions(q: string): Promise<string[]> {
      const trimmed = validateSearchText(q);
      const res = await source.suggestions(trimmed);
      return res;
    },

    /**
     * Search YouTube catalog (/search).
     * @param q Search query (trimmed 1–200 characters)
     * @param type Search type ('songs' | 'albums' | 'artists' | 'playlists' | 'all')
     * @param cursor Base64url pagination cursor
     */
    async search(
      q: string,
      type: 'songs' | 'albums' | 'artists' | 'playlists' | 'all' = 'all',
      cursor?: string,
    ): Promise<Page<SearchItem>> {
      const trimmedQ = validateSearchText(q);
      const validatedType = validateSearchType(type);
      const nextpage = decodeCursor(cursor);

      const typeMap: Record<SearchType, string> = {
        songs: 'music_songs',
        albums: 'music_albums',
        artists: 'music_artists',
        playlists: 'music_playlists',
        all: 'all',
      };

      const filter = typeMap[validatedType];

      // Results of an `all` search carry the kind of the search they came from.
      let results: { items: (StreamItem & { __sonareKind?: string })[]; nextpage: string | null };

      if (filter === 'all' && !nextpage) {
        const [songs, albums, artists, playlists] = await Promise.all([
          source.search(trimmedQ, 'music_songs'),
          source.search(trimmedQ, 'music_albums'),
          source.search(trimmedQ, 'music_artists'),
          source.search(trimmedQ, 'music_playlists'),
        ]);

        const items = [
          ...songs.items.map((i) => ({ ...i, __sonareKind: 'track' })),
          ...albums.items.map((i) => ({ ...i, __sonareKind: 'album' })),
          ...artists.items.map((i) => ({ ...i, __sonareKind: 'artist' })),
          ...playlists.items.map((i) => ({ ...i, __sonareKind: 'playlist' })),
        ];
        results = { items, nextpage: null };
      } else {
        if (nextpage) {
          results = await source.searchNextPage(trimmedQ, nextpage, filter);
        } else {
          results = await source.search(trimmedQ, filter);
        }
      }

      const requestedKindMap: Record<string, string> = {
        music_songs: 'track',
        music_albums: 'album',
        music_artists: 'artist',
        music_playlists: 'playlist',
      };
      const expectedKind = filter !== 'all' ? requestedKindMap[filter] : undefined;

      const items: SearchItem[] = results.items.map((item) => {
        let mapped;
        let mappedKind = item.__sonareKind || expectedKind;

        // Sniff fallback if somehow missing
        if (!mappedKind) {
          if (item.type === 'playlist') mappedKind = 'album';
          else if (item.type === 'channel') mappedKind = 'artist';
          else mappedKind = 'track';
        }

        if (mappedKind === 'album' || mappedKind === 'playlist') {
          // Contract: types playlists & albums return Albums natively for search display
          mapped = normalizeStreamItemToAlbum(item);
          return { kind: 'album' as const, ...mapped };
        } else if (mappedKind === 'artist') {
          mapped = normalizeStreamItemToArtist(item);
          return { kind: 'artist' as const, ...mapped };
        } else {
          mapped = normalizeStreamItemToTrack(item);
          return { kind: 'track' as const, ...mapped };
        }
      });

      return {
        items,
        meta: {
          nextCursor: encodeCursor(results.nextpage),
        },
      };
    },

    /**
     * Trending tracks (/trending).
     * @param region Two-letter country code (default 'IN')
     * @param limit Maximum results (1–100, default 50)
     */
    async trending(region: string = 'IN', limit: number = 50): Promise<Page<Track & { kind: 'track' }>> {
      const validatedRegion = validateRegion(region);
      const validatedLimit = validateLimit(limit, 50);

      let items: StreamItem[] = [];
      let failure: unknown;

      try {
        const rawTrending = await source.trending(validatedRegion);
        const isMusicTrack = (t: StreamItem) => {
          if (!t || t.type !== 'stream') return false;
          if (t.isShort || !t.duration || t.duration <= 0) return false;
          if (t.livestream) return false;

          const title = (t.title || '').toLowerCase();
          const uploader = (t.uploaderName || '').toLowerCase();

          // Exclude obvious non-music patterns (live news, streams, gaming, asmr, yoga)
          if (/\b(live|livestream|news|asmr|parkour|gameplay|minecraft|gta|vlog|roast|podcast|yoga)\b/i.test(title)) {
            return false;
          }

          // Music channel indicators
          if (t.uploaderName?.includes('- Topic') || uploader.includes('topic')) return true;
          if (
            uploader.includes('vevo') ||
            uploader.includes('music') ||
            uploader.includes('records') ||
            uploader.includes('t-series') ||
            uploader.includes('saregama') ||
            uploader.includes('yrf') ||
            uploader.includes('sony') ||
            uploader.includes('zee') ||
            uploader.includes('audio')
          ) {
            return true;
          }

          // Video title music indicators (official video, audio, song, lyrical, ft, feat)
          if (/\b(official video|official audio|music video|lyric video|lyrics|feat|ft\.|prod\.)\b/i.test(title)) {
            return true;
          }

          return false;
        };

        items = rawTrending.filter(isMusicTrack);
      } catch (e) {
        failure = e;
      }

      // Ensure we always have sufficient high quality musical items for the Home carousel and trending shelf
      if (items.length < validatedLimit) {
        try {
          const musicSearch = await source.search('trending music top songs', 'music_songs');
          const searchItems = musicSearch.items || [];
          const seenIds = new Set(items.map((i) => i.url));
          for (const item of searchItems) {
            if (items.length >= validatedLimit) break;
            if (item.url && !seenIds.has(item.url) && item.duration && item.duration > 0) {
              seenIds.add(item.url);
              items.push(item);
            }
          }
        } catch (e) {
          failure = e;
        }
      }

      // Both sources failing is an outage, not an empty chart.
      if (items.length === 0 && failure) throw failure;

      return {
        items: items
          .slice(0, validatedLimit)
          .map((item) => ({ kind: 'track' as const, ...normalizeStreamItemToTrack(item) })),
        meta: {},
      };
    },

    /**
     * Album details (/albums/:id).
     * @param id Album ID (format `yt:<listId>`)
     */
    async album(id: string): Promise<Album> {
      const rawId = idHelpers.extractYtId(id);
      const playlist = await source.playlist(rawId);
      return normalizePlaylistToAlbum(playlist, rawId);
    },

    /**
     * Album tracks (/albums/:id/tracks).
     * @param id Album ID (format `yt:<listId>`)
     * @param cursor Base64url pagination cursor
     */
    async albumTracks(id: string, cursor?: string): Promise<Page<Track & { kind: 'track' }>> {
      const rawId = idHelpers.extractYtId(id);
      const nextpage = decodeCursor(cursor);

      let tracks: StreamItem[];
      let nextCursor: string | null | undefined;

      if (nextpage) {
        const paged = await source.playlistNextPage(rawId, nextpage);
        tracks = paged.relatedStreams || [];
        nextCursor = paged.nextpage;
      } else {
        const playlist = await source.playlist(rawId);
        tracks = playlist.relatedStreams || [];
        nextCursor = playlist.nextpage;
      }

      return {
        items: tracks.map((t) => ({ kind: 'track' as const, ...normalizeStreamItemToTrack(t) })),
        meta: { nextCursor: encodeCursor(nextCursor) },
      };
    },

    /**
     * Artist details (/artists/:id).
     * @param id Artist channel ID (format `yt:<channelId>`)
     */
    async artist(id: string): Promise<Artist> {
      const rawId = idHelpers.extractYtId(id);
      const channel = await source.channel(rawId);
      const artist = normalizeChannelToArtist(channel, rawId);
      artist.following = false;
      return artist;
    },

    /**
     * Artist top tracks (/artists/:id/top-tracks).
     * @param id Artist channel ID (format `yt:<channelId>`)
     * @param limit Maximum results (1–100, default 20)
     */
    async artistTopTracks(id: string, limit: number = 20): Promise<Page<Track & { kind: 'track' }>> {
      const rawId = idHelpers.extractYtId(id);
      const validatedLimit = validateLimit(limit, 20);

      const channel = await source.channel(rawId);
      let tracks = channel.relatedStreams || [];
      if (tracks.length === 0) {
        tracks = await searchArtistCatalog(source, rawId, channel.name, 'music_songs');
      }
      tracks = tracks.slice(0, validatedLimit);

      return {
        items: tracks.map((t) => ({ kind: 'track' as const, ...normalizeStreamItemToTrack(t) })),
        meta: {},
      };
    },

    /**
     * Artist albums (/artists/:id/albums).
     * @param id Artist channel ID (format `yt:<channelId>`)
     * @param cursor Base64url pagination cursor
     */
    async artistAlbums(id: string, cursor?: string): Promise<Page<Album & { kind: 'album' }>> {
      const rawId = idHelpers.extractYtId(id);

      let items: ChannelTabItem[] = [];
      let nextCursor: string | null | undefined;

      if (cursor) {
        const data = decodeCursor(cursor);
        if (data) {
          const tabData = await source.channelTabs(data);
          items = tabData.content || [];
          nextCursor = tabData.nextpage;
        }
      } else {
        const channel = await source.channel(rawId);
        const albumsTab = channel.tabs?.find(
          (t) => t.name.toLowerCase() === 'albums' || t.name.toLowerCase() === 'releases',
        );
        if (albumsTab && albumsTab.data) {
          const tabData = await source.channelTabs(albumsTab.data);
          items = tabData.content || [];
          nextCursor = tabData.nextpage;
        } else {
          items = await searchArtistCatalog(source, rawId, channel.name, 'music_albums');
        }
      }

      return {
        items: items.map((i) => ({ kind: 'album' as const, ...normalizeChannelTabAlbum(i) })),
        meta: { nextCursor: encodeCursor(nextCursor) },
      };
    },

    /**
     * Public playlist metadata (/playlists/:id).
     * @param id Playlist ID (format `yt:<listId>`)
     */
    async playlist(id: string): Promise<Playlist> {
      const rawId = idHelpers.extractYtId(id);
      const pl = await source.playlist(rawId);
      return {
        id: idHelpers.prefixYt(rawId),
        name: pl.name,
        kind: 'online',
        trackCount: pl.videos >= 0 ? pl.videos : null,
        downloadedCount: 0,
      };
    },

    /**
     * Public playlist tracks (/playlists/:id/tracks).
     * @param id Playlist ID (format `yt:<listId>`)
     * @param cursor Base64url pagination cursor
     */
    async playlistTracks(id: string, cursor?: string): Promise<Page<Track & { kind: 'track' }>> {
      const rawId = idHelpers.extractYtId(id);
      const nextpage = decodeCursor(cursor);

      let tracks: StreamItem[];
      let nextCursor: string | null | undefined;

      if (nextpage) {
        const paged = await source.playlistNextPage(rawId, nextpage);
        tracks = paged.relatedStreams || [];
        nextCursor = paged.nextpage;
      } else {
        const pl = await source.playlist(rawId);
        tracks = pl.relatedStreams || [];
        nextCursor = pl.nextpage;
      }

      return {
        items: tracks.map((t) => ({ kind: 'track' as const, ...normalizeStreamItemToTrack(t) })),
        meta: { nextCursor: encodeCursor(nextCursor) },
      };
    },

    /**
     * Track details (/tracks/:id).
     * Codec and bitrate from the 'auto' stream selection pick.
     * @param id Track video ID (format `yt:<videoId>`)
     */
    async track(id: string): Promise<Track> {
      const rawId = idHelpers.extractYtId(id);
      const streams = await source.getStream(rawId);

      let codecStr: string | null = null;
      let bitrate: number | null = null;
      const best = selectBestAudioStream(streams.audioStreams, 'auto', undefined, streams.videoStreams);
      if (best) {
        codecStr = best.codec;
        bitrate = best.bitrate;
      }

      return normalizeStreamToTrack(streams, rawId, codecStr ?? undefined, bitrate ?? undefined);
    },

    /**
     * Stream information (/tracks/:id/stream).
     * @param id Track video ID (format `yt:<videoId>`)
     * @param options Stream options (quality and format)
     */
    async stream(id: string, options?: { quality?: string; format?: string }): Promise<StreamInfo> {
      const rawId = idHelpers.extractYtId(id);
      const streams = await source.getStream(rawId);

      const quality = options?.quality || 'auto';
      const best = selectBestAudioStream(streams.audioStreams, quality, options?.format, streams.videoStreams);
      if (!best) {
        throw new SourceError('unavailable', 'No audio streams found');
      }

      return toStreamInfo(best);
    },
  };
};
