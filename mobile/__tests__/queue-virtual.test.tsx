import React from 'react';
import { render } from '@testing-library/react-native';
import { useDownloadsStore } from '../src/store/downloads';
import { useModeStore } from '../src/store/mode';
import { usePlayerStore } from '../src/store/player';
import { makeTrack } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

/**
 * The FlatList mock in jest.setup draws every row it is given. A real FlatList mounts a screenful
 * and lets the rest come in as the user scrolls, so this file swaps in a list that windows like
 * the real one. That is what makes the row count below say something about the queue screen.
 */
const mocked = jest.requireMock('react-native') as { FlatList: unknown };

const WindowedFlatList = (props: any) => {
  const header =
    typeof props.ListHeaderComponent === 'function' ? props.ListHeaderComponent() : props.ListHeaderComponent;
  const mounted = (props.data ?? []).slice(0, props.initialNumToRender ?? 10);
  return (
    <>
      {header}
      {mounted.map((item: unknown, index: number) => (
        <React.Fragment key={props.keyExtractor?.(item, index) ?? index}>
          {props.renderItem({ item, index, separators: {} })}
        </React.Fragment>
      ))}
    </>
  );
};

mocked.FlatList = WindowedFlatList;

// Loaded after the swap, so the queue screen takes the windowed list.
const { QueueScreen } = require('../src/screens/Queue');

const queueOf = (length: number) =>
  Array.from({ length }, (_, i) => makeTrack({ title: `Song ${i + 1}`, artist: `Artist ${i + 1}` }));

it('MOB-QVIRT-001 a 2,000-song queue mounts a screenful of rows, not 2,000', () => {
  const queue = queueOf(2000);
  useModeStore.setState({ mode: 'online' });
  useDownloadsStore.setState({ items: {} });
  usePlayerStore.setState({
    currentTrack: queue[0],
    queue,
    index: 0,
    isPlaying: true,
    positionMs: 0,
    durationMs: 200_000,
    shuffle: false,
    repeat: 'off',
  });

  const { getAllByLabelText, getByText, UNSAFE_getByType } = render(<QueueScreen />);

  // One list takes every upcoming song, and can place a row without measuring it.
  const list = UNSAFE_getByType(WindowedFlatList as never);
  expect(list.props.data).toHaveLength(1999);
  expect(list.props.getItemLayout(null, 3)).toEqual({ length: 60, offset: 180, index: 3 });

  // Only the first screenful is mounted, and the header is not repeated per row.
  const rows = getAllByLabelText(/^Remove .* from the queue$/);
  expect(rows.length).toBe(10);
  expect(getByText('ONLINE QUEUE')).toBeTruthy();
});
