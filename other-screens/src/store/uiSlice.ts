import { createSlice } from '@reduxjs/toolkit'

interface UIState {
  queueOpen: boolean
}

const initialState: UIState = {
  queueOpen: false,
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
  },
})

export const { openQueue, closeQueue, toggleQueue } = uiSlice.actions
export default uiSlice.reducer
