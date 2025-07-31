import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production' || mode === 'deploy';
  const isMinimal = mode === 'minimal';
  const isVercelBuild = process.env.VERCEL === '1' || mode === 'deploy';
  
  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        // Otimizações específicas para produção
        babel: isProduction ? {
          plugins: [
            ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]
          ]
        } : undefined
      })
    ],
    define: {
      // Definir variáveis globais para produção
      __DEV__: !isProduction,
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
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
      // Otimizações específicas para Vercel
      minify: isProduction ? 'terser' : false,
      sourcemap: false, // Desabilitar sourcemap em produção para reduzir tamanho
      target: isVercelBuild ? 'es2020' : 'esnext',
      cssCodeSplit: true,
      reportCompressedSize: false, // Acelerar build na Vercel
      assetsInlineLimit: 4096, // Inline assets menores que 4KB
      
      // Configurações específicas para Vercel
      outDir: 'dist',
      emptyOutDir: true,
      
      // Configuração otimizada de chunks para Vercel
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        
        // Configurações específicas para Vercel
        ...(isVercelBuild && {
          maxParallelFileOps: 5,
          cache: false, // Desabilitar cache para builds consistentes na Vercel
        }),
        output: {
          // Estratégia de chunks otimizada para cache na Vercel
          manualChunks: (id) => {
            // Vendor chunks principais
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@tanstack/react-query')) {
                return 'query-vendor';
              }
              if (id.includes('lucide-react') || id.includes('recharts')) {
                return 'ui-vendor';
              }
              if (id.includes('@google/generative-ai')) {
                return 'ai-vendor';
              }
              if (id.includes('react-router')) {
                return 'router-vendor';
              }
              // Outros vendors em chunk separado
              return 'vendor';
            }
            
            // Chunks de componentes principais
            if (id.includes('/components/Dashboard')) {
              return 'dashboard';
            }
            if (id.includes('/components/') && (
              id.includes('Patient') || 
              id.includes('Calendar') || 
              id.includes('Reports')
            )) {
              return 'pages';
            }
            
            // Chunks de hooks e serviços
            if (id.includes('/hooks/') || id.includes('/services/')) {
              return 'core';
            }
          },
          
          // Nomes de arquivo otimizados para cache na Vercel
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          entryFileNames: 'assets/[name]-[hash].js',
        },
        
        // Configurações para evitar dependências circulares
        external: [],
      },
      
      // Configurações otimizadas de terser para Vercel
      terserOptions: isProduction ? {
        compress: {
          drop_console: isVercelBuild, // Remover console apenas na Vercel
          drop_debugger: true,
          pure_funcs: isVercelBuild ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: isVercelBuild ? 2 : 1, // Múltiplas passadas apenas na Vercel
          unsafe_arrows: true,
          unsafe_methods: true,
          unsafe_proto: true,
          // Otimizações adicionais para Vercel
          dead_code: true,
          unused: true,
          conditionals: true,
          evaluate: true,
          booleans: true,
          loops: true,
          hoist_funs: true,
          hoist_vars: false,
          if_return: true,
          join_vars: true,
          reduce_vars: true,
          warnings: false,
        },
        mangle: {
          safari10: true,
          properties: {
            regex: /^_/
          }
        },
        format: {
          safari10: true,
          comments: false,
          ecma: 2020,
          ascii_only: true, // Garantir compatibilidade
        },
      } : undefined,
      
      // Limites otimizados para Vercel
      chunkSizeWarningLimit: isVercelBuild ? 1500 : (isMinimal ? 2000 : 1000),
    },
    
    // Configurações específicas por modo
    esbuild: {
      logLevel: isMinimal ? 'silent' : (isVercelBuild ? 'error' : 'info'),
      jsx: 'automatic',
      jsxDev: !isProduction,
      target: isVercelBuild ? 'es2020' : 'esnext',
      // Otimizações específicas para produção
      ...(isProduction && {
        drop: isVercelBuild ? ['console', 'debugger'] : ['debugger'],
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
        legalComments: 'none',
        treeShaking: true,
      }),
    },
    
    // Configurações de desenvolvimento
    server: {
      port: 3000,
      host: true,
      hmr: {
        overlay: false,
      },
    },
    
    // Otimizações de dependências para Vercel
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@tanstack/react-query',
        'lucide-react',
        'recharts',
        'react-router-dom',
        'crypto-js',
        'bcryptjs',
        'zod',
      ],
      exclude: [
        // Excluir dependências que causam problemas na Vercel
        '@google/generative-ai',
        'jspdf',
        'exceljs',
      ],
      // Força re-otimização em mudanças
      force: isVercelBuild,
      // Configurações específicas para Vercel
      ...(isVercelBuild && {
        esbuildOptions: {
          target: 'es2020',
          supported: {
            'top-level-await': false
          }
        }
      })
    },
    
    // Configurações específicas para Vercel
    ...(isVercelBuild && {
      logLevel: 'warn',
      clearScreen: false,
      build: {
        // Configurações específicas para build na Vercel
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          // Otimizações específicas para Vercel
          treeshake: {
            preset: 'recommended',
            moduleSideEffects: false,
          },
        },
      },
    }),
    
    // Configurações de performance
    ...(isProduction && {
      experimental: {
        renderBuiltUrl(filename) {
          // Otimizar URLs de assets para CDN da Vercel
          return `/${filename}`;
        },
      },
    }),
    
    // Configuração para usar apenas o index.html principal
    root: '.',
    publicDir: 'public'
  };
});
