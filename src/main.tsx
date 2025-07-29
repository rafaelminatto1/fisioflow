import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

// Registrar Service Worker para PWA apenas em produção
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registrado com sucesso:', registration);
      })
      .catch((registrationError) => {
        console.error('Falha no registro do SW:', registrationError);
      });
  });
}

// Configurações de desenvolvimento
if (process.env.NODE_ENV === 'development') {
  // Limpar Service Worker em desenvolvimento AGRESSIVAMENTE
  if ('serviceWorker' in navigator) {
    // Desregistrar todos os service workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        console.log('🗑️ Removendo Service Worker:', registration.scope);
        registration.unregister();
      }
    });
    
    // Limpar caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          console.log('🗑️ Removendo cache:', cacheName);
          caches.delete(cacheName);
        });
      });
    }
    
    // Forçar reload sem cache após limpeza
    setTimeout(() => {
      if (navigator.serviceWorker.controller) {
        console.log('🔄 Recarregando para aplicar limpeza...');
        window.location.reload();
      }
    }, 1000);
  }
  
  // Habilitar React DevTools
  if (typeof window !== 'undefined') {
    const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && !hook.onCommitFiberRoot) {
      hook.onCommitFiberRoot = () => {};
    }
  }
}

// Configurações de produção
if (process.env.NODE_ENV === 'production') {
  // Temporariamente habilitado para debug
  // console.log = () => {};
  // console.warn = () => {};
  // console.error = () => {};
}

// Configurar meta tags dinâmicas para PWA
const updateMetaTags = () => {
  // Theme color baseado no sistema
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const themeColor = prefersDark ? '#1f2937' : '#3b82f6';
  
  let themeMetaTag = document.querySelector('meta[name="theme-color"]');
  if (!themeMetaTag) {
    themeMetaTag = document.createElement('meta');
    themeMetaTag.setAttribute('name', 'theme-color');
    document.head.appendChild(themeMetaTag);
  }
  themeMetaTag.setAttribute('content', themeColor);
  
  // Status bar style para iOS
  let statusBarMetaTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!statusBarMetaTag) {
    statusBarMetaTag = document.createElement('meta');
    statusBarMetaTag.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    document.head.appendChild(statusBarMetaTag);
  }
  statusBarMetaTag.setAttribute('content', prefersDark ? 'black-translucent' : 'default');
};

// Atualizar meta tags na inicialização
updateMetaTags();

// Escutar mudanças no tema do sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateMetaTags);

// Configurar viewport para dispositivos móveis
const setViewport = () => {
  let viewportMetaTag = document.querySelector('meta[name="viewport"]');
  if (!viewportMetaTag) {
    viewportMetaTag = document.createElement('meta');
    viewportMetaTag.setAttribute('name', 'viewport');
    document.head.appendChild(viewportMetaTag);
  }
  
  // Configuração otimizada para iOS e Android
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const viewportContent = isIOS 
    ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    : 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
  
  viewportMetaTag.setAttribute('content', viewportContent);
};

setViewport();

// Configurar tratamento de erros globais
window.addEventListener('error', (event) => {
  // Erro global capturado - pode ser enviado para serviço de monitoramento
  // como Sentry, LogRocket, etc.
});

window.addEventListener('unhandledrejection', (event) => {
  // Promise rejeitada não tratada - pode ser enviado para serviço de monitoramento
});

// Configurar performance monitoring
if ('performance' in window && 'PerformanceObserver' in window) {
  // Monitorar Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        // LCP measurement
      }
      if (entry.entryType === 'first-input') {
        // FID measurement
      }
      if (entry.entryType === 'layout-shift') {
        if (!(entry as any).hadRecentInput) {
          // CLS measurement
        }
      }
    }
  });
  
  try {
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  } catch (e) {
    // Fallback para navegadores que não suportam todos os tipos
  }
}

// Renderizar a aplicação
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Hot Module Replacement (HMR) para desenvolvimento
if (process.env.NODE_ENV === 'development' && (module as any).hot) {
  (module as any).hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(
      <React.StrictMode>
        <AuthProvider>
          <NextApp />
        </AuthProvider>
      </React.StrictMode>
    );
  });
}