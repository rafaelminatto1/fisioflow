/**
 * Service Worker - Cache offline otimizado para FisioFlow
 * Implementa estratégias de cache inteligentes para melhor performance
 */

const CACHE_NAME = 'fisioflow-v1.0.0';
const STATIC_CACHE = 'fisioflow-static-v1.0.0';
const DYNAMIC_CACHE = 'fisioflow-dynamic-v1.0.0';
const API_CACHE = 'fisioflow-api-v1.0.0';

// Assets estáticos para cache (sempre disponíveis offline)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS e JS serão adicionados automaticamente pelo Vite
];

// Padrões de URL para diferentes estratégias de cache
const CACHE_STRATEGIES = {
  // Cache first - assets estáticos
  CACHE_FIRST: [
    /\.(?:js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf)$/,
    /\/assets\//,
  ],
  
  // Network first - dados dinâmicos
  NETWORK_FIRST: [
    /\/api\//,
    /gemini/,
  ],
  
  // Stale while revalidate - conteúdo que pode ser atualizado
  STALE_WHILE_REVALIDATE: [
    /\.(?:html)$/,
    /\/$/,
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
  
  // Ignora requests de outros domínios e chrome-extension
  if (url.origin !== location.origin && !url.origin.includes('chrome-extension')) {
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
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.error(`❌ Erro em cache-first: ${error}`);
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
    }
    return networkResponse;
  }).catch(() => cachedResponse); // Fallback para cache se network falhar
  
  if (cachedResponse) {
    console.log(`💾 Stale cache hit: ${request.url}`);
    return cachedResponse;
  }
  
  console.log(`🌐 No cache, aguardando network: ${request.url}`);
  return fetchPromise;
}

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