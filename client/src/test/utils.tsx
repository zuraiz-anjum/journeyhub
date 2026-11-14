import type { ReactElement } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import authReducer, { fetchCurrentUser } from '../store/authSlice';
import type { User } from '../types';

export const member: User = {
  _id: 'u1',
  name: 'Maya Rahman',
  email: 'maya@journeyhub.test',
  role: 'member',
  bio: '',
  homeCity: 'Lahore',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const admin: User = { ...member, _id: 'u0', name: 'Site Admin', email: 'admin@journeyhub.test', role: 'admin' };

// a fresh store, with someone logged in or not
export function makeStore(user: User | null = null) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authReducer(undefined, fetchCurrentUser.fulfilled(user, 'test')) },
  });
}

// shows the current url so tests can check where a page navigated to
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

interface Options {
  user?: User | null;
  // url to start on and the route pattern the page is mounted at (for useParams)
  route?: string;
  path?: string;
}

export function renderPage(ui: ReactElement, { user = null, route = '/', path = '/' }: Options = {}) {
  const store = makeStore(user);
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<p>other page</p>} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </Provider>
  );
  return { store, ...result };
}

// what axios resolves with
export function ok<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} } as AxiosResponse<T>;
}

// what axios rejects with when the server answers with an error status
export function serverError(status: number, message: string): AxiosError {
  const response = { data: { message }, status, statusText: '', headers: {}, config: {} } as AxiosResponse;
  return new AxiosError(message, String(status), undefined, undefined, response);
}

// YYYY-MM-DD for today plus some days, in local time like the date inputs
export function dateFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
