import path from 'path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '..');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8787';
const remoteAcceptance = process.env.PLAYWRIGHT_REMOTE === '1';
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: path.join(repoRoot, 'playwright-report'), open: 'never' }]]
    : 'list',
  outputDir: path.join(repoRoot, 'test-results'),
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI && !remoteAcceptance && !skipWebServer
    ? [
        {
          command: 'npm run start:prod',
          cwd: path.join(repoRoot, 'backend'),
          url: `${apiURL}/health/live`,
          reuseExistingServer: false,
          timeout: 120_000,
        },
        {
          command:
            'cross-env VITE_API_URL=http://localhost:8787 npm run dev -- --port 5173',
          cwd: repoRoot,
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
        },
        {
          command:
            'cross-env VITE_API_URL=http://localhost:8787 VITE_AUTH_PORTAL=ops npm run dev:ops',
          cwd: repoRoot,
          url: 'http://localhost:5177/login',
          reuseExistingServer: false,
          timeout: 120_000,
        },
      ]
    : undefined,
});
