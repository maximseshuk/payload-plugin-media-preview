import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default defineConfig({
  plugins: [
    tsconfigPaths({
      ignoreConfigErrors: true,
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    hookTimeout: 30_000,
    root: dirname,
    testTimeout: 30_000,
  },
})
