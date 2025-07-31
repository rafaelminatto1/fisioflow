/**
 * Sistema de Monitoramento de Erros para Produção
 * Coleta e reporta erros de forma estruturada
 */

export interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  buildVersion: string;
  environment: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  url: string;
  sessionId: string;
  context?: Record<string, any>;
}

class ErrorMonitoringService {
  private sessionId: string;
  private userId?: string;
  private isProduction: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = import.meta.env.PROD;
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Capturar erros JavaScript não tratados
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript-error'
        }
      });
    });

    // Capturar promises rejeitadas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        severity: 'high',
        context: {
          type: 'unhandled-promise-rejection',
          reason: event.reason
        }
      });
    });

    // Capturar erros de recursos (imagens, scripts, etc.)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.reportError({
          message: `Resource loading error: ${(event.target as any)?.src || (event.target as any)?.href}`,
          severity: 'medium',
          context: {
            type: 'resource-error',
            tagName: (event.target as any)?.tagName,
            src: (event.target as any)?.src,
            href: (event.target as any)?.href
          }
        });
      }
    }, true);
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  reportError(error: {
    message: string;
    stack?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
  }): string {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.userId,
      sessionId: this.sessionId,
      buildVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: this.isProduction ? 'production' : 'development',
      severity: error.severity || 'medium',
      context: error.context
    };

    // Armazenar localmente
    this.storeErrorLocally(errorReport);

    // Enviar para serviço de monitoramento se em produção
    if (this.isProduction) {
      this.sendErrorToService(errorReport);
    } else {
      console.error('Error Report:', errorReport);
    }

    return errorId;
  }

  reportPerformanceMetric(metric: {
    metric: string;
    value: number;
    context?: Record<string, any>;
  }): void {
    const performanceMetric: PerformanceMetric = {
      id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      metric: metric.metric,
      value: metric.value,
      url: window.location.href,
      sessionId: this.sessionId,
      context: metric.context
    };

    // Armazenar localmente
    this.storePerformanceMetricLocally(performanceMetric);

    // Enviar para serviço se em produção
    if (this.isProduction) {
      this.sendPerformanceMetricToService(performanceMetric);
    } else {
      console.log('Performance Metric:', performanceMetric);
    }
  }

  private storeErrorLocally(errorReport: ErrorReport): void {
    try {
      const errors = JSON.parse(localStorage.getItem('fisioflow-errors') || '[]');
      errors.push(errorReport);
      
      // Manter apenas os últimos 50 erros
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('fisioflow-errors', JSON.stringify(errors));
    } catch (error) {
      console.error('Failed to store error locally:', error);
    }
  }

  private storePerformanceMetricLocally(metric: PerformanceMetric): void {
    try {
      const metrics = JSON.parse(localStorage.getItem('fisioflow-performance') || '[]');
      metrics.push(metric);
      
      // Manter apenas as últimas 100 métricas
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100);
      }
      
      localStorage.setItem('fisioflow-performance', JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to store performance metric locally:', error);
    }
  }

  private async sendErrorToService(errorReport: ErrorReport): Promise<void> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) return;

      await fetch(`${apiUrl}/monitoring/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      });
    } catch (error) {
      console.error('Failed to send error to monitoring service:', error);
    }
  }

  private async sendPerformanceMetricToService(metric: PerformanceMetric): Promise<void> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) return;

      await fetch(`${apiUrl}/monitoring/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric)
      });
    } catch (error) {
      console.error('Failed to send performance metric to monitoring service:', error);
    }
  }

  // Métricas de performance específicas
  measurePageLoad(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (navigation) {
            this.reportPerformanceMetric({
              metric: 'page_load_time',
              value: navigation.loadEventEnd - navigation.fetchStart,
              context: {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                firstPaint: this.getFirstPaint(),
                firstContentfulPaint: this.getFirstContentfulPaint()
              }
            });
          }
        }, 0);
      });
    }
  }

  private getFirstPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  private getFirstContentfulPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : null;
  }

  // Métricas de interação
  measureUserInteraction(action: string, duration?: number): void {
    this.reportPerformanceMetric({
      metric: 'user_interaction',
      value: duration || 0,
      context: {
        action,
        timestamp: Date.now()
      }
    });
  }

  // Obter relatórios armazenados localmente
  getStoredErrors(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('fisioflow-errors') || '[]');
    } catch (error) {
      console.error('Failed to get stored errors:', error);
      return [];
    }
  }

  getStoredPerformanceMetrics(): PerformanceMetric[] {
    try {
      return JSON.parse(localStorage.getItem('fisioflow-performance') || '[]');
    } catch (error) {
      console.error('Failed to get stored performance metrics:', error);
      return [];
    }
  }

  // Limpar dados armazenados
  clearStoredData(): void {
    try {
      localStorage.removeItem('fisioflow-errors');
      localStorage.removeItem('fisioflow-performance');
    } catch (error) {
      console.error('Failed to clear stored monitoring data:', error);
    }
  }

  // Gerar relatório de saúde da aplicação
  generateHealthReport(): {
    errors: ErrorReport[];
    performance: PerformanceMetric[];
    summary: {
      totalErrors: number;
      criticalErrors: number;
      averagePageLoadTime: number;
      sessionDuration: number;
    };
  } {
    const errors = this.getStoredErrors();
    const performance = this.getStoredPerformanceMetrics();
    
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const pageLoadMetrics = performance.filter(p => p.metric === 'page_load_time');
    const averagePageLoadTime = pageLoadMetrics.length > 0 
      ? pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) / pageLoadMetrics.length 
      : 0;

    return {
      errors,
      performance,
      summary: {
        totalErrors: errors.length,
        criticalErrors,
        averagePageLoadTime,
        sessionDuration: Date.now() - parseInt(this.sessionId.split('-')[1])
      }
    };
  }
}

// Instância global do serviço
export const errorMonitoring = new ErrorMonitoringService();

// Hook para React
export const useErrorMonitoring = () => {
  return {
    reportError: errorMonitoring.reportError.bind(errorMonitoring),
    reportPerformanceMetric: errorMonitoring.reportPerformanceMetric.bind(errorMonitoring),
    measureUserInteraction: errorMonitoring.measureUserInteraction.bind(errorMonitoring),
    setUserId: errorMonitoring.setUserId.bind(errorMonitoring),
    getHealthReport: errorMonitoring.generateHealthReport.bind(errorMonitoring)
  };
};

// Inicializar métricas de performance
if (typeof window !== 'undefined') {
  errorMonitoring.measurePageLoad();
}