import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:3106', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'env NODE_ENV=production PORT=3106 DATABASE_PATH=:memory: npm run start',
    url: 'http://127.0.0.1:3106/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
