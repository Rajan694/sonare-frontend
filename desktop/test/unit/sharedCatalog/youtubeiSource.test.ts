import { describe, expect, it } from 'vitest';
import type {
  InnertubeLike,
  YTBasicInfoResult,
  YTMusicItem,
  YTMusicSearchResult,
  YTSuggestionsSection,
} from '../../../../shared/youtube/innertubeLike';
import { createYoutubeiSource } from '../../../../shared/youtube/youtubeiSource';
import { SourceError } from '../../../../shared/catalog/source';

// ---------------------------------------------------------------------------
// Factories for fake youtubei.js data
// ---------------------------------------------------------------------------

function fakeBasicInfo(overrides: Partial<YTBasicInfoResult> = {}): YTBasicInfoResult {
  return {
    basic_info: {
      title: 'Test Song',
      author: 'Test Artist',
      channel_id: 'UCtest12345678901234',
      duration: 210,
      thumbnail: [
        { url: 'https://i.ytimg.com/vi/abc/default.jpg', width: 120, height: 90 },
        { url: 'https://i.ytimg.com/vi/abc/hq720.jpg', width: 1280, height: 720 },
      ],
    },
    playability_status: { status: 'OK', reason: '' },
    streaming_data: {
      adaptive_formats: [
        {
          itag: 251,
          url: 'https://rr1.googlevideo.com/videoplayback?itag=251',
          mime_type: 'audio/webm; codecs="opus"',
          bitrate: 136544,
          content_length: 3433755,
          quality: 'tiny',
          has_audio: true,
          has_video: false,
        },
        {
          itag: 140,
          url: 'https://rr1.googlevideo.com/videoplayback?itag=140',
          mime_type: 'audio/mp4; codecs="mp4a.40.2"',
          bitrate: 130677,
          content_length: 3449447,
          quality: 'tiny',
          has_audio: true,
          has_video: false,
        },
        {
          itag: 137,
          url: 'https://rr1.googlevideo.com/videoplayback?itag=137',
          mime_type: 'video/mp4; codecs="avc1.640028"',
          bitrate: 4000000,
          content_length: 50000000,
          quality: '1080p',
          has_audio: false,
          has_video: true,
        },
      ],
      formats: [],
    },
    ...overrides,
  };
}

function fakeInnertube(
  opts: {
    getBasicInfo?: (id: string, o?: { client?: string }) => Promise<YTBasicInfoResult>;
    search?: (q: string, o: { type: string }) => Promise<YTMusicSearchResult>;
    getSearchSuggestions?: (q: string) => Promise<YTSuggestionsSection[]>;
    getPlaylist?: (id: string) => Promise<any>;
    getChannel?: (id: string) => Promise<any>;
    getTrending?: () => Promise<any>;
    actions?: InnertubeLike['actions'];
  } = {},
): InnertubeLike {
  return {
    getBasicInfo: opts.getBasicInfo ?? (async () => fakeBasicInfo()),
    music: {
      search: (opts.search ?? (async () => ({ contents: [] }))) as InnertubeLike['music']['search'],
      getSearchSuggestions: opts.getSearchSuggestions ?? (async () => []),
    },
    ...(opts.getPlaylist ? { getPlaylist: opts.getPlaylist } : {}),
    ...(opts.getChannel ? { getChannel: opts.getChannel } : {}),
    ...(opts.getTrending ? { getTrending: opts.getTrending } : {}),
    ...(opts.actions ? { actions: opts.actions } : {}),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('youtubeiSource', () => {
  // == getStream ==

  it('WEB-CAT-037: getStream maps VISIONOS response to Piped Streams shape', async () => {
    const yt = fakeInnertube();
    const src = createYoutubeiSource(yt);
    const s = await src.getStream('abc123');
    expect(s.title).toBe('Test Song');
    expect(s.uploader).toBe('Test Artist');
    expect(s.uploaderUrl).toBe('/channel/UCtest12345678901234');
    expect(s.duration).toBe(210);
    expect(s.thumbnailUrl).toBe('https://i.ytimg.com/vi/abc/hq720.jpg');
    expect(s.audioStreams).toHaveLength(2);
    expect(s.videoStreams).toHaveLength(0); // no muxed formats
    // Video-only adaptive should NOT appear in audioStreams
    const itags = s.audioStreams.map((a) => a.itag);
    expect(itags).toContain(251);
    expect(itags).toContain(140);
    expect(itags).not.toContain(137);
  });

  it('WEB-CAT-038: getStream tries clients in order and uses first success', async () => {
    const calls: string[] = [];
    const yt = fakeInnertube({
      getBasicInfo: async (_id, opts) => {
        calls.push(opts?.client ?? 'default');
        if (opts?.client === 'MWEB') {
          return fakeBasicInfo({
            playability_status: { status: 'LOGIN_REQUIRED', reason: 'Sign in' },
          });
        }
        return fakeBasicInfo();
      },
    });
    const src = createYoutubeiSource(yt, { clients: ['MWEB', 'VISIONOS'] });
    const s = await src.getStream('x');
    expect(calls).toEqual(['MWEB', 'VISIONOS']);
    expect(s.title).toBe('Test Song');
  });

  it('WEB-CAT-039: getStream skips formats without a url', async () => {
    const yt = fakeInnertube({
      getBasicInfo: async () =>
        fakeBasicInfo({
          streaming_data: {
            adaptive_formats: [
              {
                itag: 251,
                url: null, // no url — must be skipped
                mime_type: 'audio/webm; codecs="opus"',
                bitrate: 136544,
                has_audio: true,
                has_video: false,
              },
              {
                itag: 140,
                url: 'https://rr1.googlevideo.com/videoplayback?itag=140',
                mime_type: 'audio/mp4; codecs="mp4a.40.2"',
                bitrate: 130677,
                content_length: 3449447,
                quality: 'tiny',
                has_audio: true,
                has_video: false,
              },
            ],
            formats: [],
          },
        }),
    });
    const src = createYoutubeiSource(yt);
    const s = await src.getStream('x');
    expect(s.audioStreams).toHaveLength(1);
    expect(s.audioStreams[0].itag).toBe(140);
  });

  it('WEB-CAT-040: getStream maps codec and format correctly', async () => {
    const yt = fakeInnertube();
    const src = createYoutubeiSource(yt);
    const s = await src.getStream('x');
    const opus = s.audioStreams.find((a) => a.itag === 251)!;
    expect(opus.format).toBe('WEBMA_OPUS');
    expect(opus.codec).toBe('opus');
    const m4a = s.audioStreams.find((a) => a.itag === 140)!;
    expect(m4a.format).toBe('M4A');
    expect(m4a.codec).toBe('mp4a.40.2');
  });

  it('WEB-CAT-041: getStream throws blocked when all clients return LOGIN_REQUIRED', async () => {
    const yt = fakeInnertube({
      getBasicInfo: async () =>
        fakeBasicInfo({
          playability_status: { status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm' },
          streaming_data: null,
        }),
    });
    const src = createYoutubeiSource(yt, { clients: ['VISIONOS'] });
    await expect(src.getStream('x')).rejects.toThrow(SourceError);
    try {
      await src.getStream('x');
    } catch (e) {
      expect((e as SourceError).kind).toBe('blocked');
    }
  });

  it('WEB-CAT-042: getStream throws not_found for ERROR status', async () => {
    const yt = fakeInnertube({
      getBasicInfo: async () =>
        fakeBasicInfo({
          playability_status: { status: 'ERROR', reason: 'Video unavailable' },
          streaming_data: null,
        }),
    });
    const src = createYoutubeiSource(yt);
    await expect(src.getStream('x')).rejects.toThrow(SourceError);
    try {
      await src.getStream('x');
    } catch (e) {
      expect((e as SourceError).kind).toBe('not_found');
    }
  });

  it('WEB-CAT-043: getStream throws unavailable on network error', async () => {
    const yt = fakeInnertube({
      getBasicInfo: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    const src = createYoutubeiSource(yt);
    await expect(src.getStream('x')).rejects.toThrow(SourceError);
    try {
      await src.getStream('x');
    } catch (e) {
      expect((e as SourceError).kind).toBe('unavailable');
    }
  });

  it('WEB-CAT-044: getStream contentLength is -1 when unknown', async () => {
    const yt = fakeInnertube({
      getBasicInfo: async () =>
        fakeBasicInfo({
          streaming_data: {
            adaptive_formats: [
              {
                itag: 251,
                url: 'https://rr1.googlevideo.com/videoplayback',
                mime_type: 'audio/webm; codecs="opus"',
                bitrate: 130000,
                // content_length intentionally missing
                has_audio: true,
                has_video: false,
              },
            ],
            formats: [],
          },
        }),
    });
    const src = createYoutubeiSource(yt);
    const s = await src.getStream('x');
    expect(s.audioStreams[0].contentLength).toBe(-1);
  });

  // == search ==

  it('WEB-CAT-045: search songs maps to Piped StreamItem with correct url and artist', async () => {
    const yt = fakeInnertube({
      search: async () => ({
        contents: [
          {
            contents: [
              {
                id: 'H3Kzh6RrnMc',
                title: 'Hymn for the Weekend',
                artists: [{ name: 'Coldplay', channel_id: 'UCIaFw5VBEK8qaW6nRpx_qnw' }],
                duration: { seconds: 259, text: '4:19' },
                thumbnail: {
                  contents: [{ url: 'https://i.ytimg.com/vi/H3Kzh6RrnMc/hq720.jpg', width: 1280, height: 720 }],
                },
              },
            ] as YTMusicItem[],
            continuation: 'abc123token',
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const page = await src.search('coldplay', 'music_songs');
    expect(page.items).toHaveLength(1);
    const s = page.items[0];
    expect(s.type).toBe('stream');
    expect(s.url).toBe('/watch?v=H3Kzh6RrnMc');
    expect(s.title).toBe('Hymn for the Weekend');
    expect(s.uploaderName).toBe('Coldplay');
    expect(s.uploaderUrl).toBe('/channel/UCIaFw5VBEK8qaW6nRpx_qnw');
    expect(s.duration).toBe(259);
  });

  it('WEB-CAT-046: search songs uses first artist name matching backend', async () => {
    const yt = fakeInnertube({
      search: async () => ({
        contents: [
          {
            contents: [
              {
                id: 'xyz',
                title: 'Duet Song',
                artists: [
                  { name: 'Artist One', channel_id: 'UCone' },
                  { name: 'Artist Two', channel_id: 'UCtwo' },
                ],
                duration: { seconds: 180 },
                thumbnail: { contents: [{ url: 'https://thumb.jpg', width: 120, height: 120 }] },
              },
            ] as YTMusicItem[],
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const page = await src.search('duet', 'music_songs');
    expect(page.items[0].uploaderName).toBe('Artist One');
    // uploaderUrl should be the first artist with a channel_id
    expect(page.items[0].uploaderUrl).toBe('/channel/UCone');
  });

  it('WEB-CAT-047: search albums extracts OLAK playlist id from overlay', async () => {
    const yt = fakeInnertube({
      search: async () => ({
        contents: [
          {
            contents: [
              {
                id: 'MPREb_Y34ylqw59dN',
                title: 'Midnight (Kygo Remix)',
                author: { name: 'Coldplay', channel_id: 'UCIaFw5VBEK8qaW6nRpx_qnw' },
                thumbnail: { contents: [{ url: 'https://thumb.jpg', width: 544, height: 544 }] },
                overlay: {
                  content: {
                    endpoint: {
                      payload: { playlistId: 'OLAK5uy_kuPAIyP_Fm2myDbUn1hXrpc0dQ_e851qM' },
                    },
                  },
                },
              },
            ] as YTMusicItem[],
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const page = await src.search('coldplay', 'music_albums');
    expect(page.items).toHaveLength(1);
    const a = page.items[0];
    expect(a.type).toBe('playlist');
    expect(a.url).toBe('/playlist?list=OLAK5uy_kuPAIyP_Fm2myDbUn1hXrpc0dQ_e851qM');
    expect(a.name).toBe('Midnight (Kygo Remix)');
    expect(a.uploaderName).toBe('Coldplay');
    expect(a.uploaderUrl).toBe('/channel/UCIaFw5VBEK8qaW6nRpx_qnw');
  });

  it('WEB-CAT-048: search albums skips items without OLAK id', async () => {
    const yt = fakeInnertube({
      search: async () => ({
        contents: [
          {
            contents: [
              {
                id: 'MPREb_noOlak',
                title: 'Some Album',
                author: { name: 'Artist' },
                thumbnail: { contents: [{ url: 'https://t.jpg' }] },
                overlay: {
                  content: {
                    endpoint: {
                      payload: { playlistId: 'RDAMVMxyz' }, // not OLAK
                    },
                  },
                },
              },
            ] as YTMusicItem[],
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const page = await src.search('test', 'music_albums');
    expect(page.items).toHaveLength(0);
  });

  it('WEB-CAT-049: search artists maps to channel StreamItem with subscriberCount', async () => {
    const yt = fakeInnertube({
      search: async () => ({
        contents: [
          {
            contents: [
              {
                id: 'UCIaFw5VBEK8qaW6nRpx_qnw',
                name: 'Coldplay',
                subscribers: '338M monthly audience',
                thumbnail: {
                  contents: [{ url: 'https://lh3.googleusercontent.com/artist.jpg', width: 120, height: 120 }],
                },
              },
            ] as YTMusicItem[],
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const page = await src.search('coldplay', 'music_artists');
    expect(page.items).toHaveLength(1);
    const artist = page.items[0];
    expect(artist.type).toBe('channel');
    expect(artist.url).toBe('/channel/UCIaFw5VBEK8qaW6nRpx_qnw');
    expect(artist.name).toBe('Coldplay');
    expect(artist.subscriberCount).toBe(338000000);
  });

  it('WEB-CAT-050: search playlists strips VL prefix from id', async () => {
    const yt = fakeInnertube({
      search: async () => ({
        contents: [
          {
            contents: [
              {
                id: 'VLPLgxs93BSP-hrI_pMZT28kVmGcvfFq234b',
                title: 'Test Playlist',
                author: { name: 'User', channel_id: 'UCuser123' },
                thumbnail: { contents: [{ url: 'https://thumb.jpg' }] },
              },
            ] as YTMusicItem[],
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const page = await src.search('test', 'music_playlists');
    expect(page.items).toHaveLength(1);
    expect(page.items[0].url).toBe('/playlist?list=PLgxs93BSP-hrI_pMZT28kVmGcvfFq234b');
    expect(page.items[0].name).toBe('Test Playlist');
  });

  it('WEB-CAT-051: search returns nextpage with continuation token and filter', async () => {
    const yt = fakeInnertube({
      search: async () => ({
        contents: [
          {
            contents: [
              {
                id: 'x',
                title: 'Song',
                artists: [{ name: 'A' }],
                duration: { seconds: 100 },
                thumbnail: { contents: [{ url: 'https://t.jpg' }] },
              },
            ] as YTMusicItem[],
            continuation: 'continuationToken123',
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const page = await src.search('q', 'music_songs');
    expect(page.nextpage).not.toBeNull();
    const parsed = JSON.parse(page.nextpage!);
    expect(parsed.t).toBe('continuationToken123');
    expect(parsed.f).toBe('music_songs');
  });

  it('WEB-CAT-052: search returns null nextpage when no continuation', async () => {
    const yt = fakeInnertube({
      search: async () => ({
        contents: [
          {
            contents: [
              {
                id: 'x',
                title: 'Song',
                artists: [{ name: 'A' }],
                duration: { seconds: 100 },
                thumbnail: { contents: [{ url: 'https://t.jpg' }] },
              },
            ] as YTMusicItem[],
            // no continuation
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const page = await src.search('q', 'music_songs');
    expect(page.nextpage).toBeNull();
  });

  // == suggestions ==

  it('WEB-CAT-053: suggestions extracts plain strings from SearchSuggestion items', async () => {
    const yt = fakeInnertube({
      getSearchSuggestions: async () =>
        [
          {
            contents: [{ suggestion: { text: 'coldplay' } }, { suggestion: { text: 'coldplay songs' } }],
          },
        ] as YTSuggestionsSection[],
    });
    const src = createYoutubeiSource(yt);
    const result = await src.suggestions('coldplay');
    expect(result).toEqual(['coldplay', 'coldplay songs']);
  });

  it('WEB-CAT-054: suggestions extracts strings from MusicResponsiveListItem in second section', async () => {
    const yt = fakeInnertube({
      getSearchSuggestions: async () =>
        [
          {
            contents: [{ suggestion: { text: 'coldplay' } }],
          },
          {
            contents: [{ name: 'Coldplay' }, { title: 'Yellow' }],
          },
        ] as YTSuggestionsSection[],
    });
    const src = createYoutubeiSource(yt);
    const result = await src.suggestions('coldplay');
    expect(result).toEqual(['coldplay', 'Coldplay', 'Yellow']);
  });

  it('WEB-CAT-055: suggestions wraps network error as SourceError unavailable', async () => {
    const yt = fakeInnertube({
      getSearchSuggestions: async () => {
        throw new Error('fetch failed');
      },
    });
    const src = createYoutubeiSource(yt);
    await expect(src.suggestions('q')).rejects.toThrow(SourceError);
    try {
      await src.suggestions('q');
    } catch (e) {
      expect((e as SourceError).kind).toBe('unavailable');
    }
  });

  // == stub methods ==

  it('WEB-CAT-056: unimplemented methods throw SourceError unavailable', async () => {
    const yt = fakeInnertube();
    const src = createYoutubeiSource(yt);
    for (const method of ['trending', 'channel', 'channelTabs', 'playlist', 'playlistNextPage'] as const) {
      await expect((src as Record<string, (...a: string[]) => Promise<unknown>>)[method]('x', 'y')).rejects.toThrow(
        SourceError,
      );
    }
  });

  it('WEB-CAT-057: getStream selects largest thumbnail by width', async () => {
    const yt = fakeInnertube({
      getBasicInfo: async () =>
        fakeBasicInfo({
          basic_info: {
            title: 'T',
            author: 'A',
            channel_id: 'UCx',
            duration: 100,
            thumbnail: [
              { url: 'https://small.jpg', width: 120, height: 90 },
              { url: 'https://large.jpg', width: 1920, height: 1080 },
              { url: 'https://medium.jpg', width: 640, height: 480 },
            ],
          },
        }),
    });
    const src = createYoutubeiSource(yt);
    const s = await src.getStream('x');
    expect(s.thumbnailUrl).toBe('https://large.jpg');
  });

  it('WEB-CAT-058: getStream falls through client with no audio formats to next client', async () => {
    let callNum = 0;
    const yt = fakeInnertube({
      getBasicInfo: async () => {
        callNum++;
        if (callNum === 1) {
          // First client: OK but no audio formats with url
          return fakeBasicInfo({
            streaming_data: {
              adaptive_formats: [
                {
                  itag: 137,
                  url: 'https://video.com/v',
                  mime_type: 'video/mp4; codecs="avc1"',
                  bitrate: 4000000,
                  has_audio: false,
                  has_video: true,
                },
              ],
              formats: [],
            },
          });
        }
        return fakeBasicInfo();
      },
    });
    const src = createYoutubeiSource(yt, { clients: ['MWEB', 'VISIONOS'] });
    const s = await src.getStream('x');
    expect(callNum).toBe(2);
    expect(s.audioStreams.length).toBeGreaterThan(0);
  });

  it('WEB-CAT-059: search wraps network error as SourceError unavailable', async () => {
    const yt = fakeInnertube({
      search: async () => {
        throw new Error('network down');
      },
    });
    const src = createYoutubeiSource(yt);
    await expect(src.search('q', 'music_songs')).rejects.toThrow(SourceError);
    try {
      await src.search('q', 'music_songs');
    } catch (e) {
      expect((e as SourceError).kind).toBe('unavailable');
    }
  });

  it('WEB-CAT-060: getStream uses muxed formats in videoStreams when present', async () => {
    const yt = fakeInnertube({
      getBasicInfo: async () =>
        fakeBasicInfo({
          streaming_data: {
            adaptive_formats: [
              {
                itag: 251,
                url: 'https://audio.com/a',
                mime_type: 'audio/webm; codecs="opus"',
                bitrate: 130000,
                has_audio: true,
                has_video: false,
              },
            ],
            formats: [
              {
                itag: 18,
                url: 'https://muxed.com/v',
                mime_type: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"',
                bitrate: 500000,
                has_audio: true,
                has_video: true,
              },
            ],
          },
        }),
    });
    const src = createYoutubeiSource(yt);
    const s = await src.getStream('x');
    expect(s.audioStreams).toHaveLength(1);
    expect(s.videoStreams).toHaveLength(1);
    expect(s.videoStreams[0].itag).toBe(18);
  });

  // == playlist ==

  it('WEB-CAT-064: playlist maps playlist details and video items to Piped Playlist shape', async () => {
    const yt = fakeInnertube({
      getPlaylist: async () => ({
        info: {
          title: 'Album - Moon Music',
          description: 'Moon Music Description',
          total_items: 2,
          author: {
            name: 'Coldplay',
            id: 'UCDPM_123',
            thumbnails: [{ url: 'https://author.jpg', width: 300, height: 300 }],
          },
          thumbnails: [{ url: 'https://cover.jpg', width: 500, height: 500 }],
        },
        videos: [
          {
            id: 'vid1',
            title: 'feelslikeimfallinginlove',
            author: { name: 'Coldplay', channel_id: 'UCDPM_123' },
            duration: { seconds: 236 },
            thumbnails: [{ url: 'https://thumb1.jpg', width: 120, height: 90 }],
          },
        ],
        memo: new Map([
          [
            'ContinuationItem',
            [
              {
                type: 'ContinuationItem',
                endpoint: { payload: { token: 'playlist_cont_token' } },
              },
            ],
          ],
        ]),
      }),
    });
    const src = createYoutubeiSource(yt);
    const pl = await src.playlist('OLAK5uy_123');
    expect(pl.name).toBe('Album - Moon Music');
    expect(pl.description).toBe('Moon Music Description');
    expect(pl.uploader).toBe('Coldplay');
    expect(pl.uploaderUrl).toBe('/channel/UCDPM_123');
    expect(pl.uploaderAvatar).toBe('https://author.jpg');
    expect(pl.thumbnailUrl).toBe('https://cover.jpg');
    expect(pl.videos).toBe(2);
    expect(pl.relatedStreams).toHaveLength(1);
    expect(pl.relatedStreams[0].url).toBe('/watch?v=vid1');
    expect(pl.relatedStreams[0].title).toBe('feelslikeimfallinginlove');
    expect(pl.relatedStreams[0].duration).toBe(236);
    expect(pl.nextpage).toBe(JSON.stringify({ token: 'playlist_cont_token', playlistId: 'OLAK5uy_123' }));
  });

  it('WEB-CAT-065: playlist strips VL prefix from playlist ID', async () => {
    let requestedId = '';
    const yt = fakeInnertube({
      getPlaylist: async (id) => {
        requestedId = id;
        return {
          info: { title: 'Test Playlist', total_items: 0 },
          videos: [],
        };
      },
    });
    const src = createYoutubeiSource(yt);
    await src.playlist('VLOLAK5uy_abc');
    expect(requestedId).toBe('OLAK5uy_abc');
  });

  // == playlistNextPage ==

  it('WEB-CAT-066: playlistNextPage fetches continuation items and returns nextpage cursor', async () => {
    const continuationMap = new Map();
    continuationMap.set('LockupView', [
      {
        type: 'LockupView',
        content_id: 'vid2',
        metadata: {
          title: { text: 'We Pray' },
          metadata: {
            metadata_rows: [
              {
                metadata_parts: [
                  {
                    text: {
                      runs: [{ text: 'Coldplay', endpoint: { payload: { browseId: 'UCDPM_123' } } }],
                    },
                  },
                ],
              },
            ],
          },
        },
        duration: 233,
        content_image: {
          image: [{ url: 'https://thumb2.jpg', width: 640, height: 360 }],
        },
      },
    ]);
    continuationMap.set('ContinuationItemView', [
      {
        type: 'ContinuationItemView',
        endpoint: { payload: { token: 'tok_page3' } },
      },
    ]);

    const yt = fakeInnertube({
      actions: {
        execute: async () => ({
          on_response_received_actions_memo: continuationMap,
        }),
      },
    });
    const src = createYoutubeiSource(yt);
    const res = await src.playlistNextPage('OLAK5uy_123', JSON.stringify({ token: 'tok_page2' }));
    expect(res.relatedStreams).toHaveLength(1);
    expect(res.relatedStreams[0].url).toBe('/watch?v=vid2');
    expect(res.relatedStreams[0].title).toBe('We Pray');
    expect(res.relatedStreams[0].uploaderName).toBe('Coldplay');
    expect(res.relatedStreams[0].uploaderUrl).toBe('/channel/UCDPM_123');
    expect(res.relatedStreams[0].duration).toBe(233);
    expect(res.nextpage).toBe(JSON.stringify({ token: 'tok_page3', playlistId: 'OLAK5uy_123' }));
  });

  it('WEB-CAT-067: playlistNextPage handles last page with null nextpage', async () => {
    const emptyMemo = new Map();
    emptyMemo.set('LockupView', [
      {
        type: 'LockupView',
        content_id: 'vid3',
        metadata: { title: { text: 'Last Song' } },
      },
    ]);

    const yt = fakeInnertube({
      actions: {
        execute: async () => ({
          on_response_received_actions_memo: emptyMemo,
        }),
      },
    });
    const src = createYoutubeiSource(yt);
    const res = await src.playlistNextPage('OLAK5uy_123', 'raw_token_xyz');
    expect(res.relatedStreams).toHaveLength(1);
    expect(res.nextpage).toBeNull();
  });

  // == channel ==

  it('WEB-CAT-068: channel maps channel metadata, tabs, and relatedStreams', async () => {
    const tabsMap = new Map();
    tabsMap.set('Tab', [
      {
        type: 'Tab',
        title: 'Releases',
        endpoint: {
          metadata: { url: '/channel/UCDPM_123/releases' },
          payload: { browseId: 'UCDPM_123', params: 'params_releases_123' },
        },
      },
    ]);

    const yt = fakeInnertube({
      getChannel: async () => ({
        header: {
          page_title: 'Coldplay',
          author: {
            name: 'Coldplay',
            thumbnails: [{ url: 'https://avatar.jpg', width: 400, height: 400 }],
          },
          banner: [{ url: 'https://banner.jpg', width: 1200, height: 300 }],
          subscribers: '28.7M subscribers',
        },
        has_videos: true,
        videos: [
          {
            content_id: 'vid1',
            metadata: {
              title: { text: 'Yellow' },
              metadata: {
                metadata_rows: [
                  {
                    metadata_parts: [
                      {
                        text: {
                          runs: [{ text: 'Coldplay', endpoint: { payload: { browseId: 'UCDPM_123' } } }],
                        },
                      },
                    ],
                  },
                ],
              },
            },
            duration: 269,
            content_image: {
              image: [{ url: 'https://yellow.jpg', width: 640, height: 360 }],
            },
          },
        ],
        tabs: ['Home', 'Releases'],
        page: { contents_memo: tabsMap },
      }),
    });
    const src = createYoutubeiSource(yt);
    const ch = await src.channel('UCDPM_123');
    expect(ch.id).toBe('UCDPM_123');
    expect(ch.name).toBe('Coldplay');
    expect(ch.avatarUrl).toBe('https://avatar.jpg');
    expect(ch.bannerUrl).toBe('https://banner.jpg');
    expect(ch.subscriberCount).toBe(28700000);
    expect(ch.relatedStreams).toHaveLength(1);
    expect(ch.relatedStreams[0].title).toBe('Yellow');
    expect(ch.tabs).toBeDefined();
    expect(ch.tabs).toHaveLength(1);
    expect(ch.tabs![0].name).toBe('albums');
    const parsedData = JSON.parse(ch.tabs![0].data);
    expect(parsedData.browseId).toBe('UCDPM_123');
    expect(parsedData.params).toBe('params_releases_123');
  });

  it('WEB-CAT-069: channel for Topic channel returns empty relatedStreams', async () => {
    const yt = fakeInnertube({
      getChannel: async () => ({
        header: {
          page_title: 'Coldplay - Topic',
          author: {
            name: 'Coldplay - Topic',
            thumbnails: [{ url: 'https://avatar.jpg', width: 400, height: 400 }],
          },
        },
        has_videos: true,
        videos: [
          {
            content_id: 'vid_topic',
            title: 'Topic Video',
          },
        ],
      }),
    });
    const src = createYoutubeiSource(yt);
    const ch = await src.channel('UCIaFw5VBEK8qaW6nRpx_qnw');
    expect(ch.name).toBe('Coldplay - Topic');
    // Topic channels MUST have empty relatedStreams
    expect(ch.relatedStreams).toHaveLength(0);
  });

  it('WEB-CAT-070: channelTabs fetches albums tab and maps OLAK playlists to ChannelTabItem', async () => {
    const tabMap = new Map();
    tabMap.set('Playlist', [
      {
        type: 'Playlist',
        id: 'OLAK5uy_nlLN3UPzX97__AeYWNqJz6Pl7jfQFSKN4',
        title: { text: 'Moon Music' },
        author: {
          name: 'Coldplay · Sep 24, 2025',
          id: 'UCDPM_123',
        },
        thumbnail_renderer: {
          thumbnail: [{ url: 'https://album_cover.jpg', width: 500, height: 500 }],
        },
        video_count: '10 videos',
      },
    ]);
    tabMap.set('ContinuationItem', [
      {
        type: 'ContinuationItem',
        endpoint: { payload: { token: 'tab_cont_token' } },
      },
    ]);

    const yt = fakeInnertube({
      actions: {
        execute: async () => ({
          contents_memo: tabMap,
        }),
      },
    });
    const src = createYoutubeiSource(yt);
    const res = await src.channelTabs(JSON.stringify({ browseId: 'UCDPM_123', params: 'some_params' }));
    expect(res.content).toHaveLength(1);
    const item = res.content[0];
    expect(item.type).toBe('playlist');
    expect(item.url).toBe('/playlist?list=OLAK5uy_nlLN3UPzX97__AeYWNqJz6Pl7jfQFSKN4');
    expect(item.playlistId).toBe('OLAK5uy_nlLN3UPzX97__AeYWNqJz6Pl7jfQFSKN4');
    expect(item.name).toBe('Moon Music');
    expect(item.uploaderName).toBe('Coldplay');
    expect(item.uploaderUrl).toBe('/channel/UCDPM_123');
    expect(item.thumbnail).toBe('https://album_cover.jpg');
    expect(item.videos).toBe(10);
    expect(res.nextpage).toBe(JSON.stringify({ token: 'tab_cont_token' }));
  });

  // == searchNextPage ==

  it('WEB-CAT-071: searchNextPage uses continuation token and returns mapped StreamItems', async () => {
    let calledPayload: any = null;
    const yt = fakeInnertube({
      actions: {
        execute: async (_endpoint, args) => {
          calledPayload = args;
          return {
            continuation_contents: {
              contents: [
                {
                  id: 'next_vid1',
                  title: 'Next Page Song',
                  artists: [{ name: 'Test Artist', channel_id: 'UCtest' }],
                  duration: { seconds: 195 },
                  thumbnail: { contents: [{ url: 'https://thumb.jpg', width: 120, height: 120 }] },
                },
              ],
              continuation: 'tok_page3',
            },
          };
        },
      },
    });
    const src = createYoutubeiSource(yt);
    const res = await src.searchNextPage('query', JSON.stringify({ t: 'tok_page2', f: 'music_songs' }), 'music_songs');
    expect(calledPayload?.continuation).toBe('tok_page2');
    expect(calledPayload?.client).toBe('YTMUSIC');
    expect(res.items).toHaveLength(1);
    expect(res.items[0].url).toBe('/watch?v=next_vid1');
    expect(res.items[0].title).toBe('Next Page Song');
    expect(res.items[0].uploaderName).toBe('Test Artist');
    expect(res.items[0].uploaderUrl).toBe('/channel/UCtest');
    expect(res.items[0].duration).toBe(195);
    expect(res.nextpage).toBe(JSON.stringify({ t: 'tok_page3', f: 'music_songs' }));
  });

  // == trending ==

  it('WEB-CAT-072: trending delegates to getTrending when available or throws unavailable', async () => {
    const ytAvailable = fakeInnertube({
      getTrending: async () => ({
        videos: [
          {
            id: 'trend1',
            title: 'Trending Hit',
            author: { name: 'Hit Artist', channel_id: 'UChit' },
            duration: 215,
            thumbnails: [{ url: 'https://hit.jpg', width: 480, height: 360 }],
          },
        ],
      }),
    });
    const srcAvailable = createYoutubeiSource(ytAvailable);
    const trendingList = await srcAvailable.trending('US');
    expect(trendingList).toHaveLength(1);
    expect(trendingList[0].url).toBe('/watch?v=trend1');
    expect(trendingList[0].title).toBe('Trending Hit');
    expect(trendingList[0].uploaderName).toBe('Hit Artist');

    // Without getTrending, throws unavailable
    const ytUnavailable = fakeInnertube();
    const srcUnavailable = createYoutubeiSource(ytUnavailable);
    await expect(srcUnavailable.trending('US')).rejects.toThrow(SourceError);
    try {
      await srcUnavailable.trending('US');
    } catch (e) {
      expect((e as SourceError).kind).toBe('unavailable');
    }
  });

  // == channel prefix ==

  it('WEB-CAT-073: channel strips yt: prefix from artist ID', async () => {
    let requestedId = '';
    const yt = fakeInnertube({
      getChannel: async (id) => {
        requestedId = id;
        return {
          header: { page_title: 'Artist' },
          metadata: { title: 'Artist' },
          videos: [],
        };
      },
    });
    const src = createYoutubeiSource(yt);
    await src.channel('yt:UCxyz123');
    expect(requestedId).toBe('UCxyz123');
  });
});
