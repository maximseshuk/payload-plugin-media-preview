import payloadEsLintConfig from '@payloadcms/eslint-config'
import pluginStylistic from '@stylistic/eslint-plugin'

export default [
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/build/',
      '**/.next/',
      '**/pnpm-lock.yaml',
      '**/tsconfig.tsbuildinfo',
      '**/payload-types.ts',
      '**/importMap.js',
      '**/next-env.d.ts',
      '**/eslint.config.js',
      '**/playwright.config.ts',
      '**/.temp',
      '**/temp/',
      '**/README.md',
      '**/.git',
      '**/.*',
    ],
  },
  ...payloadEsLintConfig,
  {
    plugins: {
      '@stylistic': pluginStylistic,
    },
    rules: {
      '@stylistic/block-spacing': ['error', 'always'],
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/comma-spacing': ['error', { after: true, before: false }],
      '@stylistic/function-call-spacing': ['error', 'never'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/key-spacing': ['error', { afterColon: true, beforeColon: false, mode: 'strict' }],
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      '@stylistic/max-len': ['error', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: { delimiter: 'none', requireLast: false },
          singleline: { delimiter: 'semi', requireLast: false },
        },
      ],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/space-before-blocks': ['error', 'always'],
      '@stylistic/space-before-function-paren': [
        'error',
        { anonymous: 'always', asyncArrow: 'always', named: 'never' },
      ],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/type-annotation-spacing': ['error', { after: true, before: false, overrides: { arrow: 'ignore' } }],
      '@stylistic/arrow-spacing': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      'eol-last': ['error', 'always'],
      'no-multi-spaces': 'error',
      'no-restricted-exports': 'off',
      'object-curly-newline': ['error', { consistent: true, multiline: true }],
      'object-curly-spacing': ['error', 'always'],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
        projectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 40,
          allowDefaultProject: [
            'scripts/*.ts',
            '*.js',
            '*.mjs',
            '*.spec.ts',
            '*.d.ts',
            'vitest.config.ts',
            'tests/*.mjs',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
