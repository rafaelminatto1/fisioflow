// services/ai-economica/aiService.ts
// Serviço principal de IA econômica - orquestrador de todas as fontes

import { AIQuery, AIResponse, QueryType, ResponseSource, AIError, ErrorContext } from '../../types/ai-economica.types';
import { KnowledgeBaseService } from './knowledgeBaseService';
import { CacheService } from './cacheService';
import { PremiumAccountManager } from './premiumAccountManager';
import { AnalyticsService } from './analyticsService';
import { aiEconomicaLogger } from './logger';
import { monitoringService } from './monitoringService';
import { AI_ECONOMICA_CONFIG } from '../../config/ai-economica.config';

export class AIService {
  private knowledgeBase: KnowledgeBaseService;
  private cacheService: CacheService;
  private premiumManager: PremiumAccountManager;
  private analytics: AnalyticsService;

  constructor() {
    this.knowledgeBase = new KnowledgeBaseService();
    this.cacheService = new CacheService();
    this.premiumManager = new PremiumAccountManager();
    this.analytics = new AnalyticsService();
  }

  async processQuery(query: AIQuery): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Validar consulta
      this.validateQuery(query);
      
      // Gerar hash para cache
      query.hash = this.generateQueryHash(query);
      
      // Log início da consulta
      aiEconomicaLogger.logQuery(query.id, query.type, ResponseSource.INTERNAL);
      
      // 1. PRIMEIRA PRIORIDADE: Buscar na base interna
      const internalResult = await this.searchInternal(query);
      if (internalResult && internalResult.confidence >= AI_ECONOMICA_CONFIG.CONFIDENCE_THRESHOLDS.MIN_INTERNAL_CONFIDENCE) {
        const responseTime = Date.now() - startTime;
        internalResult.responseTime = responseTime;
        
        // Registrar métricas
        monitoringService.recordQuery(ResponseSource.INTERNAL, undefined, responseTime);
        this.analytics.recordQuery(query, internalResult, ResponseSource.INTERNAL);
        
        // Calcular economia
        const estimatedCost = this.estimateAPICost(query);
        monitoringService.recordCostSaving(estimatedCost);
        
        aiEconomicaLogger.logCostSaving(estimatedCost, ResponseSource.INTERNAL);
        return internalResult;
      }

      // 2. SEGUNDA PRIORIDADE: Verificar cache
      const cachedResult = await this.cacheService.get(query.hash);
      if (cachedResult && cachedResult.confidence >= AI_ECONOMICA_CONFIG.CONFIDENCE_THRESHOLDS.MIN_CACHE_CONFIDENCE) {
        const responseTime = Date.now() - startTime;
        cachedResult.responseTime = responseTime;
        
        // Registrar métricas
        monitoringService.recordQuery(ResponseSource.CACHE, undefined, responseTime);
        this.analytics.recordQuery(query, cachedResult, ResponseSource.CACHE);
        
        // Calcular economia
        const estimatedCost = this.estimateAPICost(query);
        monitoringService.recordCostSaving(estimatedCost);
        
        aiEconomicaLogger.logCacheHit(query.hash);
        return cachedResult;
      }

      // 3. TERCEIRA PRIORIDADE: Usar conta premium
      const premiumResult = await this.queryPremium(query);
      if (premiumResult) {
        const responseTime = Date.now() - startTime;
        premiumResult.responseTime = responseTime;
        
        // Cachear resultado para consultas futuras
        await this.cacheService.set(query.hash, premiumResult, this.getTTLForQuery(query));
        
        // Registrar métricas
        monitoringService.recordQuery(ResponseSource.PREMIUM, premiumResult.provider, responseTime);
        this.analytics.recordQuery(query, premiumResult, ResponseSource.PREMIUM);
        
        return premiumResult;
      }

      // 4. FALLBACK: Resposta padrão
      const fallbackResult = this.getDefaultResponse(query);
      const responseTime = Date.now() - startTime;
      fallbackResult.responseTime = responseTime;
      
      this.analytics.recordQuery(query, fallbackResult, ResponseSource.INTERNAL);
      return fallbackResult;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Registrar erro
      monitoringService.recordError(ResponseSource.PREMIUM, error as Error);
      aiEconomicaLogger.logQueryError(query.id, error as Error);
      
      // Tentar recuperação
      return await this.handleError(error as Error, { query, attemptedSources: [], lastError: error as Error });
    }
  }

  private async searchInternal(query: AIQuery): Promise<AIResponse | null> {
    try {
      const results = await this.knowledgeBase.search({
        text: query.text,
        type: query.type,
        symptoms: query.context.symptoms,
        diagnosis: query.context.diagnosis,
        specialty: query.context.specialty,
        context: query.context
      });

      if (results.length === 0) {
        return null;
      }

      // Combinar resultados e calcular confiança
      const combinedResult = this.combineInternalResults(results, query);
      
      // Log do uso da base interna
      aiEconomicaLogger.logKnowledgeUsage(
        results[0]?.entry.id || 'multiple',
        combinedResult.confidence,
        query.context.userId,
        query.context.tenantId
      );
      
      return combinedResult;
      
    } catch (error) {
      aiEconomicaLogger.logQueryError('internal_search', error as Error);
      return null;
    }
  }

  private combineInternalResults(results: any[], query: AIQuery): AIResponse {
    // Pegar os 3 resultados mais relevantes
    const topResults = results.slice(0, 3);
    
    // Combinar conteúdo
    let combinedContent = '';
    const references: any[] = [];
    const suggestions: string[] = [];
    
    topResults.forEach((result, index) => {
      if (index > 0) combinedContent += '\n\n---\n\n';
      
      combinedContent += `**${result.entry.title}**\n\n`;
      combinedContent += result.entry.content;
      
      // Adicionar referências
      references.push({
        id: result.entry.id,
        title: result.entry.title,
        type: 'internal',
        confidence: result.entry.confidence
      });
      
      // Adicionar sugestões baseadas nas tags
      result.entry.tags.forEach((tag: string) => {
        if (!suggestions.includes(tag)) {
          suggestions.push(tag);
        }
      });
    });

    // Calcular confiança combinada (média ponderada)
    const totalRelevance = topResults.reduce((sum, result) => sum + result.relevanceScore, 0);
    const weightedConfidence = topResults.reduce((sum, result) => {
      const weight = result.relevanceScore / totalRelevance;
      return sum + (result.entry.confidence * weight);
    }, 0);

    // Gerar perguntas de follow-up baseadas no contexto
    const followUpQuestions = this.generateFollowUpQuestions(query, topResults);

    return {
      id: `internal_${Date.now()}`,
      queryId: query.id,
      content: combinedContent,
      confidence: Math.min(weightedConfidence, 1.0),
      source: ResponseSource.INTERNAL,
      references,
      suggestions: suggestions.slice(0, 5), // Limitar a 5 sugestões
      followUpQuestions,
      responseTime: 0, // Será preenchido pelo caller
      createdAt: new Date().toISOString(),
      metadata: {
        evidenceLevel: this.calculateEvidenceLevel(topResults),
        reliability: weightedConfidence,
        relevance: totalRelevance / topResults.length
      }
    };
  }

  private async queryPremium(query: AIQuery): Promise<AIResponse | null> {
    try {
      // Selecionar melhor provedor para este tipo de consulta
      const provider = await this.premiumManager.selectBestProvider(query.type);
      if (!provider) {
        aiEconomicaLogger.log('WARN', 'PREMIUM_QUERY', 'No premium provider available');
        return null;
      }

      // Fazer a consulta
      const response = await this.premiumManager.query(provider, query);
      
      // Enriquecer resposta com metadados
      response.source = ResponseSource.PREMIUM;
      response.metadata = {
        ...response.metadata,
        evidenceLevel: 'moderate', // Assumir nível moderado para IA externa
        reliability: 0.8, // Confiabilidade padrão para IA premium
        relevance: 0.8
      };

      return response;
      
    } catch (error) {
      aiEconomicaLogger.logQueryError('premium_query', error as Error);
      return null;
    }
  }

  private getDefaultResponse(query: AIQuery): AIResponse {
    let content = '';
    const suggestions: string[] = [];
    
    switch (query.type) {
      case QueryType.PROTOCOL_SUGGESTION:
        content = 'Não foi possível encontrar um protocolo específico para sua consulta. Recomendo consultar a literatura científica mais recente ou buscar orientação de um especialista na área.';
        suggestions.push('Consultar diretrizes clínicas', 'Buscar evidências científicas', 'Avaliar caso individualmente');
        break;
        
      case QueryType.DIAGNOSIS_HELP:
        content = 'Para auxiliar no diagnóstico, é importante realizar uma avaliação clínica completa, incluindo anamnese detalhada, exame físico e, quando necessário, exames complementares.';
        suggestions.push('Anamnese detalhada', 'Exame físico completo', 'Considerar diagnóstico diferencial');
        break;
        
      case QueryType.EXERCISE_RECOMMENDATION:
        content = 'A prescrição de exercícios deve ser individualizada, considerando a condição clínica, limitações e objetivos do paciente. Sempre respeite as contraindicações.';
        suggestions.push('Avaliar condição atual', 'Considerar limitações', 'Progressão gradual');
        break;
        
      default:
        content = 'Não foi possível encontrar informações específicas para sua consulta. Recomendo buscar fontes confiáveis ou consultar um profissional especializado.';
        suggestions.push('Consultar literatura científica', 'Buscar orientação especializada', 'Verificar diretrizes atuais');
    }

    return {
      id: `default_${Date.now()}`,
      queryId: query.id,
      content,
      confidence: 0.3, // Baixa confiança para resposta padrão
      source: ResponseSource.INTERNAL,
      references: [],
      suggestions,
      followUpQuestions: [
        'Você pode fornecer mais detalhes sobre o caso?',
        'Há alguma informação adicional que possa ajudar?',
        'Você gostaria de reformular a pergunta?'
      ],
      responseTime: 0,
      createdAt: new Date().toISOString(),
      metadata: {
        evidenceLevel: 'low',
        reliability: 0.3,
        relevance: 0.5
      }
    };
  }

  private async handleError(error: Error, context: ErrorContext): Promise<AIResponse> {
    const aiError: AIError = {
      type: this.classifyError(error),
      message: error.message,
      context
    };

    switch (aiError.type) {
      case 'KNOWLEDGE_BASE_UNAVAILABLE':
        // Tentar cache se a base interna falhar
        if (!context.attemptedSources.includes(ResponseSource.CACHE)) {
          try {
            const cachedResult = await this.cacheService.get(context.query.hash);
            if (cachedResult) {
              return cachedResult;
            }
          } catch (cacheError) {
            // Continuar para próximo fallback
          }
        }
        break;
        
      case 'PREMIUM_LIMIT_REACHED':
        // Tentar outro provedor premium
        try {
          const alternativeResult = await this.tryAlternativeProvider(context.query);
          if (alternativeResult) {
            return alternativeResult;
          }
        } catch (altError) {
          // Continuar para fallback
        }
        break;
        
      case 'NETWORK_ERROR':
        // Usar modo offline (cache + base interna)
        return this.useOfflineMode(context.query);
        
      case 'INVALID_QUERY':
        return this.suggestQueryImprovement(context.query);
    }

    // Fallback final
    return this.getDefaultResponse(context.query);
  }

  private classifyError(error: Error): AIError['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('limit') || message.includes('quota')) {
      return 'PREMIUM_LIMIT_REACHED';
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    
    if (message.includes('invalid') || message.includes('malformed')) {
      return 'INVALID_QUERY';
    }
    
    return 'KNOWLEDGE_BASE_UNAVAILABLE';
  }

  private async tryAlternativeProvider(query: AIQuery): Promise<AIResponse | null> {
    const availableProviders = await this.premiumManager.getAvailableProviders();
    
    for (const provider of availableProviders) {
      try {
        const usage = await this.premiumManager.getCurrentUsage(provider);
        if (usage.status === 'available') {
          return await this.premiumManager.query(provider, query);
        }
      } catch (error) {
        continue; // Tentar próximo provedor
      }
    }
    
    return null;
  }

  private async useOfflineMode(query: AIQuery): Promise<AIResponse> {
    // Tentar cache primeiro
    try {
      const cachedResult = await this.cacheService.get(query.hash);
      if (cachedResult) {
        return cachedResult;
      }
    } catch (error) {
      // Continuar para base interna
    }

    // Tentar base interna com confiança mais baixa
    try {
      const internalResult = await this.searchInternal(query);
      if (internalResult && internalResult.confidence >= 0.3) { // Limite mais baixo para modo offline
        return internalResult;
      }
    } catch (error) {
      // Continuar para fallback
    }

    // Resposta padrão para modo offline
    const offlineResponse = this.getDefaultResponse(query);
    offlineResponse.content = `[MODO OFFLINE] ${offlineResponse.content}`;
    return offlineResponse;
  }

  private suggestQueryImprovement(query: AIQuery): AIResponse {
    const suggestions = [
      'Tente ser mais específico sobre a condição ou sintoma',
      'Inclua mais contexto sobre o paciente (idade, histórico, etc.)',
      'Use termos técnicos mais precisos',
      'Divida consultas complexas em perguntas menores'
    ];

    return {
      id: `suggestion_${Date.now()}`,
      queryId: query.id,
      content: 'Sua consulta pode ser melhorada para obter resultados mais precisos. Considere as sugestões abaixo:',
      confidence: 0.5,
      source: ResponseSource.INTERNAL,
      references: [],
      suggestions,
      followUpQuestions: [
        'Você pode reformular sua pergunta?',
        'Há mais detalhes que você pode fornecer?',
        'Qual é o contexto específico da sua consulta?'
      ],
      responseTime: 0,
      createdAt: new Date().toISOString(),
      metadata: {
        evidenceLevel: 'low',
        reliability: 0.5,
        relevance: 0.6
      }
    };
  }

  // Métodos auxiliares

  private validateQuery(query: AIQuery): void {
    if (!query.text || query.text.trim().length === 0) {
      throw new Error('Query text is required');
    }
    
    if (query.text.length > AI_ECONOMICA_CONFIG.SECURITY.MAX_QUERY_LENGTH) {
      throw new Error('Query text is too long');
    }
    
    if (!query.type || !Object.values(QueryType).includes(query.type)) {
      throw new Error('Invalid query type');
    }
    
    if (!query.context || !query.context.userRole) {
      throw new Error('Query context is required');
    }
  }

  private generateQueryHash(query: AIQuery): string {
    // Gerar hash baseado no conteúdo da consulta para cache
    const hashContent = `${query.text}_${query.type}_${JSON.stringify(query.context)}`;
    
    // Hash simples (em produção, usar crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < hashContent.length; i++) {
      const char = hashContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private estimateAPICost(query: AIQuery): number {
    // Estimativa de custo baseada no tamanho da consulta
    // Valores aproximados em reais
    const baseTokens = Math.ceil(query.text.length / 4);
    const costPerToken = 0.0001; // R$ 0,0001 por token (estimativa)
    
    return baseTokens * costPerToken;
  }

  private getTTLForQuery(query: AIQuery): number {
    return AI_ECONOMICA_CONFIG.CACHE_TTL[query.type] || AI_ECONOMICA_CONFIG.CACHE_TTL.GENERAL_QUESTION;
  }

  private calculateEvidenceLevel(results: any[]): 'low' | 'moderate' | 'high' {
    const avgEvidenceScore = results.reduce((sum, result) => {
      const level = result.entry.metadata?.evidenceLevel || 'low';
      const score = level === 'high' ? 3 : level === 'moderate' ? 2 : 1;
      return sum + score;
    }, 0) / results.length;

    if (avgEvidenceScore >= 2.5) return 'high';
    if (avgEvidenceScore >= 1.5) return 'moderate';
    return 'low';
  }

  private generateFollowUpQuestions(query: AIQuery, results: any[]): string[] {
    const questions: string[] = [];
    
    // Baseado no tipo de consulta
    switch (query.type) {
      case QueryType.DIAGNOSIS_HELP:
        questions.push(
          'Há outros sintomas que não foram mencionados?',
          'Qual é o histórico médico do paciente?',
          'Foram realizados exames complementares?'
        );
        break;
        
      case QueryType.PROTOCOL_SUGGESTION:
        questions.push(
          'Qual é o estágio da condição?',
          'Há contraindicações específicas?',
          'Qual é o objetivo principal do tratamento?'
        );
        break;
        
      case QueryType.EXERCISE_RECOMMENDATION:
        questions.push(
          'Qual é o nível de condicionamento do paciente?',
          'Há limitações de movimento?',
          'Qual equipamento está disponível?'
        );
        break;
    }
    
    // Baseado nos resultados encontrados
    if (results.length > 0) {
      const commonConditions = new Set();
      results.forEach(result => {
        result.entry.conditions.forEach((condition: string) => commonConditions.add(condition));
      });
      
      if (commonConditions.size > 1) {
        questions.push('Você gostaria de informações sobre condições relacionadas?');
      }
    }
    
    return questions.slice(0, 3); // Limitar a 3 perguntas
  }

  // Métodos públicos para administração

  async getSystemStatus(): Promise<{
    knowledgeBase: { totalEntries: number; avgConfidence: number };
    cache: { hitRate: number; totalEntries: number };
    premiumAccounts: any[];
    overallHealth: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      const kbStats = await this.knowledgeBase.getStatistics();
      const cacheStats = await this.cacheService.getStats();
      const premiumStatus = await this.premiumManager.getAllUsageStatus();
      
      // Calcular saúde geral
      let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      const criticalProviders = premiumStatus.filter(p => p.status === 'limit_reached').length;
      const warningProviders = premiumStatus.filter(p => p.status === 'warning').length;
      
      if (criticalProviders > premiumStatus.length / 2) {
        overallHealth = 'critical';
      } else if (warningProviders > 0 || criticalProviders > 0) {
        overallHealth = 'warning';
      }
      
      return {
        knowledgeBase: {
          totalEntries: kbStats.totalEntries,
          avgConfidence: kbStats.averageConfidence
        },
        cache: {
          hitRate: cacheStats.hitRate,
          totalEntries: cacheStats.totalEntries
        },
        premiumAccounts: premiumStatus,
        overallHealth
      };
      
    } catch (error) {
      aiEconomicaLogger.logQueryError('system_status', error as Error);
      return {
        knowledgeBase: { totalEntries: 0, avgConfidence: 0 },
        cache: { hitRate: 0, totalEntries: 0 },
        premiumAccounts: [],
        overallHealth: 'critical'
      };
    }
  }

  async clearAllCaches(): Promise<void> {
    await this.cacheService.clear();
    aiEconomicaLogger.log('INFO', 'ADMIN_ACTION', 'All caches cleared');
  }

  async rebuildKnowledgeIndex(tenantId?: string): Promise<void> {
    await this.knowledgeBase.rebuildIndex(tenantId);
    aiEconomicaLogger.log('INFO', 'ADMIN_ACTION', `Knowledge index rebuilt for tenant: ${tenantId || 'all'}`);
  }
}