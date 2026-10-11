import { defineConfig } from '@playwright/test'

import base from './playwright.config.js'

export default defineConfig({
  ...base,
  fullyParallel: false,
  retries: 0,
  testDir: './screenshots',
  testMatch: '**/*.screenshots.ts',
  use: { ...base.use, screenshot: 'off', trace: 'off', video: 'off' },
  workers: 1,
})
