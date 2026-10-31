import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright runs against the production build, not the dev server.
 *
 * The default port is 4173. `E2E_PORT` lets a developer move it when another
 * local project already owns the port; CI always uses the default.
 */
const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    locale: 'es-VE',
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        locale: 'es-VE',
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort --host 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
