/** "Save queue as playlist" names: Queue 1, Queue 2 … one more than the highest already taken. */
export const nextQueuePlaylistName = (existingNames: readonly string[]): string => {
  let highest = 0;
  for (const name of existingNames) {
    const match = /^Queue (\d+)$/.exec(name.trim());
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `Queue ${highest + 1}`;
};
