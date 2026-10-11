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
  } = {},
): InnertubeLike {
  return {
    getBasicInfo: opts.getBasicInfo ?? (async () => fakeBasicInfo()),
    music: {
      search: (opts.search ?? (async () => ({ contents: [] }))) as InnertubeLike['music']['search'],
      getSearchSuggestions: opts.getSearchSuggestions ?? (async () => []),
    },
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

  it('WEB-CAT-046: search songs joins multiple artist names with comma', async () => {
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
    expect(page.items[0].uploaderName).toBe('Artist One, Artist Two');
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
});
