import { oxfmtBase } from '@seshuk/payload-plugin-tooling/oxfmt'
import { defineConfig } from 'oxfmt'

export default defineConfig({
  ...oxfmtBase,
  ignorePatterns: [
    ...oxfmtBase.ignorePatterns,
    'tests/.next',
    'tests/playwright',
    'tests/uploads',
    '**/next-env.d.ts',
    'tests/app/(payload)/**',
  ],
})
