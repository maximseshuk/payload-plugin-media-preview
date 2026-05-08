import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['typescript', 'react', 'react-perf', 'unicorn', 'import', 'jsx-a11y', 'oxc'],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
    perf: 'off',
  },
  env: {
    browser: true,
    node: true,
    es2024: true,
  },
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/payload-types.ts',
    '**/importMap.js',
    '**/next-env.d.ts',
    '**/.temp/**',
    '**/temp/**',
    'tests/app/(payload)/**',
    'tests/playwright/**',
    'tests/uploads/**',
  ],
  rules: {
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    'import/no-default-export': 'off',
    'import/no-unassigned-import': 'off',
    'react/iframe-missing-sandbox': 'off',
    'unicorn/consistent-function-scoping': 'off',
  },
  overrides: [
    {
      files: ['tests/**/*.{ts,tsx,mjs}'],
      rules: {
        'no-await-in-loop': 'off',
      },
    },
  ],
})
