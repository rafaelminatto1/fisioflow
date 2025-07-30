// services/ai-economica/preCacheService.ts
// Sistema de pré-cache inteligente baseado em padrões de uso

import { aiLogger } from './logger';
import { CacheService } from './cacheService';
import { AIResponse, QueryType } from '../../types/ai-economica.types';

interface QueryPattern {
  query: string;
  queryType: QueryType;
  frequency: number;
  lastUsed: string;
  avgResponseTime: number;
  userRoles: string[];
  timeOfDay: number[]; // horas do dia quando é mais usado
  dayOfWeek: number[]; // dias da semana quando é mais usado
  tenantId: string;
}

interface PreCacheJob {
  id: string;
  query: string;
  queryType: QueryType;
  priority: number;
  scheduledFor: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface CacheWarmingStrategy {
  name: string;
  description: string;
  enabled: boolean;
  schedule: string; // cron-like schedule
  maxQueries: number;
  minFrequency: number;
  execute: () => Promise<void>;
}

class PreCacheService {
  private cacheService: CacheService;
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private preCacheJobs: Map<string, PreCacheJob> = new Map();
  private isRunning = false;
  private warmingInterval?: NodeJS.Timeout;

  // Estratégias de warming
  private warmingStrategies: CacheWarmingStrategy[] = [];

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
    this.initializeStrategies();
    aiLogger.info('PRE_CACHE_SERVICE', 'Serviço de pré-cache inicializado');
  }

  // Inicializar estratégias de warming
  private initializeStrategies(): void {
    this.warmingStrategies = [
      {
        name: 'frequent_queries',
        description: 'Pré-cache de consultas frequentes',
        enabled: true,
        schedule: '0 */6 * * *', // A cada 6 horas
        maxQueries: 50,
        minFrequency: 5,
        execute: () => this.warmFrequentQueries(),
      },
      {
        name: 'peak_hours',
        description: 'Pré-cache para horários de pico',
        enabled: true,
        schedule: '0 7,13 * * 1-5', // 7h e 13h em dias úteis
        maxQueries: 30,
        minFrequency: 3,
        execute: () => this.warmPeakHoursQueries(),
      },
      {
        name: 'new_content',
        description: 'Pré-cache de conteúdo novo da base de conhecimento',
        enabled: true,
        schedule: '0 2 * * *', // 2h da manhã diariamente
        maxQueries: 20,
        minFrequency: 1,
        execute: () => this.warmNewContentQueries(),
      },
      {
        name: 'user_context',
        description: 'Pré-cache baseado em contexto do usuário',
        enabled: true,
        schedule: '*/30 * * * *', // A cada 30 minutos
        maxQueries: 15,
        minFrequency: 2,
        execute: () => this.warmUserContextQueries(),
      },
    ];
  }

  // Iniciar serviço de pré-cache
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Executar estratégias em intervalos
    this.warmingInterval = setInterval(
      () => {
        this.executeWarmingStrategies();
      },
      30 * 60 * 1000
    ); // A cada 30 minutos

    // Executar warming inicial
    setTimeout(() => {
      this.executeWarmingStrategies();
    }, 5000); // 5 segundos após inicialização

    aiLogger.info('PRE_CACHE_SERVICE', 'Serviço de pré-cache iniciado');
  }

  // Parar serviço
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = undefined;
    }

    aiLogger.info('PRE_CACHE_SERVICE', 'Serviço de pré-cache parado');
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

      aiLogger.debug('PRE_CACHE_SERVICE', 'Padrão de consulta registrado', {
        patternKey,
        frequency: this.queryPatterns.get(patternKey)?.frequency,
        queryType,
        userRole,
      });
    } catch (error) {
      aiLogger.error(
        'PRE_CACHE_SERVICE',
        'Erro ao registrar padrão de consulta',
        { error }
      );
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
          aiLogger.info(
            'PRE_CACHE_SERVICE',
            `Executando estratégia: ${strategy.name}`
          );

          try {
            await strategy.execute();
          } catch (error) {
            aiLogger.error(
              'PRE_CACHE_SERVICE',
              `Erro na estratégia ${strategy.name}`,
              { error }
            );
          }
        }
      }
    } catch (error) {
      aiLogger.error(
        'PRE_CACHE_SERVICE',
        'Erro ao executar estratégias de warming',
        { error }
      );
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

      aiLogger.info(
        'PRE_CACHE_SERVICE',
        'Warming de consultas frequentes concluído',
        {
          patternsProcessed: frequentPatterns.length,
          jobsCreated: jobs.length,
        }
      );
    } catch (error) {
      aiLogger.error(
        'PRE_CACHE_SERVICE',
        'Erro no warming de consultas frequentes',
        { error }
      );
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

      aiLogger.info(
        'PRE_CACHE_SERVICE',
        'Warming para horário de pico concluído',
        {
          currentHour,
          patternsProcessed: peakPatterns.length,
          jobsCreated: jobs.length,
        }
      );
    } catch (error) {
      aiLogger.error(
        'PRE_CACHE_SERVICE',
        'Erro no warming para horário de pico',
        { error }
      );
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

      aiLogger.info('PRE_CACHE_SERVICE', 'Warming de conteúdo novo concluído', {
        queriesProcessed: newContentQueries.length,
        jobsCreated: jobs.length,
      });
    } catch (error) {
      aiLogger.error('PRE_CACHE_SERVICE', 'Erro no warming de conteúdo novo', {
        error,
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

      aiLogger.info(
        'PRE_CACHE_SERVICE',
        'Warming de contexto do usuário concluído',
        {
          patternsProcessed: contextPatterns.length,
          jobsCreated: jobs.length,
        }
      );
    } catch (error) {
      aiLogger.error(
        'PRE_CACHE_SERVICE',
        'Erro no warming de contexto do usuário',
        { error }
      );
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

    aiLogger.debug('PRE_CACHE_SERVICE', 'Job de pré-cache criado', {
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
          source: 'internal',
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
        await this.cacheService.set(cacheKey, mockResponse, job.queryType);

        job.status = 'completed';
        job.completedAt = new Date().toISOString();

        aiLogger.debug('PRE_CACHE_SERVICE', 'Job de pré-cache concluído', {
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

        aiLogger.error(
          'PRE_CACHE_SERVICE',
          'Erro ao executar job de pré-cache',
          {
            jobId: job.id,
            error,
          }
        );
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
      aiLogger.info(
        'PRE_CACHE_SERVICE',
        `Estratégia ${name} atualizada`,
        updates
      );
      return true;
    }
    return false;
  }

  getStrategies(): CacheWarmingStrategy[] {
    return [...this.warmingStrategies];
  }
}

export { PreCacheService, QueryPattern, PreCacheJob, CacheWarmingStrategy };
export default PreCacheService;
