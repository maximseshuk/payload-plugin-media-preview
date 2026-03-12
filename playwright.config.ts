import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: './tests/playwright/results',
  reporter: [['html', { outputFolder: './tests/playwright/report' }]],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'CLEAN_DB=1 USE_MEMORY_DB=1 pnpm dev',
    reuseExistingServer: true,
    timeout: 120000,
    url: 'http://localhost:3000/admin',
  },
})
