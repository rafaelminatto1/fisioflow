#!/usr/bin/env node

/**
 * Setup de Monitoramento - FisioFlow
 * Configura Sentry, Analytics e outras ferramentas de monitoramento
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONITORING_CONFIG = {
  sentry: {
    required: false,
    description: 'Error tracking and performance monitoring',
    envVar: 'VITE_SENTRY_DSN',
    setupUrl: 'https://sentry.io/welcome/'
  },
  googleAnalytics: {
    required: false,
    description: 'Web analytics and user behavior tracking',
    envVar: 'VITE_GA_TRACKING_ID',
    setupUrl: 'https://analytics.google.com/'
  },
  hotjar: {
    required: false,
    description: 'User session recordings and heatmaps',
    envVar: 'VITE_HOTJAR_ID',
    setupUrl: 'https://www.hotjar.com/'
  }
};

function createSentryConfig() {
  const sentryConfig = `// Sentry Configuration - FisioFlow
import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
      tracesSampleRate: 0.1,
      
      beforeSend(event) {
        // Filtrar erros conhecidos
        if (event.exception?.values?.[0]?.value?.includes('Script error')) {
          return null;
        }
        
        // Não enviar erros em desenvolvimento
        if (import.meta.env.DEV) {
          console.error('Sentry Error (DEV):', event);
          return null;
        }
        
        return event;
      },
      
      integrations: [
        new Sentry.BrowserTracing({
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
      ],
    });
  }
}

export function captureError(error: Error, context?: any) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('Error:', error, context);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(\`[\${level.toUpperCase()}] \${message}\`);
  }
}`;

  const configPath = path.join(__dirname, '../src/utils/sentry.ts');
  fs.writeFileSync(configPath, sentryConfig, 'utf8');
  console.log('✅ Sentry configuration created at src/utils/sentry.ts');
}

function createAnalyticsConfig() {
  const analyticsConfig = `// Analytics Configuration - FisioFlow
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    hj: (...args: any[]) => void;
  }
}

export function initGoogleAnalytics() {
  const trackingId = import.meta.env.VITE_GA_TRACKING_ID;
  
  if (trackingId && import.meta.env.PROD) {
    // Load GA script
    const script = document.createElement('script');
    script.async = true;
    script.src = \`https://www.googletagmanager.com/gtag/js?id=\${trackingId}\`;
    document.head.appendChild(script);
    
    // Initialize GA
    window.gtag = window.gtag || function() {
      (window.gtag as any).q = (window.gtag as any).q || [];
      (window.gtag as any).q.push(arguments);
    };
    
    window.gtag('js', new Date());
    window.gtag('config', trackingId, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
}

export function initHotjar() {
  const hotjarId = import.meta.env.VITE_HOTJAR_ID;
  
  if (hotjarId && import.meta.env.PROD) {
    (function(h: any, o: any, t: any, j: any, a?: any, r?: any) {
      h.hj = h.hj || function() {
        (h.hj.q = h.hj.q || []).push(arguments);
      };
      h._hjSettings = { hjid: hotjarId, hjsv: 6 };
      a = o.getElementsByTagName('head')[0];
      r = o.createElement('script');
      r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
  }
}

export function trackEvent(eventName: string, parameters?: any) {
  if (import.meta.env.PROD) {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, parameters);
    }
    
    // Hotjar
    if (window.hj) {
      window.hj('event', eventName);
    }
  } else {
    console.log('Analytics Event:', eventName, parameters);
  }
}

export function trackPageView(path: string, title?: string) {
  if (import.meta.env.PROD && window.gtag) {
    window.gtag('config', import.meta.env.VITE_GA_TRACKING_ID, {
      page_path: path,
      page_title: title || document.title,
    });
  }
}`;

  const configPath = path.join(__dirname, '../src/utils/analytics.ts');
  fs.writeFileSync(configPath, analyticsConfig, 'utf8');
  console.log('✅ Analytics configuration created at src/utils/analytics.ts');
}

function createMonitoringHook() {
  const hookCode = `// Monitoring Hook - FisioFlow
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

export function useMonitoring() {
  const location = useLocation();
  
  useEffect(() => {
    // Track page views
    trackPageView(location.pathname);
  }, [location]);
  
  useEffect(() => {
    // Track user engagement
    const startTime = Date.now();
    
    return () => {
      const timeSpent = Date.now() - startTime;
      if (timeSpent > 10000) { // More than 10 seconds
        trackEvent('user_engagement', {
          time_spent: timeSpent,
          page: location.pathname
        });
      }
    };
  }, [location]);
}`;

  const hookPath = path.join(__dirname, '../src/hooks/useMonitoring.ts');
  fs.writeFileSync(hookPath, hookCode, 'utf8');
  console.log('✅ Monitoring hook created at src/hooks/useMonitoring.ts');
}

function installDependencies() {
  console.log('📦 Installing monitoring dependencies...');
  
  const dependencies = [
    '@sentry/react',
    '@sentry/tracing'
  ];
  
  // Note: This would require running npm install
  console.log('Run the following command to install dependencies:');
  console.log(`npm install ${dependencies.join(' ')}`);
}

function displaySetupInstructions() {
  console.log('\n📋 SETUP DE MONITORAMENTO COMPLETO\n');
  
  console.log('🔧 Configurações criadas:');
  console.log('✅ src/utils/sentry.ts - Error tracking');
  console.log('✅ src/utils/analytics.ts - Web analytics');
  console.log('✅ src/hooks/useMonitoring.ts - Monitoring hook');
  
  console.log('\n📱 Para usar no seu App.tsx:');
  console.log(`
import { initSentry } from './utils/sentry';
import { initGoogleAnalytics, initHotjar } from './utils/analytics';
import { useMonitoring } from './hooks/useMonitoring';

// No início do App
useEffect(() => {
  initSentry();
  initGoogleAnalytics();
  initHotjar();
}, []);

// Em cada página/rota
useMonitoring();
`);
  
  console.log('\n🔑 Variáveis de ambiente necessárias:');
  Object.entries(MONITORING_CONFIG).forEach(([service, config]) => {
    console.log(`${config.envVar}=your_${service}_key_here`);
  });
  
  console.log('\n🌐 Links para configuração:');
  Object.entries(MONITORING_CONFIG).forEach(([service, config]) => {
    console.log(`${service}: ${config.setupUrl}`);
  });
  
  console.log('\n📊 Métricas que serão coletadas:');
  console.log('- Page views e navegação');
  console.log('- Erros JavaScript');
  console.log('- Performance metrics');
  console.log('- User engagement');
  console.log('- Core Web Vitals');
}

function main() {
  console.log('🚀 Configurando monitoramento para FisioFlow...\n');
  
  try {
    // Criar diretórios se não existirem
    const srcUtils = path.join(__dirname, '../src/utils');
    const srcHooks = path.join(__dirname, '../src/hooks');
    
    if (!fs.existsSync(srcUtils)) {
      fs.mkdirSync(srcUtils, { recursive: true });
    }
    
    if (!fs.existsSync(srcHooks)) {
      fs.mkdirSync(srcHooks, { recursive: true });
    }
    
    // Criar configurações
    createSentryConfig();
    createAnalyticsConfig();
    createMonitoringHook();
    
    // Mostrar instruções
    displaySetupInstructions();
    
    console.log('\n✅ Setup de monitoramento concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante setup:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as setupMonitoring };