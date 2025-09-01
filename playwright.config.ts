import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PW_BASE_URL || 'http://localhost:3110';
// Use a dedicated DB file for E2E; allow override via env
const e2eDbPath = process.env.SQLITE_DB_PATH || './db.e2e.sqlite';
// Ensure globalSetup sees the same path
process.env.SQLITE_DB_PATH = e2eDbPath;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'PORT=3110 npm run dev',
    url: 'http://localhost:3110',
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 180_000,
    env: {
      TRANSLATION_DEV_FALLBACK: '1',
      TRANSLATION_JOB_AUTOSTART: '0',
      NEXT_PUBLIC_E2E: '1',
      E2E_MODE: '1',
      SQLITE_DB_PATH: e2eDbPath,
    }
  },
  globalSetup: require.resolve('./scripts/playwright.global-setup'),
});
