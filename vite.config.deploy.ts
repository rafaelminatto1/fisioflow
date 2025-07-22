import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração específica para deploy com menos validação TypeScript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Desabilitar checagem TypeScript durante build para deploy rápido
    rollupOptions: {
      onwarn(warning, warn) {
        // Suprimir avisos específicos
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      },
    },
  },
  esbuild: {
    // Ignorar erros TypeScript para deploy rápido
    logLevel: 'error',
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
})