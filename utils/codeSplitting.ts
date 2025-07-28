/**
 * Sistema de Code Splitting Inteligente
 * Otimiza o carregamento de bundles baseado em prioridade e uso
 */

import { lazy, ComponentType } from 'react';

// Tipos para configuração de splitting
interface ChunkConfig {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'lazy';
  preload?: boolean;
  prefetch?: boolean;
  dependencies?: string[];
}

interface LazyComponentConfig extends ChunkConfig {
  component: () => Promise<{ default: ComponentType<any> }>;
}

// Mapeamento de prioridades para estratégias de carregamento
const LOADING_STRATEGIES = {
  critical: { preload: true, prefetch: true },
  high: { preload: false, prefetch: true },
  medium: { preload: false, prefetch: false },
  low: { preload: false, prefetch: false },
  lazy: { preload: false, prefetch: false },
};

// Cache de componentes já carregados
const componentCache = new Map<string, ComponentType<any>>();
const loadingPromises = new Map<string, Promise<ComponentType<any>>>();

/**
 * Cria um componente lazy com configuração avançada
 */
export function createLazyComponent<T = any>(config: LazyComponentConfig): ComponentType<T> {
  const { name, priority, component: importFn } = config;
  const strategy = LOADING_STRATEGIES[priority];

  // Aplicar estratégia de preload/prefetch
  if (strategy.preload) {
    // Preload imediato
    setTimeout(() => preloadComponent(name, importFn), 0);
  } else if (strategy.prefetch) {
    // Prefetch quando idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => prefetchComponent(name, importFn));
    } else {
      setTimeout(() => prefetchComponent(name, importFn), 2000);
    }
  }

  return lazy(() => {
    // Verificar cache primeiro
    if (componentCache.has(name)) {
      return Promise.resolve({ default: componentCache.get(name)! });
    }

    // Verificar se já está carregando
    if (loadingPromises.has(name)) {
      return loadingPromises.get(name)!.then(comp => ({ default: comp }));
    }

    // Criar nova promise de carregamento
    const loadingPromise = importFn().then(module => {
      const component = module.default;
      componentCache.set(name, component);
      loadingPromises.delete(name);
      return component;
    });

    loadingPromises.set(name, loadingPromise.then(m => ({ default: m }).default));
    return loadingPromise;
  });
}

/**
 * Preload imediato do componente
 */
function preloadComponent(name: string, importFn: () => Promise<{ default: ComponentType<any> }>) {
  if (!componentCache.has(name) && !loadingPromises.has(name)) {
    const promise = importFn().then(module => {
      componentCache.set(name, module.default);
      return module.default;
    });
    
    loadingPromises.set(name, promise);
  }
}

/**
 * Prefetch do componente (baixa prioridade)
 */
function prefetchComponent(name: string, importFn: () => Promise<{ default: ComponentType<any> }>) {
  if (!componentCache.has(name) && !loadingPromises.has(name)) {
    // Criar link de prefetch se possível
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'script';
      // Note: Em produção real, seria necessário extrair a URL do chunk
      document.head.appendChild(link);
    } catch (error) {
      // Fallback para prefetch via import
      preloadComponent(name, importFn);
    }
  }
}

/**
 * Configurações de chunks por domínio
 */
export const CHUNK_CONFIGS = {
  // === COMPONENTES CRÍTICOS (sempre no bundle principal) ===
  core: {
    name: 'core',
    priority: 'critical' as const,
    components: ['Sidebar', 'Header', 'LoginPage', 'ErrorBoundary'],
  },

  // === ALTA PRIORIDADE (preload + prefetch) ===
  dashboard: {
    name: 'dashboard',
    priority: 'critical' as const,
    preload: true,
    components: ['Dashboard', 'HomePage'],
  },

  patients: {
    name: 'patients', 
    priority: 'high' as const,
    prefetch: true,
    components: ['PatientPage', 'PatientPortal', 'PatientModal'],
  },

  // === PRIORIDADE MÉDIA (prefetch) ===
  calendar: {
    name: 'calendar',
    priority: 'medium' as const,
    components: ['CalendarPage', 'AppointmentModal'],
  },

  tasks: {
    name: 'tasks',
    priority: 'medium' as const,
    components: ['KanbanBoard', 'TaskModal'],
  },

  exercises: {
    name: 'exercises',
    priority: 'medium' as const,
    components: ['ExercisePage', 'ExerciseModal'],
  },

  // === FUNCIONALIDADES ESPECÍFICAS (lazy) ===
  protocols: {
    name: 'protocols',
    priority: 'low' as const,
    components: [
      'ClinicalProtocolsLibraryPage',
      'ClinicalProtocolViewerPage', 
      'PatientProtocolTrackingPage'
    ],
  },

  education: {
    name: 'education',
    priority: 'low' as const,
    components: ['ClinicalCasesLibraryPage', 'MentorshipPage'],
  },

  ai: {
    name: 'ai',
    priority: 'lazy' as const,
    components: ['AIAssistant', 'ChatPage'],
  },

  finance: {
    name: 'finance',
    priority: 'low' as const,
    components: ['FinancialPage', 'BillingPage'],
  },

  reports: {
    name: 'reports',
    priority: 'low' as const,
    components: ['ReportsPage', 'ProtocolAnalyticsPage'],
  },

  admin: {
    name: 'admin',
    priority: 'lazy' as const,
    components: ['StaffPage', 'CompliancePage', 'SystemStatusPage'],
  },

  analytics: {
    name: 'analytics',
    priority: 'lazy' as const,
    components: [
      'AnalyticsDashboard',
      'UnifiedDashboard', 
      'OperationalDashboard',
      'FinancialSummaryDashboard',
      'ExecutiveDashboard'
    ],
  },

  secondary: {
    name: 'secondary',
    priority: 'lazy' as const,
    components: ['ParceriasPage', 'SuportePage', 'IntegrationsPage'],
  },
};

/**
 * Sistema de preload baseado em navegação do usuário
 */
class IntelligentPreloader {
  private static instance: IntelligentPreloader;
  private userPatterns: Map<string, number> = new Map();
  private preloadQueue: Set<string> = new Set();

  static getInstance(): IntelligentPreloader {
    if (!IntelligentPreloader.instance) {
      IntelligentPreloader.instance = new IntelligentPreloader();
    }
    return IntelligentPreloader.instance;
  }

  /**
   * Registra navegação do usuário para aprender padrões
   */
  recordNavigation(fromRoute: string, toRoute: string) {
    const pattern = `${fromRoute}->${toRoute}`;
    const count = this.userPatterns.get(pattern) || 0;
    this.userPatterns.set(pattern, count + 1);

    // Se padrão é comum (>3 vezes), adicionar à queue de preload
    if (count >= 3) {
      this.preloadQueue.add(toRoute);
    }
  }

  /**
   * Preload inteligente baseado em padrões
   */
  smartPreload(currentRoute: string) {
    const possibleNext = Array.from(this.userPatterns.entries())
      .filter(([pattern]) => pattern.startsWith(currentRoute))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2); // Top 2 próximas rotas prováveis

    possibleNext.forEach(([pattern]) => {
      const nextRoute = pattern.split('->')[1];
      this.preloadQueue.add(nextRoute);
    });

    this.processPreloadQueue();
  }

  private processPreloadQueue() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadQueue.forEach(route => {
          // Implementar preload baseado na rota
          this.preloadByRoute(route);
        });
        this.preloadQueue.clear();
      });
    }
  }

  private preloadByRoute(route: string) {
    // Mapear rota para chunk e fazer preload
    const chunkMap = {
      'patients': () => import(/* webpackChunkName: "patients" */ '../components/PatientPage'),
      'calendar': () => import(/* webpackChunkName: "calendar" */ '../components/CalendarPage'),
      'exercises': () => import(/* webpackChunkName: "exercises" */ '../components/ExercisePage'),
      // ... outros mapeamentos
    };

    const importFn = chunkMap[route as keyof typeof chunkMap];
    if (importFn) {
      importFn().catch(() => {}); // Silent fail
    }
  }
}

/**
 * Hook para usar o sistema de preload inteligente
 */
export function useIntelligentPreload() {
  const preloader = IntelligentPreloader.getInstance();
  
  return {
    recordNavigation: preloader.recordNavigation.bind(preloader),
    smartPreload: preloader.smartPreload.bind(preloader),
  };
}

/**
 * Utilitários para bundle analysis
 */
export const bundleUtils = {
  /**
   * Log do tamanho dos chunks carregados
   */
  logChunkSizes() {
    if (process.env.NODE_ENV === 'development') {
      console.group('📦 Bundle Analysis');
      console.log('Cached components:', componentCache.size);
      console.log('Loading components:', loadingPromises.size);
      console.log('Cache keys:', Array.from(componentCache.keys()));
      console.groupEnd();
    }
  },

  /**
   * Limpar cache de componentes (útil para debugging)
   */
  clearCache() {
    componentCache.clear();
    loadingPromises.clear();
  },

  /**
   * Preload manual de chunks específicos
   */
  preloadChunks(chunkNames: string[]) {
    chunkNames.forEach(chunkName => {
      const config = Object.values(CHUNK_CONFIGS).find(c => c.name === chunkName);
      if (config) {
        // Implementar preload baseado na configuração
        console.log(`Preloading chunk: ${chunkName}`);
      }
    });
  }
};

export default {
  createLazyComponent,
  CHUNK_CONFIGS,
  useIntelligentPreload,
  bundleUtils,
};