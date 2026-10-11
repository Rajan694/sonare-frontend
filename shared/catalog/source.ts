// YouTubeSource interface and SourceError for the catalog layer.
// Same contract as backend/src/upstream/piped.ts Piped class.

import type { Channel, ChannelTabPage, Playlist, PlaylistPage, SearchPage, Streams, StreamItem } from './pipedTypes.js';

export type SourceErrorKind = 'unavailable' | 'not_found' | 'blocked' | 'bad_response';

export class SourceError extends Error {
  kind: SourceErrorKind;

  constructor(kind: SourceErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'SourceError';
  }
}

export interface YouTubeSource {
  getStream(videoId: string): Promise<Streams>;
  search(q: string, filter?: string): Promise<SearchPage>;
  searchNextPage(q: string, nextpage: string, filter?: string): Promise<SearchPage>;
  suggestions(query: string): Promise<string[]>;
  trending(region?: string): Promise<StreamItem[]>;
  channel(id: string): Promise<Channel>;
  channelTabs(data: string): Promise<ChannelTabPage>;
  playlist(id: string): Promise<Playlist>;
  playlistNextPage(id: string, nextpage: string): Promise<PlaylistPage>;
}
