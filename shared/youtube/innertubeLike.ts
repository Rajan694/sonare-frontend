// Minimal structural interface for a youtubei.js Innertube instance.
// Only the members used by createYoutubeiSource are typed here.
// Each app creates the real Innertube and passes it in; this file must
// not import 'youtubei.js' so that shared/ stays dependency-free.

/** A thumbnail with a URL and optional dimensions. */
export interface YTThumbnail {
  url: string;
  width?: number;
  height?: number;
}

/** A music search result item (MusicResponsiveListItem). */
export interface YTMusicItem {
  /** Video/playlist/channel id (may carry VL prefix for playlists). */
  id?: string;
  /** Title: string or object with .text */
  title?: string | { text?: string };
  /** Name (used for artists/playlists). */
  name?: string | { text?: string };
  /** Duration in seconds and/or as formatted text. */
  duration?: { seconds?: number; text?: string } | null;
  /** Artists array for song items. */
  artists?: Array<{ name?: string; channel_id?: string }> | null;
  /** Author for album/playlist items. */
  author?: { name?: string; channel_id?: string } | null;
  /** Subscriber count for artist items. */
  subscribers?: string | number | null;
  /** MusicThumbnail with contents array of thumbnails. */
  thumbnail?: YTMusicThumbnail | null;
  /** Overlay containing a play-button with the OLAK playlist id for album items. */
  overlay?: YTMusicItemOverlay | null;
  /** Flex columns for music items (contains author / subtitle runs). */
  flex_columns?: Array<{
    title?: {
      text?: string;
      runs?: Array<{ text?: string; endpoint?: { payload?: { browseId?: string } } }>;
      toString?: () => string;
    };
  }>;
}

export interface YTMusicThumbnail {
  contents?: YTThumbnail[];
}

export interface YTMusicItemOverlay {
  content?: {
    endpoint?: {
      payload?: {
        playlistId?: string;
      };
    };
  } | null;
  [key: string]: any;
}

/** A section inside a music search response or suggestions response. */
export interface YTMusicSection {
  /** Contents of the section: search result items. */
  contents?: any[];
  /** Continuation token for the next page. */
  continuation?: string | null;
  [key: string]: any;
}

/** A search suggestion item (SearchSuggestion or MusicResponsiveListItem). */
export interface YTSuggestionItem {
  /** For SearchSuggestion items: object with .text string. */
  suggestion?: { text?: string } | string | null;
  /** Title for responsive list items. */
  title?: string | { text?: string } | null;
  /** Name for artist items. */
  name?: string | { text?: string } | null;
  [key: string]: any;
}

/** A suggestions section. */
export interface YTSuggestionsSection {
  contents?: any[];
  [key: string]: any;
}

/** Basic info about a video. */
export interface YTBasicInfo {
  title?: string;
  author?: string;
  channel_id?: string;
  duration?: number;
  thumbnail?: YTThumbnail[];
}

/** Playability status of a video. */
export interface YTPlayabilityStatus {
  status?: string;
  reason?: string;
}

/** A single adaptive/format stream entry. */
export interface YTStreamFormat {
  itag?: number;
  url?: string | null;
  mime_type?: string;
  bitrate?: number;
  content_length?: number;
  quality?: string;
  has_audio?: boolean;
  has_video?: boolean;
}

/** Streaming data returned by getBasicInfo. */
export interface YTStreamingData {
  adaptive_formats?: YTStreamFormat[];
  formats?: YTStreamFormat[];
  expires?: Date;
  hls_manifest_url?: string | null;
  dash_manifest_url?: string | null;
}

/** Return value of getBasicInfo. */
export interface YTBasicInfoResult {
  basic_info: YTBasicInfo;
  playability_status?: YTPlayabilityStatus;
  streaming_data?: YTStreamingData | null;
}

/** Return value of music.search. */
export interface YTMusicSearchResult {
  /** Main sections of the search response. */
  contents?: any[];
  [key: string]: any;
}

/** The music sub-service of Innertube. */
export interface InnertubeMusicLike {
  search(q: string, opts: { type: 'song' | 'album' | 'artist' | 'playlist' }): Promise<YTMusicSearchResult>;
  getSearchSuggestions(q: string): Promise<YTSuggestionsSection[]>;
}

/** A video item inside a playlist or channel. */
export interface YTVideoItem {
  id?: string;
  content_id?: string;
  type?: string;
  title?: any;
  metadata?: any;
  author?: any;
  duration?: any;
  thumbnails?: any;
  content_image?: any;
  [key: string]: any;
}

/** Playlist info returned by getPlaylist. */
export interface YTPlaylistInfo {
  title?: string;
  description?: string;
  author?: any;
  total_items?: string | number;
  thumbnails?: YTThumbnail[];
  [key: string]: any;
}

/** Return value of getPlaylist. */
export interface YTPlaylistResult {
  info?: any;
  videos?: any[];
  has_continuation?: boolean;
  memo?: unknown;
  page?: {
    contents_memo?: unknown;
  };
  [key: string]: any;
}

/** Channel header returned by getChannel. */
export interface YTChannelHeader {
  type?: string;
  page_title?: string;
  author?: any;
  subscribers?: any;
  banner?: any;
  content?: any;
  [key: string]: any;
}

/** Return value of getChannel. */
export interface YTChannelResult {
  header?: any;
  metadata?: any;
  has_videos?: boolean;
  videos?: any[];
  tabs?: string[];
  memo?: unknown;
  page?: {
    contents_memo?: unknown;
  };
  [key: string]: any;
}

/** Actions service for calling Innertube endpoints directly. */
export interface YTActionsLike {
  execute(
    endpoint: string,
    payload: Record<string, unknown>,
  ): Promise<any>;
}

/** The minimal Innertube interface used by createYoutubeiSource. */
export interface InnertubeLike {
  getBasicInfo(
    videoId: string,
    opts?: { client?: string },
  ): Promise<YTBasicInfoResult>;
  getPlaylist?(id: string): Promise<YTPlaylistResult>;
  getChannel?(id: string): Promise<YTChannelResult>;
  getTrending?(): Promise<any>;
  actions?: YTActionsLike;
  music: InnertubeMusicLike;
}
