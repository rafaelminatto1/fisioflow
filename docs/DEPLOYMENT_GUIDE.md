# Guia de Deploy - FisioFlow

## Visão Geral

Este guia detalha o processo completo de deploy do FisioFlow, desde desenvolvimento até produção, incluindo configurações de ambiente, otimizações e monitoramento.

## Ambientes

### 1. Desenvolvimento (Development)
- **URL**: `http://localhost:3000`
- **API**: Mocks e localStorage
- **Build**: Hot reload com source maps
- **Logs**: Verbose com debug info

### 2. Homologação (Staging)
- **URL**: `https://staging.fisioflow.com.br`
- **API**: Staging endpoints
- **Build**: Produção com source maps
- **Logs**: Estruturados sem debug

### 3. Produção (Production)
- **URL**: `https://fisioflow.com.br`
- **API**: Production endpoints
- **Build**: Otimizado sem source maps
- **Logs**: Apenas errors e warnings

## Pré-requisitos

### Sistema
```bash
# Node.js (versão LTS recomendada)
node --version  # >= 18.0.0
npm --version   # >= 9.0.0

# Git
git --version  # >= 2.30.0
```

### Dependências de Build
```bash
# Instalar dependências
npm install

# Verificar vulnerabilidades
npm audit

# Limpar cache se necessário
npm cache clean --force
```

## Configuração de Ambientes

### Variáveis de Ambiente

#### `.env.local` (Desenvolvimento)
```bash
# API Keys
VITE_GEMINI_API_KEY=sua_chave_gemini_desenvolvimento

# URLs
VITE_API_URL=http://localhost:5000/api
VITE_APP_URL=http://localhost:3000

# Features flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false

# Build
NODE_ENV=development
VITE_BUILD_MODE=development
```

#### `.env.staging` (Homologação)
```bash
# API Keys
VITE_GEMINI_API_KEY=sua_chave_gemini_staging

# URLs
VITE_API_URL=https://api-staging.fisioflow.com.br
VITE_APP_URL=https://staging.fisioflow.com.br

# Features
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true

# Build
NODE_ENV=production
VITE_BUILD_MODE=staging
```

#### `.env.production` (Produção)
```bash
# API Keys (configurar no ambiente de deploy)
VITE_GEMINI_API_KEY=sua_chave_gemini_producao

# URLs
VITE_API_URL=https://api.fisioflow.com.br
VITE_APP_URL=https://fisioflow.com.br

# Features
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true

# Build
NODE_ENV=production
VITE_BUILD_MODE=production

# Security
VITE_ENABLE_CSP=true
VITE_ENABLE_HTTPS_ONLY=true
```

### Configuração de Segurança

#### Content Security Policy (CSP)
```javascript
// vite.config.ts - produção
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Headers de segurança
        manualChunks: {
          'security': ['crypto-js', 'bcryptjs']
        }
      }
    }
  },
  server: {
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://generativelanguage.googleapis.com;
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        connect-src 'self' https://generativelanguage.googleapis.com;
        frame-ancestors 'none';
      `.replace(/\s+/g, ' ').trim()
    }
  }
});
```

## Processo de Build

### Scripts de Build

```json
{
  "scripts": {
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "build:prod": "vite build --mode production",
    "build:analyze": "vite build --mode production && npm run analyze",
    "analyze": "npx vite-bundle-analyzer dist/stats.html",
    "build:check": "npm run build:prod && npm run size-check",
    "size-check": "node scripts/bundle-analysis.js"
  }
}
```

### Otimizações de Build

#### 1. Code Splitting Avançado
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendors separados por funcionalidade
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'recharts', 'react-hook-form'],
          'query-vendor': ['@tanstack/react-query'],
          'ai-vendor': ['@google/generative-ai'],
          
          // Features por prioridade
          'auth-critical': ['./hooks/useAuth.tsx'],
          'data-critical': ['./hooks/data/useOptimizedStorage.ts'],
          'patient-feature': ['./components/PatientPage.tsx'],
          'calendar-feature': ['./components/CalendarPage.tsx'],
          'reports-feature': ['./components/ReportsPage.tsx'],
          
          // Utilities
          'crypto-utils': ['crypto-js', 'bcryptjs'],
          'validation-utils': ['zod', './utils/validations.ts'],
        }
      }
    }
  }
});
```

#### 2. Tree Shaking Otimizado
```typescript
// Package.json
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/styles/**/*"
  ]
}

// Imports otimizados
// ❌ Não recomendado
import * as icons from 'lucide-react';

// ✅ Recomendado
import { User, Calendar, Settings } from 'lucide-react';
```

#### 3. Compressão e Minificação
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false,
        safari10: true
      }
    }
  }
});
```

## Deploy Strategies

### 1. Vercel (Recomendado para SPA)

#### Configuração
```json
// vercel.json
{
  "buildCommand": "npm run build:prod",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "env": {
    "VITE_GEMINI_API_KEY": "@gemini_api_key",
    "VITE_API_URL": "@api_url",
    "VITE_APP_URL": "@app_url"
  }
}
```

#### Deploy Script
```bash
#!/bin/bash
# scripts/deploy-vercel.sh

set -e

echo "🚀 Iniciando deploy para Vercel..."

# 1. Verificações pré-deploy
echo "📋 Executando verificações..."
npm run lint
npm run build:check
npm run test:unit

# 2. Build de produção
echo "🔨 Construindo aplicação..."
npm run build:prod

# 3. Análise de bundle
echo "📊 Analisando bundle..."
npm run analyze

# 4. Deploy
echo "🌐 Fazendo deploy..."
vercel --prod

echo "✅ Deploy concluído!"
```

### 2. Netlify

#### Configuração
```toml
# netlify.toml
[build]
  command = "npm run build:prod"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--prefix=/dev/null"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 3. AWS S3 + CloudFront

#### S3 Bucket Configuration
```bash
# Criar bucket
aws s3 mb s3://fisioflow-app-prod

# Configurar website hosting
aws s3 website s3://fisioflow-app-prod \
  --index-document index.html \
  --error-document index.html

# Upload dos arquivos
aws s3 sync dist/ s3://fisioflow-app-prod \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html" \
  --exclude "*.json"

# Index.html sem cache
aws s3 cp dist/index.html s3://fisioflow-app-prod/ \
  --cache-control "no-cache, no-store, must-revalidate"
```

#### CloudFront Distribution
```json
{
  "DistributionConfig": {
    "CallerReference": "fisioflow-prod-2024",
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": "S3-fisioflow-app-prod",
          "DomainName": "fisioflow-app-prod.s3.amazonaws.com",
          "S3OriginConfig": {
            "OriginAccessIdentity": ""
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-fisioflow-app-prod",
      "ViewerProtocolPolicy": "redirect-to-https",
      "Compress": true,
      "CachePolicyId": "optimized-caching"
    },
    "CustomErrorResponses": {
      "Quantity": 1,
      "Items": [
        {
          "ErrorCode": 404,
          "ResponsePagePath": "/index.html",
          "ResponseCode": 200,
          "ErrorCachingMinTTL": 0
        }
      ]
    }
  }
}
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test:unit
      
      - name: Build application
        run: npm run build:prod
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          VITE_API_URL: ${{ secrets.API_URL }}
      
      - name: Run bundle analysis
        run: npm run analyze

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for production
        run: npm run build:prod
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY_PROD }}
          VITE_API_URL: ${{ secrets.API_URL_PROD }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

cache:
  paths:
    - node_modules/

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run lint
    - npm run test:unit
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run build:prod
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

deploy:
  stage: deploy
  image: node:$NODE_VERSION
  script:
    - npm install -g vercel
    - vercel --token $VERCEL_TOKEN --prod
  only:
    - main
```

## Monitoramento e Logs

### 1. Performance Monitoring

#### Core Web Vitals
```javascript
// src/utils/performance.js
export function measureCoreWebVitals() {
  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      console.log('FID:', entry.processingStart - entry.startTime);
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        console.log('CLS:', clsValue);
      }
    }
  }).observe({ entryTypes: ['layout-shift'] });
}
```

#### Bundle Size Monitoring
```javascript
// scripts/monitor-bundle.js
import { analyzeBundleSize } from './bundle-analysis.js';

const BUNDLE_SIZE_LIMITS = {
  'index': 300 * 1024, // 300KB
  'PatientPage': 200 * 1024, // 200KB
  'vendor': 500 * 1024, // 500KB
  'total': 1200 * 1024 // 1.2MB
};

function checkBundleSizeLimits() {
  const analysis = analyzeBundleSize();
  const violations = [];
  
  analysis.files.forEach(file => {
    const limit = BUNDLE_SIZE_LIMITS[file.type] || BUNDLE_SIZE_LIMITS.total;
    if (file.size > limit) {
      violations.push({
        file: file.name,
        size: file.size,
        limit,
        overage: file.size - limit
      });
    }
  });
  
  if (violations.length > 0) {
    console.error('❌ Bundle size violations:');
    violations.forEach(v => {
      console.error(`${v.file}: ${v.size} bytes (limit: ${v.limit})`);
    });
    process.exit(1);
  }
  
  console.log('✅ All bundle sizes within limits');
}

checkBundleSizeLimits();
```

### 2. Error Tracking

#### Sentry Integration
```typescript
// src/utils/errorTracking.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  beforeSend(event) {
    // Filtrar errors de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Filtrar errors conhecidos
    if (event.exception?.values?.[0]?.value?.includes('Script error')) {
      return null;
    }
    
    return event;
  }
});

export { Sentry };
```

### 3. Analytics

#### Google Analytics 4
```typescript
// src/utils/analytics.ts
import { gtag } from 'ga-gtag';

export function initAnalytics() {
  if (process.env.VITE_GA_TRACKING_ID && process.env.NODE_ENV === 'production') {
    gtag('config', process.env.VITE_GA_TRACKING_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
}

export function trackEvent(eventName: string, parameters?: any) {
  if (process.env.NODE_ENV === 'production') {
    gtag('event', eventName, parameters);
  }
}

export function trackPageView(path: string) {
  if (process.env.NODE_ENV === 'production') {
    gtag('config', process.env.VITE_GA_TRACKING_ID, {
      page_path: path,
    });
  }
}
```

## Rollback e Recovery

### 1. Rollback Strategy
```bash
#!/bin/bash
# scripts/rollback.sh

DEPLOYMENT_ID=$1
ENVIRONMENT=${2:-production}

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "❌ Usage: ./rollback.sh <deployment-id> [environment]"
  exit 1
fi

echo "🔄 Rolling back to deployment: $DEPLOYMENT_ID"

# Vercel rollback
if [ "$ENVIRONMENT" = "vercel" ]; then
  vercel rollback $DEPLOYMENT_ID --token $VERCEL_TOKEN
fi

# AWS S3 rollback
if [ "$ENVIRONMENT" = "aws" ]; then
  aws s3 sync s3://fisioflow-backups/$DEPLOYMENT_ID/ s3://fisioflow-app-prod/ --delete
  aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
fi

echo "✅ Rollback completed"
```

### 2. Health Checks
```javascript
// src/utils/healthCheck.js
export async function performHealthCheck() {
  const checks = [
    // LocalStorage funcionando
    () => {
      try {
        localStorage.setItem('health-check', 'ok');
        const value = localStorage.getItem('health-check');
        localStorage.removeItem('health-check');
        return value === 'ok';
      } catch {
        return false;
      }
    },
    
    // API externa (Gemini) acessível
    async () => {
      try {
        const response = await fetch('https://generativelanguage.googleapis.com', {
          method: 'HEAD',
          mode: 'no-cors'
        });
        return true;
      } catch {
        return false;
      }
    },
    
    // Assets carregando
    () => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.every(link => !link.hasAttribute('data-error'));
    }
  ];
  
  const results = await Promise.all(checks.map(check => 
    Promise.resolve(check()).catch(() => false)
  ));
  
  return {
    healthy: results.every(Boolean),
    checks: {
      localStorage: results[0],
      externalAPI: results[1],
      assets: results[2]
    }
  };
}
```

## Checklist de Deploy

### Pré-Deploy
- [ ] Todos os testes passando
- [ ] Build de produção funcionando
- [ ] Bundle size dentro dos limites
- [ ] Variáveis de ambiente configuradas
- [ ] Chaves de API válidas e com restrições
- [ ] Certificados SSL válidos

### Deploy
- [ ] Deploy executado com sucesso
- [ ] DNS propagado
- [ ] CDN invalidado
- [ ] Health checks passando
- [ ] Monitoramento ativo

### Pós-Deploy
- [ ] Funcionalidades críticas testadas
- [ ] Performance dentro dos limites
- [ ] Logs sem errors críticos
- [ ] Analytics funcionando
- [ ] Backup do deploy anterior disponível

## Troubleshooting

### Problemas Comuns

#### 1. Bundle Size Muito Grande
```bash
# Análise detalhada
npm run analyze

# Identificar dependências pesadas
npx webpack-bundle-analyzer dist/stats.json

# Soluções:
# - Lazy loading adicional
# - Tree shaking otimizado
# - Remoção de dependências não utilizadas
```

#### 2. Erro de Carregamento de Chunks
```javascript
// Retry logic para chunks
const originalImport = window.__webpack_require__;
window.__webpack_require__ = function(id) {
  return originalImport(id).catch(err => {
    console.warn(`Chunk ${id} failed to load, retrying...`);
    return originalImport(id);
  });
};
```

#### 3. Problemas de Cache
```bash
# Limpar caches
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Build limpo
rm -rf dist
npm run build:prod
```

Este guia garante deploys seguros e confiáveis do FisioFlow em produção.