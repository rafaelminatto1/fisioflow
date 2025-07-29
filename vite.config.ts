import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production' || mode === 'deploy';
  const isMinimal = mode === 'minimal';
  
  return {
    plugins: [
      react({
        jsxRuntime: 'automatic'
      })
    ],
    define: {
      // Definir variáveis globais para produção
      __DEV__: !isProduction,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@/src': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './components'),
        '@/hooks': path.resolve(__dirname, './hooks'),
        '@/services': path.resolve(__dirname, './services'),
        '@/utils': path.resolve(__dirname, './utils'),
      },
    },
    build: {
      // Otimizações para produção
      minify: isProduction ? 'terser' : false,
      sourcemap: false, // Desabilitar sourcemap em produção para reduzir tamanho
      target: 'es2020',
      cssCodeSplit: true,
      reportCompressedSize: false, // Acelerar build
      
      // Configuração de chunks para melhor cache
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'query-vendor': ['@tanstack/react-query'],
            'ui-vendor': ['lucide-react', 'recharts'],
            'ai-vendor': ['@google/generative-ai'],
            
            // Core app chunks
            'auth': ['./hooks/useAuth.tsx'],
            'data-core': ['./hooks/data/useOptimizedStorage.ts'],
            'data-users': ['./hooks/data/useUsers.ts'],
            'data-patients': ['./hooks/data/usePatients.ts'],
            'data-tasks': ['./hooks/data/useTasks.ts'],
            
            // Component chunks
            'components-core': ['./components/LazyRoutes.tsx'],
            'components-dashboard': ['./components/Dashboard.tsx'],
            'services': ['./services/geminiService.ts', './services/notificationService.ts'],
          },
          
          // Nomes de arquivo com hash para cache busting
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '')
              : 'chunk';
            return `assets/${facadeModuleId}-[hash].js`;
          },
          assetFileNames: 'assets/[name]-[hash].[ext]',
          entryFileNames: 'assets/[name]-[hash].js',
        },
        
        // Configurações para evitar dependências circulares
        external: (id) => {
          // Não externalizar dependências locais
          return false;
        },
      },
      
      // Configurações de terser para produção
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.warn'],
          passes: 2, // Múltiplas passadas para melhor compressão
        },
        mangle: {
          safari10: true,
        },
        format: {
          safari10: true,
          comments: false, // Remover comentários
        },
      } : undefined,
      
      // Limite de tamanho de chunk
      chunkSizeWarningLimit: isMinimal ? 2000 : 1000,
    },
    
    // Configurações específicas por modo
    esbuild: {
      logLevel: isMinimal ? 'silent' : 'info',
      jsx: 'automatic',
      jsxDev: !isProduction,
    },
    
    // Configurações de desenvolvimento
    server: {
      port: 3000,
      host: true,
      hmr: {
        overlay: false,
      },
    },
    
    // Otimizações de dependências
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        'lucide-react',
        'recharts',
      ],
      exclude: [
        // Excluir dependências que causam problemas
      ],
    },
    
    // Configuração para usar apenas o index.html principal
    root: '.',
    publicDir: 'public'
  };
});
