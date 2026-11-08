import { describe, expect, it, vi } from 'vitest';
import api from '../api/client';
import authReducer, { clearAuthError, fetchCurrentUser, login, logout, register, userUpdated } from './authSlice';
import { makeStore, member, ok, serverError } from '../test/utils';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  default: { get: vi.fn(), post: vi.fn() },
}));
const mockedApi = vi.mocked(api, true);

const initial = authReducer(undefined, { type: 'init' });

describe('auth slice reducer', () => {
  it('starts with nobody logged in and the session not checked yet', () => {
    expect(initial).toEqual({ user: null, checked: false, loading: false, error: null });
  });

  it('marks the session as checked after /auth/me, with or without a user', () => {
    expect(authReducer(initial, fetchCurrentUser.fulfilled(member, 'r1'))).toMatchObject({ user: member, checked: true });
    expect(authReducer(initial, fetchCurrentUser.fulfilled(null, 'r1'))).toMatchObject({ user: null, checked: true });
  });

  it('sets loading and clears the old error while logging in', () => {
    const withError = { ...initial, error: 'Wrong email or password' };
    const state = authReducer(withError, login.pending('r1', { email: 'a@b.c', password: 'x' }));
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('stores the user when login works', () => {
    const state = authReducer(initial, login.fulfilled(member, 'r1', { email: member.email, password: 'x' }));
    expect(state).toEqual({ user: member, checked: true, loading: false, error: null });
  });

  it('keeps the server message when login fails', () => {
    const action = login.rejected(null, 'r1', { email: member.email, password: 'x' }, 'Wrong email or password');
    const state = authReducer({ ...initial, loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.user).toBeNull();
    expect(state.error).toBe('Wrong email or password');
  });

  it('falls back to a general message when a failure has no message', () => {
    const action = login.rejected(new Error('boom'), 'r1', { email: member.email, password: 'x' });
    expect(authReducer(initial, action).error).toBe('Something went wrong');
  });

  it('handles register the same way as login', () => {
    const form = { name: 'Sara', email: 'sara@x.com', password: 'secret1' };
    expect(authReducer(initial, register.pending('r1', form)).loading).toBe(true);
    expect(authReducer(initial, register.fulfilled(member, 'r1', form)).user).toEqual(member);
    expect(authReducer(initial, register.rejected(null, 'r1', form, 'Email taken')).error).toBe('Email taken');
  });

  it('clears the user on logout', () => {
    const loggedIn = authReducer(initial, login.fulfilled(member, 'r1', { email: member.email, password: 'x' }));
    expect(authReducer(loggedIn, logout.fulfilled(undefined, 'r2')).user).toBeNull();
  });

  it('updates the user after a profile edit', () => {
    const loggedIn = authReducer(initial, login.fulfilled(member, 'r1', { email: member.email, password: 'x' }));
    const state = authReducer(loggedIn, userUpdated({ ...member, name: 'Maya R.' }));
    expect(state.user?.name).toBe('Maya R.');
  });

  it('clearAuthError removes the error', () => {
    expect(authReducer({ ...initial, error: 'Oops' }, clearAuthError()).error).toBeNull();
  });
});

describe('auth thunks', () => {
  it('login posts the credentials and stores the returned user', async () => {
    mockedApi.post.mockResolvedValueOnce(ok({ user: member }));
    const store = makeStore();
    await store.dispatch(login({ email: member.email, password: 'Member123!' }));
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', { email: member.email, password: 'Member123!' });
    expect(store.getState().auth.user).toEqual(member);
  });

  it('login passes the server error message to the state', async () => {
    mockedApi.post.mockRejectedValueOnce(serverError(401, 'Wrong email or password'));
    const store = makeStore();
    await store.dispatch(login({ email: member.email, password: 'nope' }));
    expect(store.getState().auth.error).toBe('Wrong email or password');
    expect(store.getState().auth.user).toBeNull();
  });

  it('fetchCurrentUser treats a 401 as nobody logged in', async () => {
    mockedApi.get.mockRejectedValueOnce(serverError(401, 'Please log in first'));
    const store = makeStore(member);
    await store.dispatch(fetchCurrentUser());
    expect(store.getState().auth).toMatchObject({ user: null, checked: true });
  });
});
