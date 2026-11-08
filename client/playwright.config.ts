import { defineConfig } from '@playwright/test';

// Browser tests for the whole app. They expect MongoDB to be running; the API and the
// Vite dev server are started automatically if they are not already up.
// The database is reseeded before the run (see e2e/global-setup.ts).
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // the files share one database, so they run one after another in file name order
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    // uses the Chrome that is already installed instead of downloading a browser
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm --prefix ../server start',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
