/**
 * Sistema de Monitoramento de Performance
 * Coleta métricas de performance, identifica gargalos e otimiza automaticamente
 */

import { auditLogger, AuditAction, LegalBasis } from './auditLogger';

// === INTERFACES ===
interface PerformanceMetric {
  id: string;
  timestamp: string;
  type: 'navigation' | 'resource' | 'paint' | 'interaction' | 'custom';
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'score';
  
  // Context
  userId?: string;
  tenantId?: string;
  sessionId: string;
  page: string;
  component?: string;
  
  // Categorization
  category: string;
  severity: 'good' | 'needs_improvement' | 'poor';
  
  // Additional data
  metadata?: Record<string, any>;
  tags?: string[];
}

interface PerformanceBudget {
  metric: string;
  budget: number;
  unit: string;
  tolerance: number; // % de tolerância antes do alerta
}

interface PerformanceAlert {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  budget: number;
  severity: 'warning' | 'critical';
  message: string;
  suggestions: string[];
}

interface PerformanceReport {
  id: string;
  timestamp: string;
  timeframe: 'hourly' | 'daily' | 'weekly';
  
  // Core Web Vitals
  coreWebVitals: {
    lcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    fid: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    cls: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  };
  
  // Performance metrics
  metrics: {
    pageLoadTime: number;
    timeToInteractive: number;
    firstContentfulPaint: number;
    totalBlockingTime: number;
    memoryUsage: number;
    bundleSize: number;
  };
  
  // Resource analysis
  resources: {
    totalRequests: number;
    totalSize: number;
    slowestResource: string;
    largestResource: string;
    cacheHitRate: number;
  };
  
  // User experience
  userExperience: {
    averageInteractionTime: number;
    errorRate: number;
    bounceRate: number;
    pageViews: number;
  };
  
  // Recommendations
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }[];
}

interface ComponentPerformance {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  memoryUsage: number;
  reRenderReasons: string[];
  lastProfiled: string;
}

// === CLASSE PRINCIPAL ===
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private budgets: PerformanceBudget[] = [];
  private alerts: PerformanceAlert[] = [];
  private sessionId: string;
  private userId?: string;
  private tenantId?: string;
  private observer?: PerformanceObserver;
  private componentProfiles: Map<string, ComponentPerformance> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
    this.setupDefaultBudgets();
  }

  /**
   * Inicializar o monitor de performance
   */
  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Core Web Vitals
    this.setupCoreWebVitals();
    
    // Resource monitoring
    this.setupResourceMonitoring();
    
    // Navigation monitoring
    this.setupNavigationMonitoring();
    
    // Memory monitoring
    this.setupMemoryMonitoring();
    
    // Component profiling
    this.setupComponentProfiling();

    console.log('📊 Performance Monitor inicializado');
  }

  /**
   * Configurar usuário atual
   */
  setUser(userId: string, tenantId: string): void {
    this.userId = userId;
    this.tenantId = tenantId;
  }

  /**
   * Registrar métrica customizada
   */
  recordMetric(
    name: string,
    value: number,
    options: {
      type?: PerformanceMetric['type'];
      unit?: PerformanceMetric['unit'];
      category?: string;
      component?: string;
      metadata?: Record<string, any>;
      tags?: string[];
    } = {}
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date().toISOString(),
      type: options.type || 'custom',
      name,
      value,
      unit: options.unit || 'ms',
      userId: this.userId,
      tenantId: this.tenantId,
      sessionId: this.sessionId,
      page: window.location.pathname,
      component: options.component,
      category: options.category || 'custom',
      severity: this.classifyPerformance(name, value),
      metadata: options.metadata,
      tags: options.tags,
    };

    this.storeMetric(metric);
    this.checkBudgets(metric);

    console.log(`📈 Métrica registrada: ${name} = ${value}${options.unit || 'ms'}`);
  }

  /**
   * Iniciar medição de tempo
   */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, {
        type: 'custom',
        unit: 'ms',
        category: 'timing',
      });
    };
  }

  /**
   * Medir performance de função
   */
  measureFunction<T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): T {
    const functionName = name || fn.name || 'anonymous';
    
    return ((...args: any[]) => {
      const endTiming = this.startTiming(`function_${functionName}`);
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.finally(() => endTiming());
        }
        
        endTiming();
        return result;
      } catch (error) {
        endTiming();
        throw error;
      }
    }) as T;
  }

  /**
   * Definir budget de performance
   */
  setBudget(metric: string, budget: number, unit: string, tolerance: number = 10): void {
    const budgetConfig: PerformanceBudget = {
      metric,
      budget,
      unit,
      tolerance,
    };

    const existingIndex = this.budgets.findIndex(b => b.metric === metric);
    if (existingIndex !== -1) {
      this.budgets[existingIndex] = budgetConfig;
    } else {
      this.budgets.push(budgetConfig);
    }

    console.log(`💰 Budget definido: ${metric} = ${budget}${unit} (±${tolerance}%)`);
  }

  /**
   * Obter métricas de performance
   */
  getMetrics(filters: {
    timeframe?: 'hour' | 'day' | 'week';
    type?: string;
    category?: string;
    severity?: string;
  } = {}): PerformanceMetric[] {
    let filtered = this.metrics;

    if (filters.timeframe) {
      const now = Date.now();
      const timeframes = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
      };
      
      const cutoff = now - timeframes[filters.timeframe];
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() > cutoff);
    }

    if (filters.type) {
      filtered = filtered.filter(m => m.type === filters.type);
    }

    if (filters.category) {
      filtered = filtered.filter(m => m.category === filters.category);
    }

    if (filters.severity) {
      filtered = filtered.filter(m => m.severity === filters.severity);
    }

    return filtered;
  }

  /**
   * Gerar relatório de performance
   */
  generateReport(timeframe: 'hourly' | 'daily' | 'weekly' = 'daily'): PerformanceReport {
    const metrics = this.getMetrics({ timeframe: timeframe.replace('ly', '') as any });
    
    const report: PerformanceReport = {
      id: this.generateReportId(),
      timestamp: new Date().toISOString(),
      timeframe,
      
      coreWebVitals: this.analyzeCoreWebVitals(metrics),
      metrics: this.analyzePerformanceMetrics(metrics),
      resources: this.analyzeResources(metrics),
      userExperience: this.analyzeUserExperience(metrics),
      recommendations: this.generateRecommendations(metrics),
    };

    console.log('📋 Relatório de performance gerado:', report.id);
    return report;
  }

  /**
   * Obter alertas de performance
   */
  getAlerts(): PerformanceAlert[] {
    return this.alerts.slice(-50); // Últimos 50 alertas
  }

  /**
   * Obter perfil de componentes
   */
  getComponentProfiles(): ComponentPerformance[] {
    return Array.from(this.componentProfiles.values());
  }

  /**
   * Limpar dados antigos
   */
  cleanup(olderThanDays: number = 7): void {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );
    
    this.alerts = this.alerts.filter(a => 
      new Date(a.timestamp).getTime() > cutoff
    );

    console.log(`🧹 Dados de performance antigos removidos (>${olderThanDays} dias)`);
  }

  // === MÉTODOS PRIVADOS ===

  private setupCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordMetric('lcp', entry.startTime, {
              type: 'paint',
              category: 'core_web_vitals',
              metadata: { element: (entry as any).element },
            });
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordMetric('fid', entry.processingStart - entry.startTime, {
              type: 'interaction',
              category: 'core_web_vitals',
              metadata: { eventType: (entry as any).name },
            });
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              this.recordMetric('cls', clsValue, {
                type: 'paint',
                unit: 'score',
                category: 'core_web_vitals',
              });
            }
          });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('⚠️ Core Web Vitals não suportados neste browser');
      }
    }
  }

  private setupResourceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordMetric(`resource_${entry.name.split('/').pop()}`, entry.duration, {
              type: 'resource',
              category: 'network',
              metadata: {
                transferSize: (entry as any).transferSize,
                encodedBodySize: (entry as any).encodedBodySize,
                decodedBodySize: (entry as any).decodedBodySize,
                initiatorType: (entry as any).initiatorType,
              },
            });
          });
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('⚠️ Resource monitoring não suportado');
      }
    }
  }

  private setupNavigationMonitoring(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.navigationStart, {
            type: 'navigation',
            category: 'page_load',
          });
          
          this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.navigationStart, {
            type: 'navigation',
            category: 'dom',
          });
          
          this.recordMetric('time_to_interactive', navigation.domInteractive - navigation.navigationStart, {
            type: 'navigation',
            category: 'interactivity',
          });
        }
      }, 0);
    });
  }

  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('memory_used', memory.usedJSHeapSize, {
          type: 'custom',
          unit: 'bytes',
          category: 'memory',
          metadata: {
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
          },
        });
      }, 30000); // A cada 30 segundos
    }
  }

  private setupComponentProfiling(): void {
    // React DevTools integration seria ideal, mas vamos simular
    if (typeof window !== 'undefined') {
      // Interceptar React render methods se disponível
      this.setupReactProfiling();
    }
  }

  private setupReactProfiling(): void {
    // Placeholder para integração com React Profiler
    // Em produção, usaria React.Profiler ou React DevTools API
  }

  private setupDefaultBudgets(): void {
    const defaultBudgets: PerformanceBudget[] = [
      { metric: 'lcp', budget: 2500, unit: 'ms', tolerance: 10 },
      { metric: 'fid', budget: 100, unit: 'ms', tolerance: 10 },
      { metric: 'cls', budget: 0.1, unit: 'score', tolerance: 10 },
      { metric: 'page_load_time', budget: 3000, unit: 'ms', tolerance: 15 },
      { metric: 'time_to_interactive', budget: 3800, unit: 'ms', tolerance: 15 },
      { metric: 'memory_used', budget: 50 * 1024 * 1024, unit: 'bytes', tolerance: 20 }, // 50MB
    ];

    this.budgets = defaultBudgets;
  }

  private storeMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Manter apenas as últimas 10000 métricas na memória
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }
    
    // Salvar algumas métricas no localStorage
    try {
      const stored = localStorage.getItem('fisioflow_performance_metrics') || '[]';
      const existing = JSON.parse(stored);
      
      // Manter apenas métricas importantes
      if (['lcp', 'fid', 'cls', 'page_load_time'].includes(metric.name)) {
        existing.push(metric);
        const toStore = existing.slice(-200); // Últimas 200 métricas importantes
        localStorage.setItem('fisioflow_performance_metrics', JSON.stringify(toStore));
      }
    } catch (error) {
      console.warn('⚠️ Erro ao salvar métrica:', error);
    }
  }

  private checkBudgets(metric: PerformanceMetric): void {
    const budget = this.budgets.find(b => b.metric === metric.name);
    if (!budget) return;

    const deviation = Math.abs(metric.value - budget.budget) / budget.budget * 100;
    
    if (deviation > budget.tolerance) {
      const alert: PerformanceAlert = {
        id: this.generateAlertId(),
        timestamp: new Date().toISOString(),
        metric: metric.name,
        value: metric.value,
        budget: budget.budget,
        severity: deviation > budget.tolerance * 2 ? 'critical' : 'warning',
        message: `${metric.name} excedeu o budget em ${deviation.toFixed(1)}%`,
        suggestions: this.generateSuggestions(metric.name, metric.value, budget),
      };

      this.alerts.push(alert);
      console.warn(`⚠️ Budget excedido: ${alert.message}`);
    }
  }

  private classifyPerformance(metricName: string, value: number): PerformanceMetric['severity'] {
    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      page_load_time: { good: 3000, poor: 5000 },
      time_to_interactive: { good: 3800, poor: 7300 },
    };

    const threshold = thresholds[metricName];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs_improvement';
    return 'poor';
  }

  private analyzeCoreWebVitals(metrics: PerformanceMetric[]): PerformanceReport['coreWebVitals'] {
    const getLatestMetric = (name: string) => {
      const metric = metrics.filter(m => m.name === name).pop();
      return metric ? {
        value: metric.value,
        rating: metric.severity === 'good' ? 'good' : 
                metric.severity === 'needs_improvement' ? 'needs-improvement' : 'poor'
      } : { value: 0, rating: 'good' as const };
    };

    return {
      lcp: getLatestMetric('lcp'),
      fid: getLatestMetric('fid'),
      cls: getLatestMetric('cls'),
    };
  }

  private analyzePerformanceMetrics(metrics: PerformanceMetric[]): PerformanceReport['metrics'] {
    const getValue = (name: string) => {
      const metric = metrics.filter(m => m.name === name).pop();
      return metric?.value || 0;
    };

    return {
      pageLoadTime: getValue('page_load_time'),
      timeToInteractive: getValue('time_to_interactive'),
      firstContentfulPaint: getValue('fcp'),
      totalBlockingTime: getValue('tbt'),
      memoryUsage: getValue('memory_used'),
      bundleSize: getValue('bundle_size'),
    };
  }

  private analyzeResources(metrics: PerformanceMetric[]): PerformanceReport['resources'] {
    const resourceMetrics = metrics.filter(m => m.type === 'resource');
    
    return {
      totalRequests: resourceMetrics.length,
      totalSize: resourceMetrics.reduce((sum, m) => sum + (m.metadata?.transferSize || 0), 0),
      slowestResource: resourceMetrics.reduce((slowest, current) => 
        current.value > slowest.value ? current : slowest, { value: 0, name: '' }
      ).name,
      largestResource: resourceMetrics.reduce((largest, current) => 
        (current.metadata?.transferSize || 0) > (largest.metadata?.transferSize || 0) ? current : largest,
        { metadata: { transferSize: 0 }, name: '' }
      ).name,
      cacheHitRate: 0, // Seria calculado com dados reais de cache
    };
  }

  private analyzeUserExperience(metrics: PerformanceMetric[]): PerformanceReport['userExperience'] {
    const interactionMetrics = metrics.filter(m => m.type === 'interaction');
    
    return {
      averageInteractionTime: interactionMetrics.length > 0 
        ? interactionMetrics.reduce((sum, m) => sum + m.value, 0) / interactionMetrics.length 
        : 0,
      errorRate: 0, // Seria integrado com error tracker
      bounceRate: 0, // Seria calculado com analytics
      pageViews: metrics.filter(m => m.name === 'page_load_time').length,
    };
  }

  private generateRecommendations(metrics: PerformanceMetric[]): PerformanceReport['recommendations'] {
    const recommendations: PerformanceReport['recommendations'] = [];
    
    // Analisar LCP
    const lcpMetric = metrics.filter(m => m.name === 'lcp').pop();
    if (lcpMetric && lcpMetric.value > 2500) {
      recommendations.push({
        priority: 'high',
        action: 'Otimizar Largest Contentful Paint',
        impact: 'Melhora significativa na percepção de velocidade',
        effort: 'medium',
      });
    }

    // Analisar memory usage
    const memoryMetric = metrics.filter(m => m.name === 'memory_used').pop();
    if (memoryMetric && memoryMetric.value > 100 * 1024 * 1024) { // 100MB
      recommendations.push({
        priority: 'medium',
        action: 'Reduzir uso de memória',
        impact: 'Melhor performance em dispositivos com pouca memória',
        effort: 'high',
      });
    }

    return recommendations;
  }

  private generateSuggestions(metricName: string, value: number, budget: PerformanceBudget): string[] {
    const suggestions: Record<string, string[]> = {
      lcp: [
        'Otimizar imagens e usar formatos modernos (WebP, AVIF)',
        'Implementar lazy loading para imagens',
        'Minimizar JavaScript crítico',
        'Usar CDN para recursos estáticos',
      ],
      fid: [
        'Reduzir JavaScript de terceiros',
        'Implementar code splitting',
        'Usar Web Workers para processamento pesado',
        'Otimizar event handlers',
      ],
      cls: [
        'Definir dimensões para imagens e vídeos',
        'Reservar espaço para anúncios',
        'Evitar inserir conteúdo dinâmico acima do fold',
        'Usar CSS transforms em vez de mudanças de layout',
      ],
      page_load_time: [
        'Implementar cache agressivo',
        'Otimizar bundle size',
        'Usar preload para recursos críticos',
        'Implementar service worker',
      ],
    };

    return suggestions[metricName] || ['Analisar métrica específica para recomendações'];
  }

  private generateSessionId(): string {
    return `perf_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === INSTÂNCIA SINGLETON ===
export const performanceMonitor = new PerformanceMonitor();

// === HOOKS REACT ===
export const usePerformanceMonitor = () => {
  const recordMetric = React.useCallback((
    name: string,
    value: number,
    options?: Parameters<typeof performanceMonitor.recordMetric>[2]
  ) => {
    performanceMonitor.recordMetric(name, value, options);
  }, []);

  const startTiming = React.useCallback((name: string) => {
    return performanceMonitor.startTiming(name);
  }, []);

  const measureFunction = React.useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ) => {
    return performanceMonitor.measureFunction(fn, name);
  }, []);

  return {
    recordMetric,
    startTiming,
    measureFunction,
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
    getAlerts: performanceMonitor.getAlerts.bind(performanceMonitor),
  };
};

// === PROFILER COMPONENT ===
export const PerformanceProfiler: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ id, children }) => {
  const onRenderCallback = React.useCallback((
    profileId: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    performanceMonitor.recordMetric(`component_${profileId}_${phase}`, actualDuration, {
      type: 'custom',
      category: 'react_profiler',
      component: profileId,
      metadata: {
        phase,
        baseDuration,
        startTime,
        commitTime,
      },
    });
  }, []);

  return (
    <React.Profiler id={id} onRender={onRenderCallback}>
      {children}
    </React.Profiler>
  );
};

export default performanceMonitor;

// Adicionar import do React
import React from 'react';