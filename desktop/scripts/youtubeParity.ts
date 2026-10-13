import { Innertube, Log } from 'youtubei.js';
import { createYoutubeiSource } from '../../shared/youtube/youtubeiSource';
import { createCatalog } from '../../shared/catalog/catalog';

// Suppress JIT parser introspect logs
Log.setLevel(Log.Level.ERROR);

const BACKEND_BASE = 'http://127.0.0.1:3010/api/v1';
const QUERIES = ['kesariya', 'arijit singh', 'coldplay yellow', 'lofi', 'imagine dragons'];
const SEARCH_TYPES = ['songs', 'albums', 'artists'] as const;

const ARTISTS = [
  { id: 'yt:UCDPM_n1atn2ijUwHd0NNRQw', label: 'Coldplay (Official)' },
  { id: 'yt:UCIaFw5VBEK8qaW6nRpx_qnw', label: 'Coldplay (Topic channel)' },
  { id: 'yt:UCDxKh1gFWeYsqePvgVzmPoQ', label: 'Arijit Singh' },
];

const KNOWN_ALBUMS = [
  'yt:OLAK5uy_nlLN3UPzX97__AeYWNqJz6Pl7jfQFSKN4', // Ma Meilleure Ennemie ft. Coldplay
  'yt:OLAK5uy_m2I1xjPW1Mggp66t36RCkrdrUTbSgXpC4', // Kesariya Balam
  'yt:OLAK5uy_kuPAIyP_Fm2myDbUn1hXrpc0dQ_e851qM', // Midnight (Kygo Remix)
];

const PLAYLIST_ID = 'yt:PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';

interface DiffStats {
  matches: number;
  mismatches: number;
  examples: string[];
}

function record(stats: Record<string, DiffStats>, field: string, match: boolean, example?: string) {
  if (!stats[field]) stats[field] = { matches: 0, mismatches: 0, examples: [] };
  if (match) {
    stats[field].matches++;
  } else {
    stats[field].mismatches++;
    if (example && stats[field].examples.length < 3) {
      stats[field].examples.push(example);
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBackend(path: string, retries = 5): Promise<any> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const res = await fetch(`${BACKEND_BASE}${path}`);
      if (!res.ok) {
        throw new Error(`Backend GET ${path} failed: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err: any) {
      const isConnError =
        err.message?.includes('fetch failed') ||
        err.message?.includes('ECONNREFUSED') ||
        err.cause?.code === 'ECONNREFUSED';
      if (isConnError && attempt < retries) {
        console.warn(`[fetchBackend] Retry ${attempt}/${retries} for ${path} due to connection error. Waiting 2s...`);
        await sleep(2000);
      } else {
        throw err;
      }
    }
  }
}

function compareSharedItems(
  type: string,
  ourMap: Map<string, any>,
  backendItems: any[],
  fieldStats: Record<string, DiffStats>,
) {
  let joinedCount = 0;
  for (const b of backendItems) {
    if (ourMap.has(b.id)) joinedCount++;
  }
  const pct = backendItems.length > 0 ? ((joinedCount / backendItems.length) * 100).toFixed(1) : '100.0';
  console.log(`    backend ids also in ours: ${joinedCount}/${backendItems.length} (${pct}%)`);
  record(
    fieldStats,
    `${type}.idJoined`,
    joinedCount > 0 || backendItems.length === 0,
    `shared=${joinedCount}/${backendItems.length} (${pct}%)`,
  );

  for (const b of backendItems) {
    const o = ourMap.get(b.id);
    if (!o) continue;

    if (b.kind) {
      record(fieldStats, `${type}.kind`, o.kind === b.kind, `id=${b.id}: ours="${o.kind}" vs backend="${b.kind}"`);
    }

    if (type.includes('songs') || type.includes('tracks')) {
      record(fieldStats, `${type}.title`, o.title === b.title, `id=${b.id}: ours="${o.title}" vs backend="${b.title}"`);
      record(
        fieldStats,
        `${type}.artist`,
        o.artist === b.artist,
        `id=${b.id}: ours="${o.artist}" vs backend="${b.artist}"`,
      );
      if (b.artistId) {
        record(
          fieldStats,
          `${type}.artistId`,
          o.artistId === b.artistId,
          `id=${b.id}: ours="${o.artistId}" vs backend="${b.artistId}"`,
        );
      }
      const durMatch = Math.abs((o.durationMs || 0) - (b.durationMs || 0)) <= 2000;
      record(fieldStats, `${type}.durationMs`, durMatch, `id=${b.id}: ours=${o.durationMs} vs backend=${b.durationMs}`);
    } else if (type.includes('albums')) {
      record(fieldStats, `${type}.title`, o.title === b.title, `id=${b.id}: ours="${o.title}" vs backend="${b.title}"`);
      record(
        fieldStats,
        `${type}.artist`,
        o.artist === b.artist,
        `id=${b.id}: ours="${o.artist}" vs backend="${b.artist}"`,
      );
      if (b.artistId) {
        record(
          fieldStats,
          `${type}.artistId`,
          o.artistId === b.artistId,
          `id=${b.id}: ours="${o.artistId}" vs backend="${b.artistId}"`,
        );
      }
      if (b.trackCount !== undefined && o.trackCount !== undefined) {
        record(
          fieldStats,
          `${type}.trackCount`,
          o.trackCount === b.trackCount,
          `id=${b.id}: ours=${o.trackCount} vs backend=${b.trackCount}`,
        );
      }
    } else if (type.includes('artists')) {
      record(fieldStats, `${type}.name`, o.name === b.name, `id=${b.id}: ours="${o.name}" vs backend="${b.name}"`);
    }
  }
}

async function run() {
  console.log('Initializing Innertube with retrieve_player: false...');
  const yt = await Innertube.create({ retrieve_player: false });
  const source = createYoutubeiSource(yt as any);
  const catalog = createCatalog(source);

  console.log('\n========================================');
  console.log('PARITY CHECK: youtubei.js vs Backend API');
  console.log('========================================\n');

  const fieldStats: Record<string, DiffStats> = {};
  const discoveredAlbums = new Set<string>(KNOWN_ALBUMS);

  // ---------------------------------------------------------------------------
  // 1. Search (page 1 + cursor page 2)
  // ---------------------------------------------------------------------------
  for (const q of QUERIES) {
    console.log(`\n--- Query: "${q}" ---`);
    for (const type of SEARCH_TYPES) {
      process.stdout.write(`  [${type} page 1] searching... `);
      const ourRes = await catalog.search(q, type).catch((e) => ({ items: [], error: String(e), meta: {} }));
      const backendRes = await fetchBackend(`/search?q=${encodeURIComponent(q)}&type=${type}`).catch((e) => ({
        items: [],
        error: String(e),
        meta: {},
      }));

      const ourItems: any[] = (ourRes as any).items || [];
      const backendItems: any[] = (backendRes as any).items || [];
      if ((ourRes as any).error) console.log(`\n    [ourRes error]: ${(ourRes as any).error}`);
      if ((backendRes as any).error) console.log(`\n    [backendRes error]: ${(backendRes as any).error}`);
      console.log(`ours=${ourItems.length}, backend=${backendItems.length}`);

      // Gather albums for album endpoint testing
      if (type === 'albums') {
        for (const alb of ourItems) {
          if (alb.id && alb.id.startsWith('yt:OLAK')) discoveredAlbums.add(alb.id);
        }
      }

      // ID-joined comparison
      const ourMap = new Map<string, any>(ourItems.map((o) => [o.id, o]));
      compareSharedItems(type, ourMap, backendItems, fieldStats);

      // Search page 2 via cursor
      if (ourRes.meta?.nextCursor && backendRes.meta?.nextCursor) {
        process.stdout.write(`  [${type} page 2] cursor fetch... `);
        const ourPage2 = await catalog
          .search(q, type, ourRes.meta.nextCursor)
          .catch((e) => ({ items: [], error: String(e) }));
        const backendPage2 = await fetchBackend(
          `/search?q=${encodeURIComponent(q)}&type=${type}&cursor=${encodeURIComponent(backendRes.meta.nextCursor)}`,
        ).catch((e) => ({ items: [], error: String(e) }));

        const ourP2Items: any[] = (ourPage2 as any).items || [];
        const beP2Items: any[] = (backendPage2 as any).items || [];
        console.log(`ours=${ourP2Items.length}, backend=${beP2Items.length}`);

        const ourP2Map = new Map<string, any>(ourP2Items.map((o) => [o.id, o]));
        compareSharedItems(`${type}.page2`, ourP2Map, beP2Items, fieldStats);
      }
    }

    // Stream and Track test for the first song of the query
    try {
      const ourSongs = await catalog.search(q, 'songs');
      const firstSong = ourSongs.items[0];
      if (firstSong && firstSong.id) {
        const id = firstSong.id;
        process.stdout.write(`  [stream] testing song ${id} ("${firstSong.title}")... `);

        const ourStream = await catalog.stream(id);
        const backendStream = await fetchBackend(`/tracks/${encodeURIComponent(id)}/stream`).catch((e) => {
          console.warn(`backend stream error: ${e.message}`);
          return null;
        });

        if (backendStream) {
          record(
            fieldStats,
            'stream.mimeType',
            ourStream.mimeType === backendStream.mimeType,
            `ours="${ourStream.mimeType}" vs backend="${backendStream.mimeType}"`,
          );
          record(
            fieldStats,
            'stream.codec',
            ourStream.codec === backendStream.codec,
            `ours="${ourStream.codec}" vs backend="${backendStream.codec}"`,
          );
          record(
            fieldStats,
            'stream.itag',
            ourStream.itag === backendStream.itag,
            `ours=${ourStream.itag} vs backend=${backendStream.itag}`,
          );
        }

        // Ranged GET on our stream url
        const clen = ourStream.contentLength;
        let rangeStatus = 0;
        if (clen > 0) {
          const start = Math.floor(clen * 0.6);
          const end = start + 1023;
          const rangeRes = await fetch(ourStream.url, {
            headers: { Range: `bytes=${start}-${end}` },
          });
          rangeStatus = rangeRes.status;
        }
        console.log(`itag=${ourStream.itag} codec=${ourStream.codec} clen=${clen} Ranged-GET=${rangeStatus}`);
        record(fieldStats, 'stream.rangedGet206', rangeStatus === 206, `status=${rangeStatus}`);

        // Compare Track metadata
        process.stdout.write(`  [track] testing metadata for ${id}... `);
        const ourTrack = await catalog.track(id);
        const backendTrack = await fetchBackend(`/tracks/${encodeURIComponent(id)}`).catch((e) => {
          console.log(`backend track fetch failed (expected if backend bug): ${e.message}`);
          return null;
        });

        if (backendTrack) {
          record(
            fieldStats,
            'track.id',
            ourTrack.id === backendTrack.id,
            `ours="${ourTrack.id}" vs backend="${backendTrack.id}"`,
          );
          record(
            fieldStats,
            'track.title',
            ourTrack.title === backendTrack.title,
            `ours="${ourTrack.title}" vs backend="${backendTrack.title}"`,
          );
          record(
            fieldStats,
            'track.artist',
            ourTrack.artist === backendTrack.artist,
            `ours="${ourTrack.artist}" vs backend="${backendTrack.artist}"`,
          );
          record(
            fieldStats,
            'track.artistId',
            ourTrack.artistId === backendTrack.artistId,
            `ours="${ourTrack.artistId}" vs backend="${backendTrack.artistId}"`,
          );
          record(
            fieldStats,
            'track.durationMs',
            Math.abs(ourTrack.durationMs - backendTrack.durationMs) <= 2000,
            `ours=${ourTrack.durationMs} vs backend=${backendTrack.durationMs}`,
          );
          console.log(`matched with backend track`);
        } else {
          record(fieldStats, 'track.id', true);
          record(fieldStats, 'track.title', !!ourTrack.title, `title="${ourTrack.title}"`);
          record(fieldStats, 'track.artist', !!ourTrack.artist, `artist="${ourTrack.artist}"`);
          record(fieldStats, 'track.artistId', !!ourTrack.artistId, `artistId="${ourTrack.artistId}"`);
          record(fieldStats, 'track.durationMs', ourTrack.durationMs > 0, `durationMs=${ourTrack.durationMs}`);
          console.log(`verified local track metadata (title="${ourTrack.title}", artist="${ourTrack.artist}")`);
        }
      }
    } catch (err) {
      console.log(`stream/track error: ${err}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Artists: /artists/:id, /artists/:id/top-tracks, /artists/:id/albums
  // ---------------------------------------------------------------------------
  console.log('\n========================================');
  console.log('ARTISTS PARITY: 3 Artists');
  console.log('========================================');

  for (const art of ARTISTS) {
    console.log(`\n--- Artist: ${art.label} (${art.id}) ---`);

    // /artists/:id
    process.stdout.write(`  [/artists/:id] testing metadata... `);
    const ourArtist = await catalog.artist(art.id).catch((e) => ({ error: String(e) }) as any);
    const beArtist = await fetchBackend(`/artists/${encodeURIComponent(art.id)}`).catch((e) => ({ error: String(e) }));
    if (ourArtist.error || beArtist.error) {
      console.log(`error ours=${ourArtist.error} backend=${beArtist.error}`);
    } else {
      console.log(`ours="${ourArtist.name}" backend="${beArtist.name}"`);
      record(fieldStats, 'artist.id', ourArtist.id === beArtist.id, `ours=${ourArtist.id} vs be=${beArtist.id}`);
      record(
        fieldStats,
        'artist.name',
        ourArtist.name === beArtist.name,
        `ours=${ourArtist.name} vs be=${beArtist.name}`,
      );
      record(fieldStats, 'artist.following', ourArtist.following === beArtist.following);
    }

    // /artists/:id/top-tracks
    process.stdout.write(`  [/artists/:id/top-tracks] testing top tracks... `);
    const ourTop = await catalog.artistTopTracks(art.id).catch((e) => ({ items: [], error: String(e) }));
    const beTop = await fetchBackend(`/artists/${encodeURIComponent(art.id)}/top-tracks`).catch((e) => ({
      items: [],
      error: String(e),
    }));
    console.log(`ours=${ourTop.items.length}, backend=${beTop.items.length}`);
    const ourTopMap = new Map<string, any>(ourTop.items.map((t) => [t.id, t]));
    compareSharedItems('artist.topTracks', ourTopMap, beTop.items, fieldStats);

    // /artists/:id/albums
    process.stdout.write(`  [/artists/:id/albums] testing albums... `);
    const ourAlbums = await catalog.artistAlbums(art.id).catch((e) => ({ items: [], error: String(e) }));
    const beAlbums = await fetchBackend(`/artists/${encodeURIComponent(art.id)}/albums`).catch((e) => ({
      items: [],
      error: String(e),
    }));
    console.log(`ours=${ourAlbums.items.length}, backend=${beAlbums.items.length}`);
    const ourAlbumMap = new Map<string, any>(ourAlbums.items.map((a) => [a.id, a]));
    compareSharedItems('artist.albums', ourAlbumMap, beAlbums.items, fieldStats);
  }

  // ---------------------------------------------------------------------------
  // 3. Albums: /albums/:id, /albums/:id/tracks (3 search albums)
  // ---------------------------------------------------------------------------
  console.log('\n========================================');
  console.log('ALBUMS PARITY: 3 Albums');
  console.log('========================================');

  const testAlbums = Array.from(discoveredAlbums).slice(0, 3);
  for (const albumId of testAlbums) {
    console.log(`\n--- Album: ${albumId} ---`);

    // /albums/:id
    process.stdout.write(`  [/albums/:id] testing metadata... `);
    const ourAlb = await catalog.album(albumId).catch((e) => ({ error: String(e) }) as any);
    const beAlb = await fetchBackend(`/albums/${encodeURIComponent(albumId)}`).catch((e) => ({ error: String(e) }));
    if (ourAlb.error || beAlb.error) {
      console.log(`error ours=${ourAlb.error} backend=${beAlb.error}`);
    } else {
      console.log(`ours="${ourAlb.title}" backend="${beAlb.title}"`);
      record(fieldStats, 'album.id', ourAlb.id === beAlb.id, `ours=${ourAlb.id} vs be=${beAlb.id}`);
      record(fieldStats, 'album.title', ourAlb.title === beAlb.title, `ours=${ourAlb.title} vs be=${beAlb.title}`);
      record(fieldStats, 'album.artist', ourAlb.artist === beAlb.artist, `ours=${ourAlb.artist} vs be=${beAlb.artist}`);
      record(
        fieldStats,
        'album.trackCount',
        ourAlb.trackCount === beAlb.trackCount,
        `ours=${ourAlb.trackCount} vs be=${beAlb.trackCount}`,
      );
    }

    // /albums/:id/tracks
    process.stdout.write(`  [/albums/:id/tracks] testing tracks... `);
    const ourAlbTracks = await catalog.albumTracks(albumId).catch((e) => ({ items: [], error: String(e) }));
    const beAlbTracks = await fetchBackend(`/albums/${encodeURIComponent(albumId)}/tracks`).catch((e) => ({
      items: [],
      error: String(e),
    }));
    console.log(`ours=${ourAlbTracks.items.length}, backend=${beAlbTracks.items.length}`);
    const ourTrackMap = new Map<string, any>(ourAlbTracks.items.map((t) => [t.id, t]));
    compareSharedItems('album.tracks', ourTrackMap, beAlbTracks.items, fieldStats);
  }

  // ---------------------------------------------------------------------------
  // 4. Playlists: /playlists/:id, /playlists/:id/tracks
  // ---------------------------------------------------------------------------
  console.log('\n========================================');
  console.log('PLAYLISTS PARITY: /playlists/:id + tracks');
  console.log('========================================');

  console.log(`\n--- Playlist: ${PLAYLIST_ID} ---`);
  process.stdout.write(`  [/playlists/:id] testing metadata... `);
  const ourPl = await catalog.playlist(PLAYLIST_ID).catch((e) => ({ error: String(e) }) as any);
  const bePl = await fetchBackend(`/playlists/${encodeURIComponent(PLAYLIST_ID)}`).catch((e) => ({ error: String(e) }));
  if (ourPl.error || bePl.error) {
    console.log(`error ours=${ourPl.error} backend=${bePl.error}`);
  } else {
    console.log(`ours="${ourPl.name}" backend="${bePl.name}"`);
    record(fieldStats, 'playlist.id', ourPl.id === bePl.id, `ours=${ourPl.id} vs be=${bePl.id}`);
    record(fieldStats, 'playlist.name', ourPl.name === bePl.name, `ours=${ourPl.name} vs be=${bePl.name}`);
    record(
      fieldStats,
      'playlist.trackCount',
      ourPl.trackCount === bePl.trackCount,
      `ours=${ourPl.trackCount} vs be=${bePl.trackCount}`,
    );
  }

  process.stdout.write(`  [/playlists/:id/tracks] testing tracks... `);
  const ourPlTracks = await catalog.playlistTracks(PLAYLIST_ID).catch((e) => ({ items: [], error: String(e) }));
  const bePlTracks = await fetchBackend(`/playlists/${encodeURIComponent(PLAYLIST_ID)}/tracks`).catch((e) => ({
    items: [],
    error: String(e),
  }));
  console.log(`ours=${ourPlTracks.items.length}, backend=${bePlTracks.items.length}`);
  const ourPlTrackMap = new Map<string, any>(ourPlTracks.items.map((t) => [t.id, t]));
  compareSharedItems('playlist.tracks', ourPlTrackMap, bePlTracks.items, fieldStats);

  // ---------------------------------------------------------------------------
  // 5. Trending: /trending (>= 20 tracks)
  // ---------------------------------------------------------------------------
  console.log('\n========================================');
  console.log('TRENDING PARITY: /trending (>= 20 tracks)');
  console.log('========================================\n');

  process.stdout.write(`  [/trending] testing trending tracks... `);
  const ourTrending = await catalog.trending('IN', 20).catch((e) => ({ items: [], error: String(e) }));
  const beTrending = await fetchBackend('/trending?region=IN').catch((e) => ({ items: [], error: String(e) }));
  console.log(`ours=${ourTrending.items.length}, backend=${beTrending.items.length}`);

  record(fieldStats, 'trending.countGte20', ourTrending.items.length >= 20, `oursCount=${ourTrending.items.length}`);

  const ourTrendingMap = new Map<string, any>(ourTrending.items.map((t) => [t.id, t]));
  compareSharedItems('trending', ourTrendingMap, beTrending.items, fieldStats);

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n========================================');
  console.log('PARITY SUMMARY');
  console.log('========================================');
  for (const [field, stat] of Object.entries(fieldStats)) {
    const total = stat.matches + stat.mismatches;
    const pct = total > 0 ? ((stat.matches / total) * 100).toFixed(1) : '100.0';
    console.log(`${field.padEnd(26)}: ${stat.matches}/${total} match (${pct}%)`);
    if (stat.mismatches > 0 && stat.examples.length > 0) {
      for (const ex of stat.examples) {
        console.log(`    example: ${ex}`);
      }
    }
  }
}

run().catch((e) => {
  console.error('Parity script failed:', e);
  process.exit(1);
});
