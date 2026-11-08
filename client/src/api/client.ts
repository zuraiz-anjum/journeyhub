import axios from 'axios';

// All requests go to /api. In development Vite proxies that to the Express server,
// and withCredentials makes the browser send the httpOnly auth cookie.
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Pulls a readable message out of whatever went wrong.
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (!err.response) return 'Could not reach the server. Is it running?';
    return `Request failed (${err.response.status})`;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export default api;
