import { defineConfig } from 'vite'
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
    },
})
