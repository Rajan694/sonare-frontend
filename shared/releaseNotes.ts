// A release's notes (the GitHub release body, Markdown) as plain blocks the apps can draw in
// their "What's new" dialog without a Markdown renderer. GitHub's generated notes end every
// item with "by @someone in https://…/pull/12" and a "Full Changelog" link; those are dropped.

export interface NoteBlock {
  kind: 'heading' | 'item' | 'text';
  text: string;
}

const inline = (text: string): string =>
  text
    // [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // **bold**, __bold__, `code`
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    // " by @user in https://github.com/…" that GitHub appends to each change
    .replace(/\s+by\s+@[\w-]+(\s+in\s+\S+)?\s*$/i, '')
    // a bare link left at the end
    .replace(/\s*(in\s+)?https?:\/\/\S+\s*$/i, '')
    .trim();

export const parseReleaseNotes = (notes: string | null | undefined): NoteBlock[] => {
  if (!notes) return [];
  const blocks: NoteBlock[] = [];
  for (const raw of notes.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^\**full changelog\**:/i.test(line) || /^-{3,}$/.test(line)) continue;
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const item = /^[-*+]\s+(.*)$/.exec(line);
    const text = inline(heading?.[1] ?? item?.[1] ?? line);
    if (!text) continue;
    blocks.push({ kind: heading ? 'heading' : item ? 'item' : 'text', text });
  }
  return blocks;
};
