import { createSlice } from '@reduxjs/toolkit'

interface UIState {
  queueOpen: boolean
  /** Desktop/web sidebar shrunk to its icon rail. Persisted in store/index.ts. */
  sidebarCollapsed: boolean
}

const initialState: UIState = {
  queueOpen: false,
  sidebarCollapsed: false,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openQueue(state) {
      state.queueOpen = true
    },
    closeQueue(state) {
      state.queueOpen = false
    },
    toggleQueue(state) {
      state.queueOpen = !state.queueOpen
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
  },
})

export const { openQueue, closeQueue, toggleQueue, toggleSidebar } = uiSlice.actions
export default uiSlice.reducer
