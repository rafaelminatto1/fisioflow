// services/ai-economica/logger.ts
// Sistema de logging específico para IA econômica

import { AI_ECONOMICA_CONFIG } from '../../config/ai-economica.config';
import { PremiumProvider, QueryType, ResponseSource } from '../../types/ai-economica.types';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  userId?: string;
  tenantId?: string;
}

export class AIEconomicaLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 10000;

  private log(level: LogLevel, category: string, message: string, data?: any, userId?: string, tenantId?: string): void {
    if (!AI_ECONOMICA_CONFIG.LOGGING.ENABLED) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      userId,
      tenantId
    };

    this.logs.push(entry);
    
    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AI-ECONOMICA] ${level.toUpperCase()}: ${category} - ${message}`, data);
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Remover informações sensíveis
    const sanitized = { ...data };
    
    // Remover chaves de API
    if (sanitized.apiKey) delete sanitized.apiKey;
    if (sanitized.token) delete sanitized.token;
    
    // Anonimizar dados pessoais se configurado
    if (AI_ECONOMICA_CONFIG.SECURITY.ANONYMIZE_EXTERNAL_QUERIES) {
      if (sanitized.patientId) sanitized.patientId = '[ANONYMIZED]';
      if (sanitized.patientName) sanitized.patientName = '[ANONYMIZED]';
    }
    
    return sanitized;
  }

  // Logs de consultas
  logQuery(queryId: string, queryType: QueryType, source: ResponseSource, userId?: string, tenantId?: string): void {
    this.log(LogLevel.INFO, 'QUERY', `Query processed from ${source}`, {
      queryId,
      queryType,
      source
    }, userId, tenantId);
  }

  logQueryError(queryId: string, error: Error, userId?: string, tenantId?: string): void {
    this.log(LogLevel.ERROR, 'QUERY_ERROR', `Query failed: ${error.message}`, {
      queryId,
      error: error.stack
    }, userId, tenantId);
  }

  // Logs de cache
  logCacheHit(queryHash: string, userId?: string, tenantId?: string): void {
    this.log(LogLevel.DEBUG, 'CACHE_HIT', 'Cache hit', { queryHash }, userId, tenantId);
  }

  logCacheMiss(queryHash: string, userId?: string, tenantId?: string): void {
    this.log(LogLevel.DEBUG, 'CACHE_MISS', 'Cache miss', { queryHash }, userId, tenantId);
  }

  logCacheCleanup(removedEntries: number): void {
    this.log(LogLevel.INFO, 'CACHE_CLEANUP', `Removed ${removedEntries} expired cache entries`);
  }

  // Logs de contas premium
  logPremiumUsage(provider: PremiumProvider, tokensUsed: number, remainingQuota: number, userId?: string, tenantId?: string): void {
    this.log(LogLevel.INFO, 'PREMIUM_USAGE', `Used ${provider}`, {
      provider,
      tokensUsed,
      remainingQuota
    }, userId, tenantId);
  }

  logPremiumLimitWarning(provider: PremiumProvider, usagePercentage: number): void {
    this.log(LogLevel.WARN, 'PREMIUM_LIMIT', `${provider} usage at ${usagePercentage}%`, {
      provider,
      usagePercentage
    });
  }

  logPremiumLimitReached(provider: PremiumProvider): void {
    this.log(LogLevel.ERROR, 'PREMIUM_LIMIT', `${provider} limit reached`, { provider });
  }

  // Logs de base de conhecimento
  logKnowledgeContribution(entryId: string, authorId: string, tenantId?: string): void {
    this.log(LogLevel.INFO, 'KNOWLEDGE_CONTRIBUTION', 'New knowledge entry added', {
      entryId,
      authorId
    }, authorId, tenantId);
  }

  logKnowledgeUsage(entryId: string, confidence: number, userId?: string, tenantId?: string): void {
    this.log(LogLevel.DEBUG, 'KNOWLEDGE_USAGE', 'Knowledge entry used', {
      entryId,
      confidence
    }, userId, tenantId);
  }

  // Logs de economia
  logCostSaving(estimatedSaving: number, source: ResponseSource, userId?: string, tenantId?: string): void {
    this.log(LogLevel.INFO, 'COST_SAVING', `Estimated saving: R$ ${estimatedSaving.toFixed(2)}`, {
      estimatedSaving,
      source
    }, userId, tenantId);
  }

  // Logs de performance
  logResponseTime(queryId: string, responseTime: number, source: ResponseSource): void {
    this.log(LogLevel.DEBUG, 'PERFORMANCE', `Response time: ${responseTime}ms`, {
      queryId,
      responseTime,
      source
    });
  }

  logSlowQuery(queryId: string, responseTime: number, threshold: number): void {
    this.log(LogLevel.WARN, 'SLOW_QUERY', `Slow query detected: ${responseTime}ms (threshold: ${threshold}ms)`, {
      queryId,
      responseTime,
      threshold
    });
  }

  // Métodos para recuperar logs
  getLogs(level?: LogLevel, category?: string, limit = 100): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    return filteredLogs.slice(-limit);
  }

  getLogsSince(since: Date): LogEntry[] {
    return this.logs.filter(log => new Date(log.timestamp) >= since);
  }

  // Método para exportar logs
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }
    
    // CSV format
    const headers = 'timestamp,level,category,message,userId,tenantId';
    const rows = this.logs.map(log => 
      `${log.timestamp},${log.level},${log.category},"${log.message}",${log.userId || ''},${log.tenantId || ''}`
    );
    
    return [headers, ...rows].join('\n');
  }

  // Limpeza de logs antigos
  cleanupOldLogs(): void {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - AI_ECONOMICA_CONFIG.LOGGING.RETENTION_DAYS);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => new Date(log.timestamp) >= retentionDate);
    const removedCount = initialCount - this.logs.length;

    if (removedCount > 0) {
      this.log(LogLevel.INFO, 'LOG_CLEANUP', `Removed ${removedCount} old log entries`);
    }
  }
}

// Instância singleton do logger
export const aiEconomicaLogger = new AIEconomicaLogger();

// Configurar limpeza automática de logs
if (AI_ECONOMICA_CONFIG.LOGGING.ENABLED) {
  setInterval(() => {
    aiEconomicaLogger.cleanupOldLogs();
  }, 24 * 60 * 60 * 1000); // Executar diariamente
}