import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração otimizada para deploy com code splitting
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
      output: {
        manualChunks: (id) => {
          // Vendor chunks para bibliotecas principais
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@google/generative-ai')) {
              return 'vendor-ai';
            }
            if (
              id.includes('jspdf') ||
              id.includes('xlsx') ||
              id.includes('qrcode')
            ) {
              return 'vendor-utils';
            }
            return 'vendor';
          }

          // Feature chunks baseados em diretórios
          if (
            id.includes('/exercises/') ||
            id.includes('ExercisePage') ||
            id.includes('ExerciseModal')
          ) {
            return 'exercises';
          }
          if (id.includes('PatientPage') || id.includes('PatientPortal')) {
            return 'patients';
          }
          if (id.includes('AIAssistant') || id.includes('ChatPage')) {
            return 'ai-features';
          }
          if (id.includes('ReportsPage') || id.includes('Dashboard')) {
            return 'reports';
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId
                .split('/')
                .pop()
                .replace('.tsx', '')
                .replace('.ts', '')
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Aumentar limite para 1MB
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
      '@': '/src',
    },
  },
});
