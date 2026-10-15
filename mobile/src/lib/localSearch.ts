import type { Track } from '../data/types';

/**
 * Searching the songs on the phone. The query is matched against the title, artist and album
 * of each downloaded song, ignoring case and accents (NFD, combining marks stripped), and every
 * word of the query must appear somewhere in those three fields.
 */
export const foldForSearch = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const matchesLocalQuery = (track: Pick<Track, 'title' | 'artist' | 'album'>, query: string): boolean => {
  const words = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const haystack = foldForSearch(`${track.title} ${track.artist} ${track.album ?? ''}`);
  return words.every((word) => haystack.includes(word));
};

export const searchLocalTracks = (tracks: Track[], query: string): Track[] => {
  if (!query.trim()) return [];
  return tracks.filter((track) => matchesLocalQuery(track, query));
};

export interface LocalArtistGroup {
  id: string;
  name: string;
  tracks: Track[];
}

export interface LocalAlbumGroup {
  id: string;
  title: string;
  artist: string;
  tracks: Track[];
}

/** The matches grouped under the artist that made them, keeping the order they came in. */
export const groupLocalByArtist = (tracks: Track[]): LocalArtistGroup[] => {
  const groups = new Map<string, LocalArtistGroup>();
  for (const track of tracks) {
    const key = track.artistId || track.artist;
    const group = groups.get(key) ?? { id: key, name: track.artist, tracks: [] };
    group.tracks.push(track);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** The matches grouped under their album; songs with no album are grouped as "Single". */
export const groupLocalByAlbum = (tracks: Track[]): LocalAlbumGroup[] => {
  const groups = new Map<string, LocalAlbumGroup>();
  for (const track of tracks) {
    const key = track.albumId || track.album || track.id;
    const group = groups.get(key) ?? { id: key, title: track.album || 'Single', artist: track.artist, tracks: [] };
    group.tracks.push(track);
    groups.set(key, group);
  }
  return [...groups.values()];
};
