// components/ai-economica/AnalyticsDashboard.tsx
// Dashboard completo de analytics para IA econômica

import React, { useState, useEffect } from 'react'
import { analyticsService } from '../../services/ai-economica/analyticsService'
import { PremiumProvider, ResponseSource, QueryType } from '../../types/ai-economica.types'

interface DashboardData {
  currentMetrics: any
  trends: any[]
  insights: any[]
  economyReport: any
}

interface MetricCard {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'stable'
  icon: string
  color: string
}

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 segundos
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadDashboardData()
    
    const interval = setInterval(() => {
      loadDashboardData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [selectedPeriod, refreshInterval])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const [currentMetrics, economyReport, insights] = await Promise.all([
        Promise.resolve(analyticsService.getCurrentMetrics()),
        analyticsService.generateEconomyReport(selectedPeriod),
        Promise.resolve(analyticsService.getCurrentInsights())
      ])

      const trends = analyticsService.getTrendData('totalQueries', 12)

      setData({
        currentMetrics,
        trends,
        insights,
        economyReport
      })
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatNumber = (value: number) => value.toLocaleString()

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      case 'stable': return '➡️'
      default: return '➡️'
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodWhenUp: boolean = true) => {
    if (trend === 'stable') return 'text-gray-600'
    const isPositive = (trend === 'up' && isGoodWhenUp) || (trend === 'down' && !isGoodWhenUp)
    return isPositive ? 'text-green-600' : 'text-red-600'
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'savings': return '💰'
      case 'efficiency': return '⚡'
      case 'usage': return '📊'
      case 'optimization': return '🔧'
      default: return '💡'
    }
  }

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando analytics...</p>
        </div>
      </div>
    )
  }

  if (!data || !data.currentMetrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Dados insuficientes para exibir analytics.</p>
        <p className="text-sm text-gray-500 mt-2">Execute algumas consultas para ver as métricas.</p>
      </div>
    )
  }

  const { currentMetrics, economyReport, insights } = data

  // Preparar cards de métricas principais
  const metricCards: MetricCard[] = [
    {
      title: 'Total de Consultas',
      value: formatNumber(economyReport.summary.totalQueries),
      change: economyReport.trends.queriesGrowth,
      trend: economyReport.trends.queriesGrowth > 5 ? 'up' : economyReport.trends.queriesGrowth < -5 ? 'down' : 'stable',
      icon: '📊',
      color: 'bg-blue-500'
    },
    {
      title: 'Taxa de Economia',
      value: formatPercentage(economyReport.summary.economyRate * 100),
      change: economyReport.trends.efficiencyChange,
      trend: economyReport.trends.efficiencyChange > 5 ? 'up' : economyReport.trends.efficiencyChange < -5 ? 'down' : 'stable',
      icon: '💰',
      color: 'bg-green-500'
    },
    {
      title: 'Economia Total',
      value: formatCurrency(economyReport.summary.totalSavings),
      change: economyReport.trends.savingsGrowth,
      trend: economyReport.trends.savingsGrowth > 5 ? 'up' : economyReport.trends.savingsGrowth < -5 ? 'down' : 'stable',
      icon: '🎯',
      color: 'bg-purple-500'
    },
    {
      title: 'Tempo Médio',
      value: `${economyReport.summary.avgResponseTime}ms`,
      trend: 'stable',
      icon: '⚡',
      color: 'bg-orange-500'
    },
    {
      title: 'Cache Hit Rate',
      value: formatPercentage(economyReport.summary.cacheEfficiency * 100),
      trend: 'stable',
      icon: '🚀',
      color: 'bg-indigo-500'
    }
  ]

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics de IA Econômica</h1>
            <p className="text-gray-600 mt-1">
              Monitoramento em tempo real da economia e performance
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Seletor de Período */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="day">Último Dia</option>
              <option value="week">Última Semana</option>
              <option value="month">Último Mês</option>
            </select>
            
            {/* Status de Atualização */}
            <div className="text-sm text-gray-500">
              Atualizado: {lastUpdate.toLocaleTimeString()}
            </div>
            
            {/* Botão de Refresh */}
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {metricCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.color} text-white text-2xl mr-4`}>
                {card.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                {card.change !== undefined && (
                  <div className={`flex items-center text-sm ${getTrendColor(card.trend!)}`}>
                    <span className="mr-1">{getTrendIcon(card.trend!)}</span>
                    <span>{card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos e Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Breakdown por Fonte */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultas por Fonte</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                <span className="font-medium">Base Interna</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatNumber(economyReport.breakdown.internal.queries)}</div>
                <div className="text-sm text-gray-600">{economyReport.breakdown.internal.percentage}%</div>
                <div className="text-sm text-green-600">+{formatCurrency(economyReport.breakdown.internal.savings)}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                <span className="font-medium">Cache</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatNumber(economyReport.breakdown.cache.queries)}</div>
                <div className="text-sm text-gray-600">{economyReport.breakdown.cache.percentage}%</div>
                <div className="text-sm text-green-600">+{formatCurrency(economyReport.breakdown.cache.savings)}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-500 rounded mr-3"></div>
                <span className="font-medium">Premium</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatNumber(economyReport.breakdown.premium.queries)}</div>
                <div className="text-sm text-gray-600">{economyReport.breakdown.premium.percentage}%</div>
                <div className="text-sm text-orange-600">-{formatCurrency(economyReport.breakdown.premium.cost)}</div>
              </div>
            </div>
          </div>
          
          {/* Barra de Progresso Visual */}
          <div className="mt-6">
            <div className="flex h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="bg-green-500" 
                style={{ width: `${economyReport.breakdown.internal.percentage}%` }}
              ></div>
              <div 
                className="bg-blue-500" 
                style={{ width: `${economyReport.breakdown.cache.percentage}%` }}
              ></div>
              <div 
                className="bg-purple-500" 
                style={{ width: `${economyReport.breakdown.premium.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Uso de Provedores Premium */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso de Provedores Premium</h3>
          <div className="space-y-3">
            {Object.entries(currentMetrics.economy.premiumUsage).map(([provider, usage]) => {
              const percentage = economyReport.summary.totalQueries > 0 
                ? ((usage as number) / economyReport.summary.totalQueries) * 100 
                : 0
              
              const providerNames = {
                [PremiumProvider.CHATGPT_PLUS]: 'ChatGPT Plus',
                [PremiumProvider.GEMINI_PRO]: 'Gemini Pro',
                [PremiumProvider.CLAUDE_PRO]: 'Claude Pro',
                [PremiumProvider.PERPLEXITY_PRO]: 'Perplexity Pro',
                [PremiumProvider.MARS_AI_PRO]: 'Mars AI Pro'
              }
              
              return (
                <div key={provider} className="flex items-center justify-between">
                  <span className="font-medium">{providerNames[provider as PremiumProvider]}</span>
                  <div className="text-right">
                    <div className="font-bold">{usage as number}</div>
                    <div className="text-sm text-gray-600">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Insights e Recomendações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Insights Automáticos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights Automáticos</h3>
          <div className="space-y-4">
            {insights.length > 0 ? (
              insights.slice(0, 5).map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border ${getInsightColor(insight.impact)}`}>
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">{getInsightIcon(insight.type)}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      <p className="text-sm text-blue-600 mt-2 font-medium">{insight.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum insight disponível no momento</p>
            )}
          </div>
        </div>

        {/* Recomendações */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendações</h3>
          <div className="space-y-3">
            {economyReport.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-600 mr-3 mt-0.5">💡</span>
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Configurações do Dashboard */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Dashboard</h3>
        <div className="flex items-center space-x-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intervalo de Atualização
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value={15000}>15 segundos</option>
              <option value={30000}>30 segundos</option>
              <option value={60000}>1 minuto</option>
              <option value={300000}>5 minutos</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard