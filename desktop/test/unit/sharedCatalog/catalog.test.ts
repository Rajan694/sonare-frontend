import { describe, expect, it, vi } from 'vitest';
import type { Channel, Playlist, StreamItem, Streams } from '../../../../shared/catalog/pipedTypes';
import type { YouTubeSource } from '../../../../shared/catalog/source';
import { SourceError } from '../../../../shared/catalog/source';
import { CatalogInputError, idHelpers, parseYouTubeLink } from '../../../../shared/catalog/ids';
import { decodeCursor, encodeCursor } from '../../../../shared/catalog/cursor';
import { directImageUrl, sizedImageUrl, trackThumbUrl } from '../../../../shared/catalog/images';
import {
  cleanArtist,
  cleanTitle,
  normalizeChannelToArtist,
  normalizePlaylistToAlbum,
  normalizeStreamItemToAlbum,
  normalizeStreamItemToArtist,
  normalizeStreamItemToTrack,
  normalizeStreamToTrack,
} from '../../../../shared/catalog/normalize';
import { selectBestAudioStream, toStreamInfo } from '../../../../shared/catalog/streams';
import { createCatalog } from '../../../../shared/catalog/catalog';

const samplePipedStream = (id = 'dQw4w9WgXcQ'): Streams => ({
  id,
  title: 'Never Gonna Give You Up (Official Music Video)',
  description: 'A music video track',
  uploader: 'Rick Astley - Topic',
  uploaderUrl: '/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
  uploaderAvatar: 'https://piped.video/avatar.jpg',
  thumbnailUrl: 'https://piped.video/thumb.jpg',
  duration: 213,
  views: 1000000,
  audioStreams: [
    {
      url: 'https://audio.googlevideo.com/videoplayback?itag=251',
      format: 'opus',
      quality: 'medium',
      mimeType: 'audio/webm; codecs="opus"',
      codec: 'opus',
      audioTrackName: null,
      audioTrackId: null,
      audioTrackType: null,
      audioTrackLocale: null,
      videoOnly: false,
      itag: 251,
      bitrate: 160000,
      initStart: 0,
      initEnd: 200,
      indexStart: 201,
      indexEnd: 400,
      width: 0,
      height: 0,
      fps: 0,
      contentLength: 4200000,
    },
    {
      url: 'https://audio.googlevideo.com/videoplayback?itag=140',
      format: 'm4a',
      quality: 'medium',
      mimeType: 'audio/mp4; codecs="mp4a.40.2"',
      codec: 'mp4a.40.2',
      audioTrackName: null,
      audioTrackId: null,
      audioTrackType: null,
      audioTrackLocale: null,
      videoOnly: false,
      itag: 140,
      bitrate: 128000,
      initStart: 0,
      initEnd: 200,
      indexStart: 201,
      indexEnd: 400,
      width: 0,
      height: 0,
      fps: 0,
      contentLength: 3500000,
    },
  ],
  videoStreams: [],
  relatedStreams: [],
});

const samplePipedSearchItem = (id = 'dQw4w9WgXcQ'): StreamItem => ({
  url: `/watch?v=${id}`,
  title: 'Never Gonna Give You Up (Official Music Video)',
  uploaderName: 'Rick Astley - Topic',
  uploaderUrl: '/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
  uploaderAvatar: 'https://piped.video/avatar.jpg',
  thumbnail: 'https://piped.video/thumb.jpg',
  duration: 213,
  views: 1000000,
  uploadedDate: '10 years ago',
  shortDescription: null,
  uploaded: 1500000000000,
  uploaderVerified: true,
  type: 'stream',
});

const samplePipedPlaylist = (id = 'PL1234567890'): Playlist => ({
  id,
  name: 'Greatest Hits Album',
  thumbnailUrl: 'https://piped.video/playlist_thumb.jpg',
  bannerUrl: 'https://piped.video/playlist_banner.jpg',
  uploader: 'Rick Astley',
  uploaderUrl: '/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
  uploaderAvatar: 'https://piped.video/avatar.jpg',
  videos: 1,
  relatedStreams: [samplePipedSearchItem('dQw4w9WgXcQ')],
  nextpage: null,
});

const samplePipedChannel = (id = 'UCuAXFkgsw1L7xaCfnd5JJOw'): Channel => ({
  id,
  name: 'Rick Astley - Topic',
  avatarUrl: 'https://piped.video/artist_avatar.jpg',
  bannerUrl: 'https://piped.video/artist_banner.jpg',
  description: 'Official artist channel for Rick Astley.',
  subscriberCount: 3000000,
  verified: true,
  relatedStreams: [samplePipedSearchItem('dQw4w9WgXcQ')],
  tabs: [
    {
      name: 'Albums',
      data: 'tab_data_albums',
      content: [
        {
          url: '/playlist?list=OLAK5uy_sample',
          title: 'Whenever You Need Somebody',
          thumbnail: 'https://piped.video/album_thumb.jpg',
          uploaderName: 'Rick Astley',
          uploaderUrl: `/channel/${id}`,
          uploaderAvatar: 'https://piped.video/artist_avatar.jpg',
          videos: 10,
        },
      ],
    },
  ],
  nextpage: null,
});

const createMockSource = (overrides: Partial<YouTubeSource> = {}): YouTubeSource => ({
  getStream: vi.fn().mockResolvedValue(samplePipedStream()),
  search: vi.fn().mockResolvedValue({ items: [samplePipedSearchItem()], nextpage: null }),
  searchNextPage: vi.fn().mockResolvedValue({ items: [samplePipedSearchItem()], nextpage: null }),
  suggestions: vi.fn().mockResolvedValue(['rick astley', 'never gonna give you up']),
  trending: vi.fn().mockResolvedValue([samplePipedSearchItem()]),
  channel: vi.fn().mockResolvedValue(samplePipedChannel()),
  channelTabs: vi.fn().mockResolvedValue({ content: [], nextpage: null }),
  playlist: vi.fn().mockResolvedValue(samplePipedPlaylist()),
  playlistNextPage: vi.fn().mockResolvedValue({ relatedStreams: [samplePipedSearchItem()], nextpage: null }),
  ...overrides,
});

describe('shared catalog: cursor encoding', () => {
  it('WEB-CAT-001 encodeCursor encodes a string to base64url with L. prefix, and returns undefined for empty input', () => {
    expect(encodeCursor(undefined)).toBeUndefined();
    expect(encodeCursor(null)).toBeUndefined();
    expect(encodeCursor('')).toBeUndefined();

    const encoded = encodeCursor('test-token');
    expect(encoded).toBeDefined();
    expect(encoded?.startsWith('L.')).toBe(true);
  });

  it('WEB-CAT-002 decodeCursor decodes an L. prefixed base64url cursor including UTF-8 characters', () => {
    expect(decodeCursor(undefined)).toBeUndefined();
    expect(decodeCursor(null)).toBeUndefined();
    expect(decodeCursor('')).toBeUndefined();

    const utf8Token = 'こんにちは世界-123_456~';
    const encoded = encodeCursor(utf8Token);
    expect(encoded).toBeDefined();
    expect(decodeCursor(encoded)).toBe(utf8Token);
  });

  it('WEB-CAT-003 decodeCursor throws CatalogInputError when L. prefix is missing or cursor is malformed', () => {
    expect(() => decodeCursor('rawTokenWithoutPrefix')).toThrow(CatalogInputError);
    expect(() => decodeCursor('rawTokenWithoutPrefix')).toThrow('missing local prefix');
    expect(() => decodeCursor('L.!!!InvalidBase64###')).toThrow(CatalogInputError);
  });
});

describe('shared catalog: ID helpers', () => {
  it('WEB-CAT-004 idHelpers extracts YouTube ID and strips yt: prefix, rejecting invalid prefixes', () => {
    expect(idHelpers.extractYtId('yt:dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(() => idHelpers.extractYtId('dQw4w9WgXcQ')).toThrow(CatalogInputError);
    expect(() => idHelpers.extractYtId('local:abcdef')).toThrow(CatalogInputError);
  });

  it('WEB-CAT-005 idHelpers parses channel and playlist IDs from URLs and constructs prefix identifiers', () => {
    expect(idHelpers.prefixYt('xyz')).toBe('yt:xyz');
    expect(idHelpers.prefixLocal('hash1')).toBe('local:hash1');
    expect(idHelpers.prefixSonare('uuid1')).toBe('sonare:uuid1');
    expect(idHelpers.extractChannelIdFromUrl('/channel/UCuAXFkgsw1L7xaCfnd5JJOw')).toBe('UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(idHelpers.artistIdFromUrl('/channel/UCuAXFkgsw1L7xaCfnd5JJOw')).toBe('yt:UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(idHelpers.artistIdFromUrl('/user/RandomUser')).toBe('');
    expect(idHelpers.artistIdFromUrl(undefined)).toBe('');
    expect(idHelpers.extractListIdFromUrl('/playlist?list=PL1234567890')).toBe('PL1234567890');
    expect(idHelpers.extractListIdFromUrl('/watch?v=123&list=PL98765')).toBe('PL98765');
  });

  it('WEB-CAT-085 parseYouTubeLink parses YouTube URLs across all supported forms or returns null', () => {
    // Songs
    expect(parseYouTubeLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'song',
      id: 'yt:dQw4w9WgXcQ',
    });
    expect(parseYouTubeLink('youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'song',
      id: 'yt:dQw4w9WgXcQ',
    });
    expect(parseYouTubeLink('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'song',
      id: 'yt:dQw4w9WgXcQ',
    });
    expect(parseYouTubeLink('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'song',
      id: 'yt:dQw4w9WgXcQ',
    });
    expect(parseYouTubeLink('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toEqual({
      kind: 'song',
      id: 'yt:dQw4w9WgXcQ',
    });
    expect(parseYouTubeLink('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      kind: 'song',
      id: 'yt:dQw4w9WgXcQ',
    });
    // Video with list attached -> song
    expect(parseYouTubeLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL12345')).toEqual({
      kind: 'song',
      id: 'yt:dQw4w9WgXcQ',
    });
    expect(parseYouTubeLink('https://youtu.be/dQw4w9WgXcQ?list=PL12345')).toEqual({
      kind: 'song',
      id: 'yt:dQw4w9WgXcQ',
    });

    // Playlists
    expect(parseYouTubeLink('https://www.youtube.com/playlist?list=PL12345')).toEqual({
      kind: 'playlist',
      id: 'yt:PL12345',
    });
    expect(parseYouTubeLink('https://music.youtube.com/playlist?list=PL12345')).toEqual({
      kind: 'playlist',
      id: 'yt:PL12345',
    });
    expect(parseYouTubeLink('https://youtu.be/?list=PL12345')).toEqual({
      kind: 'playlist',
      id: 'yt:PL12345',
    });

    // Non-matching / plain text / invalid
    expect(parseYouTubeLink('rick astley')).toBeNull();
    expect(parseYouTubeLink('https://spotify.com/track/123')).toBeNull();
    expect(parseYouTubeLink('')).toBeNull();
    expect(parseYouTubeLink('   ')).toBeNull();
    expect(parseYouTubeLink('https://www.youtube.com/watch?v=short')).toBeNull();
  });
});

describe('shared catalog: image helpers', () => {
  it('WEB-CAT-006 directImageUrl returns raw direct image url and strips backend proxy prefix if present', () => {
    expect(directImageUrl(undefined)).toBeUndefined();
    expect(directImageUrl('https://lh3.googleusercontent.com/photo')).toBe('https://lh3.googleusercontent.com/photo');

    const proxied = '/api/v1/image?url=%2Fphoto.jpg&host=i.ytimg.com&other=1';
    expect(directImageUrl(proxied)).toBe('https://i.ytimg.com/api/v1/image?url=%2Fphoto.jpg&other=1');

    const untrusted = '/api/v1/image?url=%2Fphoto.jpg&host=malicious.com';
    expect(directImageUrl(untrusted)).toBe(untrusted);
  });

  it('WEB-CAT-007 trackThumbUrl produces canonical YouTube thumbnail URL from video ID', () => {
    expect(trackThumbUrl('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
    expect(trackThumbUrl('abc-123')).toBe('https://i.ytimg.com/vi/abc-123/mqdefault.jpg');
  });

  it('WEB-CAT-008 sizedImageUrl resizes image URLs and skips signed URLs with rs query parameter', () => {
    expect(sizedImageUrl(undefined, 140)).toBeUndefined();

    const signedUrl = 'https://i.ytimg.com/s_p/cover.jpg?rs=AOn4CLDh';
    expect(sizedImageUrl(signedUrl, 140)).toBe(signedUrl);

    const googleUserContent = 'https://lh3.googleusercontent.com/album=w544-h544';
    expect(sizedImageUrl(googleUserContent, 140)).toBe('https://lh3.googleusercontent.com/album=w140-h140');
    expect(sizedImageUrl(googleUserContent, 640)).toBe('https://lh3.googleusercontent.com/album=w640-h640');

    const ytMaxRes = 'https://i.ytimg.com/vi/123/maxresdefault.jpg';
    expect(sizedImageUrl(ytMaxRes, 140)).toBe('https://i.ytimg.com/vi/123/mqdefault.jpg');
    expect(sizedImageUrl(ytMaxRes, 300)).toBe('https://i.ytimg.com/vi/123/hqdefault.jpg');
    expect(sizedImageUrl(ytMaxRes, 640)).toBe('https://i.ytimg.com/vi/123/maxresdefault.jpg');
  });
});

describe('shared catalog: normalization', () => {
  it('WEB-CAT-009 cleanTitle strips video badges, audio indicators, and extraneous whitespace', () => {
    expect(cleanTitle('Song Title (Official Music Video)')).toBe('Song Title');
    expect(cleanTitle('Song Title [Official Audio]')).toBe('Song Title');
    expect(cleanTitle('Song Title (Official Video)')).toBe('Song Title');
    expect(cleanTitle('Song Title [Lyrics]')).toBe('Song Title');
    expect(cleanTitle('Song Title   (Lyric)  ')).toBe('Song Title');
    expect(cleanTitle('Plain Title')).toBe('Plain Title');
    expect(cleanTitle('')).toBe('');
  });

  it('WEB-CAT-010 cleanArtist strips Topic suffix and trims uploader name', () => {
    expect(cleanArtist('Rick Astley - Topic')).toBe('Rick Astley');
    expect(cleanArtist('Rick Astley - topic')).toBe('Rick Astley');
    expect(cleanArtist('Queen')).toBe('Queen');
    expect(cleanArtist('')).toBe('');
    expect(cleanArtist(undefined)).toBe('');
  });

  it('WEB-CAT-011 normalizeStreamToTrack maps Piped Streams object to Sonare Track with direct image URLs and codecs', () => {
    const raw = samplePipedStream('dQw4w9WgXcQ');
    const track = normalizeStreamToTrack(raw, 'dQw4w9WgXcQ', 'opus', 160000, {
      favourite: true,
      playCount: 5,
      addedAt: 1234567,
    });

    expect(track.id).toBe('yt:dQw4w9WgXcQ');
    expect(track.title).toBe('Never Gonna Give You Up');
    expect(track.artist).toBe('Rick Astley');
    expect(track.artistId).toBe('yt:UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(track.durationMs).toBe(213000);
    expect(track.codec).toBe('OPUS');
    expect(track.bitrateKbps).toBe(160);
    expect(track.favourite).toBe(true);
    expect(track.playCount).toBe(5);
    expect(track.addedAt).toBe(1234567);
    expect(track.thumbnail).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
  });

  it('WEB-CAT-012 normalizeStreamItemToTrack converts search stream item to Track', () => {
    const item = samplePipedSearchItem('testId123');
    const track = normalizeStreamItemToTrack(item);

    expect(track.id).toBe('yt:testId123');
    expect(track.title).toBe('Never Gonna Give You Up');
    expect(track.artist).toBe('Rick Astley');
    expect(track.durationMs).toBe(213000);
    expect(track.thumbnail).toBe('https://i.ytimg.com/vi/testId123/mqdefault.jpg');
  });

  it('WEB-CAT-013 normalizeStreamItemToArtist converts channel item to Artist', () => {
    const item: StreamItem = {
      type: 'channel',
      url: '/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
      name: 'Rick Astley - Topic',
      thumbnail: 'https://piped.video/artist.jpg',
      subscriberCount: 3000000,
    };
    const artist = normalizeStreamItemToArtist(item);

    expect(artist.id).toBe('yt:UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(artist.name).toBe('Rick Astley');
    expect(artist.monthlyListeners).toBe(3000000);
    expect(artist.following).toBe(false);
  });

  it('WEB-CAT-014 normalizeStreamItemToAlbum converts playlist item to Album', () => {
    const item: StreamItem = {
      type: 'playlist',
      url: '/playlist?list=PL1234567890',
      title: 'Greatest Hits',
      uploaderName: 'Rick Astley - Topic',
      uploaderUrl: '/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
      videos: 12,
      thumbnail: 'https://piped.video/album.jpg',
    };
    const album = normalizeStreamItemToAlbum(item);

    expect(album.id).toBe('yt:PL1234567890');
    expect(album.title).toBe('Greatest Hits');
    expect(album.artist).toBe('Rick Astley');
    expect(album.artistId).toBe('yt:UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(album.trackCount).toBe(12);
  });

  it('WEB-CAT-015 normalizeChannelToArtist converts Channel to Artist and assigns artwork route', () => {
    const channel = samplePipedChannel('UCuAXFkgsw1L7xaCfnd5JJOw');
    const artist = normalizeChannelToArtist(channel, 'UCuAXFkgsw1L7xaCfnd5JJOw');

    expect(artist.id).toBe('yt:UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(artist.name).toBe('Rick Astley');
    expect(artist.monthlyListeners).toBe(3000000);
    expect(artist.following).toBe(false);
  });

  it('WEB-CAT-016 normalizePlaylistToAlbum extracts release year from description and determines uploader', () => {
    const plWithYear: Playlist = {
      ...samplePipedPlaylist('PLwithYear'),
      description: 'Recorded in studio, released in 1987 by RCA',
    };
    const album = normalizePlaylistToAlbum(plWithYear, 'PLwithYear');
    expect(album.year).toBe(1987);

    const plNoUploader: Playlist = {
      id: 'PLnoUploader',
      name: 'Various Artists',
      relatedStreams: [
        { uploaderName: 'Band A', uploaderUrl: '/channel/UCbandA' },
        { uploaderName: 'Band B', uploaderUrl: '/channel/UCbandB' },
        { uploaderName: 'Band B', uploaderUrl: '/channel/UCbandB' },
      ],
      videos: 3,
    };
    const albumNoUploader = normalizePlaylistToAlbum(plNoUploader, 'PLnoUploader');
    expect(albumNoUploader.artist).toBe('Band B');
    expect(albumNoUploader.artistId).toBe('yt:UCbandB');
  });
});

describe('shared catalog: stream selection', () => {
  const streams = samplePipedStream();

  it('WEB-CAT-017 selectBestAudioStream picks highest bitrate stream for high quality', () => {
    const best = selectBestAudioStream(streams.audioStreams, 'high');
    expect(best).toBeDefined();
    expect(best?.bitrate).toBe(160000);
    expect(best?.codec).toBe('OPUS');
    expect(best?.itag).toBe(251);
  });

  it('WEB-CAT-018 selectBestAudioStream picks medium bitrate stream for medium and auto quality', () => {
    const autoBest = selectBestAudioStream(streams.audioStreams, 'auto');
    expect(autoBest).toBeDefined();
    expect(autoBest?.codec).toBe('OPUS');
    expect(autoBest?.bitrate).toBe(160000);

    const medBest = selectBestAudioStream(streams.audioStreams, 'medium');
    expect(medBest).toBeDefined();
    expect(medBest?.codec).toBe('OPUS');
  });

  it('WEB-CAT-019 selectBestAudioStream filters by format when specified', () => {
    const m4aStream = selectBestAudioStream(streams.audioStreams, 'auto', 'm4a');
    expect(m4aStream).toBeDefined();
    expect(m4aStream?.codec).toBe('AAC');
    expect(m4aStream?.itag).toBe(140);
    expect(m4aStream?.bitrate).toBe(128000);
  });

  it('WEB-CAT-020 selectBestAudioStream falls back to videoStreams when audioStreams is empty', () => {
    const videoFallback: Streams = {
      ...streams,
      audioStreams: [],
      videoStreams: [
        {
          url: 'https://video.googlevideo.com/videoplayback?itag=18',
          format: 'mp4',
          quality: '360p',
          mimeType: 'video/mp4',
          codec: 'avc1',
          videoOnly: false,
          itag: 18,
          bitrate: 500000,
          initStart: 0,
          initEnd: 0,
          indexStart: 0,
          indexEnd: 0,
          width: 640,
          height: 360,
          fps: 30,
          contentLength: 10000000,
        },
      ],
    };

    const best = selectBestAudioStream(videoFallback.audioStreams, 'auto', undefined, videoFallback.videoStreams);
    expect(best).toBeDefined();
    expect(best?.itag).toBe(18);
    expect(best?.muxed).toBe(true);
  });

  it('WEB-CAT-021 toStreamInfo maps Piped stream to Sonare StreamInfo with bitrate in kbps', () => {
    const best = selectBestAudioStream(streams.audioStreams, 'high')!;
    const info = toStreamInfo(best);

    expect(info.url).toBe(best.url);
    expect(info.mimeType).toBe(best.mimeType);
    expect(info.codec).toBe(best.codec);
    expect(info.bitrateKbps).toBe(160);
    expect(info.muxed).toBe(false);

    const muxedStream = { ...best, muxed: true };
    const muxedInfo = toStreamInfo(muxedStream);
    expect(muxedInfo.muxed).toBe(true);
  });
});

describe('shared catalog: catalog operations', () => {
  it('WEB-CAT-022 suggestions returns query suggestions and validates non-empty query', async () => {
    const mockSource = createMockSource({
      suggestions: vi.fn().mockResolvedValue(['rick astley', 'rick astley songs']),
    });
    const catalog = createCatalog(mockSource);

    const res = await catalog.suggestions('  rick astley  ');
    expect(res).toEqual(['rick astley', 'rick astley songs']);
    expect(mockSource.suggestions).toHaveBeenCalledWith('rick astley');

    await expect(catalog.suggestions('')).rejects.toThrow(CatalogInputError);
    await expect(catalog.suggestions('   ')).rejects.toThrow(CatalogInputError);
    await expect(catalog.suggestions('a'.repeat(201))).rejects.toThrow(CatalogInputError);
  });

  it('WEB-CAT-023 search queries specific type and encodes pagination cursor', async () => {
    const mockSource = createMockSource({
      search: vi.fn().mockResolvedValue({
        items: [samplePipedSearchItem('bohemian123')],
        nextpage: 'page2Token',
      }),
    });
    const catalog = createCatalog(mockSource);

    const res = await catalog.search('bohemian', 'songs');
    expect(mockSource.search).toHaveBeenCalledWith('bohemian', 'music_songs');
    expect(res.items).toHaveLength(1);
    expect(res.items[0].kind).toBe('track');
    expect(res.items[0].id).toBe('yt:bohemian123');
    expect(res.meta.nextCursor).toBe(encodeCursor('page2Token'));

    // Searching with cursor
    const cursor = encodeCursor('page2Token');
    await catalog.search('bohemian', 'songs', cursor);
    expect(mockSource.searchNextPage).toHaveBeenCalledWith('bohemian', 'page2Token', 'music_songs');
  });

  it('WEB-CAT-024 search aggregates songs, albums, artists, and playlists when type is all', async () => {
    const mockSource = createMockSource({
      search: vi.fn().mockImplementation((_q: string, filter?: string) => {
        if (filter === 'music_songs') {
          return Promise.resolve({ items: [samplePipedSearchItem('track1')], nextpage: null });
        }
        if (filter === 'music_albums') {
          return Promise.resolve({
            items: [
              {
                type: 'playlist',
                url: '/playlist?list=PLalbum1',
                title: 'Album 1',
                uploaderName: 'Band',
                videos: 10,
              },
            ],
            nextpage: null,
          });
        }
        if (filter === 'music_artists') {
          return Promise.resolve({
            items: [
              {
                type: 'channel',
                url: '/channel/UCartist1',
                name: 'Artist 1',
                subscriberCount: 50000,
              },
            ],
            nextpage: null,
          });
        }
        if (filter === 'music_playlists') {
          return Promise.resolve({
            items: [
              {
                type: 'playlist',
                url: '/playlist?list=PLplaylist1',
                title: 'Playlist 1',
                uploaderName: 'Curator',
                videos: 20,
              },
            ],
            nextpage: null,
          });
        }
        return Promise.resolve({ items: [], nextpage: null });
      }),
    });
    const catalog = createCatalog(mockSource);

    const res = await catalog.search('queen', 'all');
    expect(res.items).toHaveLength(4);
    expect(res.items.map((i) => i.kind)).toEqual(['track', 'album', 'artist', 'album']);
  });

  it('WEB-CAT-025 search throws CatalogInputError on invalid query or invalid type', async () => {
    const catalog = createCatalog(createMockSource());

    await expect(catalog.search('')).rejects.toThrow(CatalogInputError);
    await expect(catalog.search('   ')).rejects.toThrow(CatalogInputError);
    await expect(catalog.search('valid', 'invalidType' as unknown as 'songs')).rejects.toThrow(CatalogInputError);
  });

  it('WEB-CAT-026 trending filters out non-music streams and returns normalized tracks', async () => {
    const musicItem = samplePipedSearchItem('music1');
    const newsItem: StreamItem = {
      url: '/watch?v=news1',
      title: 'Daily Live News and Updates',
      uploaderName: 'News Network',
      duration: 3600,
      type: 'stream',
    };
    const gamingItem: StreamItem = {
      url: '/watch?v=game1',
      title: 'Minecraft Parkour Gameplay Ep 5',
      uploaderName: 'GamerChannel',
      duration: 600,
      type: 'stream',
    };

    const mockSource = createMockSource({
      trending: vi.fn().mockResolvedValue([musicItem, newsItem, gamingItem]),
      search: vi.fn().mockResolvedValue({ items: [], nextpage: null }),
    });
    const catalog = createCatalog(mockSource);

    const res = await catalog.trending('IN', 1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe('yt:music1');
    expect(res.items[0].kind).toBe('track');
  });

  it('WEB-CAT-027 trending falls back to music search when raw trending has fewer items than limit', async () => {
    const musicItem = samplePipedSearchItem('music1');
    const fallbackItem = samplePipedSearchItem('fallbackMusic2');

    const mockSource = createMockSource({
      trending: vi.fn().mockResolvedValue([musicItem]),
      search: vi.fn().mockResolvedValue({ items: [fallbackItem], nextpage: null }),
    });
    const catalog = createCatalog(mockSource);

    const res = await catalog.trending('IN', 2);
    expect(mockSource.search).toHaveBeenCalledWith('trending music top songs', 'music_songs');
    expect(res.items).toHaveLength(2);
    expect(res.items[0].id).toBe('yt:music1');
    expect(res.items[1].id).toBe('yt:fallbackMusic2');
  });

  it('WEB-CAT-028 trending rethrows source error when both trending and search fail', async () => {
    const error = new SourceError('unavailable', 'Service outage');
    const mockSource = createMockSource({
      trending: vi.fn().mockRejectedValue(error),
      search: vi.fn().mockRejectedValue(error),
    });
    const catalog = createCatalog(mockSource);

    await expect(catalog.trending('IN', 10)).rejects.toThrow(error);
  });

  it('WEB-CAT-029 album fetches playlist and returns normalized album', async () => {
    const mockSource = createMockSource({
      playlist: vi.fn().mockResolvedValue(samplePipedPlaylist('PL1234567890')),
    });
    const catalog = createCatalog(mockSource);

    const res = await catalog.album('yt:PL1234567890');
    expect(mockSource.playlist).toHaveBeenCalledWith('PL1234567890');
    expect(res.id).toBe('yt:PL1234567890');
    expect(res.title).toBe('Greatest Hits Album');

    await expect(catalog.album('invalidPrefix')).rejects.toThrow(CatalogInputError);
  });

  it('WEB-CAT-030 albumTracks supports pagination via cursor', async () => {
    const mockSource = createMockSource({
      playlist: vi.fn().mockResolvedValue({
        ...samplePipedPlaylist('PL1234567890'),
        nextpage: 'page2',
      }),
      playlistNextPage: vi.fn().mockResolvedValue({
        relatedStreams: [samplePipedSearchItem('pagedTrack')],
        nextpage: null,
      }),
    });
    const catalog = createCatalog(mockSource);

    const firstPage = await catalog.albumTracks('yt:PL1234567890');
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.meta.nextCursor).toBe(encodeCursor('page2'));

    const secondPage = await catalog.albumTracks('yt:PL1234567890', firstPage.meta.nextCursor);
    expect(mockSource.playlistNextPage).toHaveBeenCalledWith('PL1234567890', 'page2');
    expect(secondPage.items[0].id).toBe('yt:pagedTrack');
  });

  it('WEB-CAT-031 artist returns artist metadata with following set to false', async () => {
    const mockSource = createMockSource({
      channel: vi.fn().mockResolvedValue(samplePipedChannel('UCuAXFkgsw1L7xaCfnd5JJOw')),
    });
    const catalog = createCatalog(mockSource);

    const artist = await catalog.artist('yt:UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(artist.id).toBe('yt:UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(artist.name).toBe('Rick Astley');
    expect(artist.following).toBe(false);
  });

  it('WEB-CAT-032 artistTopTracks falls back to search when artist channel has no related streams', async () => {
    const emptyChannel: Channel = {
      ...samplePipedChannel('UCuAXFkgsw1L7xaCfnd5JJOw'),
      relatedStreams: [],
    };
    const mockSource = createMockSource({
      channel: vi.fn().mockResolvedValue(emptyChannel),
      search: vi.fn().mockResolvedValue({
        items: [samplePipedSearchItem('searchedTrack')],
        nextpage: null,
      }),
    });
    const catalog = createCatalog(mockSource);

    const res = await catalog.artistTopTracks('yt:UCuAXFkgsw1L7xaCfnd5JJOw', 10);
    expect(mockSource.search).toHaveBeenCalledWith('Rick Astley', 'music_songs');
    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe('yt:searchedTrack');
  });

  it('WEB-CAT-033 artistAlbums fetches from channel tab or falls back to search', async () => {
    const mockSource = createMockSource({
      channel: vi.fn().mockResolvedValue(samplePipedChannel('UCuAXFkgsw1L7xaCfnd5JJOw')),
      channelTabs: vi.fn().mockResolvedValue({
        content: [
          {
            url: '/playlist?list=OLAK5uy_tabAlbum',
            title: 'Tab Album',
            videos: 8,
          },
        ],
        nextpage: null,
      }),
    });
    const catalog = createCatalog(mockSource);

    const res = await catalog.artistAlbums('yt:UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(mockSource.channelTabs).toHaveBeenCalledWith('tab_data_albums');
    expect(res.items).toHaveLength(1);
    expect(res.items[0].title).toBe('Tab Album');
  });

  it('WEB-CAT-034 playlist and playlistTracks return metadata and tracks', async () => {
    const mockSource = createMockSource({
      playlist: vi.fn().mockResolvedValue(samplePipedPlaylist('PL1234567890')),
    });
    const catalog = createCatalog(mockSource);

    const pl = await catalog.playlist('yt:PL1234567890');
    expect(pl.id).toBe('yt:PL1234567890');
    expect(pl.name).toBe('Greatest Hits Album');
    expect(pl.kind).toBe('online');

    const tracks = await catalog.playlistTracks('yt:PL1234567890');
    expect(tracks.items).toHaveLength(1);
    expect(tracks.items[0].id).toBe('yt:dQw4w9WgXcQ');
  });

  it('WEB-CAT-035 track resolves best audio stream codec and bitrate, and stream returns StreamInfo', async () => {
    const mockSource = createMockSource({
      getStream: vi.fn().mockResolvedValue(samplePipedStream('dQw4w9WgXcQ')),
    });
    const catalog = createCatalog(mockSource);

    const track = await catalog.track('yt:dQw4w9WgXcQ');
    expect(track.id).toBe('yt:dQw4w9WgXcQ');
    expect(track.codec).toBe('OPUS');
    expect(track.bitrateKbps).toBe(160);

    const stream = await catalog.stream('yt:dQw4w9WgXcQ', { quality: 'high' });
    expect(stream.codec).toBe('OPUS');
    expect(stream.bitrateKbps).toBe(160);
  });

  it('WEB-CAT-036 stream throws SourceError when no audio or video streams are available', async () => {
    const noStreams: Streams = {
      ...samplePipedStream('emptyStreams'),
      audioStreams: [],
      videoStreams: [],
    };
    const mockSource = createMockSource({
      getStream: vi.fn().mockResolvedValue(noStreams),
    });
    const catalog = createCatalog(mockSource);

    await expect(catalog.stream('yt:emptyStreams')).rejects.toThrow(SourceError);
    await expect(catalog.stream('yt:emptyStreams')).rejects.toThrow('No audio streams found');
  });
});
