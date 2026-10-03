import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    environment: 'node',
    hookTimeout: 30_000,
    projects: [
      { extends: true, test: { include: ['tests/unit/**/*.spec.ts'], name: 'unit' } },
      { extends: true, test: { include: ['tests/integration/**/*.int.spec.ts'], name: 'integration' } },
    ],
    testTimeout: 30_000,
  },
})
