import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: './playwright/results',
  reporter: [['html', { outputFolder: './playwright/report' }]],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  use: {
    baseURL: 'http://localhost:47391',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'pnpm exec cross-env PAYLOAD_CONFIG_PATH=./tests/payload.config.ts DATABASE_URL=file::memory: next dev tests --turbo --port 47391',
    cwd: '..',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    url: 'http://localhost:47391/admin',
  },
})
