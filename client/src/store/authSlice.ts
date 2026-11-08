import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import api, { getErrorMessage } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  // true once we have asked the server who is logged in (on page load)
  checked: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  checked: false,
  loading: false,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async () => {
  try {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data.user;
  } catch {
    // 401 just means nobody is logged in
    return null;
  }
});

export const login = createAsyncThunk<User, { email: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await api.post<{ user: User }>('/auth/login', credentials);
      return res.data.user;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const register = createAsyncThunk<
  User,
  { name: string; email: string; password: string },
  { rejectValue: string }
>('auth/register', async (form, { rejectWithValue }) => {
  try {
    const res = await api.post<{ user: User }>('/auth/register', form);
    return res.data.user;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    userUpdated(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.checked = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });

    // login and register behave the same way
    for (const thunk of [login, register]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false;
          state.user = action.payload;
          state.checked = true;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload ?? 'Something went wrong';
        });
    }
  },
});

export const { userUpdated, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
