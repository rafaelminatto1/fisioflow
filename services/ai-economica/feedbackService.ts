import { 
  FeedbackEntry, 
  QualityMetrics, 
  ImprovementSuggestion,
  KnowledgeEntry,
  FeedbackType,
  QualityReport
} from '../../types/ai-economica.types';
import { logger } from './logger';
import { supabase } from '../supabase';

/**
 * Serviço de feedback e melhoria contínua da base de conhecimento
 * Coleta feedback dos usuários e ajusta automaticamente a qualidade das entradas
 */
export class FeedbackService {
  private feedbackCache: Map<string, FeedbackEntry[]> = new Map();
  private qualityMetricsCache: Map<string, QualityMetrics> = new Map();

  constructor() {
    this.initializeService();
  }

  /**
   * Inicializa o serviço de feedback
   */
  private async initializeService(): Promise<void> {
    try {
      logger.info('Inicializando serviço de feedback', { component: 'FeedbackService' });
      
      // Carregar feedback existente do cache
      await this.loadFeedbackFromStorage();
      
      // Iniciar processo de limpeza periódica
      this.startPeriodicCleanup();
      
    } catch (error) {
      logger.error('Erro ao inicializar serviço de feedback', {
        component: 'FeedbackService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Registra feedback do usuário sobre uma resposta
   */
  public async submitFeedback(
    entryId: string,
    userId: string,
    rating: number,
    feedbackType: FeedbackType,
    comment?: string,
    suggestions?: string[]
  ): Promise<void> {
    try {
      const feedback: FeedbackEntry = {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entryId,
        userId,
        rating: Math.max(1, Math.min(5, rating)), // Garantir que está entre 1-5
        feedbackType,
        comment,
        suggestions,
        timestamp: new Date().toISOString(),
        processed: false
      };

      // Salvar no cache local
      if (!this.feedbackCache.has(entryId)) {
        this.feedbackCache.set(entryId, []);
      }
      this.feedbackCache.get(entryId)!.push(feedback);

      // Salvar no Supabase (se disponível)
      await this.saveFeedbackToStorage(feedback);

      // Processar feedback imediatamente para ajustes rápidos
      await this.processFeedback(entryId);

      logger.info('Feedback registrado com sucesso', {
        component: 'FeedbackService',
        entryId,
        rating,
        feedbackType
      });

    } catch (error) {
      logger.error('Erro ao registrar feedback', {
        component: 'FeedbackService',
        entryId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  /**
   * Processa feedback para uma entrada específica
   */
  private async processFeedback(entryId: string): Promise<void> {
    try {
      const feedbacks = this.feedbackCache.get(entryId) || [];
      if (feedbacks.length === 0) return;

      // Calcular métricas de qualidade
      const metrics = this.calculateQualityMetrics(feedbacks);
      this.qualityMetricsCache.set(entryId, metrics);

      // Gerar sugestões de melhoria se necessário
      if (metrics.averageRating < 3.0 || metrics.negativeRatio > 0.3) {
        const suggestions = await this.generateImprovementSuggestions(entryId, feedbacks);
        await this.notifyImprovementNeeded(entryId, suggestions);
      }

      // Marcar feedbacks como processados
      feedbacks.forEach(feedback => feedback.processed = true);

      logger.debug('Feedback processado', {
        component: 'FeedbackService',
        entryId,
        averageRating: metrics.averageRating,
        totalFeedbacks: feedbacks.length
      });

    } catch (error) {
      logger.error('Erro ao processar feedback', {
        component: 'FeedbackService',
        entryId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Calcula métricas de qualidade baseadas no feedback
   */
  private calculateQualityMetrics(feedbacks: FeedbackEntry[]): QualityMetrics {
    if (feedbacks.length === 0) {
      return {
        averageRating: 0,
        totalFeedbacks: 0,
        positiveRatio: 0,
        negativeRatio: 0,
        neutralRatio: 0,
        confidenceScore: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / feedbacks.length;

    const positive = feedbacks.filter(f => f.rating >= 4).length;
    const negative = feedbacks.filter(f => f.rating <= 2).length;
    const neutral = feedbacks.filter(f => f.rating === 3).length;

    const total = feedbacks.length;

    // Calcular score de confiança baseado na quantidade e qualidade do feedback
    const confidenceScore = this.calculateConfidenceScore(averageRating, total);

    return {
      averageRating,
      totalFeedbacks: total,
      positiveRatio: positive / total,
      negativeRatio: negative / total,
      neutralRatio: neutral / total,
      confidenceScore,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calcula score de confiança baseado na qualidade e quantidade do feedback
   */
  private calculateConfidenceScore(averageRating: number, totalFeedbacks: number): number {
    // Score base baseado na avaliação média
    let baseScore = averageRating / 5;

    // Ajustar baseado na quantidade de feedback
    let quantityMultiplier = 1;
    if (totalFeedbacks >= 10) quantityMultiplier = 1.2;
    else if (totalFeedbacks >= 5) quantityMultiplier = 1.1;
    else if (totalFeedbacks >= 2) quantityMultiplier = 1.0;
    else quantityMultiplier = 0.8; // Penalizar pouco feedback

    // Garantir que o score está entre 0 e 1
    return Math.max(0, Math.min(1, baseScore * quantityMultiplier));
  }

  /**
   * Gera sugestões de melhoria baseadas no feedback negativo
   */
  private async generateImprovementSuggestions(
    entryId: string, 
    feedbacks: FeedbackEntry[]
  ): Promise<ImprovementSuggestion[]> {
    const suggestions: ImprovementSuggestion[] = [];
    
    try {
      // Analisar comentários negativos
      const negativeFeedbacks = feedbacks.filter(f => f.rating <= 2 && f.comment);
      
      // Categorizar problemas comuns
      const commonIssues = this.categorizeIssues(negativeFeedbacks);
      
      // Gerar sugestões baseadas nos problemas identificados
      for (const [issue, count] of commonIssues.entries()) {
        if (count >= 2) { // Só sugerir se o problema aparece múltiplas vezes
          const suggestion = this.createSuggestionForIssue(issue, count);
          if (suggestion) {
            suggestions.push(suggestion);
          }
        }
      }

      // Analisar sugestões diretas dos usuários
      const userSuggestions = feedbacks
        .filter(f => f.suggestions && f.suggestions.length > 0)
        .flatMap(f => f.suggestions!);

      // Agrupar sugestões similares
      const groupedSuggestions = this.groupSimilarSuggestions(userSuggestions);
      
      for (const [suggestion, count] of groupedSuggestions.entries()) {
        suggestions.push({
          id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          entryId,
          type: 'user_suggestion',
          priority: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low',
          description: suggestion,
          suggestedBy: 'user_feedback',
          createdAt: new Date().toISOString(),
          status: 'pending'
        });
      }

      logger.debug('Sugestões de melhoria geradas', {
        component: 'FeedbackService',
        entryId,
        suggestionsCount: suggestions.length
      });

    } catch (error) {
      logger.error('Erro ao gerar sugestões de melhoria', {
        component: 'FeedbackService',
        entryId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }

    return suggestions;
  }

  /**
   * Categoriza problemas comuns baseados nos comentários
   */
  private categorizeIssues(negativeFeedbacks: FeedbackEntry[]): Map<string, number> {
    const issues = new Map<string, number>();
    
    const issuePatterns = [
      { pattern: /incompleto|falta|insuficiente/i, category: 'incomplete_content' },
      { pattern: /desatualizado|antigo|obsoleto/i, category: 'outdated_content' },
      { pattern: /incorreto|errado|equivocado/i, category: 'incorrect_content' },
      { pattern: /confuso|difícil|complicado/i, category: 'unclear_content' },
      { pattern: /irrelevante|não relacionado/i, category: 'irrelevant_content' },
      { pattern: /exemplo|caso prático/i, category: 'needs_examples' },
      { pattern: /referência|fonte|estudo/i, category: 'needs_references' }
    ];

    negativeFeedbacks.forEach(feedback => {
      if (feedback.comment) {
        issuePatterns.forEach(({ pattern, category }) => {
          if (pattern.test(feedback.comment!)) {
            issues.set(category, (issues.get(category) || 0) + 1);
          }
        });
      }
    });

    return issues;
  }

  /**
   * Cria sugestão específica para um tipo de problema
   */
  private createSuggestionForIssue(issue: string, count: number): ImprovementSuggestion | null {
    const suggestionMap: Record<string, string> = {
      'incomplete_content': 'Adicionar mais detalhes e informações completas ao conteúdo',
      'outdated_content': 'Atualizar o conteúdo com informações mais recentes',
      'incorrect_content': 'Revisar e corrigir informações incorretas',
      'unclear_content': 'Simplificar e clarificar a linguagem utilizada',
      'irrelevant_content': 'Revisar a relevância do conteúdo para o contexto',
      'needs_examples': 'Adicionar exemplos práticos e casos de uso',
      'needs_references': 'Incluir referências científicas e fontes confiáveis'
    };

    const description = suggestionMap[issue];
    if (!description) return null;

    return {
      id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entryId: '',
      type: 'quality_improvement',
      priority: count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low',
      description,
      suggestedBy: 'system_analysis',
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
  }

  /**
   * Agrupa sugestões similares dos usuários
   */
  private groupSimilarSuggestions(suggestions: string[]): Map<string, number> {
    const grouped = new Map<string, number>();
    
    suggestions.forEach(suggestion => {
      const normalized = suggestion.toLowerCase().trim();
      
      // Procurar sugestões similares existentes
      let found = false;
      for (const [existing, count] of grouped.entries()) {
        if (this.areSuggestionsSimilar(normalized, existing.toLowerCase())) {
          grouped.set(existing, count + 1);
          found = true;
          break;
        }
      }
      
      if (!found) {
        grouped.set(suggestion, 1);
      }
    });

    return grouped;
  }

  /**
   * Verifica se duas sugestões são similares
   */
  private areSuggestionsSimilar(suggestion1: string, suggestion2: string): boolean {
    // Implementação simples baseada em palavras-chave comuns
    const words1 = new Set(suggestion1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(suggestion2.split(/\s+/).filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    // Considerar similares se têm mais de 50% de palavras em comum
    return intersection.size / union.size > 0.5;
  }

  /**
   * Notifica sobre necessidade de melhoria
   */
  private async notifyImprovementNeeded(
    entryId: string, 
    suggestions: ImprovementSuggestion[]
  ): Promise<void> {
    try {
      // Salvar sugestões no storage
      for (const suggestion of suggestions) {
        await this.saveImprovementSuggestion(suggestion);
      }

      // Log para monitoramento
      logger.warn('Entrada precisa de melhoria', {
        component: 'FeedbackService',
        entryId,
        suggestionsCount: suggestions.length,
        suggestions: suggestions.map(s => s.description)
      });

      // Aqui poderia enviar notificação para os fisioterapeutas
      // Por exemplo, via email ou notificação no sistema

    } catch (error) {
      logger.error('Erro ao notificar necessidade de melhoria', {
        component: 'FeedbackService',
        entryId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Obtém métricas de qualidade para uma entrada
   */
  public getQualityMetrics(entryId: string): QualityMetrics | null {
    return this.qualityMetricsCache.get(entryId) || null;
  }

  /**
   * Obtém todas as sugestões de melhoria pendentes
   */
  public async getPendingImprovements(): Promise<ImprovementSuggestion[]> {
    try {
      // Carregar do Supabase se disponível
      const { data, error } = await supabase
        .from('ai_improvement_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('createdAt', { ascending: false });

      if (error) {
        logger.warn('Erro ao carregar sugestões do Supabase, usando cache local', {
          component: 'FeedbackService',
          error: error.message
        });
        return [];
      }

      return data || [];

    } catch (error) {
      logger.error('Erro ao obter sugestões pendentes', {
        component: 'FeedbackService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return [];
    }
  }

  /**
   * Marca uma sugestão como implementada
   */
  public async markSuggestionAsImplemented(suggestionId: string): Promise<void> {
    try {
      await supabase
        .from('ai_improvement_suggestions')
        .update({ 
          status: 'implemented',
          implementedAt: new Date().toISOString()
        })
        .eq('id', suggestionId);

      logger.info('Sugestão marcada como implementada', {
        component: 'FeedbackService',
        suggestionId
      });

    } catch (error) {
      logger.error('Erro ao marcar sugestão como implementada', {
        component: 'FeedbackService',
        suggestionId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Gera relatório de qualidade da base de conhecimento
   */
  public generateQualityReport(): QualityReport {
    const allMetrics = Array.from(this.qualityMetricsCache.values());
    
    if (allMetrics.length === 0) {
      return {
        totalEntries: 0,
        averageRating: 0,
        totalFeedbacks: 0,
        entriesNeedingImprovement: 0,
        topIssues: [],
        qualityTrend: 'stable',
        generatedAt: new Date().toISOString()
      };
    }

    const totalEntries = allMetrics.length;
    const averageRating = allMetrics.reduce((sum, m) => sum + m.averageRating, 0) / totalEntries;
    const totalFeedbacks = allMetrics.reduce((sum, m) => sum + m.totalFeedbacks, 0);
    const entriesNeedingImprovement = allMetrics.filter(m => 
      m.averageRating < 3.0 || m.negativeRatio > 0.3
    ).length;

    // Identificar principais problemas
    const topIssues = this.identifyTopIssues();

    return {
      totalEntries,
      averageRating,
      totalFeedbacks,
      entriesNeedingImprovement,
      topIssues,
      qualityTrend: this.calculateQualityTrend(),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Identifica os principais problemas na base de conhecimento
   */
  private identifyTopIssues(): Array<{issue: string, count: number}> {
    // Implementação simplificada - poderia ser mais sofisticada
    return [
      { issue: 'Conteúdo incompleto', count: 5 },
      { issue: 'Falta de exemplos práticos', count: 3 },
      { issue: 'Informações desatualizadas', count: 2 }
    ];
  }

  /**
   * Calcula tendência de qualidade
   */
  private calculateQualityTrend(): 'improving' | 'declining' | 'stable' {
    // Implementação simplificada - compararia métricas ao longo do tempo
    return 'stable';
  }

  /**
   * Carrega feedback do storage
   */
  private async loadFeedbackFromStorage(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('ai_feedback')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000); // Limitar para não sobrecarregar

      if (error) {
        logger.warn('Erro ao carregar feedback do Supabase', {
          component: 'FeedbackService',
          error: error.message
        });
        return;
      }

      // Organizar feedback por entryId
      data?.forEach(feedback => {
        if (!this.feedbackCache.has(feedback.entryId)) {
          this.feedbackCache.set(feedback.entryId, []);
        }
        this.feedbackCache.get(feedback.entryId)!.push(feedback);
      });

      logger.info('Feedback carregado do storage', {
        component: 'FeedbackService',
        feedbackCount: data?.length || 0
      });

    } catch (error) {
      logger.error('Erro ao carregar feedback do storage', {
        component: 'FeedbackService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Salva feedback no storage
   */
  private async saveFeedbackToStorage(feedback: FeedbackEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_feedback')
        .insert([feedback]);

      if (error) {
        logger.warn('Erro ao salvar feedback no Supabase', {
          component: 'FeedbackService',
          error: error.message
        });
      }

    } catch (error) {
      logger.error('Erro ao salvar feedback no storage', {
        component: 'FeedbackService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Salva sugestão de melhoria no storage
   */
  private async saveImprovementSuggestion(suggestion: ImprovementSuggestion): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_improvement_suggestions')
        .insert([suggestion]);

      if (error) {
        logger.warn('Erro ao salvar sugestão no Supabase', {
          component: 'FeedbackService',
          error: error.message
        });
      }

    } catch (error) {
      logger.error('Erro ao salvar sugestão no storage', {
        component: 'FeedbackService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Inicia limpeza periódica de dados antigos
   */
  private startPeriodicCleanup(): void {
    // Limpar dados antigos a cada 24 horas
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Remove dados antigos do cache
   */
  private async cleanupOldData(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // Manter apenas 90 dias

      // Limpar feedback antigo do cache
      for (const [entryId, feedbacks] of this.feedbackCache.entries()) {
        const recentFeedbacks = feedbacks.filter(f => 
          new Date(f.timestamp) > cutoffDate
        );
        
        if (recentFeedbacks.length !== feedbacks.length) {
          this.feedbackCache.set(entryId, recentFeedbacks);
        }
      }

      logger.info('Limpeza de dados antigos concluída', {
        component: 'FeedbackService',
        cutoffDate: cutoffDate.toISOString()
      });

    } catch (error) {
      logger.error('Erro durante limpeza de dados antigos', {
        component: 'FeedbackService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

// Instância singleton
export const feedbackService = new FeedbackService();