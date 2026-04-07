import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Default environment is node (preserves existing lib tests).
    // Component tests that need a DOM opt in with `// @vitest-environment jsdom`
    // at the top of the file. (Vitest 4 removed `environmentMatchGlobs`.)
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    exclude: ['node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['lib/cmmc/**', 'lib/crypto.ts', 'lib/design/**'],
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
