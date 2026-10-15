import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '../api/api';
import { addRecentSearch, removeRecentSearch } from '../../../shared/search/recentSearches';
import type { Album, Artist, Playlist, Track } from '../types';

export type SearchType = 'songs' | 'albums' | 'artists' | 'playlists';
export type SearchItem = Track | Album | Artist | Playlist;

/**
 * The search lives here rather than in the Search screen, so leaving the page (or opening
 * a result) and coming back finds the same query, chip and results instead of a blank page.
 */
export interface SearchState {
  /** What is typed in the top-bar search field. */
  query: string;
  type: SearchType;
  /** Server results for the `resultsFor` key. */
  results: SearchItem[];
  resultsFor: string | null;
  /** Key of the newest request, which `status` describes; responses to older ones are dropped. */
  requested: string | null;
  status: 'idle' | 'loading' | 'done' | 'error';
  error: string | null;
  /** The next page for what is shown, as the last page the server sent reported it. */
  nextCursor: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  /** The queries this device searched recently, newest first. */
  recent: string[];
}

export const initialSearchState: SearchState = {
  query: '',
  type: 'songs',
  results: [],
  resultsFor: null,
  requested: null,
  status: 'idle',
  error: null,
  nextCursor: null,
  loadingMore: false,
  loadMoreError: null,
  recent: [],
};

export const searchKey = (query: string, type: SearchType) => `${type}:${query.trim()}`;

/** One page of results and how to ask for the next one. */
interface SearchPage {
  items: SearchItem[];
  nextCursor: string | null;
}

export const runSearch = createAsyncThunk<SearchPage, { query: string; type: SearchType }>(
  'search/run',
  async ({ query, type }) => {
    const page = await api.search(query.trim(), type);
    return { items: page.items, nextCursor: page.meta?.nextCursor ?? null };
  },
  {
    // Skip a request for what is already shown or on its way — e.g. on coming back to the page.
    // A failed one may be asked for again.
    condition: ({ query, type }, { getState }) => {
      const { requested, status } = (getState() as { search: SearchState }).search;
      return requested !== searchKey(query, type) || status === 'error';
    },
  },
);

/** Fetch the page after the one shown and append it; a search of its own resets the pages. */
export const loadMoreSearch = createAsyncThunk<SearchPage, { query: string; type: SearchType }>(
  'search/loadMore',
  async ({ query, type }, { getState }) => {
    const { nextCursor } = (getState() as { search: SearchState }).search;
    if (!nextCursor) return { items: [], nextCursor: null };
    const page = await api.search(query.trim(), type, nextCursor);
    return { items: page.items, nextCursor: page.meta?.nextCursor ?? null };
  },
);

const searchSlice = createSlice({
  name: 'search',
  initialState: initialSearchState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setType(state, action: PayloadAction<SearchType>) {
      state.type = action.payload;
    },
    addRecent(state, action: PayloadAction<string>) {
      state.recent = addRecentSearch(state.recent, action.payload);
    },
    removeRecent(state, action: PayloadAction<string>) {
      state.recent = removeRecentSearch(state.recent, action.payload);
    },
    clearRecent(state) {
      state.recent = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runSearch.pending, (state, action) => {
        state.requested = searchKey(action.meta.arg.query, action.meta.arg.type);
        state.status = 'loading';
        state.error = null;
        state.nextCursor = null;
        state.loadingMore = false;
        state.loadMoreError = null;
      })
      .addCase(runSearch.fulfilled, (state, action) => {
        const key = searchKey(action.meta.arg.query, action.meta.arg.type);
        if (key !== state.requested) return;
        state.results = action.payload.items;
        state.resultsFor = key;
        state.status = 'done';
        state.nextCursor = action.payload.nextCursor;
      })
      .addCase(runSearch.rejected, (state, action) => {
        const key = searchKey(action.meta.arg.query, action.meta.arg.type);
        if (key !== state.requested) return;
        state.status = 'error';
        state.error = action.error.message ?? 'Search failed';
      })
      .addCase(loadMoreSearch.pending, (state, action) => {
        // A new query (or chip) started meanwhile: don't mark the fresh list as loading a page.
        if (searchKey(action.meta.arg.query, action.meta.arg.type) !== state.resultsFor) return;
        state.loadingMore = true;
        state.loadMoreError = null;
      })
      .addCase(loadMoreSearch.fulfilled, (state, action) => {
        const key = searchKey(action.meta.arg.query, action.meta.arg.type);
        // A new query (or chip) started meanwhile: this page belongs to results that are gone.
        if (key !== state.resultsFor) return;
        const seen = new Set(state.results.map((item) => item.id));
        for (const item of action.payload.items) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          state.results.push(item);
        }
        state.nextCursor = action.payload.nextCursor;
        state.loadingMore = false;
      })
      .addCase(loadMoreSearch.rejected, (state, action) => {
        const key = searchKey(action.meta.arg.query, action.meta.arg.type);
        if (key !== state.resultsFor) return;
        state.loadingMore = false;
        state.loadMoreError = action.error.message ?? "Couldn't load more";
      });
  },
});

export const { setQuery, setType, addRecent, removeRecent, clearRecent } = searchSlice.actions;
export default searchSlice.reducer;
