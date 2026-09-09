import path from 'path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '..');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8787';
const remoteAcceptance = process.env.PLAYWRIGHT_REMOTE === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI && !remoteAcceptance
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
