/**
 * Download file names, the same in both apps: just the song's title, `Title.ext` (a taken name
 * gets a free variant such as `Title (1).ext` where the file is saved). Until 2026-10-23 the name
 * was `Artist - Title [videoId].ext`; the id let an app that lost its downloads list (a reinstall,
 * cleared data) link the files back to their songs (audit I14). Files named that way still relink;
 * newer ones show up as ordinary songs on the device instead.
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

/** The name without its extension: the title. */
export const downloadName = (item: { title: string }): string => safeName(item.title);

/** The YouTube id an older download's file name ends with (`… [videoId].ext`); null for other files. */
export const idInFileName = (fileName: string): string | null => {
  const m = /\[([A-Za-z0-9_-]{11})\]\.[a-z0-9]+$/i.exec(fileName);
  return m ? `yt:${m[1]}` : null;
};

/**
 * Artist, title and id back out of an older download's name (`Artist - Title [videoId]`), for a
 * file whose tags say nothing (the system then shows the file name as its title). Null for other files.
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
