import { useWindowDimensions } from 'react-native';

/**
 * Columns for a grid of cards that fills the window's width: more of them on a phone turned
 * sideways. `minCell` is the narrowest a card may get, `padding` the list's own side padding.
 * A FlatList needs a new `key` when the count changes.
 */
export const useGrid = (minCell: number, gap: number, padding = 24) => {
  const { width } = useWindowDimensions();
  const columns = Math.max(1, Math.floor((width - padding + gap) / (minCell + gap)));
  const cellWidth = (width - padding - gap * (columns - 1)) / columns;
  return { columns, cell: { width: cellWidth } };
};
