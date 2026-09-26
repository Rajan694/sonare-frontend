import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import search, { initialSearchState, type SearchState, type SearchType } from './searchSlice'
import ui from './uiSlice'

const SAVED_SEARCH_KEY = 'sonare_search'
const SIDEBAR_KEY = 'sonare_sidebar_collapsed'
const SEARCH_TYPES: SearchType[] = ['songs', 'albums', 'artists', 'playlists']

/** The query and chip survive a reload (dev-server reloads included); results are refetched. */
function savedSearch(): SearchState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_SEARCH_KEY) ?? 'null') as Partial<SearchState> | null
    return {
      ...initialSearchState,
      ...(typeof saved?.query === 'string' && { query: saved.query }),
      ...(saved?.type && SEARCH_TYPES.includes(saved.type) && { type: saved.type }),
    }
  } catch {
    return initialSearchState
  }
}

/** Unlike the search, the sidebar choice is a preference and survives restarts. */
function savedSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export const store = configureStore({
  reducer: { search, ui },
  preloadedState: { search: savedSearch(), ui: { queueOpen: false, sidebarCollapsed: savedSidebarCollapsed() } },
})

let lastSidebar = store.getState().ui.sidebarCollapsed
store.subscribe(() => {
  const collapsed = store.getState().ui.sidebarCollapsed
  if (collapsed === lastSidebar) return
  lastSidebar = collapsed
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed))
  } catch {
    // Blocked storage: the sidebar reopens expanded next launch.
  }
})

let lastSaved: SearchState | null = null
store.subscribe(() => {
  const { search } = store.getState()
  if (lastSaved && lastSaved.query === search.query && lastSaved.type === search.type) return
  lastSaved = search
  try {
    sessionStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify({ query: search.query, type: search.type }))
  } catch {
    // Blocked storage: the search just won't survive a reload.
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
