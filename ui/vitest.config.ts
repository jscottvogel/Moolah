/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}', '../../amplify/functions/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**', 'tests/**'],
        css: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'src/test/setup.ts'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        dedupe: ['react', 'react-dom'],
    },
});
