// services/ai-economica/aiService.ts
// Serviço principal de IA econômica - Orquestrador do fluxo: base interna → cache → premium

import { 
  AIQuery, 
  AIResponse, 
  QueryType, 
  KnowledgeResult,
  ResponseSource,
  PremiumProvider 
} from '../../types/ai-economica.types'
import { aiLogger } from './logger'
import { KnowledgeBaseService } from './knowledgeBaseService'
import { CacheService } from './cacheService'
import { PremiumAccountManager } from './premiumAccountManager'
import { PreCacheService } from './preCacheService'
import { monitoringService } from './monitoringService'
import { feedbackService } from './feedbackService'

interface AIServiceConfig {
  internalConfidenceThreshold: number // Mínimo para usar resposta interna
  cacheEnabled: boolean
  premiumEnabled: boolean
  maxResponseTime: number // ms
  fallbackEnabled: boolean
}

interface ProcessingContext {
  query: AIQuery
  startTime: number
  attemptedSources: ResponseSource[]
  internalResults?: KnowledgeResult[]
  cacheResult?: AIResponse
  premiumResult?: AIResponse
  selectedProvider?: PremiumProvider
  errors: Array<{ source: ResponseSource; error: string }>
}

interface ResponseQuality {
  confidence: number
  relevance: number
  completeness: number
  accuracy: number
  overall: number
}

export class AIService {
  private knowledgeBase: KnowledgeBaseService
  private cache: CacheService
  private premiumManager: PremiumAccountManager
  private preCache: PreCacheService
  private config: AIServiceConfig

  constructor() {
    this.knowledgeBase = new KnowledgeBaseService()
    this.cache = new CacheService()
    this.premiumManager = new PremiumAccountManager()
    this.preCache = new PreCacheService(this.cache)
    
    this.config = {
      internalConfidenceThreshold: 0.7,
      cacheEnabled: true,
      premiumEnabled: true,
      maxResponseTime: 30000, // 30 segundos
      fallbackEnabled: true
    }

    // Inicializar serviços
    this.preCache.start()
    
    aiLogger.info('AI_SERVICE', 'Serviço principal de IA econômica inicializado')
  }

  // Método principal para processar consultas
  async processQuery(query: AIQuery): Promise<AIResponse> {
    const context: ProcessingContext = {
      query,
      startTime: Date.now(),
      attemptedSources: [],
      errors: []
    }

    try {
      // Validar consulta
      this.validateQuery(query)
      
      // Registrar padrão para pré-cache
      this.recordQueryPattern(query)
      
      // Executar fluxo econômico
      const response = await this.executeEconomicFlow(context)
      
      // Calcular métricas finais
      const responseTime = Date.now() - context.startTime
      response.responseTime = responseTime
      
      // Registrar uso e métricas
      await this.recordQueryMetrics(context, response)
      
      // Log de sucesso
      aiLogger.info('AI_SERVICE', 'Consulta processada com sucesso', {
        queryId: query.id,
        source: response.source,
        provider: response.provider,
        responseTime,
        confidence: response.confidence,
        attemptedSources: context.attemptedSources
      })

      return response
      
    } catch (error) {
      const responseTime = Date.now() - context.startTime
      
      // Log de erro
      aiLogger.error('AI_SERVICE', 'Erro ao processar consulta', {
        queryId: query.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        responseTime,
        attemptedSources: context.attemptedSources,
        errors: context.errors
      })
      
      // Tentar fallback se habilitado
      if (this.config.fallbackEnabled) {
        return this.generateFallbackResponse(query, error as Error)
      }
      
      throw error
    }
  }

  // Executar fluxo econômico: base interna → cache → premium
  private async executeEconomicFlow(context: ProcessingContext): Promise<AIResponse> {
    const { query } = context
    
    // 1. PRIMEIRA PRIORIDADE: Base de conhecimento interna
    try {
      context.attemptedSources.push('internal')
      const internalResponse = await this.searchInternalKnowledge(query)
      
      if (internalResponse && internalResponse.confidence >= this.config.internalConfidenceThreshold) {
        context.internalResults = internalResponse.results
        
        aiLogger.info('AI_SERVICE', 'Resposta obtida da base interna', {
          queryId: query.id,
          confidence: internalResponse.confidence,
          resultsCount: internalResponse.results.length
        })
        
        return {
          id: this.generateResponseId(),
          queryId: query.id,
          content: internalResponse.content,
          confidence: internalResponse.confidence,
          source: 'internal',
          references: internalResponse.references,
          suggestions: internalResponse.suggestions,
          followUpQuestions: internalResponse.followUpQuestions,
          responseTime: 0,
          createdAt: new Date().toISOString(),
          metadata: {
            reliability: internalResponse.confidence,
            relevance: internalResponse.relevance || 0.9
          }
        }
      }
    } catch (error) {
      context.errors.push({
        source: 'internal',
        error: error instanceof Error ? error.message : 'Erro na base interna'
      })
      
      aiLogger.warn('AI_SERVICE', 'Erro na busca interna, continuando para cache', {
        queryId: query.id,
        error
      })
    }

    // 2. SEGUNDA PRIORIDADE: Cache
    if (this.config.cacheEnabled) {
      try {
        context.attemptedSources.push('cache')
        const cacheKey = this.generateCacheKey(query)
        const cachedResponse = await this.cache.get(cacheKey, query.type)
        
        if (cachedResponse) {
          context.cacheResult = cachedResponse
          
          aiLogger.info('AI_SERVICE', 'Resposta obtida do cache', {
            queryId: query.id,
            cacheKey,
            confidence: cachedResponse.confidence
          })
          
          return {
            ...cachedResponse,
            id: this.generateResponseId(),
            queryId: query.id,
            source: 'cache',
            createdAt: new Date().toISOString()
          }
        }
      } catch (error) {
        context.errors.push({
          source: 'cache',
          error: error instanceof Error ? error.message : 'Erro no cache'
        })
        
        aiLogger.warn('AI_SERVICE', 'Erro no cache, continuando para premium', {
          queryId: query.id,
          error
        })
      }
    }

    // 3. TERCEIRA PRIORIDADE: Contas premium
    if (this.config.premiumEnabled) {
      try {
        context.attemptedSources.push('premium')
        const premiumResponse = await this.queryPremiumProvider(query)
        
        if (premiumResponse) {
          context.premiumResult = premiumResponse
          context.selectedProvider = premiumResponse.provider
          
          // Armazenar no cache para futuras consultas
          if (this.config.cacheEnabled) {
            const cacheKey = this.generateCacheKey(query)
            await this.cache.set(cacheKey, premiumResponse, query.type)
          }
          
          aiLogger.info('AI_SERVICE', 'Resposta obtida de provedor premium', {
            queryId: query.id,
            provider: premiumResponse.provider,
            confidence: premiumResponse.confidence,
            tokensUsed: premiumResponse.tokensUsed
          })
          
          return premiumResponse
        }
      } catch (error) {
        context.errors.push({
          source: 'premium',
          error: error instanceof Error ? error.message : 'Erro nos provedores premium'
        })
        
        aiLogger.error('AI_SERVICE', 'Erro nos provedores premium', {
          queryId: query.id,
          error
        })
      }
    }

    // Se chegou aqui, nenhuma fonte funcionou
    throw new Error('Nenhuma fonte de IA disponível no momento')
  }

  // Buscar na base de conhecimento interna
  private async searchInternalKnowledge(query: AIQuery): Promise<{
    content: string
    confidence: number
    relevance: number
    results: KnowledgeResult[]
    references: any[]
    suggestions: string[]
    followUpQuestions: string[]
  } | null> {
    try {
      // Buscar por texto
      const textResults = await this.knowledgeBase.search({
        text: query.text,
        type: query.type,
        context: query.context
      })

      // Buscar por sintomas se disponível
      let symptomResults: KnowledgeResult[] = []
      if (query.context.symptoms && query.context.symptoms.length > 0) {
        symptomResults = await this.knowledgeBase.search({
          text: '',
          symptoms: query.context.symptoms,
          context: query.context
        })
      }

      // Buscar por diagnóstico se disponível
      let diagnosisResults: KnowledgeResult[] = []
      if (query.context.diagnosis) {
        diagnosisResults = await this.knowledgeBase.search({
          text: '',
          diagnosis: query.context.diagnosis,
          context: query.context
        })
      }

      // Combinar e ranquear resultados
      const allResults = [...textResults, ...symptomResults, ...diagnosisResults]
      const uniqueResults = this.deduplicateResults(allResults)
      const rankedResults = this.rankResults(uniqueResults, query)

      if (rankedResults.length === 0) {
        return null
      }

      // Gerar resposta combinada
      const combinedResponse = this.combineInternalResults(rankedResults, query)
      
      return combinedResponse
      
    } catch (error) {
      aiLogger.error('AI_SERVICE', 'Erro na busca interna', { error, queryId: query.id })
      return null
    }
  }

  // Consultar provedor premium
  private async queryPremiumProvider(query: AIQuery): Promise<AIResponse | null> {
    try {
      // Selecionar melhor provedor disponível
      const selectedProvider = await this.premiumManager.selectBestProvider(query.type)
      
      if (!selectedProvider) {
        aiLogger.warn('AI_SERVICE', 'Nenhum provedor premium disponível', {
          queryId: query.id,
          queryType: query.type
        })
        return null
      }

      // Executar consulta
      const response = await this.premiumManager.query(selectedProvider, query)
      
      return response
      
    } catch (error) {
      aiLogger.error('AI_SERVICE', 'Erro ao consultar provedor premium', {
        error,
        queryId: query.id
      })
      return null
    }
  }

  // Combinar resultados da base interna
  private combineInternalResults(results: KnowledgeResult[], query: AIQuery): {
    content: string
    confidence: number
    relevance: number
    results: KnowledgeResult[]
    references: any[]
    suggestions: string[]
    followUpQuestions: string[]
  } {
    // Pegar os melhores resultados (máximo 5)
    const topResults = results.slice(0, 5)
    
    // Calcular confiança média ponderada
    const totalRelevance = topResults.reduce((sum, r) => sum + r.relevanceScore, 0)
    const weightedConfidence = topResults.reduce((sum, r) => 
      sum + (r.entry.confidence * r.relevanceScore), 0
    ) / totalRelevance
    
    // Calcular relevância média
    const avgRelevance = totalRelevance / topResults.length

    // Gerar conteúdo combinado
    let content = `Baseado na base de conhecimento interna, encontrei ${topResults.length} resultado(s) relevante(s):\n\n`
    
    topResults.forEach((result, index) => {
      content += `**${index + 1}. ${result.entry.title}**\n`
      content += `${result.entry.summary || result.entry.content.substring(0, 200)}...\n`
      content += `*Confiança: ${Math.round(result.entry.confidence * 100)}% | Relevância: ${Math.round(result.relevanceScore * 100)}%*\n\n`
    })

    // Gerar referências
    const references = topResults.map(result => ({
      id: result.entry.id,
      title: result.entry.title,
      type: 'internal' as const,
      confidence: result.entry.confidence
    }))

    // Gerar sugestões baseadas nos resultados
    const suggestions = this.generateSuggestions(topResults, query)
    
    // Gerar perguntas de follow-up
    const followUpQuestions = this.generateFollowUpQuestions(topResults, query)

    return {
      content,
      confidence: weightedConfidence,
      relevance: avgRelevance,
      results: topResults,
      references,
      suggestions,
      followUpQuestions
    }
  }

  // Gerar sugestões baseadas nos resultados
  private generateSuggestions(results: KnowledgeResult[], query: AIQuery): string[] {
    const suggestions: string[] = []
    
    // Sugestões baseadas em técnicas relacionadas
    const techniques = new Set<string>()
    results.forEach(result => {
      result.entry.techniques.forEach(technique => techniques.add(technique))
    })
    
    if (techniques.size > 0) {
      suggestions.push(`Considere também estas técnicas: ${Array.from(techniques).slice(0, 3).join(', ')}`)
    }

    // Sugestões baseadas em condições relacionadas
    const conditions = new Set<string>()
    results.forEach(result => {
      result.entry.conditions.forEach(condition => conditions.add(condition))
    })
    
    if (conditions.size > 1) {
      suggestions.push(`Condições relacionadas que podem ser relevantes: ${Array.from(conditions).slice(0, 3).join(', ')}`)
    }

    // Sugestão de especialidade
    const specialties = new Set<string>()
    results.forEach(result => {
      result.entry.metadata.specialty.forEach(spec => specialties.add(spec))
    })
    
    if (specialties.size > 0 && !query.context.specialty) {
      suggestions.push(`Para informações mais específicas, considere consultar especialista em: ${Array.from(specialties)[0]}`)
    }

    return suggestions.slice(0, 3) // Máximo 3 sugestões
  }

  // Gerar perguntas de follow-up
  private generateFollowUpQuestions(results: KnowledgeResult[], query: AIQuery): string[] {
    const questions: string[] = []
    
    // Perguntas baseadas no tipo de consulta
    switch (query.type) {
      case QueryType.PROTOCOL_SUGGESTION:
        questions.push('Gostaria de ver exercícios específicos para este protocolo?')
        questions.push('Precisa de informações sobre contraindicações?')
        break
      case QueryType.EXERCISE_RECOMMENDATION:
        questions.push('Quer saber sobre progressão destes exercícios?')
        questions.push('Precisa de adaptações para casos específicos?')
        break
      case QueryType.DIAGNOSIS_HELP:
        questions.push('Gostaria de ver casos clínicos similares?')
        questions.push('Precisa de informações sobre diagnóstico diferencial?')
        break
      default:
        questions.push('Precisa de mais detalhes sobre algum aspecto específico?')
        questions.push('Gostaria de ver informações relacionadas?')
    }

    // Perguntas baseadas nos resultados
    if (results.some(r => r.entry.contraindications.length > 0)) {
      questions.push('Quer revisar as contraindicações importantes?')
    }

    if (results.some(r => r.entry.references.length > 0)) {
      questions.push('Gostaria de ver as referências científicas?')
    }

    return questions.slice(0, 3) // Máximo 3 perguntas
  }

  // Métodos utilitários

  private validateQuery(query: AIQuery): void {
    if (!query.text || query.text.trim().length === 0) {
      throw new Error('Texto da consulta é obrigatório')
    }
    
    if (query.text.length > 5000) {
      throw new Error('Texto da consulta muito longo (máximo 5000 caracteres)')
    }
    
    if (!Object.values(QueryType).includes(query.type)) {
      throw new Error('Tipo de consulta inválido')
    }
  }

  private recordQueryPattern(query: AIQuery): void {
    try {
      // Registrar padrão para o sistema de pré-cache
      this.preCache.recordQueryPattern(
        query.text,
        query.type,
        0, // responseTime será atualizado depois
        query.context.userRole || 'unknown',
        query.context.tenantId || 'default'
      )
    } catch (error) {
      aiLogger.warn('AI_SERVICE', 'Erro ao registrar padrão de consulta', { error })
    }
  }

  private async recordQueryMetrics(context: ProcessingContext, response: AIResponse): Promise<void> {
    try {
      const { query, startTime, selectedProvider } = context
      const responseTime = Date.now() - startTime
      
      // Registrar no serviço de monitoramento
      monitoringService.recordQuery(
        response.source,
        selectedProvider,
        responseTime
      )
      
      // Atualizar padrão de consulta com tempo de resposta real
      this.preCache.recordQueryPattern(
        query.text,
        query.type,
        responseTime,
        query.context.userRole || 'unknown',
        query.context.tenantId || 'default'
      )
      
      // Registrar economia se não usou premium
      if (response.source !== 'premium') {
        const estimatedPremiumCost = 0.002 // $0.002 por consulta
        monitoringService.recordCostSaving(estimatedPremiumCost)
      }
      
    } catch (error) {
      aiLogger.warn('AI_SERVICE', 'Erro ao registrar métricas', { error })
    }
  }

  private deduplicateResults(results: KnowledgeResult[]): KnowledgeResult[] {
    const seen = new Set<string>()
    return results.filter(result => {
      if (seen.has(result.entry.id)) {
        return false
      }
      seen.add(result.entry.id)
      return true
    })
  }

  private rankResults(results: KnowledgeResult[], query: AIQuery): KnowledgeResult[] {
    return results.sort((a, b) => {
      // Score combinado: relevância * confiança * fatores contextuais
      let scoreA = a.relevanceScore * a.entry.confidence
      let scoreB = b.relevanceScore * b.entry.confidence
      
      // Bonus para especialidade correspondente
      if (query.context.specialty) {
        if (a.entry.metadata.specialty.includes(query.context.specialty)) scoreA += 0.1
        if (b.entry.metadata.specialty.includes(query.context.specialty)) scoreB += 0.1
      }
      
      // Bonus para uso recente
      const daysSinceUsedA = (Date.now() - new Date(a.entry.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
      const daysSinceUsedB = (Date.now() - new Date(b.entry.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceUsedA < 7) scoreA += 0.05
      if (daysSinceUsedB < 7) scoreB += 0.05
      
      // Bonus por taxa de sucesso
      scoreA += a.entry.successRate * 0.1
      scoreB += b.entry.successRate * 0.1
      
      return scoreB - scoreA
    })
  }

  private generateFallbackResponse(query: AIQuery, error: Error): AIResponse {
    return {
      id: this.generateResponseId(),
      queryId: query.id,
      content: `Desculpe, não foi possível processar sua consulta no momento devido a: ${error.message}. Tente novamente em alguns minutos ou reformule sua pergunta.`,
      confidence: 0.1,
      source: 'internal',
      references: [],
      suggestions: [
        'Tente reformular sua pergunta de forma mais específica',
        'Verifique se há erros de digitação',
        'Tente novamente em alguns minutos'
      ],
      followUpQuestions: [
        'Posso ajudar com algo mais específico?',
        'Gostaria de tentar uma abordagem diferente?'
      ],
      responseTime: 0,
      createdAt: new Date().toISOString(),
      metadata: {
        reliability: 0.1,
        relevance: 0.1
      }
    }
  }

  private generateResponseId(): string {
    return `ai_response_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateCacheKey(query: AIQuery): string {
    const normalizedText = query.text.toLowerCase().trim().replace(/\s+/g, '_')
    return `${query.type}_${normalizedText}_${query.context.tenantId || 'default'}`
  }

  // Métodos públicos para configuração e estatísticas

  updateConfig(updates: Partial<AIServiceConfig>): void {
    Object.assign(this.config, updates)
    aiLogger.info('AI_SERVICE', 'Configuração atualizada', updates)
  }

  getConfig(): AIServiceConfig {
    return { ...this.config }
  }

  async getServiceStats(): Promise<{
    totalQueries: number
    queriesBySource: Record<ResponseSource, number>
    avgResponseTime: number
    successRate: number
    economySavings: number
    cacheHitRate: number
  }> {
    // Implementar coleta de estatísticas dos logs
    const logs = aiLogger.getLogs({
      category: 'AI_SERVICE',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
    })

    const queryLogs = logs.filter(log => log.message.includes('processada com sucesso'))
    const totalQueries = queryLogs.length
    
    const queriesBySource: Record<ResponseSource, number> = {
      internal: 0,
      cache: 0,
      premium: 0
    }

    let totalResponseTime = 0
    let economySavings = 0

    queryLogs.forEach(log => {
      if (log.data?.source) {
        queriesBySource[log.data.source as ResponseSource]++
      }
      if (log.data?.responseTime) {
        totalResponseTime += log.data.responseTime
      }
      if (log.data?.source !== 'premium') {
        economySavings += 0.002 // $0.002 por consulta não premium
      }
    })

    const avgResponseTime = totalQueries > 0 ? totalResponseTime / totalQueries : 0
    const successRate = totalQueries / Math.max(logs.length, 1)
    const cacheHitRate = totalQueries > 0 ? queriesBySource.cache / totalQueries : 0

    return {
      totalQueries,
      queriesBySource,
      avgResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      economySavings: Math.round(economySavings * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    }
  }

  // Método para teste e debug
  async testQuery(text: string, type: QueryType = QueryType.GENERAL_QUESTION): Promise<AIResponse> {
    const testQuery: AIQuery = {
      id: `test_${Date.now()}`,
      text,
      type,
      context: {
        userRole: 'test',
        tenantId: 'test'
      },
      priority: 'normal',
      maxResponseTime: 30000,
      hash: `test_${Date.now()}`,
      createdAt: new Date().toISOString()
    }

    return this.processQuery(testQuery)
  }
}

// Instância singleton
export const aiService = new AIService()

export default aiService