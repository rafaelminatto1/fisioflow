// services/ai-economica/preCacheService.ts
// Sistema de pré-cache inteligente baseado em padrões de uso

import { logger } from './logger';
import { cacheService } from './cacheService';
import { AIResponse, QueryType, ResponseSource } from '../../types/ai-economica.types';

export interface QueryPattern {
  query: string;
  queryType: QueryType;
  frequency: number;
  lastUsed: string;
  avgResponseTime: number;
  userRoles: string[];
  timeOfDay: number[]; // horas do dia quando é mais usado
  dayOfWeek: number[]; // dias da semana quando é mais usado
  tenantId: string;
  seasonality?: {
    month: number[];
    trends: 'increasing' | 'decreasing' | 'stable';
  };
  contextTags: string[]; // tags de contexto para melhor agrupamento
  successRate: number; // taxa de sucesso das respostas
}

export interface PreCacheJob {
  id: string;
  query: string;
  queryType: QueryType;
  priority: number;
  scheduledFor: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  cacheHitAfterPreload?: boolean;
}

export interface CacheWarmingStrategy {
  name: string;
  description: string;
  enabled: boolean;
  schedule: string; // cron-like schedule
  maxQueries: number;
  minFrequency: number;
  execute: () => Promise<void>;
  lastExecuted?: string;
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
}

export class PreCacheService {
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private preCacheJobs: Map<string, PreCacheJob> = new Map();
  private isRunning = false;
  private warmingInterval?: NodeJS.Timeout;
  private patternAnalysisInterval?: NodeJS.Timeout;

  // Estratégias de warming
  private warmingStrategies: CacheWarmingStrategy[] = [];
  
  // Machine Learning simples para predição
  private predictionModel: Map<string, number> = new Map();
  private contextualPatterns: Map<string, QueryPattern[]> = new Map();

  constructor() {
    this.initializeStrategies();
    this.startPatternAnalysis();
    logger.info('Serviço de pré-cache inteligente inicializado', {
      component: 'PreCacheService'
    });
  }

  // Inicializar estratégias de warming inteligentes
  private initializeStrategies(): void {
    this.warmingStrategies = [
      {
        name: 'frequent_queries',
        description: 'Pré-cache de consultas frequentes com análise de tendências',
        enabled: true,
        schedule: '0 */6 * * *', // A cada 6 horas
        maxQueries: 50,
        minFrequency: 5,
        execute: () => this.warmFrequentQueries(),
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0
      },
      {
        name: 'predictive_peak',
        description: 'Pré-cache preditivo para horários de pico baseado em ML',
        enabled: true,
        schedule: '0 6,12,18 * * 1-5', // Antes dos picos: 6h, 12h, 18h
        maxQueries: 40,
        minFrequency: 3,
        execute: () => this.warmPredictivePeakQueries(),
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0
      },
      {
        name: 'contextual_learning',
        description: 'Aprendizado contextual baseado em padrões de uso',
        enabled: true,
        schedule: '*/20 * * * *', // A cada 20 minutos
        maxQueries: 25,
        minFrequency: 2,
        execute: () => this.warmContextualQueries(),
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0
      },
      {
        name: 'seasonal_adaptation',
        description: 'Adaptação sazonal baseada em padrões temporais',
        enabled: true,
        schedule: '0 1 * * *', // 1h da manhã diariamente
        maxQueries: 30,
        minFrequency: 1,
        execute: () => this.warmSeasonalQueries(),
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0
      },
      {
        name: 'collaborative_filtering',
        description: 'Filtragem colaborativa baseada em usuários similares',
        enabled: true,
        schedule: '0 */4 * * *', // A cada 4 horas
        maxQueries: 20,
        minFrequency: 2,
        execute: () => this.warmCollaborativeQueries(),
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0
      },
      {
        name: 'failure_recovery',
        description: 'Recuperação inteligente de consultas que falharam',
        enabled: true,
        schedule: '*/15 * * * *', // A cada 15 minutos
        maxQueries: 10,
        minFrequency: 1,
        execute: () => this.warmFailureRecoveryQueries(),
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0
      }
    ];
  }

  // Iniciar análise de padrões
  private startPatternAnalysis(): void {
    // Análise de padrões a cada 10 minutos
    this.patternAnalysisInterval = setInterval(() => {
      this.analyzePatterns();
      this.updatePredictionModel();
      this.identifyContextualPatterns();
    }, 10 * 60 * 1000);
  }

  // Iniciar serviço de pré-cache
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Executar estratégias em intervalos adaptativos
    this.warmingInterval = setInterval(
      () => {
        this.executeWarmingStrategies();
      },
      this.calculateOptimalInterval()
    );

    // Executar warming inicial inteligente
    setTimeout(() => {
      this.performInitialWarmup();
    }, 5000); // 5 segundos após inicialização

    logger.info('Serviço de pré-cache inteligente iniciado', {
      component: 'PreCacheService',
      strategiesCount: this.warmingStrategies.length
    });
  }

  // Parar serviço
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = undefined;
    }

    logger.info('Serviço de pré-cache parado', {
      component: 'PreCacheService'
    });
  }

  // Registrar padrão de consulta
  recordQueryPattern(
    query: string,
    queryType: QueryType,
    responseTime: number,
    userRole: string,
    tenantId: string
  ): void {
    try {
      const patternKey = this.generatePatternKey(query, queryType, tenantId);
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      const existingPattern = this.queryPatterns.get(patternKey);

      if (existingPattern) {
        // Atualizar padrão existente
        existingPattern.frequency++;
        existingPattern.lastUsed = now.toISOString();
        existingPattern.avgResponseTime =
          (existingPattern.avgResponseTime * (existingPattern.frequency - 1) +
            responseTime) /
          existingPattern.frequency;

        if (!existingPattern.userRoles.includes(userRole)) {
          existingPattern.userRoles.push(userRole);
        }

        if (!existingPattern.timeOfDay.includes(hour)) {
          existingPattern.timeOfDay.push(hour);
        }

        if (!existingPattern.dayOfWeek.includes(dayOfWeek)) {
          existingPattern.dayOfWeek.push(dayOfWeek);
        }
      } else {
        // Criar novo padrão
        const newPattern: QueryPattern = {
          query,
          queryType,
          frequency: 1,
          lastUsed: now.toISOString(),
          avgResponseTime: responseTime,
          userRoles: [userRole],
          timeOfDay: [hour],
          dayOfWeek: [dayOfWeek],
          tenantId,
        };

        this.queryPatterns.set(patternKey, newPattern);
      }

      logger.debug('Padrão de consulta registrado', {
        component: 'PreCacheService',
        patternKey,
        frequency: this.queryPatterns.get(patternKey)?.frequency,
        queryType,
        userRole,
      });
    } catch (error) {
      logger.error('Erro ao registrar padrão de consulta', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Executar estratégias de warming
  private async executeWarmingStrategies(): Promise<void> {
    if (!this.isRunning) return;

    try {
      for (const strategy of this.warmingStrategies) {
        if (!strategy.enabled) continue;

        // Verificar se é hora de executar (implementação simples)
        if (this.shouldExecuteStrategy(strategy)) {
          logger.info(`Executando estratégia: ${strategy.name}`, {
            component: 'PreCacheService'
          });

          try {
            await strategy.execute();
          } catch (error) {
            logger.error(`Erro na estratégia ${strategy.name}`, {
              component: 'PreCacheService',
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Erro ao executar estratégias de warming', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Verificar se deve executar estratégia (implementação simplificada)
  private shouldExecuteStrategy(strategy: CacheWarmingStrategy): boolean {
    // Implementação básica - em produção usar biblioteca de cron
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    switch (strategy.name) {
      case 'frequent_queries':
        return minute === 0 && hour % 6 === 0; // A cada 6 horas
      case 'peak_hours':
        return minute === 0 && (hour === 7 || hour === 13); // 7h e 13h
      case 'new_content':
        return hour === 2 && minute === 0; // 2h da manhã
      case 'user_context':
        return minute % 30 === 0; // A cada 30 minutos
      default:
        return false;
    }
  }

  // Estratégia: Consultas frequentes
  private async warmFrequentQueries(): Promise<void> {
    try {
      const strategy = this.warmingStrategies.find(
        (s) => s.name === 'frequent_queries'
      )!;

      // Obter consultas mais frequentes
      const frequentPatterns = Array.from(this.queryPatterns.values())
        .filter((pattern) => pattern.frequency >= strategy.minFrequency)
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, strategy.maxQueries);

      const jobs: PreCacheJob[] = [];

      for (const pattern of frequentPatterns) {
        const job = await this.createPreCacheJob(
          pattern.query,
          pattern.queryType,
          this.calculatePriority(pattern),
          'frequent_queries'
        );
        jobs.push(job);
      }

      await this.executePreCacheJobs(jobs);

      logger.info('Warming de consultas frequentes concluído', {
        component: 'PreCacheService',
        patternsProcessed: frequentPatterns.length,
        jobsCreated: jobs.length,
      });
    } catch (error) {
      logger.error('Erro no warming de consultas frequentes', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Estratégia: Horários de pico
  private async warmPeakHoursQueries(): Promise<void> {
    try {
      const strategy = this.warmingStrategies.find(
        (s) => s.name === 'peak_hours'
      )!;
      const currentHour = new Date().getHours();

      // Obter consultas típicas do horário atual
      const peakPatterns = Array.from(this.queryPatterns.values())
        .filter(
          (pattern) =>
            pattern.timeOfDay.includes(currentHour) &&
            pattern.frequency >= strategy.minFrequency
        )
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, strategy.maxQueries);

      const jobs: PreCacheJob[] = [];

      for (const pattern of peakPatterns) {
        const job = await this.createPreCacheJob(
          pattern.query,
          pattern.queryType,
          this.calculatePriority(pattern) + 1, // Prioridade extra para pico
          'peak_hours'
        );
        jobs.push(job);
      }

      await this.executePreCacheJobs(jobs);

      logger.info('Warming para horário de pico concluído', {
        component: 'PreCacheService',
        currentHour,
        patternsProcessed: peakPatterns.length,
        jobsCreated: jobs.length,
      });
    } catch (error) {
      logger.error('Erro no warming para horário de pico', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Estratégia: Conteúdo novo
  private async warmNewContentQueries(): Promise<void> {
    try {
      const strategy = this.warmingStrategies.find(
        (s) => s.name === 'new_content'
      )!;

      // Simular consultas baseadas em conteúdo novo da base de conhecimento
      // Em implementação real, integrar com KnowledgeBaseService
      const newContentQueries = [
        {
          query: 'novos protocolos fisioterapia',
          type: QueryType.PROTOCOL_SUGGESTION,
        },
        {
          query: 'exercícios recentes reabilitação',
          type: QueryType.EXERCISE_RECOMMENDATION,
        },
        { query: 'técnicas atualizadas', type: QueryType.GENERAL_QUESTION },
      ];

      const jobs: PreCacheJob[] = [];

      for (const queryInfo of newContentQueries.slice(0, strategy.maxQueries)) {
        const job = await this.createPreCacheJob(
          queryInfo.query,
          queryInfo.type,
          3, // Prioridade média para conteúdo novo
          'new_content'
        );
        jobs.push(job);
      }

      await this.executePreCacheJobs(jobs);

      logger.info('Warming de conteúdo novo concluído', {
        component: 'PreCacheService',
        queriesProcessed: newContentQueries.length,
        jobsCreated: jobs.length,
      });
    } catch (error) {
      logger.error('Erro no warming de conteúdo novo', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Estratégia: Contexto do usuário
  private async warmUserContextQueries(): Promise<void> {
    try {
      const strategy = this.warmingStrategies.find(
        (s) => s.name === 'user_context'
      )!;

      // Obter consultas relacionadas baseadas em padrões de uso
      const contextPatterns = Array.from(this.queryPatterns.values())
        .filter((pattern) => pattern.frequency >= strategy.minFrequency)
        .slice(0, strategy.maxQueries);

      const jobs: PreCacheJob[] = [];

      for (const pattern of contextPatterns) {
        // Gerar consultas relacionadas
        const relatedQueries = this.generateRelatedQueries(pattern);

        for (const relatedQuery of relatedQueries.slice(0, 3)) {
          const job = await this.createPreCacheJob(
            relatedQuery.query,
            relatedQuery.queryType,
            2, // Prioridade baixa para contexto
            'user_context'
          );
          jobs.push(job);
        }
      }

      await this.executePreCacheJobs(jobs);

      logger.info('Warming de contexto do usuário concluído', {
        component: 'PreCacheService',
        patternsProcessed: contextPatterns.length,
        jobsCreated: jobs.length,
      });
    } catch (error) {
      logger.error('Erro no warming de contexto do usuário', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Criar job de pré-cache
  private async createPreCacheJob(
    query: string,
    queryType: QueryType,
    priority: number,
    source: string
  ): Promise<PreCacheJob> {
    const job: PreCacheJob = {
      id: this.generateJobId(),
      query,
      queryType,
      priority,
      scheduledFor: new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.preCacheJobs.set(job.id, job);

    logger.debug('Job de pré-cache criado', {
      component: 'PreCacheService',
      jobId: job.id,
      query,
      queryType,
      priority,
      source,
    });

    return job;
  }

  // Executar jobs de pré-cache
  private async executePreCacheJobs(jobs: PreCacheJob[]): Promise<void> {
    // Ordenar por prioridade
    const sortedJobs = jobs.sort((a, b) => b.priority - a.priority);

    for (const job of sortedJobs) {
      if (!this.isRunning) break;

      try {
        job.status = 'running';

        // Simular execução da consulta e cache da resposta
        // Em implementação real, integrar com AIService
        const mockResponse: AIResponse = {
          id: `response_${Date.now()}`,
          queryId: job.id,
          content: `Resposta pré-cacheada para: ${job.query}`,
          confidence: 0.8,
          source: ResponseSource.INTERNAL,
          references: [],
          suggestions: [],
          followUpQuestions: [],
          responseTime: 1500,
          createdAt: new Date().toISOString(),
          metadata: {
            reliability: 0.8,
            relevance: 0.9,
          },
        };

        // Armazenar no cache
        const cacheKey = this.generateCacheKey(job.query, job.queryType);
        await cacheService.set(cacheKey, mockResponse, job.queryType);

        job.status = 'completed';
        job.completedAt = new Date().toISOString();

        logger.debug('Job de pré-cache concluído', {
          component: 'PreCacheService',
          jobId: job.id,
          query: job.query,
          queryType: job.queryType,
        });

        // Pequena pausa entre jobs para não sobrecarregar
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        job.status = 'failed';
        job.error =
          error instanceof Error ? error.message : 'Erro desconhecido';

        logger.error('Erro ao executar job de pré-cache', {
          component: 'PreCacheService',
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  }

  // Gerar consultas relacionadas
  private generateRelatedQueries(
    pattern: QueryPattern
  ): Array<{ query: string; queryType: QueryType }> {
    const related: Array<{ query: string; queryType: QueryType }> = [];

    // Lógica simples para gerar consultas relacionadas
    // Em implementação real, usar NLP ou base de conhecimento
    const baseQuery = pattern.query.toLowerCase();

    if (baseQuery.includes('lombalgia')) {
      related.push(
        {
          query: 'exercícios lombalgia',
          queryType: QueryType.EXERCISE_RECOMMENDATION,
        },
        {
          query: 'protocolo lombalgia aguda',
          queryType: QueryType.PROTOCOL_SUGGESTION,
        }
      );
    }

    if (baseQuery.includes('joelho')) {
      related.push(
        {
          query: 'reabilitação joelho',
          queryType: QueryType.PROTOCOL_SUGGESTION,
        },
        {
          query: 'fortalecimento quadríceps',
          queryType: QueryType.EXERCISE_RECOMMENDATION,
        }
      );
    }

    // Adicionar consultas genéricas relacionadas ao tipo
    switch (pattern.queryType) {
      case QueryType.PROTOCOL_SUGGESTION:
        related.push({
          query: `exercícios ${baseQuery}`,
          queryType: QueryType.EXERCISE_RECOMMENDATION,
        });
        break;
      case QueryType.EXERCISE_RECOMMENDATION:
        related.push({
          query: `protocolo ${baseQuery}`,
          queryType: QueryType.PROTOCOL_SUGGESTION,
        });
        break;
    }

    return related;
  }

  // Calcular prioridade baseada no padrão
  private calculatePriority(pattern: QueryPattern): number {
    let priority = 1;

    // Aumentar prioridade baseado na frequência
    if (pattern.frequency >= 10) priority += 2;
    else if (pattern.frequency >= 5) priority += 1;

    // Aumentar prioridade para consultas recentes
    const daysSinceLastUse =
      (Date.now() - new Date(pattern.lastUsed).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceLastUse <= 1) priority += 1;

    // Aumentar prioridade para consultas de múltiplos usuários
    if (pattern.userRoles.length > 1) priority += 1;

    return Math.min(priority, 5); // Máximo 5
  }

  // Métodos utilitários
  private generatePatternKey(
    query: string,
    queryType: QueryType,
    tenantId: string
  ): string {
    const normalizedQuery = query.toLowerCase().trim();
    return `${tenantId}_${queryType}_${normalizedQuery}`;
  }

  private generateJobId(): string {
    return `precache_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateCacheKey(query: string, queryType: QueryType): string {
    return `${queryType}_${query.toLowerCase().replace(/\s+/g, '_')}`;
  }

  // Métodos públicos para estatísticas e controle

  getPatternStats(): {
    totalPatterns: number;
    avgFrequency: number;
    topPatterns: Array<{
      query: string;
      frequency: number;
      queryType: QueryType;
    }>;
    patternsByType: Record<QueryType, number>;
  } {
    const patterns = Array.from(this.queryPatterns.values());
    const totalPatterns = patterns.length;
    const avgFrequency =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.frequency, 0) / patterns.length
        : 0;

    const topPatterns = patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
      .map((p) => ({
        query: p.query,
        frequency: p.frequency,
        queryType: p.queryType,
      }));

    const patternsByType: Record<QueryType, number> = {} as Record<
      QueryType,
      number
    >;
    Object.values(QueryType).forEach((type) => {
      patternsByType[type] = patterns.filter(
        (p) => p.queryType === type
      ).length;
    });

    return {
      totalPatterns,
      avgFrequency: Math.round(avgFrequency * 100) / 100,
      topPatterns,
      patternsByType,
    };
  }

  getJobStats(): {
    totalJobs: number;
    pendingJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
  } {
    const jobs = Array.from(this.preCacheJobs.values());
    const totalJobs = jobs.length;
    const pendingJobs = jobs.filter((j) => j.status === 'pending').length;
    const completedJobs = jobs.filter((j) => j.status === 'completed').length;
    const failedJobs = jobs.filter((j) => j.status === 'failed').length;
    const successRate = totalJobs > 0 ? completedJobs / totalJobs : 0;

    return {
      totalJobs,
      pendingJobs,
      completedJobs,
      failedJobs,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  // Configurar estratégias
  updateStrategy(
    name: string,
    updates: Partial<CacheWarmingStrategy>
  ): boolean {
    const strategy = this.warmingStrategies.find((s) => s.name === name);
    if (strategy) {
      Object.assign(strategy, updates);
      logger.info(`Estratégia ${name} atualizada`, {
        component: 'PreCacheService',
        updates
      });
      return true;
    }
    return false;
  }

  getStrategies(): CacheWarmingStrategy[] {
    return [...this.warmingStrategies];
  }
}

  // ===== NOVOS MÉTODOS INTELIGENTES =====

  /**
   * Análise inteligente de padrões
   */
  private analyzePatterns(): void {
    try {
      const patterns = Array.from(this.queryPatterns.values());
      
      // Identificar tendências temporais
      this.identifyTemporalTrends(patterns);
      
      // Agrupar padrões similares
      this.clusterSimilarPatterns(patterns);
      
      // Calcular scores de importância
      this.calculateImportanceScores(patterns);
      
      logger.debug('Análise de padrões concluída', {
        component: 'PreCacheService',
        patternsAnalyzed: patterns.length
      });
    } catch (error) {
      logger.error('Erro na análise de padrões', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Identifica tendências temporais nos padrões
   */
  private identifyTemporalTrends(patterns: QueryPattern[]): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    
    patterns.forEach(pattern => {
      // Analisar sazonalidade
      if (!pattern.seasonality) {
        pattern.seasonality = {
          month: [currentMonth],
          trends: 'stable'
        };
      } else {
        if (!pattern.seasonality.month.includes(currentMonth)) {
          pattern.seasonality.month.push(currentMonth);
        }
        
        // Calcular tendência baseada na frequência recente
        const recentUsage = this.calculateRecentUsage(pattern);
        pattern.seasonality.trends = recentUsage > pattern.frequency * 0.8 ? 'increasing' : 
                                   recentUsage < pattern.frequency * 0.5 ? 'decreasing' : 'stable';
      }
    });
  }

  /**
   * Agrupa padrões similares para otimização
   */
  private clusterSimilarPatterns(patterns: QueryPattern[]): void {
    const clusters = new Map<string, QueryPattern[]>();
    
    patterns.forEach(pattern => {
      const clusterKey = this.generateClusterKey(pattern);
      
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(pattern);
    });
    
    // Armazenar clusters para uso posterior
    this.contextualPatterns = clusters;
  }

  /**
   * Calcula scores de importância para priorização
   */
  private calculateImportanceScores(patterns: QueryPattern[]): void {
    patterns.forEach(pattern => {
      let score = 0;
      
      // Frequência (peso 40%)
      score += (pattern.frequency / 100) * 0.4;
      
      // Recência (peso 20%)
      const daysSinceLastUse = (Date.now() - new Date(pattern.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, (30 - daysSinceLastUse) / 30) * 0.2;
      
      // Diversidade de usuários (peso 15%)
      score += (pattern.userRoles.length / 5) * 0.15;
      
      // Taxa de sucesso (peso 15%)
      score += pattern.successRate * 0.15;
      
      // Tendência (peso 10%)
      const trendMultiplier = pattern.seasonality?.trends === 'increasing' ? 1.2 : 
                             pattern.seasonality?.trends === 'decreasing' ? 0.8 : 1.0;
      score *= trendMultiplier;
      
      // Armazenar score no modelo de predição
      this.predictionModel.set(pattern.query, Math.min(1, score));
    });
  }

  /**
   * Atualiza modelo de predição simples
   */
  private updatePredictionModel(): void {
    const patterns = Array.from(this.queryPatterns.values());
    
    // Modelo simples baseado em regressão linear
    patterns.forEach(pattern => {
      const features = [
        pattern.frequency,
        pattern.userRoles.length,
        pattern.timeOfDay.length,
        pattern.successRate,
        this.calculateRecentUsage(pattern)
      ];
      
      // Predição simples: média ponderada das features
      const prediction = features.reduce((sum, feature, index) => {
        const weights = [0.3, 0.2, 0.2, 0.2, 0.1]; // Pesos das features
        return sum + (feature * weights[index]);
      }, 0) / features.length;
      
      this.predictionModel.set(pattern.query, Math.min(1, prediction));
    });
  }

  /**
   * Identifica padrões contextuais
   */
  private identifyContextualPatterns(): void {
    const patterns = Array.from(this.queryPatterns.values());
    
    // Agrupar por contexto (tipo de query + tags)
    const contextGroups = new Map<string, QueryPattern[]>();
    
    patterns.forEach(pattern => {
      const contextKey = `${pattern.queryType}_${pattern.contextTags.join('_')}`;
      
      if (!contextGroups.has(contextKey)) {
        contextGroups.set(contextKey, []);
      }
      contextGroups.get(contextKey)!.push(pattern);
    });
    
    this.contextualPatterns = contextGroups;
  }

  /**
   * Warming preditivo para horários de pico
   */
  private async warmPredictivePeakQueries(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const currentHour = new Date().getHours();
      const nextHour = (currentHour + 1) % 24;
      
      // Predizer consultas para a próxima hora
      const predictedQueries = this.predictQueriesForHour(nextHour);
      
      const jobs: PreCacheJob[] = [];
      
      for (const prediction of predictedQueries.slice(0, 40)) {
        const job = await this.createPreCacheJob(
          prediction.query,
          prediction.queryType,
          Math.ceil(prediction.probability * 5), // Converter probabilidade em prioridade
          'predictive_peak'
        );
        jobs.push(job);
      }
      
      await this.executePreCacheJobs(jobs);
      
      const duration = Date.now() - startTime;
      this.updateStrategyStats('predictive_peak', true, duration);
      
      logger.info('Warming preditivo concluído', {
        component: 'PreCacheService',
        predictedQueries: predictedQueries.length,
        jobsCreated: jobs.length,
        targetHour: nextHour
      });
      
    } catch (error) {
      this.updateStrategyStats('predictive_peak', false, Date.now() - startTime);
      logger.error('Erro no warming preditivo', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Warming contextual baseado em aprendizado
   */
  private async warmContextualQueries(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const jobs: PreCacheJob[] = [];
      
      // Para cada grupo contextual, gerar consultas relacionadas
      for (const [context, patterns] of this.contextualPatterns.entries()) {
        const relatedQueries = this.generateContextualQueries(patterns);
        
        for (const query of relatedQueries.slice(0, 5)) {
          const job = await this.createPreCacheJob(
            query.query,
            query.queryType,
            query.priority,
            'contextual_learning'
          );
          jobs.push(job);
        }
      }
      
      await this.executePreCacheJobs(jobs.slice(0, 25));
      
      const duration = Date.now() - startTime;
      this.updateStrategyStats('contextual_learning', true, duration);
      
      logger.info('Warming contextual concluído', {
        component: 'PreCacheService',
        contextsProcessed: this.contextualPatterns.size,
        jobsCreated: jobs.length
      });
      
    } catch (error) {
      this.updateStrategyStats('contextual_learning', false, Date.now() - startTime);
      logger.error('Erro no warming contextual', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Warming sazonal baseado em padrões temporais
   */
  private async warmSeasonalQueries(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const currentMonth = new Date().getMonth();
      const seasonalPatterns = Array.from(this.queryPatterns.values())
        .filter(pattern => 
          pattern.seasonality?.month.includes(currentMonth) &&
          pattern.seasonality.trends !== 'decreasing'
        )
        .sort((a, b) => b.frequency - a.frequency);
      
      const jobs: PreCacheJob[] = [];
      
      for (const pattern of seasonalPatterns.slice(0, 30)) {
        const job = await this.createPreCacheJob(
          pattern.query,
          pattern.queryType,
          this.calculateSeasonalPriority(pattern),
          'seasonal_adaptation'
        );
        jobs.push(job);
      }
      
      await this.executePreCacheJobs(jobs);
      
      const duration = Date.now() - startTime;
      this.updateStrategyStats('seasonal_adaptation', true, duration);
      
      logger.info('Warming sazonal concluído', {
        component: 'PreCacheService',
        currentMonth,
        seasonalPatterns: seasonalPatterns.length,
        jobsCreated: jobs.length
      });
      
    } catch (error) {
      this.updateStrategyStats('seasonal_adaptation', false, Date.now() - startTime);
      logger.error('Erro no warming sazonal', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Warming colaborativo baseado em usuários similares
   */
  private async warmCollaborativeQueries(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const userSimilarities = this.calculateUserSimilarities();
      const jobs: PreCacheJob[] = [];
      
      for (const [userRole, similarUsers] of userSimilarities.entries()) {
        const recommendedQueries = this.generateCollaborativeRecommendations(userRole, similarUsers);
        
        for (const query of recommendedQueries.slice(0, 4)) {
          const job = await this.createPreCacheJob(
            query.query,
            query.queryType,
            query.priority,
            'collaborative_filtering'
          );
          jobs.push(job);
        }
      }
      
      await this.executePreCacheJobs(jobs.slice(0, 20));
      
      const duration = Date.now() - startTime;
      this.updateStrategyStats('collaborative_filtering', true, duration);
      
      logger.info('Warming colaborativo concluído', {
        component: 'PreCacheService',
        userGroups: userSimilarities.size,
        jobsCreated: jobs.length
      });
      
    } catch (error) {
      this.updateStrategyStats('collaborative_filtering', false, Date.now() - startTime);
      logger.error('Erro no warming colaborativo', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Warming de recuperação para consultas que falharam
   */
  private async warmFailureRecoveryQueries(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const failedJobs = Array.from(this.preCacheJobs.values())
        .filter(job => job.status === 'failed')
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 10);
      
      const jobs: PreCacheJob[] = [];
      
      for (const failedJob of failedJobs) {
        // Tentar novamente com prioridade reduzida
        const job = await this.createPreCacheJob(
          failedJob.query,
          failedJob.queryType,
          Math.max(1, failedJob.priority - 1),
          'failure_recovery'
        );
        jobs.push(job);
      }
      
      await this.executePreCacheJobs(jobs);
      
      const duration = Date.now() - startTime;
      this.updateStrategyStats('failure_recovery', true, duration);
      
      logger.info('Warming de recuperação concluído', {
        component: 'PreCacheService',
        failedJobsRetried: failedJobs.length,
        jobsCreated: jobs.length
      });
      
    } catch (error) {
      this.updateStrategyStats('failure_recovery', false, Date.now() - startTime);
      logger.error('Erro no warming de recuperação', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ===== MÉTODOS AUXILIARES INTELIGENTES =====

  private calculateOptimalInterval(): number {
    // Calcular intervalo ótimo baseado na carga atual e padrões
    const baseInterval = 30 * 60 * 1000; // 30 minutos
    const loadFactor = this.calculateCurrentLoad();
    
    // Ajustar intervalo baseado na carga
    return Math.max(15 * 60 * 1000, baseInterval * (2 - loadFactor));
  }

  private calculateCurrentLoad(): number {
    const runningJobs = Array.from(this.preCacheJobs.values())
      .filter(job => job.status === 'running').length;
    const totalJobs = this.preCacheJobs.size;
    
    return totalJobs > 0 ? runningJobs / totalJobs : 0;
  }

  private async performInitialWarmup(): Promise<void> {
    logger.info('Iniciando warming inicial inteligente', {
      component: 'PreCacheService'
    });
    
    // Executar apenas estratégias críticas no início
    await this.warmFrequentQueries();
    await this.warmPredictivePeakQueries();
  }

  private calculateRecentUsage(pattern: QueryPattern): number {
    const daysSinceLastUse = (Date.now() - new Date(pattern.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, pattern.frequency * Math.exp(-daysSinceLastUse / 7)); // Decay exponencial
  }

  private generateClusterKey(pattern: QueryPattern): string {
    return `${pattern.queryType}_${pattern.contextTags.sort().join('_')}`;
  }

  private predictQueriesForHour(hour: number): Array<{query: string, queryType: QueryType, probability: number}> {
    const predictions: Array<{query: string, queryType: QueryType, probability: number}> = [];
    
    for (const [query, pattern] of this.queryPatterns.entries()) {
      if (pattern.timeOfDay.includes(hour)) {
        const baseProbability = this.predictionModel.get(pattern.query) || 0;
        const hourFrequency = pattern.timeOfDay.filter(h => h === hour).length / pattern.timeOfDay.length;
        const probability = baseProbability * hourFrequency;
        
        predictions.push({
          query: pattern.query,
          queryType: pattern.queryType,
          probability
        });
      }
    }
    
    return predictions.sort((a, b) => b.probability - a.probability);
  }

  private generateContextualQueries(patterns: QueryPattern[]): Array<{query: string, queryType: QueryType, priority: number}> {
    const contextualQueries: Array<{query: string, queryType: QueryType, priority: number}> = [];
    
    // Gerar consultas baseadas em padrões do contexto
    patterns.forEach(pattern => {
      const relatedQueries = this.generateRelatedQueries(pattern);
      relatedQueries.forEach(related => {
        contextualQueries.push({
          ...related,
          priority: Math.ceil((this.predictionModel.get(pattern.query) || 0) * 5)
        });
      });
    });
    
    return contextualQueries;
  }

  private calculateSeasonalPriority(pattern: QueryPattern): number {
    let priority = this.calculatePriority(pattern);
    
    if (pattern.seasonality?.trends === 'increasing') {
      priority += 2;
    }
    
    return Math.min(5, priority);
  }

  private calculateUserSimilarities(): Map<string, string[]> {
    const similarities = new Map<string, string[]>();
    const userPatterns = new Map<string, QueryPattern[]>();
    
    // Agrupar padrões por usuário
    for (const pattern of this.queryPatterns.values()) {
      pattern.userRoles.forEach(role => {
        if (!userPatterns.has(role)) {
          userPatterns.set(role, []);
        }
        userPatterns.get(role)!.push(pattern);
      });
    }
    
    // Calcular similaridades simples baseadas em consultas comuns
    for (const [userRole, patterns] of userPatterns.entries()) {
      const similarUsers: string[] = [];
      
      for (const [otherRole, otherPatterns] of userPatterns.entries()) {
        if (userRole !== otherRole) {
          const commonQueries = patterns.filter(p1 => 
            otherPatterns.some(p2 => p1.query === p2.query)
          ).length;
          
          if (commonQueries >= 2) { // Pelo menos 2 consultas em comum
            similarUsers.push(otherRole);
          }
        }
      }
      
      similarities.set(userRole, similarUsers);
    }
    
    return similarities;
  }

  private generateCollaborativeRecommendations(
    userRole: string, 
    similarUsers: string[]
  ): Array<{query: string, queryType: QueryType, priority: number}> {
    const recommendations: Array<{query: string, queryType: QueryType, priority: number}> = [];
    
    // Encontrar consultas populares entre usuários similares
    const similarUserPatterns = Array.from(this.queryPatterns.values())
      .filter(pattern => pattern.userRoles.some(role => similarUsers.includes(role)))
      .filter(pattern => !pattern.userRoles.includes(userRole)) // Excluir consultas já feitas pelo usuário
      .sort((a, b) => b.frequency - a.frequency);
    
    similarUserPatterns.slice(0, 10).forEach(pattern => {
      recommendations.push({
        query: pattern.query,
        queryType: pattern.queryType,
        priority: Math.ceil(pattern.frequency / 10)
      });
    });
    
    return recommendations;
  }

  private updateStrategyStats(strategyName: string, success: boolean, duration: number): void {
    const strategy = this.warmingStrategies.find(s => s.name === strategyName);
    if (strategy) {
      if (success) {
        strategy.successCount++;
      } else {
        strategy.failureCount++;
      }
      
      // Atualizar média de tempo de execução
      const totalExecutions = strategy.successCount + strategy.failureCount;
      strategy.avgExecutionTime = ((strategy.avgExecutionTime * (totalExecutions - 1)) + duration) / totalExecutions;
      strategy.lastExecuted = new Date().toISOString();
    }
  }

  // Atualizar método de registro de padrões para incluir contexto
  recordQueryPattern(
    query: string,
    queryType: QueryType,
    responseTime: number,
    userRole: string,
    tenantId: string,
    contextTags: string[] = [],
    success: boolean = true
  ): void {
    try {
      const patternKey = this.generatePatternKey(query, queryType, tenantId);
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      const existingPattern = this.queryPatterns.get(patternKey);

      if (existingPattern) {
        // Atualizar padrão existente
        existingPattern.frequency++;
        existingPattern.lastUsed = now.toISOString();
        existingPattern.avgResponseTime =
          (existingPattern.avgResponseTime * (existingPattern.frequency - 1) +
            responseTime) /
          existingPattern.frequency;

        // Atualizar taxa de sucesso
        const totalAttempts = existingPattern.frequency;
        const previousSuccesses = Math.round(existingPattern.successRate * (totalAttempts - 1));
        const newSuccesses = previousSuccesses + (success ? 1 : 0);
        existingPattern.successRate = newSuccesses / totalAttempts;

        if (!existingPattern.userRoles.includes(userRole)) {
          existingPattern.userRoles.push(userRole);
        }

        if (!existingPattern.timeOfDay.includes(hour)) {
          existingPattern.timeOfDay.push(hour);
        }

        if (!existingPattern.dayOfWeek.includes(dayOfWeek)) {
          existingPattern.dayOfWeek.push(dayOfWeek);
        }

        // Atualizar tags de contexto
        contextTags.forEach(tag => {
          if (!existingPattern.contextTags.includes(tag)) {
            existingPattern.contextTags.push(tag);
          }
        });
      } else {
        // Criar novo padrão
        const newPattern: QueryPattern = {
          query,
          queryType,
          frequency: 1,
          lastUsed: now.toISOString(),
          avgResponseTime: responseTime,
          userRoles: [userRole],
          timeOfDay: [hour],
          dayOfWeek: [dayOfWeek],
          tenantId,
          contextTags: [...contextTags],
          successRate: success ? 1.0 : 0.0
        };

        this.queryPatterns.set(patternKey, newPattern);
      }

      logger.debug('Padrão de consulta registrado', {
        component: 'PreCacheService',
        patternKey,
        frequency: this.queryPatterns.get(patternKey)?.frequency,
        queryType,
        userRole,
        contextTags,
        success
      });
    } catch (error) {
      logger.error('Erro ao registrar padrão de consulta', {
        component: 'PreCacheService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Parar serviço atualizado
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = undefined;
    }

    if (this.patternAnalysisInterval) {
      clearInterval(this.patternAnalysisInterval);
      this.patternAnalysisInterval = undefined;
    }

    logger.info('Serviço de pré-cache inteligente parado', {
      component: 'PreCacheService'
    });
  }
}

// Instância singleton
export const preCacheService = new PreCacheService();

export type { QueryPattern, PreCacheJob, CacheWarmingStrategy };
export default PreCacheService;
