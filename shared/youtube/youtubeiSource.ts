// YouTubeSource implementation backed by youtubei.js via the InnertubeLike interface.
// Implements getStream, search, suggestions. Other methods throw SourceError('unavailable').

import type { Streams, PipedStream, SearchPage, StreamItem, Channel, ChannelTabPage, Playlist, PlaylistPage } from '../catalog/pipedTypes.js';
import type { YouTubeSource, SourceErrorKind } from '../catalog/source.js';
import { SourceError } from '../catalog/source.js';
import type {
  InnertubeLike,
  YTBasicInfoResult,
  YTMusicItem,
  YTStreamFormat,
  YTSuggestionItem,
  YTThumbnail,
} from './innertubeLike.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract plain string from youtubei.js text objects. */
function extractText(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'text' in v) {
    const t = (v as { text?: unknown }).text;
    if (typeof t === 'string') return t;
  }
  return null;
}

/** Pick the largest thumbnail from a list ordered by area. */
function largestThumb(thumbs?: YTThumbnail[]): string {
  if (!thumbs || thumbs.length === 0) return '';
  let best = thumbs[0];
  for (const t of thumbs) {
    if ((t.width ?? 0) > (best.width ?? 0)) best = t;
  }
  return best.url;
}

/** Music search item filter name → yt.music.search type. */
const filterToType: Record<string, 'song' | 'album' | 'artist' | 'playlist'> = {
  music_songs: 'song',
  music_albums: 'album',
  music_artists: 'artist',
  music_playlists: 'playlist',
};

/** Map a mime string like 'audio/webm; codecs="opus"' to { format, codec }. */
function parseCodecFormat(mime?: string): { format: string; codec: string } {
  if (!mime) return { format: 'UNKNOWN', codec: 'unknown' };
  const codecMatch = mime.match(/codecs="([^"]+)"/);
  const codec = codecMatch ? codecMatch[1] : 'unknown';
  if (/^audio\/webm/.test(mime) && /opus/i.test(codec)) return { format: 'WEBMA_OPUS', codec: 'opus' };
  if (/^audio\/mp4/.test(mime)) return { format: 'M4A', codec };
  if (/^video\/webm/.test(mime)) return { format: 'WEBM', codec };
  if (/^video\/mp4/.test(mime)) return { format: 'MPEG_4', codec };
  return { format: 'UNKNOWN', codec };
}

/** Build a PipedStream from a youtubei.js format. */
function toPipedStream(f: YTStreamFormat): PipedStream {
  const { format, codec } = parseCodecFormat(f.mime_type);
  const mimeType = f.mime_type ? f.mime_type.split(';')[0].trim() : '';
  return {
    url: f.url ?? '',
    format,
    quality: f.quality ?? 'unknown',
    mimeType,
    codec,
    audioTrackId: null,
    audioTrackName: null,
    audioTrackType: null,
    audioTrackLocale: null,
    videoOnly: (f.has_video ?? false) && !(f.has_audio ?? false),
    itag: f.itag ?? 0,
    bitrate: f.bitrate ?? 0,
    initStart: 0,
    initEnd: 0,
    indexStart: 0,
    indexEnd: 0,
    width: 0,
    height: 0,
    fps: 0,
    contentLength: typeof f.content_length === 'number' ? f.content_length : -1,
  };
}

/** Classify playability failure into a SourceErrorKind. */
function classifyPlayability(status?: string, reason?: string): SourceErrorKind {
  if (!status) return 'unavailable';
  const s = status.toUpperCase();
  const r = (reason ?? '').toLowerCase();
  if (s === 'LOGIN_REQUIRED' || s === 'UNPLAYABLE') {
    if (r.includes('bot') || r.includes('sign in') || r.includes('confirm')) return 'blocked';
  }
  if (s === 'ERROR' || r.includes('unavailable')) return 'not_found';
  return 'unavailable';
}

// ---------------------------------------------------------------------------
// Search mapping helpers
// ---------------------------------------------------------------------------

/** Extract the OLAK playlist id from the overlay's play-button endpoint. */
function extractOlakId(item: YTMusicItem): string | null {
  const pid = item.overlay?.content?.endpoint?.payload?.playlistId;
  if (pid && pid.startsWith('OLAK5uy_')) return pid;
  return null;
}

/** Get the thumbnail URL from a MusicThumbnail object. */
function musicThumb(item: YTMusicItem): string {
  return largestThumb(item.thumbnail?.contents);
}

/** Build a StreamItem for a song. */
function songToStreamItem(item: YTMusicItem): StreamItem | null {
  const id = item.id;
  if (!id) return null;
  const title = extractText(item.title);
  if (!title) return null;

  const artists = item.artists ?? [];
  const uploaderName = artists.map((a) => a.name ?? '').filter(Boolean).join(', ') || undefined;
  const firstWithChannel = artists.find((a) => a.channel_id);
  const uploaderUrl = firstWithChannel ? `/channel/${firstWithChannel.channel_id}` : undefined;

  return {
    type: 'stream',
    url: `/watch?v=${id}`,
    title,
    thumbnail: musicThumb(item),
    uploaderName,
    uploaderUrl,
    duration: item.duration?.seconds ?? undefined,
    views: -1,
    uploaded: -1,
    uploaderVerified: false,
    isShort: false,
  };
}

/** Build a StreamItem for an album. */
function albumToStreamItem(item: YTMusicItem): StreamItem | null {
  const title = extractText(item.title) ?? extractText(item.name);
  if (!title) return null;

  // The OLAK playlist id is what Piped uses as the identifier.
  const olakId = extractOlakId(item);
  if (!olakId) {
    // If we can't extract the OLAK id, fall back to the raw browseId with MPRE prefix — but
    // the spec says we need OLAK. Skip items without it.
    return null;
  }

  const url = `/playlist?list=${olakId}`;
  const uploaderName = item.author?.name ?? undefined;
  const uploaderUrl = item.author?.channel_id ? `/channel/${item.author.channel_id}` : undefined;

  return {
    type: 'playlist',
    url,
    name: title,
    thumbnail: musicThumb(item),
    uploaderName,
    uploaderUrl,
    uploaderVerified: false,
    videos: -1,
  };
}

/** Build a StreamItem for an artist. */
function artistToStreamItem(item: YTMusicItem): StreamItem | null {
  const name = extractText(item.name) ?? extractText(item.title);
  if (!name) return null;

  const channelId = item.id;
  if (!channelId) return null;
  // channelId from music search is the browseId (UCXXX)
  const url = `/channel/${channelId}`;

  let subscriberCount: number | undefined;
  if (typeof item.subscribers === 'number') {
    subscriberCount = item.subscribers;
  } else if (typeof item.subscribers === 'string') {
    // Parse "338M monthly audience" → 338000000 (approximate)
    subscriberCount = parseSubscriberCount(item.subscribers);
  }

  return {
    type: 'channel',
    url,
    name,
    thumbnail: musicThumb(item),
    subscriberCount,
    videos: -1,
  };
}

/** Build a StreamItem for a playlist. */
function playlistToStreamItem(item: YTMusicItem): StreamItem | null {
  const title = extractText(item.title) ?? extractText(item.name);
  if (!title) return null;

  let rawId = item.id ?? '';
  // Remove VL prefix for playlists
  if (rawId.startsWith('VL')) rawId = rawId.slice(2);
  if (!rawId) return null;

  const url = `/playlist?list=${rawId}`;
  const uploaderName = item.author?.name ?? undefined;
  const uploaderUrl = item.author?.channel_id ? `/channel/${item.author.channel_id}` : undefined;

  return {
    type: 'playlist',
    url,
    name: title,
    thumbnail: musicThumb(item),
    uploaderName,
    uploaderUrl,
    uploaderVerified: false,
    videos: -1,
  };
}

/**
 * Parse a subscriber string like "338M monthly audience" or "69.3K subscribers"
 * into a numeric estimate.
 */
function parseSubscriberCount(s: string): number | undefined {
  const m = s.match(/([\d,.]+)\s*([KMBTG])?/i);
  if (!m) return undefined;
  const num = parseFloat(m[1].replace(/,/g, ''));
  if (isNaN(num)) return undefined;
  const suffix = (m[2] ?? '').toUpperCase();
  const multipliers: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000, T: 1_000_000_000_000 };
  return Math.round(num * (multipliers[suffix] ?? 1));
}

// ---------------------------------------------------------------------------
// createYoutubeiSource
// ---------------------------------------------------------------------------

export interface YoutubeiSourceOpts {
  /** Clients to try for getStream, in order. Default: ['VISIONOS']. */
  clients?: string[];
}

export function createYoutubeiSource(
  yt: InnertubeLike,
  opts: YoutubeiSourceOpts = {},
): YouTubeSource {
  const clients = opts.clients ?? ['VISIONOS'];

  // ---- getStream -----------------------------------------------------------
  async function getStream(videoId: string): Promise<Streams> {
    let lastError: SourceError | null = null;
    const statuses: Array<{ status?: string; reason?: string }> = [];

    for (const client of clients) {
      let info: YTBasicInfoResult;
      try {
        info = await yt.getBasicInfo(videoId, { client });
      } catch (_err) {
        lastError = new SourceError('unavailable', `Network error for client ${client}: ${String(_err)}`);
        continue;
      }

      const ps = info.playability_status;
      statuses.push({ status: ps?.status, reason: ps?.reason });
      if (ps?.status !== 'OK') continue;

      const sd = info.streaming_data;
      if (!sd) continue;

      // Collect audio-only adaptive formats that have a plain url (no decipher).
      const audioFormats = (sd.adaptive_formats ?? []).filter(
        (f) => f.has_audio && !f.has_video && f.url,
      );
      // Collect muxed formats (both audio+video) that have a url.
      const muxedFormats = (sd.formats ?? []).filter((f) => f.url);

      if (audioFormats.length === 0 && muxedFormats.length === 0) continue;

      const bi = info.basic_info;
      const title = bi.title ?? '';
      const uploader = bi.author ?? '';
      const uploaderUrl = bi.channel_id ? `/channel/${bi.channel_id}` : '';
      const thumbnailUrl = largestThumb(bi.thumbnail);
      const duration = bi.duration ?? 0;

      return {
        title,
        description: '',
        uploadDate: '',
        uploader,
        uploaderUrl,
        uploaderAvatar: '',
        thumbnailUrl,
        hls: '',
        dash: '',
        lbryId: null,
        category: 'Music',
        license: '',
        visibility: 'public',
        tags: [],
        metaInfo: [],
        uploaderVerified: false,
        duration,
        views: -1,
        likes: -1,
        dislikes: -1,
        uploaderSubscriberCount: -1,
        uploaded: -1,
        audioStreams: audioFormats.map(toPipedStream),
        videoStreams: muxedFormats.map(toPipedStream),
        relatedStreams: [],
        subtitles: [],
        livestream: false,
        proxyUrl: '',
        chapters: [],
        previewFrames: [],
      };
    }

    // All clients failed — classify
    const hasBlocked = statuses.some((s) => classifyPlayability(s.status, s.reason) === 'blocked');
    const hasNotFound = statuses.some((s) => classifyPlayability(s.status, s.reason) === 'not_found');
    if (hasBlocked) throw new SourceError('blocked', 'All clients blocked');
    if (hasNotFound) throw new SourceError('not_found', 'Video not found');
    throw lastError ?? new SourceError('unavailable', 'All clients failed');
  }

  // ---- search --------------------------------------------------------------
  async function search(q: string, filter?: string): Promise<SearchPage> {
    const type = filterToType[filter ?? ''];
    if (!type) {
      // If no specific filter, default to song search
      return doSearch(q, 'song', 'music_songs');
    }
    return doSearch(q, type, filter!);
  }

  async function doSearch(
    q: string,
    type: 'song' | 'album' | 'artist' | 'playlist',
    filter: string,
  ): Promise<SearchPage> {
    try {
      const res = await yt.music.search(q, { type });
      const section = res.contents?.[0];
      const items = (section?.contents ?? []).map((item) => mapSearchItem(item, type)).filter(Boolean) as StreamItem[];
      const continuation = section?.continuation ?? null;
      const nextpage = continuation ? JSON.stringify({ t: continuation, f: filter }) : null;
      return { items, nextpage, suggestion: null, corrected: false };
    } catch (err) {
      if (err instanceof SourceError) throw err;
      throw new SourceError('unavailable', `Music search failed: ${String(err)}`);
    }
  }

  function mapSearchItem(item: YTMusicItem, type: 'song' | 'album' | 'artist' | 'playlist'): StreamItem | null {
    switch (type) {
      case 'song':
        return songToStreamItem(item);
      case 'album':
        return albumToStreamItem(item);
      case 'artist':
        return artistToStreamItem(item);
      case 'playlist':
        return playlistToStreamItem(item);
      default:
        return null;
    }
  }

  // ---- searchNextPage ------------------------------------------------------
  async function searchNextPage(_q: string, _nextpage: string, _filter?: string): Promise<SearchPage> {
    throw new SourceError('unavailable', 'not implemented yet');
  }

  // ---- suggestions ---------------------------------------------------------
  async function suggestions(query: string): Promise<string[]> {
    try {
      const sections = await yt.music.getSearchSuggestions(query);
      const out: string[] = [];
      for (const section of sections ?? []) {
        for (const item of (section as { contents?: YTSuggestionItem[] }).contents ?? []) {
          const text =
            extractText((item as YTSuggestionItem).suggestion) ??
            extractText((item as YTSuggestionItem).title) ??
            extractText((item as YTSuggestionItem).name);
          if (typeof text === 'string' && text.trim().length > 0) {
            out.push(text.trim());
          }
        }
      }
      return out;
    } catch (err) {
      if (err instanceof SourceError) throw err;
      throw new SourceError('unavailable', `Suggestions failed: ${String(err)}`);
    }
  }

  // ---- stubs ---------------------------------------------------------------
  async function trending(): Promise<StreamItem[]> {
    throw new SourceError('unavailable', 'not implemented yet');
  }

  async function channel(_id: string): Promise<Channel> {
    throw new SourceError('unavailable', 'not implemented yet');
  }

  async function channelTabs(_data: string): Promise<ChannelTabPage> {
    throw new SourceError('unavailable', 'not implemented yet');
  }

  async function playlist(_id: string): Promise<Playlist> {
    throw new SourceError('unavailable', 'not implemented yet');
  }

  async function playlistNextPage(_id: string, _nextpage: string): Promise<PlaylistPage> {
    throw new SourceError('unavailable', 'not implemented yet');
  }

  return {
    getStream,
    search,
    searchNextPage,
    suggestions,
    trending,
    channel,
    channelTabs,
    playlist,
    playlistNextPage,
  };
}
