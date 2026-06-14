import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { pluginReact } from '@rsbuild/plugin-react'
import { defineConfig } from '@rslib/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  source: {
    tsconfigPath: './tsconfig.build.json',
    entry: {
      index: ['./src/**/*.{ts,tsx}', '!src/**/*.scss'],
    },
  },
  lib: [
    {
      format: 'esm',
      bundle: false,
      dts: true,
      redirect: {
        style: {
          extension: false,
        },
      },
    },
  ],
  output: {
    target: 'web',
    copy: [{ from: '**/*.scss', context: path.join(__dirname, 'src') }],
  },
  plugins: [pluginReact()],
})
