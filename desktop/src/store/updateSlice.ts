import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppRelease } from '../types';
import { checkForUpdate, downloadUpdate, type UpdateCheck } from '../storage/appUpdate';
import { DEV_BUILD } from '../lib/buildInfo';
import { loadErrorMessage } from '../api/api';

/**
 * Settings → About in the desktop window: whether a newer build was uploaded on the admin page,
 * and its download. Kept here so a download carries on (and is still shown) when the user
 * leaves Settings. A local run ('dev') is never offered the release builds.
 */
export type UpdateStatus =
  'idle' | 'checking' | 'current' | 'dev' | 'available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateState {
  status: UpdateStatus;
  /** The newer build, once one is found. */
  release: AppRelease | null;
  /** The newest build, newer or not: its notes are "What's new". */
  latest: AppRelease | null;
  /** 0..1 while downloading. */
  progress: number;
  /** Where the download was saved. */
  path: string | null;
  error: string | null;
}

export const initialUpdateState: UpdateState = {
  status: 'idle',
  release: null,
  latest: null,
  progress: 0,
  path: null,
  error: null,
};

type State = { update: UpdateState };

export const checkForUpdates = createAsyncThunk<UpdateCheck, void, { rejectValue: string }>(
  'update/check',
  async (_, { rejectWithValue }) => {
    try {
      return await checkForUpdate();
    } catch (e) {
      return rejectWithValue(loadErrorMessage(e));
    }
  },
  {
    // A download in progress or done already answered the question.
    condition: (_, { getState }) =>
      !['checking', 'downloading', 'downloaded'].includes((getState() as State).update.status),
  },
);

export const downloadAppUpdate = createAsyncThunk(
  'update/download',
  (release: AppRelease, { dispatch }) =>
    downloadUpdate(release, (fraction) => dispatch(updateSlice.actions.progress(fraction))),
  { condition: (_, { getState }) => (getState() as State).update.status !== 'downloading' },
);

export const updateSlice = createSlice({
  name: 'update',
  initialState: initialUpdateState,
  reducers: {
    progress(state, action: PayloadAction<number>) {
      if (state.status === 'downloading') state.progress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkForUpdates.pending, (state) => {
        state.status = 'checking';
        state.error = null;
      })
      .addCase(checkForUpdates.fulfilled, (state, action) => {
        const { latest, update } = action.payload;
        state.latest = latest;
        state.release = DEV_BUILD ? null : update;
        state.status = !update ? 'current' : DEV_BUILD ? 'dev' : 'available';
      })
      .addCase(checkForUpdates.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? "Couldn't check for updates";
      })
      .addCase(downloadAppUpdate.pending, (state, action) => {
        state.status = 'downloading';
        state.release = action.meta.arg;
        state.progress = 0;
        state.error = null;
      })
      .addCase(downloadAppUpdate.fulfilled, (state, action) => {
        state.status = 'downloaded';
        state.path = action.payload;
        state.progress = 1;
      })
      .addCase(downloadAppUpdate.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message || 'The download failed';
      });
  },
});

export default updateSlice.reducer;
