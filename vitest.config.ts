import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    exclude: ['node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['lib/cmmc/**', 'lib/crypto.ts'],
      exclude: ['lib/cmmc/requirement-values.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@\/(.*)/,
        replacement: path.resolve(__dirname, '$1'),
      },
    ],
  },
})
