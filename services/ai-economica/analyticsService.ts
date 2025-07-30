// services/ai-economica/analyticsService.ts
// Serviço de analytics para o sistema de IA econômica

import {
  AIQuery,
  AIResponse,
  ResponseSource,
  PremiumProvider,
  SavingsReport,
} from '../../types/ai-economica.types';
import { aiEconomicaLogger } from './logger';

interface QueryAnalytics {
  queryId: string;
  timestamp: Date;
  queryType: string;
  source: ResponseSource;
  provider?: PremiumProvider;
  responseTime: number;
  confidence: number;
  tokensUsed?: number;
  estimatedCost: number;
  actualCost: number;
  userId?: string;
  tenantId?: string;
}

interface UsageMetrics {
  totalQueries: number;
  queriesBySource: Record<ResponseSource, number>;
  queriesByType: Record<string, number>;
  averageResponseTime: number;
  averageConfidence: number;
  totalCostSaved: number;
  cacheHitRate: number;
}

export class AnalyticsService {
  private queryHistory: QueryAnalytics[] = [];
  private maxHistorySize = 10000;

  constructor() {
    this.loadFromStorage();
    this.startPeriodicSave();
  }

  recordQuery(
    query: AIQuery,
    response: AIResponse,
    source: ResponseSource
  ): void {
    const analytics: QueryAnalytics = {
      queryId: query.id,
      timestamp: new Date(),
      queryType: query.type,
      source,
      provider: response.provider,
      responseTime: response.responseTime,
      confidence: response.confidence,
      tokensUsed: response.tokensUsed,
      estimatedCost: this.estimateQueryCost(query),
      actualCost:
        source === ResponseSource.PREMIUM
          ? this.calculateActualCost(response)
          : 0,
      userId: query.context.userId,
      tenantId: query.context.tenantId,
    };

    this.queryHistory.push(analytics);

    // Manter apenas os registros mais recentes
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
    }

    // Log para monitoramento
    aiEconomicaLogger.logQuery(
      query.id,
      query.type,
      source,
      query.context.userId,
      query.context.tenantId
    );
  }

  getUsageMetrics(
    period?: { start: Date; end: Date },
    tenantId?: string
  ): UsageMetrics {
    let filteredHistory = this.queryHistory;

    // Filtrar por período
    if (period) {
      filteredHistory = filteredHistory.filter(
        (q) => q.timestamp >= period.start && q.timestamp <= period.end
      );
    }

    // Filtrar por tenant
    if (tenantId) {
      filteredHistory = filteredHistory.filter((q) => q.tenantId === tenantId);
    }

    if (filteredHistory.length === 0) {
      return {
        totalQueries: 0,
        queriesBySource: {
          [ResponseSource.INTERNAL]: 0,
          [ResponseSource.CACHE]: 0,
          [ResponseSource.PREMIUM]: 0,
        },
        queriesByType: {},
        averageResponseTime: 0,
        averageConfidence: 0,
        totalCostSaved: 0,
        cacheHitRate: 0,
      };
    }

    // Calcular métricas
    const queriesBySource = filteredHistory.reduce(
      (acc, q) => {
        acc[q.source] = (acc[q.source] || 0) + 1;
        return acc;
      },
      {} as Record<ResponseSource, number>
    );

    const queriesByType = filteredHistory.reduce(
      (acc, q) => {
        acc[q.queryType] = (acc[q.queryType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const averageResponseTime =
      filteredHistory.reduce((sum, q) => sum + q.responseTime, 0) /
      filteredHistory.length;
    const averageConfidence =
      filteredHistory.reduce((sum, q) => sum + q.confidence, 0) /
      filteredHistory.length;

    const totalCostSaved = filteredHistory
      .filter((q) => q.source !== ResponseSource.PREMIUM)
      .reduce((sum, q) => sum + q.estimatedCost, 0);

    const cacheHits = queriesBySource[ResponseSource.CACHE] || 0;
    const cacheHitRate =
      filteredHistory.length > 0 ? cacheHits / filteredHistory.length : 0;

    return {
      totalQueries: filteredHistory.length,
      queriesBySource: {
        [ResponseSource.INTERNAL]:
          queriesBySource[ResponseSource.INTERNAL] || 0,
        [ResponseSource.CACHE]: queriesBySource[ResponseSource.CACHE] || 0,
        [ResponseSource.PREMIUM]: queriesBySource[ResponseSource.PREMIUM] || 0,
      },
      queriesByType,
      averageResponseTime,
      averageConfidence,
      totalCostSaved,
      cacheHitRate,
    };
  }

  generateSavingsReport(month?: string): SavingsReport {
    const now = new Date();
    const targetMonth =
      month ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [year, monthNum] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const monthlyQueries = this.queryHistory.filter(
      (q) => q.timestamp >= startDate && q.timestamp <= endDate
    );

    const queriesAnsweredInternally = monthlyQueries.filter(
      (q) =>
        q.source === ResponseSource.INTERNAL ||
        q.source === ResponseSource.CACHE
    ).length;

    const estimatedAPICostSaved = monthlyQueries
      .filter((q) => q.source !== ResponseSource.PREMIUM)
      .reduce((sum, q) => sum + q.estimatedCost, 0);

    const premiumAccountsUsage = monthlyQueries
      .filter((q) => q.source === ResponseSource.PREMIUM && q.provider)
      .reduce(
        (acc, q) => {
          if (q.provider) {
            acc[q.provider] = (acc[q.provider] || 0) + (q.tokensUsed || 0);
          }
          return acc;
        },
        {} as Record<PremiumProvider, number>
      );

    const cacheHits = monthlyQueries.filter(
      (q) => q.source === ResponseSource.CACHE
    ).length;
    const cacheHitRate =
      monthlyQueries.length > 0 ? cacheHits / monthlyQueries.length : 0;

    return {
      month: targetMonth,
      queriesAnsweredInternally,
      estimatedAPICostSaved,
      premiumAccountsUsage,
      cacheHitRate,
    };
  }

  getTopQueries(
    limit = 10,
    period?: { start: Date; end: Date }
  ): Array<{
    queryType: string;
    count: number;
    averageResponseTime: number;
    averageConfidence: number;
    preferredSource: ResponseSource;
  }> {
    let filteredHistory = this.queryHistory;

    if (period) {
      filteredHistory = filteredHistory.filter(
        (q) => q.timestamp >= period.start && q.timestamp <= period.end
      );
    }

    const queryTypeStats = filteredHistory.reduce(
      (acc, q) => {
        if (!acc[q.queryType]) {
          acc[q.queryType] = {
            count: 0,
            totalResponseTime: 0,
            totalConfidence: 0,
            sourceCount: {
              [ResponseSource.INTERNAL]: 0,
              [ResponseSource.CACHE]: 0,
              [ResponseSource.PREMIUM]: 0,
            },
          };
        }

        const stats = acc[q.queryType];
        stats.count++;
        stats.totalResponseTime += q.responseTime;
        stats.totalConfidence += q.confidence;
        stats.sourceCount[q.source]++;

        return acc;
      },
      {} as Record<string, any>
    );

    return Object.entries(queryTypeStats)
      .map(([queryType, stats]) => {
        const preferredSource = Object.entries(stats.sourceCount).reduce(
          (a, b) => (stats.sourceCount[a[0]] > stats.sourceCount[b[0]] ? a : b)
        )[0] as ResponseSource;

        return {
          queryType,
          count: stats.count,
          averageResponseTime: stats.totalResponseTime / stats.count,
          averageConfidence: stats.totalConfidence / stats.count,
          preferredSource,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getPerformanceTrends(days = 30): Array<{
    date: string;
    totalQueries: number;
    averageResponseTime: number;
    cacheHitRate: number;
    internalSuccessRate: number;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends: Record<string, any> = {};

    // Inicializar todos os dias
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = d.toISOString().split('T')[0];
      trends[dateKey] = {
        date: dateKey,
        totalQueries: 0,
        totalResponseTime: 0,
        cacheHits: 0,
        internalSuccesses: 0,
      };
    }

    // Agregar dados
    this.queryHistory
      .filter((q) => q.timestamp >= startDate && q.timestamp <= endDate)
      .forEach((q) => {
        const dateKey = q.timestamp.toISOString().split('T')[0];
        if (trends[dateKey]) {
          trends[dateKey].totalQueries++;
          trends[dateKey].totalResponseTime += q.responseTime;

          if (q.source === ResponseSource.CACHE) {
            trends[dateKey].cacheHits++;
          }

          if (q.source === ResponseSource.INTERNAL && q.confidence > 0.7) {
            trends[dateKey].internalSuccesses++;
          }
        }
      });

    // Calcular métricas finais
    return Object.values(trends).map((day: any) => ({
      date: day.date,
      totalQueries: day.totalQueries,
      averageResponseTime:
        day.totalQueries > 0 ? day.totalResponseTime / day.totalQueries : 0,
      cacheHitRate: day.totalQueries > 0 ? day.cacheHits / day.totalQueries : 0,
      internalSuccessRate:
        day.totalQueries > 0 ? day.internalSuccesses / day.totalQueries : 0,
    }));
  }

  getUserAnalytics(
    userId: string,
    period?: { start: Date; end: Date }
  ): {
    totalQueries: number;
    favoriteQueryTypes: string[];
    averageConfidence: number;
    preferredSources: ResponseSource[];
    costSaved: number;
  } {
    let userQueries = this.queryHistory.filter((q) => q.userId === userId);

    if (period) {
      userQueries = userQueries.filter(
        (q) => q.timestamp >= period.start && q.timestamp <= period.end
      );
    }

    if (userQueries.length === 0) {
      return {
        totalQueries: 0,
        favoriteQueryTypes: [],
        averageConfidence: 0,
        preferredSources: [],
        costSaved: 0,
      };
    }

    // Tipos de consulta mais frequentes
    const queryTypeCounts = userQueries.reduce(
      (acc, q) => {
        acc[q.queryType] = (acc[q.queryType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const favoriteQueryTypes = Object.entries(queryTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    // Fontes preferidas
    const sourceCounts = userQueries.reduce(
      (acc, q) => {
        acc[q.source] = (acc[q.source] || 0) + 1;
        return acc;
      },
      {} as Record<ResponseSource, number>
    );

    const preferredSources = Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([source]) => source as ResponseSource);

    const averageConfidence =
      userQueries.reduce((sum, q) => sum + q.confidence, 0) /
      userQueries.length;

    const costSaved = userQueries
      .filter((q) => q.source !== ResponseSource.PREMIUM)
      .reduce((sum, q) => sum + q.estimatedCost, 0);

    return {
      totalQueries: userQueries.length,
      favoriteQueryTypes,
      averageConfidence,
      preferredSources,
      costSaved,
    };
  }

  private estimateQueryCost(query: AIQuery): number {
    // Estimativa baseada no tamanho da consulta
    const baseTokens = Math.ceil(query.text.length / 4);
    const costPerToken = 0.0001; // R$ 0,0001 por token

    // Multiplicador baseado no tipo de consulta
    const typeMultiplier = {
      general_question: 1.0,
      protocol_suggestion: 1.5,
      diagnosis_help: 2.0,
      exercise_recommendation: 1.2,
      case_analysis: 2.5,
      research_query: 3.0,
      document_analysis: 1.8,
    };

    const multiplier =
      typeMultiplier[query.type as keyof typeof typeMultiplier] || 1.0;
    return baseTokens * costPerToken * multiplier;
  }

  private calculateActualCost(response: AIResponse): number {
    if (!response.tokensUsed) return 0;

    // Custo real baseado nos tokens usados
    const costPerToken = 0.0001;
    return response.tokensUsed * costPerToken;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('ai_economica_analytics');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.queryHistory) {
          this.queryHistory = data.queryHistory.map((q: any) => ({
            ...q,
            timestamp: new Date(q.timestamp),
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar analytics do storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        queryHistory: this.queryHistory,
        lastSaved: new Date().toISOString(),
      };

      localStorage.setItem('ai_economica_analytics', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar analytics no storage:', error);
    }
  }

  private startPeriodicSave(): void {
    // Salvar a cada 5 minutos
    setInterval(
      () => {
        this.saveToStorage();
      },
      5 * 60 * 1000
    );

    // Salvar quando a página for fechada
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }

  // Métodos para limpeza e manutenção
  clearOldData(daysToKeep = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialCount = this.queryHistory.length;
    this.queryHistory = this.queryHistory.filter(
      (q) => q.timestamp >= cutoffDate
    );
    const removedCount = initialCount - this.queryHistory.length;

    if (removedCount > 0) {
      this.saveToStorage();
      aiEconomicaLogger.log(
        'INFO',
        'ANALYTICS_CLEANUP',
        `Removed ${removedCount} old analytics records`
      );
    }

    return removedCount;
  }

  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(
        {
          queryHistory: this.queryHistory,
          exportDate: new Date().toISOString(),
          totalRecords: this.queryHistory.length,
        },
        null,
        2
      );
    }

    // CSV format
    const headers = [
      'queryId',
      'timestamp',
      'queryType',
      'source',
      'provider',
      'responseTime',
      'confidence',
      'tokensUsed',
      'estimatedCost',
      'actualCost',
      'userId',
      'tenantId',
    ].join(',');

    const rows = this.queryHistory.map((q) =>
      [
        q.queryId,
        q.timestamp.toISOString(),
        q.queryType,
        q.source,
        q.provider || '',
        q.responseTime,
        q.confidence,
        q.tokensUsed || '',
        q.estimatedCost,
        q.actualCost,
        q.userId || '',
        q.tenantId || '',
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }
}
