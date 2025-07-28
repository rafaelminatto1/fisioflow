# FisioFlow - Script de Implementação de Melhorias
# Executa as melhorias baseadas na opção escolhida pelo usuário

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("1", "2", "3", "refatoracao", "incremental", "ios")]
    [string]$Opcao
)

Write-Host "FisioFlow - Implementacao de Melhorias" -ForegroundColor Green
Write-Host "Foco: iOS | Sistema Freemium | Escalavel" -ForegroundColor Cyan
Write-Host ""

# Função para criar hooks especializados
function New-SpecializedHook {
    param(
        [string]$HookName,
        [string]$EntityType,
        [bool]$IncludeFreemium = $true
    )
    
    $hookPath = "src/hooks/$HookName.ts"
    
    if (Test-Path $hookPath) {
        Write-Host "   SKIP $HookName - Ja existe" -ForegroundColor Yellow
        return
    }
    
    $hookContent = @"
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from './useAuth';
import { useNotification } from './useNotification';
import { api } from '../services/api';
import { $EntityType } from '../types';

// Zod Schema para validação
const ${EntityType}Schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

type Validated$EntityType = z.infer<typeof ${EntityType}Schema>;

interface Use${EntityType}sReturn {
  `${EntityType.ToLower()}s: `$EntityType[];
  loading: boolean;
  error: string | null;
  create`$EntityType: (data: Partial<`$EntityType>) => Promise<`$EntityType>;
  update`$EntityType: (id: string, data: Partial<`$EntityType>) => Promise<`$EntityType>;
  delete`$EntityType: (id: string) => Promise<void>;
  validate`$EntityType: (data: any) => data is Validated`$EntityType;
}

export const use${EntityType}s = (): Use${EntityType}sReturn => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  // React Query para buscar dados
  const {
    data: ${EntityType.ToLower()}s = [],
    isLoading: loading,
    error
  } = useQuery({
    queryKey: ['${EntityType.ToLower()}s', user?.tenantId],
    queryFn: () => api.get${EntityType}s(user?.tenantId),
    enabled: !!user?.tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
  
  // Validação com Zod
  const validate$EntityType = useCallback((data: any): data is Validated$EntityType => {
    try {
      ${EntityType}Schema.parse(data);
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }, []);
  
  // Mutation para criar
  const createMutation = useMutation({
    mutationFn: (data: Partial<$EntityType>) => {
      if (!validate$EntityType({ ...data, id: 'temp', tenantId: user?.tenantId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })) {
        throw new Error('Dados inválidos');
      }
      return api.create$EntityType(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${EntityType.ToLower()}s'] });
      showNotification('$EntityType criado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`"Erro ao criar `$EntityType: `${error.message}`", 'error');
    },
  });
  
  // Mutation para atualizar
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<$EntityType> }) => {
      return api.update$EntityType(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${EntityType.ToLower()}s'] });
      showNotification('$EntityType atualizado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`"Erro ao atualizar `$EntityType: `${error.message}`", 'error');
    },
  });
  
  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete$EntityType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${EntityType.ToLower()}s'] });
      showNotification('$EntityType excluído com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`"Erro ao excluir `$EntityType: `${error.message}`", 'error');
    },
  });
  
  // Funções expostas
  const create`$EntityType = useCallback(async (data: Partial<`$EntityType>) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);
  
  const update`$EntityType = useCallback(async (id: string, data: Partial<`$EntityType>) => {
    return updateMutation.mutateAsync({ id, data });
  }, [updateMutation]);
  
  const delete`$EntityType = useCallback(async (id: string) => {
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation]);
  
  return {
    `${EntityType.ToLower()}s,
    loading,
    error: error?.message || null,
    create`$EntityType,
    update`$EntityType,
    delete`$EntityType,
    validate`$EntityType,
  };
};

export default use`${EntityType}s;
"@
    
    Set-Content -Path $hookPath -Value $hookContent -Encoding UTF8
    Write-Host "   CREATE $HookName" -ForegroundColor Green
}

# Função para criar useAuth
function New-AuthHook {
    $authPath = "src/hooks/useAuth.ts"
    
    if (Test-Path $authPath) {
        Write-Host "   SKIP useAuth - Ja existe" -ForegroundColor Yellow
        return
    }
    
    $authContent = @'
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { z } from 'zod';
import { api } from '../services/api';
import { User, SubscriptionPlan } from '../types';

type AuthTier = 'free' | 'premium' | 'enterprise';

interface TierLimits {
  maxPatients: number;
  maxSessions: number;
  maxUsers: number;
  maxStorage: number; // em MB
  aiRequestsPerMonth: number;
  hasAdvancedAnalytics: boolean;
  hasCustomReports: boolean;
  hasPrioritySupport: boolean;
}

const TIER_LIMITS: Record<AuthTier, TierLimits> = {
  free: {
    maxPatients: 10,
    maxSessions: 50,
    maxUsers: 1,
    maxStorage: 100,
    aiRequestsPerMonth: 10,
    hasAdvancedAnalytics: false,
    hasCustomReports: false,
    hasPrioritySupport: false,
  },
  premium: {
    maxPatients: 100,
    maxSessions: 1000,
    maxUsers: 5,
    maxStorage: 1000,
    aiRequestsPerMonth: 100,
    hasAdvancedAnalytics: true,
    hasCustomReports: true,
    hasPrioritySupport: true,
  },
  enterprise: {
    maxPatients: -1, // Ilimitado
    maxSessions: -1,
    maxUsers: -1,
    maxStorage: -1,
    aiRequestsPerMonth: -1,
    hasAdvancedAnalytics: true,
    hasCustomReports: true,
    hasPrioritySupport: true,
  },
};

interface AuthUser extends User {
  tier: AuthTier;
  limits: TierLimits;
  usage: {
    patients: number;
    sessions: number;
    users: number;
    storage: number;
    aiRequests: number;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  checkLimit: (resource: keyof TierLimits, amount?: number) => boolean;
  canUpgrade: boolean;
  upgradeToTier: (tier: AuthTier) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('fisioflow-token');
        if (token) {
          const userData = await api.verifyToken(token);
          const userWithLimits = {
            ...userData,
            limits: TIER_LIMITS[userData.tier || 'free'],
            usage: await api.getUserUsage(userData.id),
          };
          setUser(userWithLimits);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('fisioflow-token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.login(email, password);
      localStorage.setItem('fisioflow-token', response.token);
      
      const userWithLimits = {
        ...response.user,
        limits: TIER_LIMITS[response.user.tier || 'free'],
        usage: await api.getUserUsage(response.user.id),
      };
      
      setUser(userWithLimits);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fisioflow-token');
    setUser(null);
  }, []);

  const register = useCallback(async (userData: any) => {
    setLoading(true);
    try {
      const response = await api.register(userData);
      localStorage.setItem('fisioflow-token', response.token);
      
      const userWithLimits = {
        ...response.user,
        tier: 'free' as AuthTier,
        limits: TIER_LIMITS.free,
        usage: {
          patients: 0,
          sessions: 0,
          users: 1,
          storage: 0,
          aiRequests: 0,
        },
      };
      
      setUser(userWithLimits);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!user) return;
    
    try {
      const updatedUser = await api.updateUser(user.id, data);
      setUser({ ...user, ...updatedUser });
    } catch (error) {
      throw error;
    }
  }, [user]);

  const checkLimit = useCallback((resource: keyof TierLimits, amount: number = 1) => {
    if (!user) return false;
    
    const limit = user.limits[resource];
    if (limit === -1) return true; // Ilimitado
    
    const currentUsage = user.usage[resource as keyof typeof user.usage] || 0;
    return (currentUsage + amount) <= limit;
  }, [user]);

  const canUpgrade = user?.tier !== 'enterprise';

  const upgradeToTier = useCallback(async (tier: AuthTier) => {
    if (!user) return;
    
    try {
      await api.upgradeTier(user.id, tier);
      const updatedUser = {
        ...user,
        tier,
        limits: TIER_LIMITS[tier],
      };
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    updateProfile,
    checkLimit,
    canUpgrade,
    upgradeToTier,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export default useAuth;
'@
    
    Set-Content -Path $authPath -Value $authContent -Encoding UTF8
    Write-Host "   CREATE useAuth.ts" -ForegroundColor Green
}

# Função para criar PWA manifest
function New-PWAManifest {
    $manifestPath = "public/manifest.json"
    
    if (Test-Path $manifestPath) {
        Write-Host "   SKIP manifest.json - Ja existe" -ForegroundColor Yellow
        return
    }
    
    $manifestContent = @'
{
  "name": "FisioFlow - Gestão de Fisioterapia",
  "short_name": "FisioFlow",
  "description": "Sistema completo de gestão para clínicas de fisioterapia",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#3B82F6",
  "background_color": "#FFFFFF",
  "scope": "/",
  "lang": "pt-BR",
  "categories": ["health", "medical", "productivity"],
  "icons": [
    {
      "src": "icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "screenshots/mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "shortcuts": [
    {
      "name": "Pacientes",
      "short_name": "Pacientes",
      "description": "Gerenciar pacientes",
      "url": "/patients",
      "icons": [{ "src": "icons/patients.png", "sizes": "96x96" }]
    },
    {
      "name": "Agenda",
      "short_name": "Agenda",
      "description": "Visualizar agenda",
      "url": "/calendar",
      "icons": [{ "src": "icons/calendar.png", "sizes": "96x96" }]
    },
    {
      "name": "Exercícios",
      "short_name": "Exercícios",
      "description": "Biblioteca de exercícios",
      "url": "/exercises",
      "icons": [{ "src": "icons/exercises.png", "sizes": "96x96" }]
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false
}
'@
    
    New-Item -ItemType Directory -Force -Path "public" | Out-Null
    Set-Content -Path $manifestPath -Value $manifestContent -Encoding UTF8
    Write-Host "   CREATE manifest.json" -ForegroundColor Green
}

# Função para criar Service Worker
function New-ServiceWorker {
    $swPath = "public/sw.js"
    
    if (Test-Path $swPath) {
        Write-Host "   SKIP sw.js - Ja existe" -ForegroundColor Yellow
        return
    }
    
    $swContent = @'
const CACHE_NAME = 'fisioflow-v1.0.0';
const STATIC_CACHE = 'fisioflow-static-v1';
const DYNAMIC_CACHE = 'fisioflow-dynamic-v1';

// Recursos para cache offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// URLs da API para cache
const API_URLS = [
  '/api/patients',
  '/api/appointments',
  '/api/exercises',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Interceptação de requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Estratégia para recursos estáticos
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }
  
  // Estratégia para API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    return;
  }
  
  // Estratégia padrão
  event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
});

// Cache First Strategy (para recursos estáticos)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First Strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First Strategy (para API)
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline - dados não disponíveis' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('Service Worker: Background sync triggered');
  
  try {
    // Sincronizar dados pendentes
    const pendingData = await getPendingData();
    
    for (const data of pendingData) {
      await syncData(data);
    }
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

async function getPendingData() {
  // Implementar lógica para obter dados pendentes
  return [];
}

async function syncData(data) {
  // Implementar lógica de sincronização
  console.log('Syncing data:', data);
}

// Notificações push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'Visualizar',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: '/icons/dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});
'@
    
    Set-Content -Path $swPath -Value $swContent -Encoding UTF8
    Write-Host "   CREATE sw.js" -ForegroundColor Green
}

# Função para atualizar index.html com PWA
function Update-IndexHTML {
    $indexPath = "index.html"
    
    if (-not (Test-Path $indexPath)) {
        Write-Host "   WARN index.html nao encontrado" -ForegroundColor Yellow
        return
    }
    
    $indexContent = Get-Content $indexPath -Raw
    
    # Verificar se já tem as meta tags
    if ($indexContent -match 'apple-mobile-web-app-capable') {
        Write-Host "   SKIP index.html - PWA tags ja existem" -ForegroundColor Yellow
        return
    }
    
    # Adicionar meta tags iOS
    $iosMetaTags = @'
    <!-- PWA Meta Tags -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="FisioFlow">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#3B82F6">
    
    <!-- iOS Icons -->
    <link rel="apple-touch-icon" href="/icons/icon-152.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png">
    
    <!-- Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    <!-- iOS Splash Screens -->
    <link rel="apple-touch-startup-image" href="/splash/iphone5_splash.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)">
    <link rel="apple-touch-startup-image" href="/splash/iphone6_splash.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)">
    <link rel="apple-touch-startup-image" href="/splash/iphoneplus_splash.png" media="(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3)">
    <link rel="apple-touch-startup-image" href="/splash/iphonex_splash.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)">
    <link rel="apple-touch-startup-image" href="/splash/ipad_splash.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)">
'@
    
    # Inserir antes do </head>
    $updatedContent = $indexContent -replace '</head>', "$iosMetaTags`n  </head>"
    
    Set-Content -Path $indexPath -Value $updatedContent -Encoding UTF8
    Write-Host "   UPDATE index.html com PWA tags" -ForegroundColor Green
}

# Implementação das opções
switch ($Opcao) {
    { $_ -in @("1", "refatoracao") } {
        Write-Host "OPCAO 1: REFATORACAO COMPLETA" -ForegroundColor Magenta
        Write-Host "Tempo estimado: 2-3 semanas" -ForegroundColor Gray
        Write-Host ""
        
        # Semana 1: Arquitetura
        Write-Host "Fase 1: Hooks Especializados..." -ForegroundColor Blue
        New-AuthHook
        New-SpecializedHook -HookName "useSubscription" -EntityType "Subscription"
        New-SpecializedHook -HookName "usePatients" -EntityType "Patient"
        New-SpecializedHook -HookName "useTasks" -EntityType "Task"
        New-SpecializedHook -HookName "useUsers" -EntityType "User"
        New-SpecializedHook -HookName "useAssessments" -EntityType "Assessment"
        New-SpecializedHook -HookName "usePrescriptions" -EntityType "Prescription"
        New-SpecializedHook -HookName "useDocuments" -EntityType "Document"
        
        # Semana 2: Sistema Freemium
        Write-Host "Fase 2: Sistema Freemium..." -ForegroundColor Blue
        # Implementar enforcement de limites
        
        # Semana 3: iOS + Performance
        Write-Host "Fase 3: PWA iOS..." -ForegroundColor Blue
        New-PWAManifest
        New-ServiceWorker
        Update-IndexHTML
        
        Write-Host ""
        Write-Host "REFATORACAO COMPLETA INICIADA!" -ForegroundColor Green
        Write-Host "Proximos passos:" -ForegroundColor Yellow
        Write-Host "1. Instalar dependencias: npm install @tanstack/react-query zod" -ForegroundColor White
        Write-Host "2. Configurar React Query no App.tsx" -ForegroundColor White
        Write-Host "3. Migrar componentes para novos hooks" -ForegroundColor White
        Write-Host "4. Testar funcionalidades" -ForegroundColor White
    }
    
    { $_ -in @("2", "incremental") } {
        Write-Host "OPCAO 2: MELHORIAS INCREMENTAIS" -ForegroundColor Magenta
        Write-Host "Tempo estimado: 1 semana" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "Fase 1: Hooks Criticos..." -ForegroundColor Blue
        New-AuthHook
        New-SpecializedHook -HookName "useSubscription" -EntityType "Subscription"
        
        Write-Host "Fase 2: Freemium Basico..." -ForegroundColor Blue
        # Implementar limites básicos
        
        Write-Host "Fase 3: Otimizacoes Basicas..." -ForegroundColor Blue
        # Lazy loading básico
        
        Write-Host ""
        Write-Host "MELHORIAS INCREMENTAIS INICIADAS!" -ForegroundColor Green
        Write-Host "Proximos passos:" -ForegroundColor Yellow
        Write-Host "1. Instalar: npm install @tanstack/react-query zod" -ForegroundColor White
        Write-Host "2. Configurar hooks criticos" -ForegroundColor White
        Write-Host "3. Implementar limites freemium" -ForegroundColor White
    }
    
    { $_ -in @("3", "ios") } {
        Write-Host "OPCAO 3: FOCO iOS" -ForegroundColor Magenta
        Write-Host "Tempo estimado: 1 semana" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "Fase 1: PWA Completo..." -ForegroundColor Blue
        New-PWAManifest
        New-ServiceWorker
        Update-IndexHTML
        
        Write-Host "Fase 2: Offline-First..." -ForegroundColor Blue
        # Implementar sincronização
        
        Write-Host "Fase 3: Otimizacoes Mobile..." -ForegroundColor Blue
        # Touch gestures e performance
        
        Write-Host ""
        Write-Host "FOCO iOS INICIADO!" -ForegroundColor Green
        Write-Host "Proximos passos:" -ForegroundColor Yellow
        Write-Host "1. Criar icones PWA (72x72 ate 512x512)" -ForegroundColor White
        Write-Host "2. Testar em dispositivo iOS" -ForegroundColor White
        Write-Host "3. Configurar push notifications" -ForegroundColor White
        Write-Host "4. Otimizar para App Store" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Implementacao concluida! Verifique os arquivos criados." -ForegroundColor Green
Write-Host "Para continuar, execute os proximos passos listados acima." -ForegroundColor Cyan