/**
 * Service Worker - Cache offline otimizado para FisioFlow
 * Implementa estratégias de cache inteligentes para melhor performance
 */

// Versão baseada em timestamp para garantir atualizações
const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `fisioflow-v${CACHE_VERSION}`;
const STATIC_CACHE = `fisioflow-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fisioflow-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `fisioflow-api-v${CACHE_VERSION}`;

// Assets estáticos para cache (sempre disponíveis offline)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS e JS serão adicionados automaticamente pelo Vite
];

// Padrões de URL para diferentes estratégias de cache
const CACHE_STRATEGIES = {
  // Cache first - assets estáticos (com hash do Vite)
  CACHE_FIRST: [
    /\.(?:js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf)$/,
    /\/assets\//,
    /chunk-[a-zA-Z0-9]+\.js$/,
    /index-[a-zA-Z0-9]+\.(js|css)$/,
  ],
  
  // Network first - dados dinâmicos
  NETWORK_FIRST: [
    /\/api\//,
    /gemini/,
    /\/auth\//,
  ],
  
  // Stale while revalidate - conteúdo que pode ser atualizado
  STALE_WHILE_REVALIDATE: [
    /\.(?:html)$/,
    /\/$/,
    /\/manifest\.json$/,
  ],
};

// Instala o Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalando...');
  
  event.waitUntil(
    Promise.all([
      // Cache assets estáticos
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting para ativar imediatamente
      self.skipWaiting(),
    ])
  );
});

// Ativa o Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ativado');
  
  event.waitUntil(
    Promise.all([
      // Limpa caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE
            )
            .map(cacheName => {
              console.log(`🗑️ Removendo cache antigo: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Assume controle de todas as abas
      self.clients.claim(),
    ])
  );
});

// Intercepta requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requests de outros domínios, chrome-extension e requisições específicas
  if (url.origin !== location.origin && !url.origin.includes('chrome-extension')) {
    return;
  }

  // Ignora requests para o próprio service worker e arquivos de sistema
  if (url.pathname === '/sw.js' || url.pathname.includes('_next/') || url.pathname.includes('__webpack')) {
    return;
  }

  // Determina estratégia de cache baseada na URL
  const strategy = getStrategy(url.pathname + url.search);
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

// Determina estratégia baseada na URL
function getStrategy(url) {
  if (CACHE_STRATEGIES.CACHE_FIRST.some(pattern => pattern.test(url))) {
    return 'cache-first';
  }
  
  if (CACHE_STRATEGIES.NETWORK_FIRST.some(pattern => pattern.test(url))) {
    return 'network-first';
  }
  
  if (CACHE_STRATEGIES.STALE_WHILE_REVALIDATE.some(pattern => pattern.test(url))) {
    return 'stale-while-revalidate';
  }
  
  return 'network-only';
}

// Manipula requests baseado na estratégia
async function handleRequest(request, strategy) {
  switch (strategy) {
    case 'cache-first':
      return cacheFirst(request);
    
    case 'network-first':
      return networkFirst(request);
    
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request);
    
    default:
      return fetch(request);
  }
}

// Cache First - tenta cache primeiro, depois network
async function cacheFirst(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log(`💾 Cache hit: ${request.url}`);
      return cachedResponse;
    }
    
    console.log(`🌐 Cache miss, buscando: ${request.url}`);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && networkResponse.status < 400) {
      // Só cacheia respostas válidas
      const responseToCache = networkResponse.clone();
      
      // Adiciona headers de cache
      const response = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers.entries()),
          'sw-cached-at': Date.now().toString(),
          'sw-cache-version': CACHE_VERSION,
        },
      });
      
      await cache.put(request, response.clone());
      return response;
    }
    
    return networkResponse;
  } catch (error) {
    console.error(`❌ Erro em cache-first: ${error}`);
    
    // Tenta buscar no cache mesmo com erro
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log(`💾 Fallback cache hit: ${request.url}`);
      return cachedResponse;
    }
    
    return new Response('Offline - recurso não disponível', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network First - tenta network primeiro, fallback para cache
async function networkFirst(request) {
  try {
    console.log(`🌐 Network first: ${request.url}`);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache API responses por tempo limitado
      const cache = await caches.open(API_CACHE);
      const responseToCache = networkResponse.clone();
      
      // Headers para expiração de cache (5 minutos)
      const response = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers.entries()),
          'sw-cached-at': Date.now().toString(),
        },
      });
      
      await cache.put(request, response.clone());
      return response;
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`💾 Network falhou, tentando cache: ${request.url}`);
    
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Verifica se cache não está muito antigo (5 minutos)
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const isExpired = cachedAt && (Date.now() - parseInt(cachedAt)) > 5 * 60 * 1000;
      
      if (!isExpired) {
        console.log(`💾 Cache offline hit: ${request.url}`);
        return cachedResponse;
      }
    }
    
    return new Response(JSON.stringify({
      error: 'Offline - dados não disponíveis',
      timestamp: new Date().toISOString(),
    }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale While Revalidate - retorna cache rapidamente, atualiza em background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch em background para atualizar cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    } else if (networkResponse.status === 401 && request.url.includes('manifest.json')) {
      // Tratamento específico para erro 401 no manifest.json
      console.warn(`🚨 Manifest.json retornou 401, verificar configuração de deploy`);
    }
    return networkResponse;
  }).catch((error) => {
    console.warn(`🌐 Network falhou para ${request.url}:`, error);
    return cachedResponse || new Response('Service Unavailable', { status: 503 });
  });
  
  if (cachedResponse) {
    console.log(`💾 Stale cache hit: ${request.url}`);
    return cachedResponse;
  }
  
  console.log(`🌐 No cache, aguardando network: ${request.url}`);
  return fetchPromise;
}

// Manipulador de notificações push
self.addEventListener('push', (event) => {
  console.log('🔔 Notificação push recebida');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      notificationData = {
        title: 'FisioFlow',
        body: event.data.text() || 'Nova notificação',
        icon: '/favicon.ico'
      };
    }
  }

  const options = {
    body: notificationData.body || 'Nova notificação',
    icon: notificationData.icon || '/favicon.ico',
    badge: notificationData.badge || '/favicon.ico',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    requireInteraction: notificationData.requireInteraction || false,
    vibrate: notificationData.vibrate || [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'FisioFlow',
      options
    )
  );
});

// Manipulador de cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Clique na notificação');
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  
  // Determina a URL para abrir baseada no tipo de notificação
  let urlToOpen = '/';
  
  switch (notificationData.type) {
    case 'chat':
      urlToOpen = `/?chat=${notificationData.chatId}`;
      break;
    case 'appointment':
      urlToOpen = `/?view=calendar&appointment=${notificationData.appointmentId}`;
      break;
    case 'exercise':
      urlToOpen = `/?view=exercises&exercise=${notificationData.exerciseId}`;
      break;
    case 'payment':
      urlToOpen = `/?view=financeiro&transaction=${notificationData.transactionId}`;
      break;
    default:
      urlToOpen = '/';
  }

  // Abre a aplicação na URL apropriada
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Procura por uma janela já aberta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Se encontrou uma janela, navega para a URL e foca
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: notificationData,
              url: urlToOpen
            });
            return client.focus();
          }
        }
        
        // Se não encontrou janela aberta, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Manipula mensagens do main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_STATS':
      getCacheStats().then(stats => {
        event.source.postMessage({
          type: 'CACHE_STATS_RESPONSE',
          payload: stats,
        });
      });
      break;
    
    case 'CLEAR_CACHE':
      clearAllCaches().then(cleared => {
        event.source.postMessage({
          type: 'CLEAR_CACHE_RESPONSE', 
          payload: { cleared },
        });
      });
      break;
    
    case 'PRECACHE_URLS':
      precacheUrls(payload.urls).then(cached => {
        event.source.postMessage({
          type: 'PRECACHE_RESPONSE',
          payload: { cached },
        });
      });
      break;
      
    case 'CLEAR_NOTIFICATIONS':
      // Limpa notificações específicas ou todas
      const tag = payload?.tag;
      self.registration.getNotifications({ tag })
        .then((notifications) => {
          notifications.forEach(notification => notification.close());
          event.source.postMessage({
            type: 'NOTIFICATIONS_CLEARED',
            payload: { count: notifications.length, tag }
          });
        });
      break;
      
    case 'GET_NOTIFICATIONS':
      // Retorna notificações ativas
      self.registration.getNotifications()
        .then((notifications) => {
          event.source.postMessage({
            type: 'NOTIFICATIONS_LIST',
            payload: notifications.map(n => ({
              title: n.title,
              body: n.body,
              tag: n.tag,
              data: n.data
            }))
          });
        });
      break;
  }
});

// Obtem estatísticas de cache
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      count: keys.length,
      urls: keys.map(req => req.url),
    };
  }
  
  return {
    caches: stats,
    totalCaches: cacheNames.length,
    totalEntries: Object.values(stats).reduce((sum, cache) => sum + cache.count, 0),
  };
}

// Limpa todos os caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const results = await Promise.allSettled(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  
  const cleared = results.filter(result => result.status === 'fulfilled').length;
  console.log(`🗑️ ${cleared} caches limpos`);
  
  return cleared;
}

// Pré-cache URLs importantes
async function precacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          return { url, success: true };
        }
        return { url, success: false, error: 'Response not ok' };
      } catch (error) {
        return { url, success: false, error: error.message };
      }
    })
  );
  
  const cached = results
    .filter(result => result.status === 'fulfilled' && result.value.success)
    .map(result => result.value.url);
  
  console.log(`📦 ${cached.length} URLs pré-cacheadas`);
  return cached;
}