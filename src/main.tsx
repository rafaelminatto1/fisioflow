import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registrado com sucesso:', registration);
      })
      .catch((registrationError) => {
        console.log('Falha no registro do SW:', registrationError);
      });
  });
}

// Configurações de desenvolvimento
if (process.env.NODE_ENV === 'development') {
  // Habilitar React DevTools
  if (typeof window !== 'undefined') {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot = 
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot || (() => {});
  }
}

// Configurações de produção
if (process.env.NODE_ENV === 'production') {
  // Desabilitar console.log em produção
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
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
  console.error('Erro global capturado:', event.error);
  // Aqui você pode enviar o erro para um serviço de monitoramento
  // como Sentry, LogRocket, etc.
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejeitada não tratada:', event.reason);
  // Aqui você pode enviar o erro para um serviço de monitoramento
});

// Configurar performance monitoring
if ('performance' in window && 'PerformanceObserver' in window) {
  // Monitorar Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        console.log('LCP:', entry.startTime);
      }
      if (entry.entryType === 'first-input') {
        console.log('FID:', entry.processingStart - entry.startTime);
      }
      if (entry.entryType === 'layout-shift') {
        if (!(entry as any).hadRecentInput) {
          console.log('CLS:', (entry as any).value);
        }
      }
    }
  });
  
  try {
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  } catch (e) {
    // Fallback para navegadores que não suportam todos os tipos
    console.log('Performance Observer não suportado completamente');
  }
}

// Renderizar a aplicação
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hot Module Replacement (HMR) para desenvolvimento
if (process.env.NODE_ENV === 'development' && (module as any).hot) {
  (module as any).hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(
      <React.StrictMode>
        <NextApp />
      </React.StrictMode>
    );
  });
}