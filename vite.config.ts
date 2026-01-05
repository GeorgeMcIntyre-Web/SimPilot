import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: '/',
    server: {
        host: '0.0.0.0', // Listen on all network interfaces
        port: 5173,
        strictPort: false, // Try next port if 5173 is taken
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    xlsx: ['xlsx'],
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'node', // Default to node for unit tests, React tests use @vitest-environment jsdom
        include: ['**/*.test.ts', '**/*.test.tsx'],
        pool: 'vmThreads',
        setupFiles: ['./src/test/setup.ts'],
        deps: {
            optimizer: {
                ssr: {
                    include: ['react-router-dom', 'react-router']
                }
            }
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.test.tsx',
                'src/test/**',
                'src/**/__tests__/**',
                'src/**/__fixtures__/**',
            ],
        },
    },
})
