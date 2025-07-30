// services/ai-economica/feedbackService.ts
// Sistema de feedback e melhoria contínua para base de conhecimento

import { aiLogger } from './logger'

export interface FeedbackEntry {
  id: string
  knowledgeEntryId: string
  userId: string
  tenantId: string
  type: 'helpful' | 'not_helpful' | 'incorrect' | 'outdated' | 'suggestion'
  rating: number // 1-5
  comment?: string
  suggestions?: string
  timestamp: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  metadata: {
    userRole: string
    queryContext?: string
    responseTime?: number
  }
}

export interface QualityMetrics {
  entryId: string
  totalFeedbacks: number
  averageRating: number
  helpfulCount: number
  notHelpfulCount: number
  incorrectCount: number
  outdatedCount: number
  suggestionCount: number
  confidenceScore: number
  lastUpdated: string
}

export interface ImprovementSuggestion {
  id: string
  entryId: string
  type: 'content_update' | 'add_reference' | 'fix_error' | 'add_contraindication' | 'general'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggestedBy: string
  suggestedAt: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  assignedTo?: string
  completedAt?: string
  rejectionReason?: string
}

class FeedbackService {
  private feedbacks: Map<string, FeedbackEntry> = new Map()
  private qualityMetrics: Map<string, QualityMetrics> = new Map()
  private improvementSuggestions: Map<string, ImprovementSuggestion> = new Map()

  constructor() {
    aiLogger.info('FEEDBACK_SERVICE', 'Serviço de feedback inicializado')
  }

  // Registrar feedback
  async submitFeedback(feedback: Omit<FeedbackEntry, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    try {
      const feedbackId = this.generateFeedbackId()
      const feedbackEntry: FeedbackEntry = {
        ...feedback,
        id: feedbackId,
        timestamp: new Date().toISOString(),
        resolved: false
      }

      this.feedbacks.set(feedbackId, feedbackEntry)
      
      // Atualizar métricas de qualidade
      await this.updateQualityMetrics(feedback.knowledgeEntryId)
      
      // Criar sugestão de melhoria se necessário
      if (feedback.type === 'suggestion' && feedback.suggestions) {
        await this.createImprovementSuggestion({
          entryId: feedback.knowledgeEntryId,
          type: 'general',
          priority: 'medium',
          description: feedback.suggestions,
          suggestedBy: feedback.userId
        })
      }

      // Criar sugestão crítica para conteúdo incorreto
      if (feedback.type === 'incorrect') {
        await this.createImprovementSuggestion({
          entryId: feedback.knowledgeEntryId,
          type: 'fix_error',
          priority: 'critical',
          description: `Conteúdo reportado como incorreto: ${feedback.comment || 'Sem detalhes'}`,
          suggestedBy: feedback.userId
        })
      }

      aiLogger.info('FEEDBACK_SERVICE', 'Feedback registrado', {
        feedbackId,
        entryId: feedback.knowledgeEntryId,
        type: feedback.type,
        rating: feedback.rating,
        userId: feedback.userId
      })

      return feedbackId
    } catch (error) {
      aiLogger.error('FEEDBACK_SERVICE', 'Erro ao registrar feedback', { error, feedback })
      throw error
    }
  }

  // Obter feedbacks de uma entrada
  async getFeedbacksForEntry(entryId: string): Promise<FeedbackEntry[]> {
    const entryFeedbacks = Array.from(this.feedbacks.values())
      .filter(feedback => feedback.knowledgeEntryId === entryId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return entryFeedbacks
  }

  // Obter métricas de qualidade
  async getQualityMetrics(entryId: string): Promise<QualityMetrics | null> {
    return this.qualityMetrics.get(entryId) || null
  }

  // Obter todas as métricas de qualidade
  async getAllQualityMetrics(tenantId?: string): Promise<QualityMetrics[]> {
    const metrics = Array.from(this.qualityMetrics.values())
    
    if (tenantId) {
      // Filtrar por tenant se necessário
      const filteredMetrics = metrics.filter(metric => {
        const feedbacks = Array.from(this.feedbacks.values())
          .filter(f => f.knowledgeEntryId === metric.entryId)
        return feedbacks.some(f => f.tenantId === tenantId)
      })
      return filteredMetrics
    }

    return metrics
  }

  // Criar sugestão de melhoria
  async createImprovementSuggestion(
    suggestion: Omit<ImprovementSuggestion, 'id' | 'suggestedAt' | 'status'>
  ): Promise<string> {
    try {
      const suggestionId = this.generateSuggestionId()
      const improvementSuggestion: ImprovementSuggestion = {
        ...suggestion,
        id: suggestionId,
        suggestedAt: new Date().toISOString(),
        status: 'pending'
      }

      this.improvementSuggestions.set(suggestionId, improvementSuggestion)

      aiLogger.info('FEEDBACK_SERVICE', 'Sugestão de melhoria criada', {
        suggestionId,
        entryId: suggestion.entryId,
        type: suggestion.type,
        priority: suggestion.priority
      })

      return suggestionId
    } catch (error) {
      aiLogger.error('FEEDBACK_SERVICE', 'Erro ao criar sugestão de melhoria', { error, suggestion })
      throw error
    }
  }

  // Obter sugestões de melhoria
  async getImprovementSuggestions(filters?: {
    entryId?: string
    status?: ImprovementSuggestion['status']
    priority?: ImprovementSuggestion['priority']
    assignedTo?: string
  }): Promise<ImprovementSuggestion[]> {
    let suggestions = Array.from(this.improvementSuggestions.values())

    if (filters) {
      if (filters.entryId) {
        suggestions = suggestions.filter(s => s.entryId === filters.entryId)
      }
      if (filters.status) {
        suggestions = suggestions.filter(s => s.status === filters.status)
      }
      if (filters.priority) {
        suggestions = suggestions.filter(s => s.priority === filters.priority)
      }
      if (filters.assignedTo) {
        suggestions = suggestions.filter(s => s.assignedTo === filters.assignedTo)
      }
    }

    return suggestions.sort((a, b) => {
      // Ordenar por prioridade e depois por data
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      
      return new Date(b.suggestedAt).getTime() - new Date(a.suggestedAt).getTime()
    })
  }

  // Atualizar status de sugestão
  async updateSuggestionStatus(
    suggestionId: string,
    status: ImprovementSuggestion['status'],
    assignedTo?: string,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const suggestion = this.improvementSuggestions.get(suggestionId)
      if (!suggestion) {
        throw new Error(`Sugestão não encontrada: ${suggestionId}`)
      }

      suggestion.status = status
      
      if (assignedTo) {
        suggestion.assignedTo = assignedTo
      }
      
      if (status === 'completed') {
        suggestion.completedAt = new Date().toISOString()
      }
      
      if (status === 'rejected' && rejectionReason) {
        suggestion.rejectionReason = rejectionReason
      }

      this.improvementSuggestions.set(suggestionId, suggestion)

      aiLogger.info('FEEDBACK_SERVICE', 'Status de sugestão atualizado', {
        suggestionId,
        status,
        assignedTo,
        rejectionReason
      })
    } catch (error) {
      aiLogger.error('FEEDBACK_SERVICE', 'Erro ao atualizar status de sugestão', { 
        error, 
        suggestionId, 
        status 
      })
      throw error
    }
  }

  // Resolver feedback
  async resolveFeedback(feedbackId: string, resolvedBy: string): Promise<void> {
    try {
      const feedback = this.feedbacks.get(feedbackId)
      if (!feedback) {
        throw new Error(`Feedback não encontrado: ${feedbackId}`)
      }

      feedback.resolved = true
      feedback.resolvedBy = resolvedBy
      feedback.resolvedAt = new Date().toISOString()

      this.feedbacks.set(feedbackId, feedback)

      aiLogger.info('FEEDBACK_SERVICE', 'Feedback resolvido', {
        feedbackId,
        resolvedBy,
        entryId: feedback.knowledgeEntryId
      })
    } catch (error) {
      aiLogger.error('FEEDBACK_SERVICE', 'Erro ao resolver feedback', { error, feedbackId })
      throw error
    }
  }

  // Gerar relatório de qualidade
  async generateQualityReport(tenantId?: string): Promise<{
    summary: {
      totalEntries: number
      averageRating: number
      totalFeedbacks: number
      pendingSuggestions: number
      criticalIssues: number
    }
    topRatedEntries: Array<{ entryId: string; rating: number; feedbackCount: number }>
    lowRatedEntries: Array<{ entryId: string; rating: number; feedbackCount: number }>
    recentFeedbacks: FeedbackEntry[]
    urgentSuggestions: ImprovementSuggestion[]
  }> {
    try {
      const allMetrics = await this.getAllQualityMetrics(tenantId)
      const allFeedbacks = Array.from(this.feedbacks.values())
        .filter(f => !tenantId || f.tenantId === tenantId)
      const allSuggestions = await this.getImprovementSuggestions()

      // Calcular estatísticas gerais
      const totalEntries = allMetrics.length
      const totalFeedbacks = allFeedbacks.length
      const averageRating = allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.averageRating, 0) / allMetrics.length 
        : 0
      const pendingSuggestions = allSuggestions.filter(s => s.status === 'pending').length
      const criticalIssues = allSuggestions.filter(s => s.priority === 'critical').length

      // Top e bottom entradas
      const sortedByRating = allMetrics
        .filter(m => m.totalFeedbacks >= 3) // Apenas com feedbacks suficientes
        .sort((a, b) => b.averageRating - a.averageRating)

      const topRatedEntries = sortedByRating.slice(0, 10).map(m => ({
        entryId: m.entryId,
        rating: m.averageRating,
        feedbackCount: m.totalFeedbacks
      }))

      const lowRatedEntries = sortedByRating.slice(-10).reverse().map(m => ({
        entryId: m.entryId,
        rating: m.averageRating,
        feedbackCount: m.totalFeedbacks
      }))

      // Feedbacks recentes
      const recentFeedbacks = allFeedbacks
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20)

      // Sugestões urgentes
      const urgentSuggestions = allSuggestions
        .filter(s => s.priority === 'critical' || s.priority === 'high')
        .filter(s => s.status === 'pending')
        .slice(0, 10)

      const report = {
        summary: {
          totalEntries,
          averageRating: Math.round(averageRating * 100) / 100,
          totalFeedbacks,
          pendingSuggestions,
          criticalIssues
        },
        topRatedEntries,
        lowRatedEntries,
        recentFeedbacks,
        urgentSuggestions
      }

      aiLogger.info('FEEDBACK_SERVICE', 'Relatório de qualidade gerado', {
        tenantId,
        totalEntries,
        totalFeedbacks,
        averageRating
      })

      return report
    } catch (error) {
      aiLogger.error('FEEDBACK_SERVICE', 'Erro ao gerar relatório de qualidade', { error, tenantId })
      throw error
    }
  }

  // Métodos privados

  private async updateQualityMetrics(entryId: string): Promise<void> {
    try {
      const entryFeedbacks = await this.getFeedbacksForEntry(entryId)
      
      if (entryFeedbacks.length === 0) return

      const totalFeedbacks = entryFeedbacks.length
      const averageRating = entryFeedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks
      
      const helpfulCount = entryFeedbacks.filter(f => f.type === 'helpful').length
      const notHelpfulCount = entryFeedbacks.filter(f => f.type === 'not_helpful').length
      const incorrectCount = entryFeedbacks.filter(f => f.type === 'incorrect').length
      const outdatedCount = entryFeedbacks.filter(f => f.type === 'outdated').length
      const suggestionCount = entryFeedbacks.filter(f => f.type === 'suggestion').length

      // Calcular score de confiança baseado em múltiplos fatores
      const helpfulRatio = totalFeedbacks > 0 ? helpfulCount / totalFeedbacks : 0.5
      const ratingRatio = averageRating / 5
      const problemRatio = totalFeedbacks > 0 ? (incorrectCount + outdatedCount) / totalFeedbacks : 0
      
      const confidenceScore = Math.max(0.1, Math.min(1.0, 
        (helpfulRatio * 0.4 + ratingRatio * 0.4 - problemRatio * 0.2)
      ))

      const metrics: QualityMetrics = {
        entryId,
        totalFeedbacks,
        averageRating: Math.round(averageRating * 100) / 100,
        helpfulCount,
        notHelpfulCount,
        incorrectCount,
        outdatedCount,
        suggestionCount,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        lastUpdated: new Date().toISOString()
      }

      this.qualityMetrics.set(entryId, metrics)

      aiLogger.debug('FEEDBACK_SERVICE', 'Métricas de qualidade atualizadas', {
        entryId,
        totalFeedbacks,
        averageRating,
        confidenceScore
      })
    } catch (error) {
      aiLogger.error('FEEDBACK_SERVICE', 'Erro ao atualizar métricas de qualidade', { 
        error, 
        entryId 
      })
    }
  }

  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateSuggestionId(): string {
    return `suggestion_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  // Métodos para análise avançada

  async getEntryTrends(entryId: string, days: number = 30): Promise<{
    ratingTrend: Array<{ date: string; rating: number }>
    feedbackVolume: Array<{ date: string; count: number }>
    issueTypes: Record<string, number>
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const entryFeedbacks = (await this.getFeedbacksForEntry(entryId))
      .filter(f => new Date(f.timestamp) >= cutoffDate)

    // Agrupar por dia
    const dailyData = new Map<string, { ratings: number[]; count: number }>()
    const issueTypes: Record<string, number> = {}

    entryFeedbacks.forEach(feedback => {
      const date = feedback.timestamp.split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { ratings: [], count: 0 })
      }
      
      const dayData = dailyData.get(date)!
      dayData.ratings.push(feedback.rating)
      dayData.count++
      
      // Contar tipos de problemas
      if (feedback.type !== 'helpful') {
        issueTypes[feedback.type] = (issueTypes[feedback.type] || 0) + 1
      }
    })

    // Converter para arrays ordenados
    const ratingTrend = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        rating: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const feedbackVolume = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      ratingTrend,
      feedbackVolume,
      issueTypes
    }
  }

  // Sugestões automáticas de melhoria baseadas em padrões
  async generateAutomaticSuggestions(entryId: string): Promise<ImprovementSuggestion[]> {
    const suggestions: Omit<ImprovementSuggestion, 'id' | 'suggestedAt' | 'status'>[] = []
    const metrics = await this.getQualityMetrics(entryId)
    const feedbacks = await this.getFeedbacksForEntry(entryId)

    if (!metrics || feedbacks.length < 3) return []

    // Sugestão para baixa avaliação
    if (metrics.averageRating < 3.0 && metrics.totalFeedbacks >= 5) {
      suggestions.push({
        entryId,
        type: 'content_update',
        priority: 'high',
        description: `Entrada com avaliação baixa (${metrics.averageRating}/5). Revisar conteúdo baseado nos feedbacks.`,
        suggestedBy: 'system'
      })
    }

    // Sugestão para muitos relatos de conteúdo incorreto
    if (metrics.incorrectCount >= 2) {
      suggestions.push({
        entryId,
        type: 'fix_error',
        priority: 'critical',
        description: `${metrics.incorrectCount} relatos de conteúdo incorreto. Verificação urgente necessária.`,
        suggestedBy: 'system'
      })
    }

    // Sugestão para conteúdo desatualizado
    if (metrics.outdatedCount >= 2) {
      suggestions.push({
        entryId,
        type: 'content_update',
        priority: 'medium',
        description: `${metrics.outdatedCount} relatos de conteúdo desatualizado. Considerar atualização.`,
        suggestedBy: 'system'
      })
    }

    // Criar as sugestões no sistema
    const createdSuggestions: ImprovementSuggestion[] = []
    for (const suggestion of suggestions) {
      const id = await this.createImprovementSuggestion(suggestion)
      const created = this.improvementSuggestions.get(id)
      if (created) {
        createdSuggestions.push(created)
      }
    }

    return createdSuggestions
  }
}

// Instância singleton
export const feedbackService = new FeedbackService()

export default feedbackService