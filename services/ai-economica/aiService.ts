// services/ai-economica/aiService.ts
// Serviço principal de IA econômica - Orquestrador do fluxo: base interna → cache → premium

import {
  AIQuery,
  AIResponse,
  QueryType,
  KnowledgeResult,
  ResponseSource,
  PremiumProvider,
} from '../../types/ai-economica.types';
import { logger } from './logger';
import { knowledgeBaseService } from './knowledgeBaseService';
import { cacheService } from './cacheService';
import { premiumAccountManager } from './premiumAccountManager';
import { preCacheService } from './preCacheService';
import { monitoringService } from './monitoringService';

interface AIServiceConfig {
  internalConfidenceThreshold: number; // Mínimo para usar resposta interna
  cacheEnabled: boolean;
  premiumEnabled: boolean;
  maxResponseTime: number; // ms
  fallbackEnabled: boolean;
}

interface ProcessingContext {
  query: AIQuery;
  startTime: number;
  attemptedSources: ResponseSource[];
  internalResults?: KnowledgeResult[];
  cacheResult?: AIResponse;
  premiumResult?: AIResponse;
  selectedProvider?: PremiumProvider;
  errors: Array<{ source: ResponseSource; error: string }>;
}

interface ResponseQuality {
  confidence: number;
  relevance: number;
  completeness: number;
  accuracy: number;
  overall: number;
}

export class AIService {
  private config: AIServiceConfig;

  constructor() {
    this.config = {
      internalConfidenceThreshold: 0.7,
      cacheEnabled: true,
      premiumEnabled: true,
      maxResponseTime: 30000, // 30 segundos
      fallbackEnabled: true,
    };

    // Iniciar serviços
    preCacheService.start();

    logger.info('Serviço principal de IA econômica inicializado', {
      component: 'AIService'
    });
  }

  // Método principal - processa consulta seguindo o fluxo econômico
  async processQuery(query: AIQuery): Promise<AIResponse> {
    const context: ProcessingContext = {
      query,
      startTime: Date.now(),
      attemptedSources: [],
      errors: [],
    };

    try {
      logger.info('Iniciando processamento de consulta', {
        component: 'AIService',
        queryId: query.id,
        type: query.type,
        text: query.text.substring(0, 100) + '...',
      });

      // Registrar padrão para pré-cache
      this.recordQueryPattern(query);

      // Fluxo econômico: 1. Base Interna → 2. Cache → 3. Premium

      // 1. Tentar base de conhecimento interna primeiro
      const internalResponse = await this.tryInternalKnowledge(context);
      if (internalResponse) {
        return this.finalizeResponse(internalResponse, context);
      }

      // 2. Tentar cache se habilitado
      if (this.config.cacheEnabled) {
        const cacheResponse = await this.tryCache(context);
        if (cacheResponse) {
          return this.finalizeResponse(cacheResponse, context);
        }
      }

      // 3. Tentar contas premium se habilitado
      if (this.config.premiumEnabled) {
        const premiumResponse = await this.tryPremium(context);
        if (premiumResponse) {
          // Cachear resposta premium para uso futuro
          if (this.config.cacheEnabled) {
            await this.cacheResponse(context.query, premiumResponse);
          }
          return this.finalizeResponse(premiumResponse, context);
        }
      }

      // 4. Fallback se habilitado
      if (this.config.fallbackEnabled) {
        const fallbackResponse = this.createFallbackResponse(context);
        return this.finalizeResponse(fallbackResponse, context);
      }

      // Se chegou aqui, não conseguiu responder
      throw new Error(
        'Não foi possível processar a consulta com nenhuma fonte disponível'
      );
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  // Tentar resposta da base de conhecimento interna
  private async tryInternalKnowledge(
    context: ProcessingContext
  ): Promise<AIResponse | null> {
    try {
      context.attemptedSources.push(ResponseSource.INTERNAL);

      logger.debug('Tentando base de conhecimento interna', {
        component: 'AIService',
        queryId: context.query.id,
      });

      const searchParams = {
        text: context.query.text,
        type: context.query.type,
        symptoms: context.query.context.symptoms,
        diagnosis: context.query.context.diagnosis,
        specialty: context.query.context.specialty,
        context: context.query.context,
      };

      const results = await knowledgeBaseService.search(searchParams);
      context.internalResults = results;

      if (results.length === 0) {
        logger.debug('Nenhum resultado na base interna', {
          component: 'AIService'
        });
        return null;
      }

      // Verificar se o melhor resultado atende ao threshold de confiança
      const bestResult = results[0];
      const combinedConfidence =
        bestResult.relevanceScore * bestResult.entry.confidence;

      if (combinedConfidence < this.config.internalConfidenceThreshold) {
        logger.debug('Confiança insuficiente na base interna', {
          component: 'AIService',
          combinedConfidence,
          threshold: this.config.internalConfidenceThreshold,
        });
        return null;
      }

      // Criar resposta baseada nos resultados internos
      const response = this.createInternalResponse(results, context.query);

      logger.info('Resposta obtida da base interna', {
        component: 'AIService',
        queryId: context.query.id,
        confidence: response.confidence,
        resultsCount: results.length,
      });

      return response;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Erro desconhecido';
      context.errors.push({ source: ResponseSource.INTERNAL, error: errorMsg });

      logger.error('Erro na base de conhecimento interna', {
        component: 'AIService',
        queryId: context.query.id,
        error: errorMsg,
      });

      return null;
    }
  }

  // Tentar resposta do cache
  private async tryCache(
    context: ProcessingContext
  ): Promise<AIResponse | null> {
    try {
      context.attemptedSources.push(ResponseSource.CACHE);

      logger.debug('Tentando cache', {
        component: 'AIService',
        queryId: context.query.id,
      });

      const cacheKey = this.generateCacheKey(context.query);
      const cachedResponse = await cacheService.get(cacheKey, context.query.type);

      if (!cachedResponse) {
        logger.debug('Cache miss', {
          component: 'AIService'
        });
        return null;
      }

      context.cacheResult = cachedResponse;

      logger.info('Resposta obtida do cache', {
        component: 'AIService',
        queryId: context.query.id,
        cacheKey,
        originalTimestamp: cachedResponse.createdAt,
      });

      // Atualizar timestamp para resposta atual
      return {
        ...cachedResponse,
        id: `cached_${Date.now()}`,
        queryId: context.query.id,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Erro desconhecido';
      context.errors.push({ source: ResponseSource.CACHE, error: errorMsg });

      logger.error('Erro no cache', {
        component: 'AIService',
        queryId: context.query.id,
        error: errorMsg,
      });

      return null;
    }
  }

  // Tentar resposta das contas premium
  private async tryPremium(
    context: ProcessingContext
  ): Promise<AIResponse | null> {
    try {
      context.attemptedSources.push(ResponseSource.PREMIUM);

      logger.debug('Tentando contas premium', {
        component: 'AIService',
        queryId: context.query.id,
        queryType: context.query.type,
      });

      // Executar consulta usando o gerenciador premium
      const response = await premiumAccountManager.executeQuery(context.query);
      context.premiumResult = response;

      logger.info('Resposta obtida de provedor premium', {
        component: 'AIService',
        queryId: context.query.id,
        provider: response.provider,
        confidence: response.confidence,
      });

      return response;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Erro desconhecido';
      context.errors.push({ source: ResponseSource.PREMIUM, error: errorMsg });

      logger.error('Erro nas contas premium', {
        component: 'AIService',
        queryId: context.query.id,
        selectedProvider: context.selectedProvider,
        error: errorMsg,
      });

      return null;
    }
  }

  // Criar resposta baseada na base interna
  private createInternalResponse(
    results: KnowledgeResult[],
    query: AIQuery
  ): AIResponse {
    const bestResult = results[0];
    const combinedResults = this.combineInternalResults(results);

    return {
      id: `internal_${Date.now()}`,
      queryId: query.id,
      content: combinedResults.content,
      confidence: combinedResults.confidence,
      source: ResponseSource.INTERNAL,
      references: combinedResults.references,
      suggestions: combinedResults.suggestions,
      followUpQuestions: combinedResults.followUpQuestions,
      responseTime: 0, // Será preenchido na finalização
      createdAt: new Date().toISOString(),
      metadata: {
        evidenceLevel: bestResult.entry.metadata?.evidenceLevel || 'low',
        reliability: combinedResults.confidence,
        relevance: bestResult.relevanceScore,
      },
    };
  }

  // Combinar múltiplos resultados internos
  private combineInternalResults(results: KnowledgeResult[]): {
    content: string;
    confidence: number;
    references: AIResponse['references'];
    suggestions: string[];
    followUpQuestions: string[];
  } {
    if (results.length === 0) {
      throw new Error('Nenhum resultado para combinar');
    }

    if (results.length === 1) {
      const result = results[0];
      return {
        content: result.entry.content,
        confidence: result.entry.confidence * result.relevanceScore,
        references: [
          {
            id: result.entry.id,
            title: result.entry.title,
            type: 'internal',
            confidence: result.entry.confidence,
          },
        ],
        suggestions: [`Baseado em: ${result.entry.title}`],
        followUpQuestions: [
          `Gostaria de mais detalhes sobre ${result.entry.title.toLowerCase()}?`,
        ],
      };
    }

    // Combinar múltiplos resultados
    const topResults = results.slice(0, 3); // Usar apenas os 3 melhores
    const combinedContent = this.createCombinedContent(topResults);
    const avgConfidence =
      topResults.reduce(
        (sum, r) => sum + r.entry.confidence * r.relevanceScore,
        0
      ) / topResults.length;

    const references = topResults.map((result) => ({
      id: result.entry.id,
      title: result.entry.title,
      type: 'internal' as const,
      confidence: result.entry.confidence,
    }));

    const suggestions = [
      `Baseado em ${topResults.length} fontes da base de conhecimento`,
      ...topResults.slice(0, 2).map((r) => `Veja também: ${r.entry.title}`),
    ];

    const followUpQuestions = [
      'Gostaria de mais detalhes sobre algum destes tópicos?',
      'Precisa de informações sobre casos similares?',
    ];

    return {
      content: combinedContent,
      confidence: avgConfidence,
      references,
      suggestions,
      followUpQuestions,
    };
  }

  // Criar conteúdo combinado de múltiplas fontes
  private createCombinedContent(results: KnowledgeResult[]): string {
    let content = 'Baseado na nossa base de conhecimento interna:\n\n';

    results.forEach((result, index) => {
      content += `**${index + 1}. ${result.entry.title}**\n`;
      content += `${result.entry.summary || result.entry.content.substring(0, 200)}...\n`;

      if (result.entry.contraindications.length > 0) {
        content += `⚠️ **Contraindicações:** ${result.entry.contraindications.join(', ')}\n`;
      }

      content += '\n';
    });

    content +=
      '\n*Esta resposta foi gerada a partir do conhecimento acumulado da nossa equipe de fisioterapeutas.*';

    return content;
  }

  // Criar resposta de fallback
  private createFallbackResponse(context: ProcessingContext): AIResponse {
    const errorSummary = context.errors
      .map((e) => `${e.source}: ${e.error}`)
      .join('; ');

    let content =
      'Desculpe, não consegui encontrar uma resposta específica para sua consulta no momento.\n\n';

    if (context.internalResults && context.internalResults.length > 0) {
      content +=
        'Encontrei algumas informações relacionadas na nossa base de conhecimento, mas com baixa confiança. ';
      content +=
        'Recomendo consultar diretamente com um fisioterapeuta da equipe.\n\n';

      const topResult = context.internalResults[0];
      content += `**Informação relacionada:** ${topResult.entry.title}\n`;
      content += `${topResult.entry.summary || topResult.entry.content.substring(0, 150)}...\n`;
    }

    content += '\n**Sugestões:**\n';
    content += '- Reformule sua pergunta com mais detalhes\n';
    content += '- Consulte nossa base de conhecimento diretamente\n';
    content += '- Entre em contato com um fisioterapeuta da equipe\n';

    return {
      id: `fallback_${Date.now()}`,
      queryId: context.query.id,
      content,
      confidence: 0.3,
      source: ResponseSource.INTERNAL,
      references: [],
      suggestions: [
        'Tente reformular sua pergunta',
        'Consulte nossa base de conhecimento',
        'Fale com um fisioterapeuta',
      ],
      followUpQuestions: [
        'Pode fornecer mais detalhes sobre sua consulta?',
        'Gostaria de falar com um fisioterapeuta?',
      ],
      responseTime: 0,
      createdAt: new Date().toISOString(),
      metadata: {
        reliability: 0.3,
        relevance: 0.2,
      },
    };
  }

  // Finalizar resposta
  private finalizeResponse(
    response: AIResponse,
    context: ProcessingContext
  ): AIResponse {
    const responseTime = Date.now() - context.startTime;
    const finalResponse = {
      ...response,
      responseTime,
    };

    // Registrar métricas
    monitoringService.recordQuery(
      response.source,
      response.provider,
      responseTime
    );

    // Registrar padrão de uso para pré-cache
    if (context.query.context.userRole) {
      preCacheService.recordQueryPattern(
        context.query.text,
        context.query.type,
        responseTime,
        context.query.context.userRole,
        'default', // tenantId padrão
        [], // contextTags
        true // success
      );
    }

    // Log final
    logger.info('Consulta processada com sucesso', {
      component: 'AIService',
      queryId: context.query.id,
      source: response.source,
      provider: response.provider,
      confidence: response.confidence,
      responseTime,
      attemptedSources: context.attemptedSources,
    });

    return finalResponse;
  }

  // Tratar erros
  private handleError(error: unknown, context: ProcessingContext): AIResponse {
    const errorMsg =
      error instanceof Error ? error.message : 'Erro desconhecido';
    const responseTime = Date.now() - context.startTime;

    logger.error('Erro no processamento da consulta', {
      component: 'AIService',
      queryId: context.query.id,
      error: errorMsg,
      attemptedSources: context.attemptedSources,
      errors: context.errors,
      responseTime,
    });

    // Registrar erro no monitoramento
    monitoringService.recordError(ResponseSource.INTERNAL, new Error(errorMsg));

    // Retornar resposta de erro
    return {
      id: `error_${Date.now()}`,
      queryId: context.query.id,
      content:
        'Ocorreu um erro interno ao processar sua consulta. Por favor, tente novamente ou entre em contato com o suporte.',
      confidence: 0.1,
      source: ResponseSource.INTERNAL,
      references: [],
      suggestions: [
        'Tente novamente em alguns minutos',
        'Reformule sua pergunta',
        'Entre em contato com o suporte',
      ],
      followUpQuestions: [],
      responseTime,
      createdAt: new Date().toISOString(),
      metadata: {
        reliability: 0.1,
        relevance: 0.1,
      },
    };
  }

  // Métodos utilitários

  private generateCacheKey(query: AIQuery): string {
    const normalizedText = query.text.toLowerCase().trim().replace(/\s+/g, '_');
    const contextHash = this.hashContext(query.context);
    return `${query.type}_${normalizedText}_${contextHash}`.substring(0, 100);
  }

  private hashContext(context: AIQuery['context']): string {
    const contextStr = JSON.stringify({
      symptoms: context.symptoms?.sort(),
      diagnosis: context.diagnosis,
      specialty: context.specialty,
    });

    // Hash simples (em produção usar biblioteca de hash)
    let hash = 0;
    for (let i = 0; i < contextStr.length; i++) {
      const char = contextStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async cacheResponse(
    query: AIQuery,
    response: AIResponse
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(query);
      await cacheService.set(cacheKey, response, query.type);

      logger.debug('Resposta cacheada', {
        component: 'AIService',
        queryId: query.id,
        cacheKey,
        source: response.source,
      });
    } catch (error) {
      logger.error('Erro ao cachear resposta', {
        component: 'AIService',
        queryId: query.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  private recordQueryPattern(query: AIQuery): void {
    try {
      if (query.context.userRole && query.context.tenantId) {
        // Será registrado na finalização com o tempo de resposta real
      }
    } catch (error) {
      logger.error('Erro ao registrar padrão de consulta', {
        component: 'AIService',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Métodos públicos para controle e estatísticas

  async getServiceStats(): Promise<{
    totalQueries: number;
    queriesBySource: Record<ResponseSource, number>;
    avgResponseTime: number;
    successRate: number;
    cacheHitRate: number;
    internalSuccessRate: number;
  }> {
    // Implementar baseado nos logs ou métricas coletadas
    return {
      totalQueries: 0,
      queriesBySource: {
        [ResponseSource.INTERNAL]: 0,
        [ResponseSource.CACHE]: 0,
        [ResponseSource.PREMIUM]: 0,
      },
      avgResponseTime: 0,
      successRate: 0,
      cacheHitRate: 0,
      internalSuccessRate: 0,
    };
  }

  updateConfig(updates: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Configuração atualizada', {
      component: 'AIService',
      updates
    });
  }

  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  // Método para teste e diagnóstico
  async testAllSources(testQuery: AIQuery): Promise<{
    internal: { success: boolean; response?: AIResponse; error?: string };
    cache: { success: boolean; response?: AIResponse; error?: string };
    premium: { success: boolean; response?: AIResponse; error?: string };
  }> {
    const results: {
      internal: { success: boolean; response?: AIResponse; error?: string };
      cache: { success: boolean; response?: AIResponse; error?: string };
      premium: { success: boolean; response?: AIResponse; error?: string };
    } = {
      internal: { success: false },
      cache: { success: false },
      premium: { success: false },
    };

    // Testar base interna
    try {
      const context: ProcessingContext = {
        query: testQuery,
        startTime: Date.now(),
        attemptedSources: [],
        errors: [],
      };

      const internalResponse = await this.tryInternalKnowledge(context);
      results.internal = {
        success: !!internalResponse,
        response: internalResponse || undefined,
      };
    } catch (error) {
      results.internal = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }

    // Testar cache
    try {
      const context: ProcessingContext = {
        query: testQuery,
        startTime: Date.now(),
        attemptedSources: [],
        errors: [],
      };

      const cacheResponse = await this.tryCache(context);
      results.cache = {
        success: !!cacheResponse,
        response: cacheResponse || undefined,
      };
    } catch (error) {
      results.cache = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }

    // Testar premium
    try {
      const context: ProcessingContext = {
        query: testQuery,
        startTime: Date.now(),
        attemptedSources: [],
        errors: [],
      };

      const premiumResponse = await this.tryPremium(context);
      results.premium = {
        success: !!premiumResponse,
        response: premiumResponse || undefined,
      };
    } catch (error) {
      results.premium = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }

    return results;
  }
}

// Instância singleton
export const aiService = new AIService();

export default aiService;
