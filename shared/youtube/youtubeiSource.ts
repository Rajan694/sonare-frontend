// YouTubeSource implementation backed by youtubei.js via the InnertubeLike interface.
// Implements getStream, search, suggestions. Other methods throw SourceError('unavailable').

import type {
  Streams,
  PipedStream,
  SearchPage,
  StreamItem,
  Channel,
  ChannelTab,
  ChannelTabItem,
  ChannelTabPage,
  Playlist,
  PlaylistPage,
} from '../catalog/pipedTypes.js';
import type { YouTubeSource, SourceErrorKind } from '../catalog/source.js';
import { SourceError } from '../catalog/source.js';
import type {
  InnertubeLike,
  YTBasicInfoResult,
  YTMusicItem,
  YTStreamFormat,
  YTSuggestionItem,
  YTThumbnail,
  YTVideoItem,
  YTPlaylistResult,
  YTChannelResult,
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

/** Extract artist name and channelId for an album, preserving name even without channel ID. */
function extractAlbumArtist(item: YTMusicItem): { name?: string; channelId?: string } {
  if (item.author?.name) {
    return { name: item.author.name, channelId: item.author.channel_id };
  }
  if (item.artists && item.artists.length > 0 && item.artists[0]?.name) {
    return { name: item.artists[0].name, channelId: item.artists[0].channel_id };
  }
  const flexCols = item.flex_columns;
  if (Array.isArray(flexCols) && flexCols.length > 1) {
    const colTitle = flexCols[1]?.title;
    if (colTitle) {
      const runs = colTitle.runs;
      if (Array.isArray(runs)) {
        const bulletIdx = runs.findIndex((r) => r.text?.trim() === '•');
        if (bulletIdx >= 0 && bulletIdx + 1 < runs.length) {
          const run = runs[bulletIdx + 1];
          const text = run?.text?.trim();
          if (text) {
            const channelId = run?.endpoint?.payload?.browseId;
            return { name: text, channelId };
          }
        }
      }
      const text = typeof colTitle === 'string' ? colTitle : colTitle.text ?? colTitle.toString?.();
      if (typeof text === 'string') {
        const parts = text.split('•').map((p) => p.trim());
        if (parts.length >= 2) {
          return { name: parts[1] };
        }
      }
    }
  }
  return {};
}

/** Build a StreamItem for a song. */
function songToStreamItem(item: YTMusicItem): StreamItem | null {
  const id = item.id;
  if (!id) return null;
  const title = extractText(item.title);
  if (!title) return null;

  const artists = item.artists ?? [];
  const firstArtist = artists[0];
  let uploaderName = firstArtist?.name ?? undefined;
  let uploaderUrl = firstArtist?.channel_id ? `/channel/${firstArtist.channel_id}` : undefined;

  // Fallback to flex_columns if artists array is empty
  if (!uploaderName && Array.isArray(item.flex_columns) && item.flex_columns.length > 1) {
    const colTitle = item.flex_columns[1]?.title;
    if (colTitle) {
      const runs = colTitle.runs;
      if (Array.isArray(runs) && runs.length > 0) {
        const firstRun = runs[0];
        const text = firstRun?.text?.trim();
        if (text && text !== '•') {
          uploaderName = text;
          const browseId = firstRun?.endpoint?.payload?.browseId;
          if (browseId) uploaderUrl = `/channel/${browseId}`;
        }
      }
      if (!uploaderName) {
        const text = typeof colTitle === 'string' ? colTitle : colTitle.text ?? colTitle.toString?.();
        if (typeof text === 'string') {
          const parts = text.split('•').map((p) => p.trim());
          if (parts[0]) uploaderName = parts[0];
        }
      }
    }
  }

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
  const { name: uploaderName, channelId } = extractAlbumArtist(item);
  const uploaderUrl = channelId ? `/channel/${channelId}` : undefined;

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
function parseSubscriberCount(s: unknown): number | undefined {
  const str = typeof s === 'string' ? s : (s as any)?.toString?.();
  if (typeof str !== 'string') return undefined;
  const m = str.match(/([\d,.]+)\s*([KMBTG])?/i);
  if (!m) return undefined;
  const num = parseFloat(m[1].replace(/,/g, ''));
  if (isNaN(num)) return undefined;
  const suffix = (m[2] ?? '').toUpperCase();
  const multipliers: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000, T: 1_000_000_000_000 };
  return Math.round(num * (multipliers[suffix] ?? 1));
}

/** Parse duration text (e.g. "3:45" or "1:02:30") to total seconds. */
function parseDurationSec(s?: string | null): number | undefined {
  if (!s) return undefined;
  const parts = s.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return undefined;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return undefined;
}

/** Parse total video count from number or string like "182 videos". */
function parseVideoCount(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = typeof v === 'string' ? v : (v as any)?.text ?? (v as any)?.toString?.();
  if (typeof s === 'string') {
    const m = s.match(/(\d[\d,]*)/);
    if (m) return parseInt(m[1].replace(/,/g, ''), 10);
  }
  return -1;
}

/** Extract duration in seconds from video item, checking badges and duration text. */
function extractVideoDuration(v: YTVideoItem): number | undefined {
  if (typeof v.duration === 'number') return v.duration;
  const d = v.duration as any;
  if (typeof d?.seconds === 'number') return d.seconds;
  if (typeof d?.text === 'string') {
    const sec = parseDurationSec(d.text);
    if (sec !== undefined) return sec;
  }
  if (typeof d?.toString === 'function') {
    const str = d.toString();
    if (str && str !== '[object Object]') {
      const sec = parseDurationSec(str);
      if (sec !== undefined) return sec;
    }
  }
  for (const o of v.content_image?.overlays ?? []) {
    for (const b of o.badges ?? []) {
      const sec = parseDurationSec(b.text);
      if (sec !== undefined) return sec;
    }
  }
  return undefined;
}

/** Extract author / uploader name and channel URL from video item. */
function extractVideoUploader(v: YTVideoItem): { name?: string; url?: string } {
  if (v.author?.name) {
    const id = v.author.id || v.author.channel_id;
    return { name: v.author.name, url: id ? `/channel/${id}` : undefined };
  }
  const parts = v.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts;
  const t = parts?.[0]?.text;
  if (t) {
    const name = t.runs?.[0]?.text || t.text;
    const browseId = t.runs?.[0]?.endpoint?.payload?.browseId || (t as any).endpoint?.payload?.browseId;
    return { name, url: browseId ? `/channel/${browseId}` : undefined };
  }
  return {};
}

/** Extract highest quality thumbnail for video item. */
function extractVideoThumbnail(v: YTVideoItem): string {
  const thumb = largestThumb(v.content_image?.image) || largestThumb(v.thumbnails);
  if (thumb) return thumb;
  const id = v.content_id || v.id;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

/** Convert a generic video node (LockupView, Video, etc.) to Piped StreamItem. */
function videoToStreamItem(v: YTVideoItem): StreamItem | null {
  const id = v.content_id || v.id;
  if (!id) return null;
  const title =
    extractText(v.metadata?.title) ??
    extractText(v.title) ??
    '';
  const { name: uploaderName, url: uploaderUrl } = extractVideoUploader(v);
  const duration = extractVideoDuration(v);
  const thumbnail = extractVideoThumbnail(v);

  return {
    type: 'stream',
    url: `/watch?v=${id}`,
    title,
    thumbnail,
    uploaderName,
    uploaderUrl,
    duration,
    views: -1,
    uploaded: -1,
    uploaderVerified: false,
    isShort: false,
  };
}

/** Recursively traverse an Innertube response/memo tree to gather AST nodes. */
function getAllNodes(obj: unknown, visited = new Set<unknown>()): unknown[] {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) return [];
  visited.add(obj);

  const out: unknown[] = [obj];
  if (obj instanceof Map || (typeof (obj as any).values === 'function' && typeof (obj as any).get === 'function')) {
    for (const val of (obj as any).values()) {
      if (Array.isArray(val)) {
        for (const item of val) out.push(...getAllNodes(item, visited));
      } else {
        out.push(...getAllNodes(val, visited));
      }
    }
    return out;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) out.push(...getAllNodes(item, visited));
    return out;
  }

  for (const key of [
    'contents_memo',
    'memo',
    'on_response_received_actions_memo',
    'continuation_contents_memo',
    'page',
    'contents',
    'items',
  ] as const) {
    if ((obj as any)[key]) out.push(...getAllNodes((obj as any)[key], visited));
  }
  return out;
}

/** Extract continuation token string from any memo or container node. */
function extractContinuationToken(memoOrNode: unknown): string | null {
  if (!memoOrNode) return null;
  const nodes = getAllNodes(memoOrNode);
  for (const node of nodes) {
    const item = node as any;
    if (item?.type === 'ContinuationItem' || item?.type === 'ContinuationItemView') {
      const token = item.endpoint?.payload?.token;
      if (typeof token === 'string' && token.length > 0) return token;
    }
  }
  return null;
}

/** Map a Playlist AST node inside a channel tab to a ChannelTabItem. */
function playlistItemToChannelTabItem(p: any): ChannelTabItem | null {
  const id = p.id;
  if (!id) return null;
  const cleanId = id.startsWith('VL') ? id.slice(2) : id;
  const title = extractText(p.title) ?? extractText(p.name) ?? '';
  if (!title) return null;

  let uploaderName = p.author?.name ? String(p.author.name) : undefined;
  if (uploaderName) {
    // Strip date/separator if attached (e.g. "Coldplay · Sep 24, 2025")
    uploaderName = uploaderName.split(/\s+[·•]\s+/)[0]?.trim() || uploaderName;
  }
  const channelId = p.author?.id || p.author?.channel_id;
  const uploaderUrl = channelId ? `/channel/${channelId}` : undefined;

  const thumb =
    largestThumb(p.thumbnail_renderer?.thumbnail) ||
    largestThumb(p.thumbnails) ||
    largestThumb(p.thumbnail?.contents);

  const videoCount = parseVideoCount(p.video_count);

  return {
    type: 'playlist',
    url: `/playlist?list=${cleanId}`,
    playlistId: cleanId,
    name: title,
    uploaderName,
    uploaderUrl,
    thumbnail: thumb,
    thumbnails: thumb ? [{ url: thumb }] : [],
    uploaderVerified: false,
    videos: videoCount >= 0 ? videoCount : -1,
  };
}

/** Classify error into a SourceError kind. */
function classifyError(err: unknown, defaultKind: SourceErrorKind = 'unavailable'): SourceError {
  if (err instanceof SourceError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('not found') || lower.includes('404') || lower.includes('status code 404')) {
    return new SourceError('not_found', msg);
  }
  if (
    lower.includes('blocked') ||
    lower.includes('sign in') ||
    lower.includes('login_required') ||
    lower.includes('status code 403')
  ) {
    return new SourceError('blocked', msg);
  }
  return new SourceError(defaultKind, msg);
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
      const items = (section?.contents ?? []).map((item: any) => mapSearchItem(item, type)).filter(Boolean) as StreamItem[];
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
  async function searchNextPage(
    _q: string,
    nextpage: string,
    filter?: string,
  ): Promise<SearchPage> {
    if (!yt.actions) {
      throw new SourceError('unavailable', 'Actions service not available on this Innertube instance');
    }
    try {
      let token = nextpage;
      let effectiveFilter = filter;
      try {
        const parsed = JSON.parse(nextpage);
        if (parsed && typeof parsed === 'object') {
          if (parsed.t) token = parsed.t;
          if (parsed.f) effectiveFilter = parsed.f;
        }
      } catch {
        // raw token
      }

      const res = await yt.actions.execute('/search', {
        continuation: token,
        client: 'YTMUSIC',
        parse: true,
      });

      const type = filterToType[effectiveFilter ?? ''] || 'song';
      const rawItems = res?.continuation_contents?.contents ?? [];
      const items = rawItems
        .map((item: any) => mapSearchItem(item, type))
        .filter(Boolean) as StreamItem[];

      const nextToken = res?.continuation_contents?.continuation ?? null;
      const nextpageStr = nextToken ? JSON.stringify({ t: nextToken, f: effectiveFilter }) : null;

      return {
        items,
        nextpage: nextpageStr,
        suggestion: null,
        corrected: false,
      };
    } catch (err) {
      throw classifyError(err);
    }
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

  // ---- trending ------------------------------------------------------------
  async function trending(_region?: string): Promise<StreamItem[]> {
    if (typeof yt.getTrending === 'function') {
      try {
        const res = await yt.getTrending();
        if (Array.isArray(res)) return res;
        if (res?.videos && Array.isArray(res.videos)) {
          return res.videos.map(videoToStreamItem).filter(Boolean) as StreamItem[];
        }
      } catch (err) {
        throw classifyError(err);
      }
    }
    throw new SourceError('unavailable', 'Trending endpoint unavailable on this YouTube source');
  }

  // ---- channel -------------------------------------------------------------
  async function channel(id: string): Promise<Channel> {
    if (typeof yt.getChannel !== 'function') {
      throw new SourceError('unavailable', 'Channel endpoint not available on this Innertube instance');
    }
    try {
      const cleanId = id.startsWith('yt:') ? id.slice(3) : id;
      const ch = await yt.getChannel(cleanId);

      // Extract channel name
      const header = ch.header;
      const content = header?.content;
      const name =
        extractText(ch.metadata?.title) ??
        extractText(content?.title) ??
        extractText(header?.page_title) ??
        extractText(header?.author?.name) ??
        '';

      const isTopic = name.toLowerCase().endsWith('- topic') || cleanId.endsWith('_topic');

      // Avatar
      const avatarUrl =
        largestThumb(content?.image?.avatar?.[0]?.image) ||
        largestThumb(ch.metadata?.avatar) ||
        largestThumb(header?.author?.thumbnails);

      // Banner
      const bannerUrl =
        largestThumb(content?.banner?.image) ||
        largestThumb(header?.banner);

      // Subscriber count
      let subCount = -1;
      if (header?.subscribers) {
        subCount = parseSubscriberCount(header.subscribers) ?? -1;
      }
      if (subCount < 0 && content?.metadata?.metadata_rows) {
        for (const row of content.metadata.metadata_rows) {
          for (const part of row.metadata_parts ?? []) {
            const t = part.text?.text;
            if (t && t.toLowerCase().includes('subscriber')) {
              subCount = parseSubscriberCount(t) ?? -1;
              break;
            }
          }
          if (subCount >= 0) break;
        }
      }

      // Related streams: Topic channels have empty relatedStreams per requirements!
      const relatedStreams: StreamItem[] = [];
      if (!isTopic && Array.isArray(ch.videos)) {
        for (const v of ch.videos) {
          const item = videoToStreamItem(v);
          if (item) relatedStreams.push(item);
        }
      }

      // Find tabs (specifically releases / albums tab)
      const tabs: ChannelTab[] = [];
      const allTabs = getAllNodes(ch.page?.contents_memo || ch.memo);
      for (const node of allTabs) {
        const t = node as any;
        if (t?.type === 'Tab' || t?.type === 'ExpandableTab') {
          const tabTitle = (extractText(t?.title) || '').toLowerCase();
          const tabUrl = (t?.endpoint?.metadata?.url || '').toLowerCase();
          if (tabTitle.includes('release') || tabTitle.includes('album') || tabUrl.includes('releases')) {
            const payload = t.endpoint?.payload;
            if (payload?.browseId || payload?.params) {
              tabs.push({
                name: 'albums',
                data: JSON.stringify({
                  browseId: payload.browseId ?? cleanId,
                  params: payload.params,
                  channelId: cleanId,
                }),
              });
              break;
            }
          }
        }
      }

      // If no endpoint tab found but ch.tabs has strings (or has_releases)
      if (
        tabs.length === 0 &&
        ((ch as any).has_releases ||
          ch.tabs?.some((t) => typeof t === 'string' && (t.toLowerCase() === 'releases' || t.toLowerCase() === 'albums')))
      ) {
        tabs.push({
          name: 'albums',
          data: JSON.stringify({
            browseId: cleanId,
            params: 'EghyZWxlYXNlc_IGBQoDsgEA',
            channelId: cleanId,
          }),
        });
      }

      return {
        id: cleanId,
        name,
        avatarUrl,
        bannerUrl,
        description: '',
        nextpage: null,
        subscriberCount: subCount >= 0 ? subCount : 0,
        verified: true,
        relatedStreams,
        tabs: tabs.length > 0 ? tabs : undefined,
      };
    } catch (err) {
      throw classifyError(err);
    }
  }

  // ---- channelTabs ---------------------------------------------------------
  async function channelTabs(data: string): Promise<ChannelTabPage> {
    if (!yt.actions) {
      throw new SourceError('unavailable', 'Actions service not available on this Innertube instance');
    }
    try {
      let payload: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          payload = parsed as Record<string, unknown>;
        } else if (typeof parsed === 'string') {
          payload = { token: parsed };
        }
      } catch {
        payload = { token: data };
      }

      const browseArgs: Record<string, unknown> = { parse: true };
      if (payload.token) {
        browseArgs.token = payload.token;
      } else if (payload.continuation) {
        browseArgs.continuation = payload.continuation;
      } else {
        if (payload.browseId) browseArgs.browseId = payload.browseId;
        if (payload.params) browseArgs.params = payload.params;
      }

      const res = await yt.actions.execute('/browse', browseArgs);
      const nodes = getAllNodes(res);
      const content: ChannelTabItem[] = [];
      const seen = new Set<string>();

      for (const node of nodes) {
        const item = node as any;
        if (item?.type === 'Playlist' || item?.type === 'GridPlaylist') {
          const tabItem = playlistItemToChannelTabItem(item);
          if (tabItem && tabItem.url && !seen.has(tabItem.url)) {
            seen.add(tabItem.url);
            content.push(tabItem);
          }
        }
      }

      const nextToken = extractContinuationToken(res);
      const nextpage = nextToken ? JSON.stringify({ token: nextToken }) : null;

      return { content, nextpage };
    } catch (err) {
      throw classifyError(err);
    }
  }

  // ---- playlist ------------------------------------------------------------
  async function playlist(id: string): Promise<Playlist> {
    if (typeof yt.getPlaylist !== 'function') {
      throw new SourceError('unavailable', 'Playlist endpoint not available on this Innertube instance');
    }
    try {
      const cleanId = id.startsWith('VL') ? id.slice(2) : id;
      const res = await yt.getPlaylist(cleanId);
      const info = res.info ?? {};
      const title = info.title ?? '';
      const description = info.description ?? '';
      const uploader = info.author?.name ?? '';
      const uploaderUrl = info.author?.id ? `/channel/${info.author.id}` : '';
      const uploaderAvatar = largestThumb(info.author?.thumbnails);
      const thumbnailUrl = largestThumb(info.thumbnails);
      const rawVideos = res.videos ?? [];
      const relatedStreams = rawVideos.map(videoToStreamItem).filter(Boolean) as StreamItem[];
      const videoCountParsed = parseVideoCount(info.total_items);
      const videos = videoCountParsed >= 0 ? videoCountParsed : relatedStreams.length;

      const nextToken =
        extractContinuationToken(res.memo) ??
        extractContinuationToken(res.page?.contents_memo);
      const nextpage = nextToken ? JSON.stringify({ token: nextToken, playlistId: cleanId }) : null;

      return {
        name: title,
        thumbnailUrl,
        description,
        bannerUrl: '',
        nextpage,
        uploader,
        uploaderUrl,
        uploaderAvatar,
        videos,
        relatedStreams,
      };
    } catch (err) {
      throw classifyError(err);
    }
  }

  // ---- playlistNextPage ----------------------------------------------------
  async function playlistNextPage(id: string, nextpage: string): Promise<PlaylistPage> {
    if (!yt.actions) {
      throw new SourceError('unavailable', 'Actions service not available on this Innertube instance');
    }
    try {
      let token = nextpage;
      try {
        const parsed = JSON.parse(nextpage);
        if (parsed && typeof parsed === 'object') {
          if (parsed.token) token = parsed.token;
          else if (parsed.t) token = parsed.t;
        }
      } catch {
        // raw token
      }

      const res = await yt.actions.execute('/browse', { token, parse: true });
      const nodes = getAllNodes(res);
      const streamItems: StreamItem[] = [];
      const seen = new Set<string>();

      for (const node of nodes) {
        const item = node as any;
        if (
          item?.type === 'LockupView' ||
          item?.type === 'PlaylistVideo' ||
          item?.type === 'CompactVideo' ||
          item?.type === 'Video'
        ) {
          const stream = videoToStreamItem(item);
          if (stream && stream.url && !seen.has(stream.url)) {
            seen.add(stream.url);
            streamItems.push(stream);
          }
        }
      }

      const nextToken = extractContinuationToken(res);
      const cleanId = id.startsWith('VL') ? id.slice(2) : id;
      const nextpageStr = nextToken ? JSON.stringify({ token: nextToken, playlistId: cleanId }) : null;

      return {
        relatedStreams: streamItems,
        nextpage: nextpageStr,
      };
    } catch (err) {
      throw classifyError(err);
    }
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
