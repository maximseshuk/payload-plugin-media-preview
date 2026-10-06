import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  outputDir: './playwright/results',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  reporter: process.env.CI
    ? [
        ['list', { printSteps: true }],
        ['json', { outputFile: './playwright/reports/plugin.json' }],
      ]
    : [['list', { printSteps: true }]],
  retries: process.env.CI ? 1 : undefined,
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60 * 1000,
  use: {
    baseURL: 'http://localhost:47391',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command:
      'pnpm exec cross-env PAYLOAD_CONFIG_PATH=./tests/payload.config.ts DATABASE_URL=file::memory: next dev tests --turbo --port 47391',
    cwd: '..',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    url: 'http://localhost:47391/admin',
  },
  workers: process.env.CI ? 1 : undefined,
})
