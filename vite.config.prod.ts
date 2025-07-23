import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Ignore TypeScript warnings during build
          if (warning.code === 'TYPESCRIPT_ERROR') return;
          warn(warning);
        },
      },
    },
    esbuild: {
      // Ignore TypeScript errors during build
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
  };
});
