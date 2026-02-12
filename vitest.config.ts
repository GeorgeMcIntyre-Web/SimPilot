import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      xlsx: 'xlsx-patched',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    server: {
      deps: {
        inline: ['react-router', 'react-router-dom'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/test/**',
        'src/**/__tests__/**',
        'src/**/__fixtures__/**',
        'src/app/**',
        'src/main.tsx',
        'src/counter.ts',
        'tests/**',
      ],
      thresholds: {
        branches: 25,
        functions: 35,
        lines: 35,
        statements: 35,
      },
    },
  },
})
