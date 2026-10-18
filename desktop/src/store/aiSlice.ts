import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Track } from '../types';

// AI features (src/components/ai): whether the backend has an AI provider answering
// (GET /app-config `ai`), and "You may like" once found, so going back to Home doesn't search
// for every song again.

export interface YouMayLikeSongs {
  userId: string;
  generatedAt: number;
  basedOn: string[];
  /** Each song with the AI's reason for it, in the AI's order. */
  songs: { track: Track; reason?: string }[];
}

export interface AiState {
  available: boolean;
  youMayLike: YouMayLikeSongs | null;
}

export const initialAiState: AiState = { available: false, youMayLike: null };

const aiSlice = createSlice({
  name: 'ai',
  initialState: initialAiState,
  reducers: {
    setAiAvailable(state, action: PayloadAction<boolean>) {
      state.available = action.payload;
    },
    setYouMayLike(state, action: PayloadAction<YouMayLikeSongs | null>) {
      state.youMayLike = action.payload;
    },
  },
});

export const { setAiAvailable, setYouMayLike } = aiSlice.actions;
export default aiSlice.reducer;
