/**
 * Download file names, the same in both apps: `Artist - Title [videoId].ext`. The id in the name
 * lets an app that lost its downloads list (a reinstall, cleared data) find the files in its
 * download folder again and link them back to their songs (audit I14).
 */

/** Characters no file system allows, folded runs of spaces, at most 120 characters. */
export const safeName = (s: string): string => {
  return (
    s
      // Control characters are not allowed in file names.
      // eslint-disable-next-line no-control-regex
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'track'
  );
};

/** The name without its extension: `Artist - Title [videoId]`. */
export const downloadName = (item: { id: string; artist: string; title: string }): string => {
  const base = safeName(`${item.artist} - ${item.title}`);
  return `${base} [${item.id.replace(/^yt:/, '')}]`;
};

/** The YouTube id a download's file name ends with, as `downloadName` writes it; null for other files. */
export const idInFileName = (fileName: string): string | null => {
  const m = /\[([A-Za-z0-9_-]{11})\]\.[a-z0-9]+$/i.exec(fileName);
  return m ? `yt:${m[1]}` : null;
};

/**
 * Artist, title and id back out of a name `downloadName` wrote, for a file whose tags say
 * nothing (the system then shows the file name as its title). Null for other files.
 */
export const parseDownloadName = (fileName: string): { id: string; artist: string | null; title: string } | null => {
  const m = /^(.*?)\s*\[([A-Za-z0-9_-]{11})\](?:\.[a-z0-9]+)?$/i.exec(fileName);
  if (!m) return null;
  const base = m[1];
  const dash = base.indexOf(' - ');
  return {
    id: `yt:${m[2]}`,
    artist: dash > 0 ? base.slice(0, dash) : null,
    title: dash > 0 ? base.slice(dash + 3) : base,
  };
};
