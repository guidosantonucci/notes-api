import { defineConfig } from '@playwright/test';

const PORT = 3100;

/** API-only suite: no browser is launched, Playwright's `request` fixture talks HTTP directly. */
export default defineConfig({
  testDir: './tests/api',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.API_URL ?? `http://localhost:${PORT}`,
    extraHTTPHeaders: { Accept: 'application/json' },
  },
  webServer: process.env.API_URL
    ? undefined // testing an already-deployed API
    : {
        command: 'node src/server.js',
        url: `http://localhost:${PORT}/health`,
        env: { PORT: String(PORT) },
        reuseExistingServer: !process.env.CI,
      },
});
