import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    exclude: ['tests/e2e/**'],
    server: {
      deps: {
        inline: ['react-router', 'react-router-dom'],
      },
    },
  },
})
