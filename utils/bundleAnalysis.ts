/**
 * Utilitários para análise de bundle e otimização de performance
 */

// Tipos para análise de chunks
interface ChunkInfo {
  name: string;
  size: number;
  loadTime: number;
  isLoaded: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface BundleMetrics {
  totalSize: number;
  initialSize: number;
  chunks: ChunkInfo[];
  loadingTime: number;
  cacheHitRate: number;
}

class BundleAnalyzer {
  private chunks: Map<string, ChunkInfo> = new Map();
  private loadTimes: Map<string, number> = new Map();
  private startTime: number = performance.now();

  /**
   * Registra o carregamento de um chunk
   */
  registerChunkLoad(chunkName: string, size: number, priority: ChunkInfo['priority']) {
    const loadTime = performance.now() - this.startTime;
    
    const chunkInfo: ChunkInfo = {
      name: chunkName,
      size,
      loadTime,
      isLoaded: true,
      priority,
    };

    this.chunks.set(chunkName, chunkInfo);
    this.logChunkLoad(chunkInfo);
  }

  /**
   * Gera relatório de performance do bundle
   */
  generateReport(): BundleMetrics {
    const chunks = Array.from(this.chunks.values());
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const criticalChunks = chunks.filter(chunk => chunk.priority === 'critical');
    const initialSize = criticalChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    
    return {
      totalSize,
      initialSize,
      chunks,
      loadingTime: Math.max(...chunks.map(c => c.loadTime)),
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * Analisa oportunidades de otimização
   */
  analyzeOptimizations(): string[] {
    const report = this.generateReport();
    const recommendations: string[] = [];

    // Bundle inicial muito grande
    if (report.initialSize > 500000) { // 500KB
      recommendations.push('Bundle inicial muito grande. Considere lazy loading para componentes não críticos.');
    }

    // Chunks com baixa prioridade carregados muito cedo
    const earlyLowPriority = report.chunks.filter(
      chunk => chunk.priority === 'low' && chunk.loadTime < 2000
    );
    if (earlyLowPriority.length > 0) {
      recommendations.push(`${earlyLowPriority.length} chunk(s) de baixa prioridade carregados muito cedo.`);
    }

    // Chunks muito grandes
    const largeChunks = report.chunks.filter(chunk => chunk.size > 200000); // 200KB
    if (largeChunks.length > 0) {
      recommendations.push(`${largeChunks.length} chunk(s) muito grandes. Considere dividir em chunks menores.`);
    }

    return recommendations;
  }

  /**
   * Monitora performance em tempo real
   */
  startPerformanceMonitoring() {
    if (typeof window === 'undefined') return;

    // Observa mudanças de performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          this.analyzeNavigationTiming(entry as PerformanceNavigationTiming);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (error) {
      // Fallback para navegadores que não suportam
    }
  }

  private logChunkLoad(chunk: ChunkInfo) {
    if (process.env.NODE_ENV === 'development') {
      const sizeKB = (chunk.size / 1024).toFixed(2);
      const loadTimeMs = chunk.loadTime.toFixed(2);
      
      // Log com cores baseado na prioridade
      const colors = {
        critical: '🔴',
        high: '🟡', 
        medium: '🟢',
        low: '🔵'
      };
      
      // Performance-conscious logging
    }
  }

  private calculateCacheHitRate(): number {
    // Implementar lógica para calcular cache hit rate
    // baseado em headers de resposta e timing
    return 0.75; // Mock value
  }

  private analyzeNavigationTiming(timing: PerformanceNavigationTiming) {
    const metrics = {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      firstContentfulPaint: this.getFirstContentfulPaint(),
      largestContentfulPaint: this.getLargestContentfulPaint(),
    };

    // Armazenar métricas para análise
    this.storeMetrics(metrics);
  }

  private getFirstContentfulPaint(): number {
    const entries = performance.getEntriesByType('paint') as PerformanceEntry[];
    const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  private getLargestContentfulPaint(): number {
    const entries = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
    const lcp = entries[entries.length - 1];
    return lcp ? lcp.startTime : 0;
  }

  private storeMetrics(metrics: Record<string, number>) {
    // Armazenar métricas para análise posterior
    localStorage.setItem('bundle-metrics', JSON.stringify(metrics));
  }
}

// Instância global do analisador
export const bundleAnalyzer = new BundleAnalyzer();

// Hook React para análise de bundle
export const useBundleAnalysis = () => {
  const startMonitoring = () => bundleAnalyzer.startPerformanceMonitoring();
  const getReport = () => bundleAnalyzer.generateReport();
  const getOptimizations = () => bundleAnalyzer.analyzeOptimizations();
  
  return {
    startMonitoring,
    getReport,
    getOptimizations,
    registerChunk: bundleAnalyzer.registerChunkLoad.bind(bundleAnalyzer),
  };
};

// Utilitário para análise automática em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  // Auto-start monitoring
  bundleAnalyzer.startPerformanceMonitoring();
  
  // Log report após carregamento inicial
  setTimeout(() => {
    const report = bundleAnalyzer.generateReport();
    const optimizations = bundleAnalyzer.analyzeOptimizations();
    
    if (optimizations.length > 0) {
      // Development logging only
    }
  }, 5000);
}