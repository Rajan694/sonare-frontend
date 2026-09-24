import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { api } from '../data/api'
import type { Album, Artist, Playlist, Track } from '../data/types'

export type SearchType = 'songs' | 'albums' | 'artists' | 'playlists'
export type SearchItem = Track | Album | Artist | Playlist

/**
 * The search lives here rather than in the Search screen, so leaving the page (or opening
 * a result) and coming back finds the same query, chip and results instead of a blank page.
 */
export interface SearchState {
  /** What is typed in the top-bar search field. */
  query: string
  type: SearchType
  /** Server results for the `resultsFor` key. */
  results: SearchItem[]
  resultsFor: string | null
  /** Key of the newest request, which `status` describes; responses to older ones are dropped. */
  requested: string | null
  status: 'idle' | 'loading' | 'done' | 'error'
  error: string | null
}

export const initialSearchState: SearchState = {
  query: '',
  type: 'songs',
  results: [],
  resultsFor: null,
  requested: null,
  status: 'idle',
  error: null,
}

export const searchKey = (query: string, type: SearchType) => `${type}:${query.trim()}`

export const runSearch = createAsyncThunk(
  'search/run',
  async ({ query, type }: { query: string; type: SearchType }) => (await api.search(query.trim(), type)).items,
  {
    // Skip a request for what is already shown or on its way — e.g. on coming back to the page.
    // A failed one may be asked for again.
    condition: ({ query, type }, { getState }) => {
      const { requested, status } = (getState() as { search: SearchState }).search
      return requested !== searchKey(query, type) || status === 'error'
    },
  }
)

const searchSlice = createSlice({
  name: 'search',
  initialState: initialSearchState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload
    },
    setType(state, action: PayloadAction<SearchType>) {
      state.type = action.payload
    },
  },
  extraReducers: builder => {
    builder
      .addCase(runSearch.pending, (state, action) => {
        state.requested = searchKey(action.meta.arg.query, action.meta.arg.type)
        state.status = 'loading'
        state.error = null
      })
      .addCase(runSearch.fulfilled, (state, action) => {
        const key = searchKey(action.meta.arg.query, action.meta.arg.type)
        if (key !== state.requested) return
        state.results = action.payload
        state.resultsFor = key
        state.status = 'done'
      })
      .addCase(runSearch.rejected, (state, action) => {
        const key = searchKey(action.meta.arg.query, action.meta.arg.type)
        if (key !== state.requested) return
        state.status = 'error'
        state.error = action.error.message ?? 'Search failed'
      })
  },
})

export const { setQuery, setType } = searchSlice.actions
export default searchSlice.reducer
