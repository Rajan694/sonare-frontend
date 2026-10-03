import React from 'react';
import { vi } from 'vitest';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import search from '../../src/store/searchSlice';
import ui from '../../src/store/uiSlice';
import { ModeContext } from '../../src/store/modeContext';
import { PlayerContext, defaultPlayerState, type PlayerStore } from '../../src/store/playerContext';
import type { Mode, PlayerState, Track } from '../../src/types';

export function makeStore() {
  return configureStore({ reducer: { search, ui } });
}

/** A PlayerStore whose actions are all spies, so tests can assert what a control asked for. */
export function makePlayer(over: Partial<PlayerStore> & { queue?: Track[]; index?: number } = {}): PlayerStore {
  const { queue, index, state, ...rest } = over;
  const s: PlayerState = {
    ...defaultPlayerState,
    ...state,
    ...(queue && { queue }),
    ...(index !== undefined && { index }),
  };
  return {
    state: s,
    setState: vi.fn(),
    currentTrack: s.queue[s.index] ?? null,
    playTrack: vi.fn(),
    isPlaying: false,
    isLoading: false,
    durationMs: s.queue[s.index]?.durationMs ?? 0,
    playbackError: null,
    togglePlay: vi.fn(),
    seek: vi.fn(),
    seekRatio: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    skipToPrevious: vi.fn(),
    volume: 1,
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleShuffle: vi.fn(),
    cycleRepeat: vi.fn(),
    playNext: vi.fn(),
    enqueue: vi.fn(),
    removeFromQueue: vi.fn(),
    moveInQueue: vi.fn(),
    clearUpcoming: vi.fn(),
    ...rest,
  };
}

/** Shows the router location, so tests can assert where a click navigated. */
function LocationProbe() {
  const loc = useLocation();
  return (
    <span data-testid="location" hidden>
      {loc.pathname + loc.search}
    </span>
  );
}

export interface ProviderOptions {
  /** Initial URL, or a location with router state (e.g. what the account gate passes). */
  route?: string | { pathname: string; state?: unknown };
  /** Route pattern the UI is mounted at, for screens that read params (e.g. '/album/:id'). */
  path?: string;
  player?: PlayerStore;
  mode?: Mode;
  setMode?: (m: Mode) => void;
  store?: ReturnType<typeof makeStore>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    route = '/',
    path,
    player = makePlayer(),
    mode = 'online',
    setMode = vi.fn(),
    store = makeStore(),
    ...rest
  }: ProviderOptions & RenderOptions = {},
) {
  const user = userEvent.setup();
  const utils = render(
    <Provider store={store}>
      <ModeContext.Provider value={{ mode, setMode }}>
        <PlayerContext.Provider value={player}>
          <MemoryRouter initialEntries={[route]}>
            {path ? (
              <Routes>
                <Route path={path} element={ui} />
                <Route path="*" element={null} />
              </Routes>
            ) : (
              ui
            )}
            <LocationProbe />
          </MemoryRouter>
        </PlayerContext.Provider>
      </ModeContext.Provider>
    </Provider>,
    rest,
  );
  const location = () => utils.getByTestId('location').textContent;
  return { ...utils, user, player, store, setMode, location };
}
