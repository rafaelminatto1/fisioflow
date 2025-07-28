/**
 * Sistema de Rastreamento de Erros
 * Captura, classifica e reporta erros da aplicação para análise e correção
 */

import { auditLogger, AuditAction, LegalBasis } from './auditLogger';

// === INTERFACES ===
interface ErrorReport {
  id: string;
  timestamp: string;
  
  // Identificação
  userId?: string;
  tenantId?: string;
  sessionId: string;
  
  // Error Info
  type: 'javascript' | 'network' | 'permission' | 'validation' | 'business' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  
  // Details
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  
  // Context
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  component?: string;
  action?: string;
  
  // Environment
  environment: 'development' | 'staging' | 'production';
  version: string;
  
  // Additional Data
  metadata?: Record<string, any>;
  tags?: string[];
  
  // State
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

interface ErrorStats {
  totalErrors: number;
  todayErrors: number;
  weekErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  topErrors: { message: string; count: number; lastSeen: string }[];
  affectedUsers: number;
  resolvedErrors: number;
  resolutionRate: number;
}

interface ErrorConfiguration {
  enabledInProduction: boolean;
  maxReportsPerMinute: number;
  maxStackTraceLength: number;
  enableAutoReporting: boolean;
  reportUrl?: string;
  excludePatterns: RegExp[];
  includeBreadcrumbs: boolean;
  maxBreadcrumbs: number;
  enablePerformanceCapture: boolean;
}

interface Breadcrumb {
  timestamp: string;
  type: 'navigation' | 'user' | 'http' | 'console' | 'dom';
  category: string;
  message: string;
  data?: Record<string, any>;
  level: 'info' | 'warning' | 'error';
}

interface PerformanceSnapshot {
  timestamp: string;
  memory?: {
    used: number;
    total: number;
  };
  timing?: {
    navigation: number;
    domComplete: number;
    loadComplete: number;
  };
  resources?: {
    count: number;
    size: number;
    slowest: string;
  };
}

// === CLASSE PRINCIPAL ===
class ErrorTracker {
  private config: ErrorConfiguration;
  private sessionId: string;
  private breadcrumbs: Breadcrumb[] = [];
  private errorReports: ErrorReport[] = [];
  private rateLimitCounter = 0;
  private rateLimitWindow = Date.now();
  private userId?: string;
  private tenantId?: string;

  constructor(config: Partial<ErrorConfiguration> = {}) {
    this.config = {
      enabledInProduction: true,
      maxReportsPerMinute: 10,
      maxStackTraceLength: 5000,
      enableAutoReporting: true,
      excludePatterns: [
        /Script error/,
        /Non-Error promise rejection captured/,
        /ResizeObserver loop limit exceeded/,
        /ChunkLoadError/,
      ],
      includeBreadcrumbs: true,
      maxBreadcrumbs: 50,
      enablePerformanceCapture: true,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  /**
   * Inicializar o rastreador de erros
   */
  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Error handler global
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // Breadcrumbs automáticos
    if (this.config.includeBreadcrumbs) {
      this.setupBreadcrumbTracking();
    }

    // Performance monitoring
    if (this.config.enablePerformanceCapture) {
      this.setupPerformanceMonitoring();
    }

    console.log('🔍 Error Tracker inicializado');
  }

  /**
   * Configurar usuário atual
   */
  setUser(userId: string, tenantId: string): void {
    this.userId = userId;
    this.tenantId = tenantId;
    
    this.addBreadcrumb({
      type: 'user',
      category: 'auth',
      message: 'User authenticated',
      data: { userId, tenantId },
      level: 'info',
    });
  }

  /**
   * Reportar erro manualmente
   */
  async reportError(
    error: Error,
    context: {
      type?: ErrorReport['type'];
      severity?: ErrorReport['severity'];
      category?: string;
      component?: string;
      action?: string;
      metadata?: Record<string, any>;
      tags?: string[];
    } = {}
  ): Promise<void> {
    if (!this.shouldReport(error)) return;

    const report: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      userId: this.userId,
      tenantId: this.tenantId,
      sessionId: this.sessionId,
      
      type: context.type || 'javascript',
      severity: context.severity || this.classifySeverity(error),
      category: context.category || 'general',
      
      message: error.message,
      stack: this.sanitizeStack(error.stack),
      
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      component: context.component,
      action: context.action,
      
      environment: this.getEnvironment(),
      version: this.getAppVersion(),
      
      metadata: {
        ...context.metadata,
        breadcrumbs: this.breadcrumbs.slice(-10), // Últimas 10
        performance: this.capturePerformanceSnapshot(),
      },
      tags: context.tags,
      
      resolved: false,
    };

    await this.storeError(report);
    await this.sendReport(report);

    console.error('🚨 Erro capturado:', {
      id: report.id,
      type: report.type,
      severity: report.severity,
      message: report.message,
    });
  }

  /**
   * Adicionar breadcrumb manual
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(fullBreadcrumb);
    
    // Manter apenas os mais recentes
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Obter estatísticas de erros
   */
  getErrorStats(): ErrorStats {
    const now = Date.now();
    const today = new Date().toDateString();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const todayErrors = this.errorReports.filter(e => 
      new Date(e.timestamp).toDateString() === today
    ).length;

    const weekErrors = this.errorReports.filter(e => 
      new Date(e.timestamp).getTime() > weekAgo
    ).length;

    const errorsByType = this.errorReports.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = this.errorReports.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top errors por message
    const errorCounts = new Map<string, { count: number; lastSeen: string }>();
    this.errorReports.forEach(error => {
      const key = error.message.substring(0, 100);
      const existing = errorCounts.get(key);
      errorCounts.set(key, {
        count: (existing?.count || 0) + 1,
        lastSeen: error.timestamp,
      });
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const affectedUsers = new Set(this.errorReports.map(e => e.userId).filter(Boolean)).size;
    const resolvedErrors = this.errorReports.filter(e => e.resolved).length;
    const resolutionRate = this.errorReports.length > 0 
      ? (resolvedErrors / this.errorReports.length) * 100 
      : 0;

    return {
      totalErrors: this.errorReports.length,
      todayErrors,
      weekErrors,
      errorsByType,
      errorsBySeverity,
      topErrors,
      affectedUsers,
      resolvedErrors,
      resolutionRate,
    };
  }

  /**
   * Marcar erro como resolvido
   */
  async resolveError(errorId: string, resolvedBy: string, notes?: string): Promise<void> {
    const error = this.errorReports.find(e => e.id === errorId);
    if (!error) return;

    error.resolved = true;
    error.resolvedAt = new Date().toISOString();
    error.resolvedBy = resolvedBy;
    error.notes = notes;

    await this.updateStoredError(error);

    console.log(`✅ Erro ${errorId} marcado como resolvido`);
  }

  /**
   * Exportar dados de erros
   */
  exportErrors(filters: {
    dateRange?: { start: string; end: string };
    severity?: string[];
    type?: string[];
    resolved?: boolean;
  } = {}): ErrorReport[] {
    let filtered = this.errorReports;

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start).getTime();
      const end = new Date(filters.dateRange.end).getTime();
      filtered = filtered.filter(e => {
        const timestamp = new Date(e.timestamp).getTime();
        return timestamp >= start && timestamp <= end;
      });
    }

    if (filters.severity) {
      filtered = filtered.filter(e => filters.severity!.includes(e.severity));
    }

    if (filters.type) {
      filtered = filtered.filter(e => filters.type!.includes(e.type));
    }

    if (filters.resolved !== undefined) {
      filtered = filtered.filter(e => e.resolved === filters.resolved);
    }

    return filtered;
  }

  // === MÉTODOS PRIVADOS ===

  private handleError(event: ErrorEvent): void {
    const error = new Error(event.message);
    error.stack = `${event.filename}:${event.lineno}:${event.colno}`;
    
    this.reportError(error, {
      type: 'javascript',
      severity: 'medium',
      category: 'uncaught',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.reportError(error, {
      type: 'javascript',
      severity: 'high',
      category: 'unhandled_promise',
    });
  }

  private setupBreadcrumbTracking(): void {
    // Navigation
    window.addEventListener('popstate', () => {
      this.addBreadcrumb({
        type: 'navigation',
        category: 'browser',
        message: 'Page navigation',
        data: { url: window.location.href },
        level: 'info',
      });
    });

    // Console errors
    const originalError = console.error;
    console.error = (...args) => {
      this.addBreadcrumb({
        type: 'console',
        category: 'log',
        message: 'Console error',
        data: { args: args.map(String) },
        level: 'error',
      });
      originalError.apply(console, args);
    };

    // HTTP requests (se fetch estiver disponível)
    if (typeof fetch !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = Date.now();
        try {
          const response = await originalFetch(...args);
          const duration = Date.now() - startTime;
          
          this.addBreadcrumb({
            type: 'http',
            category: 'request',
            message: `HTTP ${response.status}`,
            data: {
              url: args[0],
              status: response.status,
              duration,
            },
            level: response.ok ? 'info' : 'warning',
          });
          
          return response;
        } catch (error) {
          this.addBreadcrumb({
            type: 'http',
            category: 'request',
            message: 'HTTP Error',
            data: {
              url: args[0],
              error: String(error),
            },
            level: 'error',
          });
          throw error;
        }
      };
    }
  }

  private setupPerformanceMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tasks > 50ms
              this.addBreadcrumb({
                type: 'dom',
                category: 'performance',
                message: 'Long task detected',
                data: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                },
                level: 'warning',
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // PerformanceObserver não suportado
      }
    }
  }

  private shouldReport(error: Error): boolean {
    // Rate limiting
    const now = Date.now();
    if (now - this.rateLimitWindow > 60000) {
      this.rateLimitCounter = 0;
      this.rateLimitWindow = now;
    }
    
    if (this.rateLimitCounter >= this.config.maxReportsPerMinute) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (pattern.test(error.message)) {
        return false;
      }
    }

    this.rateLimitCounter++;
    return true;
  }

  private classifySeverity(error: Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('security') || message.includes('csrf') || message.includes('xss')) {
      return 'critical';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'medium';
    }
    
    if (message.includes('validation') || message.includes('required')) {
      return 'low';
    }
    
    return 'medium';
  }

  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    return stack
      .substring(0, this.config.maxStackTraceLength)
      .replace(/https?:\/\/[^\s/]+/g, '[URL]'); // Remove URLs sensíveis
  }

  private capturePerformanceSnapshot(): PerformanceSnapshot | undefined {
    if (!this.config.enablePerformanceCapture || typeof performance === 'undefined') {
      return undefined;
    }

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date().toISOString(),
    };

    // Memory info
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      snapshot.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
      };
    }

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      snapshot.timing = {
        navigation: navigation.loadEventEnd - navigation.navigationStart,
        domComplete: navigation.domComplete - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
      };
    }

    // Resource timing
    const resources = performance.getEntriesByType('resource');
    if (resources.length > 0) {
      const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      const slowest = resources.reduce((slowest, current) => 
        current.duration > slowest.duration ? current : slowest
      );
      
      snapshot.resources = {
        count: resources.length,
        size: totalSize,
        slowest: slowest.name,
      };
    }

    return snapshot;
  }

  private async storeError(report: ErrorReport): Promise<void> {
    try {
      this.errorReports.push(report);
      
      // Manter apenas os últimos 1000 erros na memória
      if (this.errorReports.length > 1000) {
        this.errorReports = this.errorReports.slice(-1000);
      }
      
      // Salvar no localStorage
      const stored = localStorage.getItem('fisioflow_error_reports') || '[]';
      const existingReports = JSON.parse(stored);
      existingReports.push(report);
      
      // Manter apenas os últimos 500 no storage
      const toStore = existingReports.slice(-500);
      localStorage.setItem('fisioflow_error_reports', JSON.stringify(toStore));
      
      // Log de auditoria se tiver usuário
      if (this.userId && this.tenantId) {
        await auditLogger.logAction(
          this.tenantId,
          this.userId,
          'USER',
          AuditAction.CREATE,
          'error_report',
          report.id,
          {
            entityName: `Error: ${report.message.substring(0, 50)}`,
            legalBasis: LegalBasis.LEGITIMATE_INTEREST,
            dataAccessed: ['error_details', 'stack_trace', 'performance_data'],
            metadata: {
              errorType: report.type,
              severity: report.severity,
              category: report.category,
            },
          }
        );
      }
    } catch (error) {
      console.error('❌ Erro ao armazenar relatório:', error);
    }
  }

  private async updateStoredError(report: ErrorReport): Promise<void> {
    try {
      const stored = localStorage.getItem('fisioflow_error_reports') || '[]';
      const reports = JSON.parse(stored);
      const index = reports.findIndex((r: ErrorReport) => r.id === report.id);
      
      if (index !== -1) {
        reports[index] = report;
        localStorage.setItem('fisioflow_error_reports', JSON.stringify(reports));
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar relatório:', error);
    }
  }

  private async sendReport(report: ErrorReport): Promise<void> {
    if (!this.config.enableAutoReporting || !this.config.reportUrl) {
      return;
    }

    try {
      // Em produção, enviaria para um serviço externo
      console.log('📤 Enviando relatório de erro:', report.id);
      
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('❌ Erro ao enviar relatório:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEnvironment(): ErrorReport['environment'] {
    if (process.env.NODE_ENV === 'production') return 'production';
    if (process.env.NODE_ENV === 'staging') return 'staging';
    return 'development';
  }

  private getAppVersion(): string {
    return process.env.REACT_APP_VERSION || '1.0.0';
  }
}

// === INSTÂNCIA SINGLETON ===
export const errorTracker = new ErrorTracker({
  enabledInProduction: true,
  maxReportsPerMinute: 15,
  includeBreadcrumbs: true,
  maxBreadcrumbs: 100,
  enablePerformanceCapture: true,
});

// === REACT ERROR BOUNDARY ===
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorTracker.reportError(error, {
      type: 'javascript',
      severity: 'high',
      category: 'react_boundary',
      component: errorInfo.componentStack?.split('\n')[1]?.trim(),
      metadata: {
        componentStack: errorInfo.componentStack,
      },
      tags: ['react', 'boundary'],
    });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />;
      }
      
      return (
        <div className="error-boundary">
          <h2>Algo deu errado!</h2>
          <p>Um erro inesperado ocorreu. Nossa equipe foi notificada.</p>
          <button onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// === HOOKS ===
export const useErrorHandler = () => {
  const reportError = React.useCallback((
    error: Error, 
    context?: Parameters<typeof errorTracker.reportError>[1]
  ) => {
    errorTracker.reportError(error, context);
  }, []);

  const addBreadcrumb = React.useCallback((
    breadcrumb: Parameters<typeof errorTracker.addBreadcrumb>[0]
  ) => {
    errorTracker.addBreadcrumb(breadcrumb);
  }, []);

  return {
    reportError,
    addBreadcrumb,
    stats: errorTracker.getErrorStats(),
  };
};

export default errorTracker;

// Adicionar import do React para o ErrorBoundary
import React from 'react';