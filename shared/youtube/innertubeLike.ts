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
  };
}

/** A section inside a music search response or suggestions response. */
export interface YTMusicSection {
  /** Contents of the section: search result items. */
  contents?: YTMusicItem[];
  /** Continuation token for the next page. */
  continuation?: string | null;
}

/** A search suggestion item (SearchSuggestion or MusicResponsiveListItem). */
export interface YTSuggestionItem {
  /** For SearchSuggestion items: object with .text string. */
  suggestion?: { text?: string } | string | null;
  /** Title for responsive list items. */
  title?: string | { text?: string } | null;
  /** Name for artist items. */
  name?: string | { text?: string } | null;
}

/** A suggestions section. */
export interface YTSuggestionsSection {
  contents?: YTSuggestionItem[];
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
  contents?: YTMusicSection[];
}

/** The music sub-service of Innertube. */
export interface InnertubeMusicLike {
  search(q: string, opts: { type: 'song' | 'album' | 'artist' | 'playlist' }): Promise<YTMusicSearchResult>;
  getSearchSuggestions(q: string): Promise<YTSuggestionsSection[]>;
}

/** The minimal Innertube interface used by createYoutubeiSource. */
export interface InnertubeLike {
  getBasicInfo(
    videoId: string,
    opts?: { client?: string },
  ): Promise<YTBasicInfoResult>;
  music: InnertubeMusicLike;
}
