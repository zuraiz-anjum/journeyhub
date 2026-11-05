import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server forwards /api to Express so the auth cookie stays same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
