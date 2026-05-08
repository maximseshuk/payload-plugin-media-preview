import { defineConfig } from 'oxfmt'

export default defineConfig({
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  insertFinalNewline: true,
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/build/**',
    'pnpm-lock.yaml',
    '**/payload-types.ts',
    '**/importMap.js',
    '**/next-env.d.ts',
    '**/tsconfig.tsbuildinfo',
    '**/.temp/**',
    '**/temp/**',
    'tests/app/(payload)/**',
  ],
})
