// services/ai-economica/analyticsService.ts
// Sistema completo de analytics para IA econômica

import { aiLogger } from './logger'
import { monitoringService } from './monitoringService'
import { feedbackService } from './feedbackService'
import { 
  PremiumProvider, 
  ResponseSource, 
  QueryType,
  SavingsReport 
} from '../../types/ai-economica.types'

interface AnalyticsMetrics {
  timestamp: string
  queries: {
    total: number
    bySource: Record<ResponseSource, number>
    byType: Record<QueryType, number>
    byHour: Record<string, number>
  }
  performance: {
    avgResponseTime: number
    cacheHitRate: number
    internalSuccessRate: number
    errorRate: number
  }
  economy: {
    totalSavings: number
    costPerQuery: number
    premiumUsage: Record<PremiumProvider, number>
    estimatedAPICost: number
  }
  quality: {
    avgRating: number
    feedbackCount: number
    issueCount: number
    improvementSuggestions: number
  }
}

interface TrendData {
  period: string
  value: number
  change: number // % change from previous period
  trend: 'up' | 'down' | 'stable'
}

interface EconomyInsight {
  type: 'savings' | 'efficiency' | 'usage' | 'optimization'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  recommendation: string
  data: any
}

export class AnalyticsService {
  private metricsHistory: AnalyticsMetrics[] = []
  private insights: EconomyInsight[] = []
  private isCollecting = false
  private collectionInterval?: NodeJS.Timeout

  constructor() {
    this.startMetricsCollection()
    aiLogger.info('ANALYTICS_SERVICE', 'Serviço de analytics inicializado')
  }

  // Iniciar coleta de métricas
  startMetricsCollection(): void {
    if (this.isCollecting) return

    this.isCollecting = true
    
    // Coletar métricas a cada 5 minutos
    this.collectionInterval = setInterval(() => {
      this.collectMetrics()
    }, 5 * 60 * 1000)

    // Coletar métricas iniciais
    setTimeout(() => {
      this.collectMetrics()
    }, 1000)

    aiLogger.info('ANALYTICS_SERVICE', 'Coleta de métricas iniciada')
  }

  // Parar coleta de métricas
  stopMetricsCollection(): void {
    if (!this.isCollecting) return

    this.isCollecting = false
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval)
      this.collectionInterval = undefined
    }

    aiLogger.info('ANALYTICS_SERVICE', 'Coleta de métricas parada')
  }

  // Coletar métricas atuais
  private async collectMetrics(): Promise<void> {
    try {
      const now = new Date()
      const timestamp = now.toISOString()

      // Obter logs das últimas 24 horas
      const logs = aiLogger.getLogs({
        startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      })

      const queryLogs = logs.filter(log => log.category === 'AI_SERVICE')
      
      // Métricas de consultas
      const queries = this.calculateQueryMetrics(queryLogs, now)
      
      // Métricas de performance
      const performance = this.calculatePerformanceMetrics(queryLogs)
      
      // Métricas de economia
      const economy = await this.calculateEconomyMetrics(queryLogs)
      
      // Métricas de qualidade
      const quality = await this.calculateQualityMetrics()

      const metrics: AnalyticsMetrics = {
        timestamp,
        queries,
        performance,
        economy,
        quality
      }

      // Adicionar às métricas históricas
      this.metricsHistory.push(metrics)
      
      // Manter apenas últimas 24 horas de métricas (288 pontos de 5 min)
      if (this.metricsHistory.length > 288) {
        this.metricsHistory = this.metricsHistory.slice(-288)
      }

      // Gerar insights
      await this.generateInsights(metrics)

      aiLogger.debug('ANALYTICS_SERVICE', 'Métricas coletadas', {
        totalQueries: queries.total,
        cacheHitRate: performance.cacheHitRate,
        totalSavings: economy.totalSavings
      })

    } catch (error) {
      aiLogger.error('ANALYTICS_SERVICE', 'Erro ao coletar métricas', { error })
    }
  }

  // Calcular métricas de consultas
  private calculateQueryMetrics(logs: any[], now: Date): AnalyticsMetrics['queries'] {
    const queryLogs = logs.filter(log => 
      log.message.includes('processada com sucesso') || 
      log.message.includes('Erro no processamento')
    )

    const total = queryLogs.length

    // Por fonte
    const bySource: Record<ResponseSource, number> = {
      internal: 0,
      cache: 0,
      premium: 0
    }

    // Por tipo
    const byType: Record<QueryType, number> = {} as Record<QueryType, number>
    Object.values(QueryType).forEach(type => {
      byType[type] = 0
    })

    // Por hora (últimas 24 horas)
    const byHour: Record<string, number> = {}
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000).getHours()
      byHour[hour.toString().padStart(2, '0')] = 0
    }

    queryLogs.forEach(log => {
      // Contar por fonte
      if (log.data?.source) {
        bySource[log.data.source as ResponseSource]++
      }

      // Contar por tipo
      if (log.data?.type) {
        byType[log.data.type as QueryType]++
      }

      // Contar por hora
      const logHour = new Date(log.timestamp).getHours()
      const hourKey = logHour.toString().padStart(2, '0')
      if (byHour[hourKey] !== undefined) {
        byHour[hourKey]++
      }
    })

    return {
      total,
      bySource,
      byType,
      byHour
    }
  }

  // Calcular métricas de performance
  private calculatePerformanceMetrics(logs: any[]): AnalyticsMetrics['performance'] {
    const queryLogs = logs.filter(log => log.message.includes('processada com sucesso'))
    const errorLogs = logs.filter(log => log.level >= 3) // ERROR level

    const totalQueries = queryLogs.length
    const totalErrors = errorLogs.length

    // Tempo médio de resposta
    const responseTimes = queryLogs
      .filter(log => log.data?.responseTime)
      .map(log => log.data.responseTime)
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    // Taxa de cache hit
    const cacheHits = queryLogs.filter(log => log.data?.source === 'cache').length
    const cacheHitRate = totalQueries > 0 ? cacheHits / totalQueries : 0

    // Taxa de sucesso da base interna
    const internalQueries = queryLogs.filter(log => log.data?.source === 'internal').length
    const internalSuccessRate = totalQueries > 0 ? internalQueries / totalQueries : 0

    // Taxa de erro
    const errorRate = (totalQueries + totalErrors) > 0 
      ? totalErrors / (totalQueries + totalErrors) 
      : 0

    return {
      avgResponseTime: Math.round(avgResponseTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      internalSuccessRate: Math.round(internalSuccessRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100
    }
  }

  // Calcular métricas de economia
  private async calculateEconomyMetrics(logs: any[]): Promise<AnalyticsMetrics['economy']> {
    const queryLogs = logs.filter(log => log.message.includes('processada com sucesso'))
    
    // Custo estimado por consulta em API paga
    const costPerAPIQuery = 0.002 // $0.002
    
    // Consultas que não usaram premium (economia)
    const nonPremiumQueries = queryLogs.filter(log => log.data?.source !== 'premium').length
    const premiumQueries = queryLogs.filter(log => log.data?.source === 'premium').length
    
    const totalSavings = nonPremiumQueries * costPerAPIQuery
    const estimatedAPICost = queryLogs.length * costPerAPIQuery
    const costPerQuery = queryLogs.length > 0 ? totalSavings / queryLogs.length : 0

    // Uso por provedor premium
    const premiumUsage: Record<PremiumProvider, number> = {} as Record<PremiumProvider, number>
    Object.values(PremiumProvider).forEach(provider => {
      premiumUsage[provider] = queryLogs.filter(log => 
        log.data?.provider === provider
      ).length
    })

    return {
      totalSavings: Math.round(totalSavings * 100) / 100,
      costPerQuery: Math.round(costPerQuery * 1000) / 1000,
      premiumUsage,
      estimatedAPICost: Math.round(estimatedAPICost * 100) / 100
    }
  }

  // Calcular métricas de qualidade
  private async calculateQualityMetrics(): Promise<AnalyticsMetrics['quality']> {
    try {
      const qualityReport = await feedbackService.generateQualityReport()
      
      return {
        avgRating: qualityReport.summary.averageRating,
        feedbackCount: qualityReport.summary.totalFeedbacks,
        issueCount: qualityReport.summary.criticalIssues,
        improvementSuggestions: qualityReport.summary.pendingSuggestions
      }
    } catch (error) {
      aiLogger.error('ANALYTICS_SERVICE', 'Erro ao calcular métricas de qualidade', { error })
      return {
        avgRating: 0,
        feedbackCount: 0,
        issueCount: 0,
        improvementSuggestions: 0
      }
    }
  }

  // Gerar insights automáticos
  private async generateInsights(currentMetrics: AnalyticsMetrics): Promise<void> {
    try {
      const newInsights: EconomyInsight[] = []

      // Insight de economia
      if (currentMetrics.economy.totalSavings > 1) {
        newInsights.push({
          type: 'savings',
          title: 'Economia Significativa Alcançada',
          description: `Economizou $${currentMetrics.economy.totalSavings.toFixed(2)} evitando APIs pagas`,
          impact: 'high',
          recommendation: 'Continue priorizando a base interna e cache para maximizar economia',
          data: {
            savings: currentMetrics.economy.totalSavings,
            percentage: Math.round((currentMetrics.economy.totalSavings / currentMetrics.economy.estimatedAPICost) * 100)
          }
        })
      }

      // Insight de eficiência de cache
      if (currentMetrics.performance.cacheHitRate > 0.6) {
        newInsights.push({
          type: 'efficiency',
          title: 'Alta Eficiência do Cache',
          description: `Taxa de cache hit de ${(currentMetrics.performance.cacheHitRate * 100).toFixed(1)}%`,
          impact: 'medium',
          recommendation: 'Cache funcionando bem, considere expandir estratégias de pré-cache',
          data: {
            hitRate: currentMetrics.performance.cacheHitRate,
            trend: this.calculateTrend('cacheHitRate')
          }
        })
      } else if (currentMetrics.performance.cacheHitRate < 0.3) {
        newInsights.push({
          type: 'optimization',
          title: 'Cache com Baixa Eficiência',
          description: `Taxa de cache hit baixa: ${(currentMetrics.performance.cacheHitRate * 100).toFixed(1)}%`,
          impact: 'medium',
          recommendation: 'Revisar estratégias de cache e implementar mais pré-cache',
          data: {
            hitRate: currentMetrics.performance.cacheHitRate,
            target: 0.6
          }
        })
      }

      // Insight de uso da base interna
      if (currentMetrics.performance.internalSuccessRate > 0.7) {
        newInsights.push({
          type: 'efficiency',
          title: 'Base Interna Altamente Eficaz',
          description: `${(currentMetrics.performance.internalSuccessRate * 100).toFixed(1)}% das consultas resolvidas internamente`,
          impact: 'high',
          recommendation: 'Excelente! Continue incentivando contribuições para a base de conhecimento',
          data: {
            successRate: currentMetrics.performance.internalSuccessRate,
            queries: currentMetrics.queries.bySource.internal
          }
        })
      }

      // Insight de uso premium
      const totalPremiumQueries = Object.values(currentMetrics.economy.premiumUsage).reduce((sum, count) => sum + count, 0)
      if (totalPremiumQueries > currentMetrics.queries.total * 0.5) {
        newInsights.push({
          type: 'usage',
          title: 'Alto Uso de Contas Premium',
          description: `${totalPremiumQueries} consultas premium (${((totalPremiumQueries / currentMetrics.queries.total) * 100).toFixed(1)}%)`,
          impact: 'medium',
          recommendation: 'Considere expandir a base interna para reduzir dependência de contas premium',
          data: {
            premiumQueries: totalPremiumQueries,
            percentage: (totalPremiumQueries / currentMetrics.queries.total) * 100,
            byProvider: currentMetrics.economy.premiumUsage
          }
        })
      }

      // Insight de qualidade
      if (currentMetrics.quality.issueCount > 5) {
        newInsights.push({
          type: 'optimization',
          title: 'Problemas de Qualidade Detectados',
          description: `${currentMetrics.quality.issueCount} problemas críticos pendentes`,
          impact: 'high',
          recommendation: 'Priorize a resolução dos problemas de qualidade na base de conhecimento',
          data: {
            issueCount: currentMetrics.quality.issueCount,
            avgRating: currentMetrics.quality.avgRating
          }
        })
      }

      // Atualizar insights (manter apenas os 10 mais recentes)
      this.insights = [...newInsights, ...this.insights.slice(0, 7)]

      aiLogger.debug('ANALYTICS_SERVICE', 'Insights gerados', {
        newInsights: newInsights.length,
        totalInsights: this.insights.length
      })

    } catch (error) {
      aiLogger.error('ANALYTICS_SERVICE', 'Erro ao gerar insights', { error })
    }
  }

  // Calcular tendência
  private calculateTrend(metric: string): 'up' | 'down' | 'stable' {
    if (this.metricsHistory.length < 2) return 'stable'

    const current = this.metricsHistory[this.metricsHistory.length - 1]
    const previous = this.metricsHistory[this.metricsHistory.length - 2]

    let currentValue = 0
    let previousValue = 0

    // Extrair valores baseado na métrica
    switch (metric) {
      case 'cacheHitRate':
        currentValue = current.performance.cacheHitRate
        previousValue = previous.performance.cacheHitRate
        break
      case 'totalSavings':
        currentValue = current.economy.totalSavings
        previousValue = previous.economy.totalSavings
        break
      case 'avgResponseTime':
        currentValue = current.performance.avgResponseTime
        previousValue = previous.performance.avgResponseTime
        break
      default:
        return 'stable'
    }

    const change = ((currentValue - previousValue) / previousValue) * 100

    if (Math.abs(change) < 5) return 'stable'
    return change > 0 ? 'up' : 'down'
  }

  // Métodos públicos para obter dados

  // Obter métricas atuais
  getCurrentMetrics(): AnalyticsMetrics | null {
    return this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1] 
      : null
  }

  // Obter histórico de métricas
  getMetricsHistory(hours: number = 24): AnalyticsMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.metricsHistory.filter(m => 
      new Date(m.timestamp) >= cutoff
    )
  }

  // Obter dados de tendência
  getTrendData(metric: string, periods: number = 12): TrendData[] {
    const recentMetrics = this.metricsHistory.slice(-periods)
    const trendData: TrendData[] = []

    recentMetrics.forEach((metrics, index) => {
      if (index === 0) return // Skip first item (no previous to compare)

      const previous = recentMetrics[index - 1]
      let currentValue = 0
      let previousValue = 0

      // Extrair valores baseado na métrica
      switch (metric) {
        case 'totalQueries':
          currentValue = metrics.queries.total
          previousValue = previous.queries.total
          break
        case 'cacheHitRate':
          currentValue = metrics.performance.cacheHitRate
          previousValue = previous.performance.cacheHitRate
          break
        case 'totalSavings':
          currentValue = metrics.economy.totalSavings
          previousValue = previous.economy.totalSavings
          break
        case 'avgResponseTime':
          currentValue = metrics.performance.avgResponseTime
          previousValue = previous.performance.avgResponseTime
          break
        default:
          return
      }

      const change = previousValue !== 0 
        ? ((currentValue - previousValue) / previousValue) * 100 
        : 0

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (Math.abs(change) >= 5) {
        trend = change > 0 ? 'up' : 'down'
      }

      trendData.push({
        period: metrics.timestamp,
        value: currentValue,
        change: Math.round(change * 100) / 100,
        trend
      })
    })

    return trendData
  }

  // Obter insights atuais
  getCurrentInsights(): EconomyInsight[] {
    return [...this.insights]
  }

  // Gerar relatório de economia
  async generateEconomyReport(period: 'day' | 'week' | 'month' = 'day'): Promise<{
    period: string
    summary: {
      totalQueries: number
      economyRate: number
      totalSavings: number
      avgResponseTime: number
      cacheEfficiency: number
    }
    breakdown: {
      internal: { queries: number; percentage: number; savings: number }
      cache: { queries: number; percentage: number; savings: number }
      premium: { queries: number; percentage: number; cost: number }
    }
    trends: {
      queriesGrowth: number
      savingsGrowth: number
      efficiencyChange: number
    }
    recommendations: string[]
  }> {
    const hours = period === 'day' ? 24 : period === 'week' ? 168 : 720
    const metrics = this.getMetricsHistory(hours)

    if (metrics.length === 0) {
      throw new Error('Dados insuficientes para gerar relatório')
    }

    const latest = metrics[metrics.length - 1]
    const costPerQuery = 0.002

    // Calcular totais
    const totalQueries = metrics.reduce((sum, m) => sum + m.queries.total, 0)
    const totalInternal = metrics.reduce((sum, m) => sum + m.queries.bySource.internal, 0)
    const totalCache = metrics.reduce((sum, m) => sum + m.queries.bySource.cache, 0)
    const totalPremium = metrics.reduce((sum, m) => sum + m.queries.bySource.premium, 0)

    const economyQueries = totalInternal + totalCache
    const economyRate = totalQueries > 0 ? economyQueries / totalQueries : 0
    const totalSavings = economyQueries * costPerQuery

    // Calcular médias
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.performance.avgResponseTime, 0) / metrics.length
    const avgCacheHitRate = metrics.reduce((sum, m) => sum + m.performance.cacheHitRate, 0) / metrics.length

    // Calcular tendências (comparar primeira e última metade do período)
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2))
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2))

    const firstHalfQueries = firstHalf.reduce((sum, m) => sum + m.queries.total, 0)
    const secondHalfQueries = secondHalf.reduce((sum, m) => sum + m.queries.total, 0)
    const queriesGrowth = firstHalfQueries > 0 
      ? ((secondHalfQueries - firstHalfQueries) / firstHalfQueries) * 100 
      : 0

    const firstHalfSavings = firstHalf.reduce((sum, m) => sum + m.economy.totalSavings, 0)
    const secondHalfSavings = secondHalf.reduce((sum, m) => sum + m.economy.totalSavings, 0)
    const savingsGrowth = firstHalfSavings > 0 
      ? ((secondHalfSavings - firstHalfSavings) / firstHalfSavings) * 100 
      : 0

    const firstHalfEfficiency = firstHalf.reduce((sum, m) => sum + m.performance.cacheHitRate, 0) / firstHalf.length
    const secondHalfEfficiency = secondHalf.reduce((sum, m) => sum + m.performance.cacheHitRate, 0) / secondHalf.length
    const efficiencyChange = firstHalfEfficiency > 0 
      ? ((secondHalfEfficiency - firstHalfEfficiency) / firstHalfEfficiency) * 100 
      : 0

    // Gerar recomendações
    const recommendations: string[] = []
    
    if (economyRate < 0.6) {
      recommendations.push('Expandir base de conhecimento interna para aumentar taxa de economia')
    }
    
    if (avgCacheHitRate < 0.4) {
      recommendations.push('Otimizar estratégias de cache para melhorar eficiência')
    }
    
    if (totalPremium > totalQueries * 0.4) {
      recommendations.push('Reduzir dependência de contas premium através de mais conteúdo interno')
    }
    
    if (avgResponseTime > 3000) {
      recommendations.push('Otimizar performance do sistema para reduzir tempo de resposta')
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistema funcionando de forma otimizada, continue monitorando métricas')
    }

    return {
      period: `${period} (${new Date(metrics[0].timestamp).toLocaleDateString()} - ${new Date(latest.timestamp).toLocaleDateString()})`,
      summary: {
        totalQueries,
        economyRate: Math.round(economyRate * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        cacheEfficiency: Math.round(avgCacheHitRate * 100) / 100
      },
      breakdown: {
        internal: {
          queries: totalInternal,
          percentage: Math.round((totalInternal / totalQueries) * 100),
          savings: Math.round(totalInternal * costPerQuery * 100) / 100
        },
        cache: {
          queries: totalCache,
          percentage: Math.round((totalCache / totalQueries) * 100),
          savings: Math.round(totalCache * costPerQuery * 100) / 100
        },
        premium: {
          queries: totalPremium,
          percentage: Math.round((totalPremium / totalQueries) * 100),
          cost: Math.round(totalPremium * 0.02 * 100) / 100 // Custo estimado das contas premium
        }
      },
      trends: {
        queriesGrowth: Math.round(queriesGrowth * 100) / 100,
        savingsGrowth: Math.round(savingsGrowth * 100) / 100,
        efficiencyChange: Math.round(efficiencyChange * 100) / 100
      },
      recommendations
    }
  }

  // Obter estatísticas do serviço
  getServiceStats(): {
    isCollecting: boolean
    metricsCount: number
    insightsCount: number
    lastCollection: string | null
    collectionInterval: number
  } {
    return {
      isCollecting: this.isCollecting,
      metricsCount: this.metricsHistory.length,
      insightsCount: this.insights.length,
      lastCollection: this.metricsHistory.length > 0 
        ? this.metricsHistory[this.metricsHistory.length - 1].timestamp 
        : null,
      collectionInterval: 5 * 60 * 1000 // 5 minutos
    }
  }
}

// Instância singleton
export const analyticsService = new AnalyticsService()

export default analyticsService