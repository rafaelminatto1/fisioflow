/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/vitest.setup.ts'],
    include: [
      'services/__tests__/**/*.test.{ts,tsx}',
      'hooks/__tests__/**/*.test.{ts,tsx}',
      'components/**/__tests__/**/*.test.{ts,tsx}',
      'utils/__tests__/**/*.test.{ts,tsx}',
      'src/components/__tests__/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'mobile/**',
      'vercel-mcp-temp/**',
      'scripts/**',
      'old/**',
      'tests/**',
      'src/tests/**',
      '**/*.integration.test.{ts,tsx}',
      '**/*.e2e.test.{ts,tsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'mobile/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        'vite.config.ts',
        'tailwind.config.js',
        'postcss.config.js'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/services': path.resolve(__dirname, './services'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/types': path.resolve(__dirname, './types'),
      '@/utils': path.resolve(__dirname, './utils'),
      '@/contexts': path.resolve(__dirname, './contexts'),
      '@/components': path.resolve(__dirname, './components')
    }
  },
  esbuild: {
    jsx: 'automatic',
    jsxDev: false,
  },
});