import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração mínima para deploy rápido
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      onwarn() {
        // Ignorar todos os warnings para deploy rápido
        return;
      },
    },
  },
  esbuild: {
    logLevel: 'silent',
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3000,
    host: true,
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})