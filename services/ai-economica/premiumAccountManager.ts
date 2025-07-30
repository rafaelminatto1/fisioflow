// services/ai-economica/premiumAccountManager.ts
// Gerenciador inteligente das contas premium de IA

import {
  PremiumProvider,
  QueryType,
  AIQuery,
  AIResponse,
  UsageStatus,
  ProviderConfig,
} from '../../types/ai-economica.types';
import {
  DEFAULT_CONFIG,
  PROVIDER_STRATEGY,
  getPreferredProviders,
} from '../../config/ai-economica.config';
import { logger } from './logger';
import { monitoringService } from './monitoringService';

interface UsageTracker {
  [provider: string]: {
    monthlyUsage: number;
    dailyUsage: number;
    lastReset: Date;
    requestHistory: Array<{
      timestamp: Date;
      tokensUsed: number;
      queryType: QueryType;
      success: boolean;
      responseTime: number;
    }>;
  };
}

interface ProviderClient {
  query(query: AIQuery): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
  getEstimatedTokens(query: string): number;
  testConnection(): Promise<boolean>;
}

interface ProviderPerformance {
  averageResponseTime: number;
  successRate: number;
  lastSuccessfulQuery: Date | null;
  consecutiveFailures: number;
  isHealthy: boolean;
}

export class PremiumAccountManager {
  private providers: Map<PremiumProvider, ProviderConfig> = new Map();
  private providerClients: Map<PremiumProvider, ProviderClient> = new Map();
  private usageTracker: UsageTracker = {};
  private performance: Map<PremiumProvider, ProviderPerformance> = new Map();
  private rotationStrategy: 'round_robin' | 'least_used' | 'best_performance' =
    'best_performance';
  private currentProviderIndex = 0;
  private readonly healthCheckInterval = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.initializeProviders();
    this.startHealthChecking();
    this.loadUsageFromStorage();
  }

  /**
   * Executa query usando o provedor mais adequado
   */
  async executeQuery(query: AIQuery): Promise<AIResponse> {
    const startTime = performance.now();

    try {
      // Determina provedor ideal baseado na estratégia
      const provider = await this.selectBestProvider(query);

      if (!provider) {
        throw new Error('Nenhum provedor premium disponível');
      }

      // Verifica limites antes da execução
      const canExecute = await this.checkUsageLimits(provider, query);
      if (!canExecute) {
        // Tenta próximo provedor
        const alternativeProvider = await this.selectAlternativeProvider(
          query,
          [provider]
        );
        if (!alternativeProvider) {
          throw new Error('Todos os provedores atingiram seus limites');
        }
        return this.executeQueryWithProvider(
          alternativeProvider,
          query,
          startTime
        );
      }

      return await this.executeQueryWithProvider(provider, query, startTime);
    } catch (error) {
      logger.error('Erro na execução da query', {
        component: 'PremiumAccountManager',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  /**
   * Executa query com provedor específico
   */
  private async executeQueryWithProvider(
    provider: PremiumProvider,
    query: AIQuery,
    startTime: number
  ): Promise<AIResponse> {
    const client = this.providerClients.get(provider);

    if (!client) {
      throw new Error(`Cliente não disponível para ${provider}`);
    }

    try {
      // Executa query
      const response = await client.query(query);
      const responseTime = performance.now() - startTime;

      // Registra uso bem-sucedido
      await this.recordUsage(provider, query, responseTime, true);
      this.updatePerformanceMetrics(provider, responseTime, true);

      logger.debug('Query executada com sucesso', {
        component: 'PremiumAccountManager',
        provider,
        queryType: query.type,
        responseTime: Math.round(responseTime),
      });

      return response;
    } catch (error) {
      const responseTime = performance.now() - startTime;

      // Registra falha
      await this.recordUsage(provider, query, responseTime, false);
      this.updatePerformanceMetrics(provider, responseTime, false);

      logger.error(`Erro no provedor ${provider}`, {
        component: 'PremiumAccountManager',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  /**
   * Seleciona o melhor provedor baseado na estratégia
   */
  private async selectBestProvider(
    query: AIQuery
  ): Promise<PremiumProvider | null> {
    const availableProviders = await this.getAvailableProviders();
    const preferredProviders = getPreferredProviders(query.type);

    // Filtra provedores preferenciais que estão disponíveis
    const viableProviders = preferredProviders.filter((provider) =>
      availableProviders.includes(provider)
    );

    if (viableProviders.length === 0) {
      return availableProviders.length > 0 ? availableProviders[0] : null;
    }

    switch (this.rotationStrategy) {
      case 'round_robin':
        return this.selectRoundRobin(viableProviders);

      case 'least_used':
        return this.selectLeastUsed(viableProviders);

      case 'best_performance':
        return this.selectBestPerformance(viableProviders);

      default:
        return viableProviders[0];
    }
  }

  /**
   * Obtém provedores disponíveis (habilitados e saudáveis)
   */
  private async getAvailableProviders(): Promise<PremiumProvider[]> {
    const available: PremiumProvider[] = [];

    for (const [provider, config] of this.providers.entries()) {
      if (config.enabled) {
        const performance = this.performance.get(provider);
        if (performance?.isHealthy) {
          available.push(provider);
        }
      }
    }

    return available;
  }

  /**
   * Seleção round-robin
   */
  private selectRoundRobin(providers: PremiumProvider[]): PremiumProvider {
    const provider = providers[this.currentProviderIndex % providers.length];
    this.currentProviderIndex =
      (this.currentProviderIndex + 1) % providers.length;
    return provider;
  }

  /**
   * Seleção pelo menos usado
   */
  private selectLeastUsed(providers: PremiumProvider[]): PremiumProvider {
    return providers.reduce((least, current) => {
      const leastUsage = this.usageTracker[least]?.monthlyUsage || 0;
      const currentUsage = this.usageTracker[current]?.monthlyUsage || 0;
      return currentUsage < leastUsage ? current : least;
    });
  }

  /**
   * Seleção pela melhor performance
   */
  private selectBestPerformance(providers: PremiumProvider[]): PremiumProvider {
    return providers.reduce((best, current) => {
      const bestPerf = this.performance.get(best);
      const currentPerf = this.performance.get(current);

      if (!bestPerf) return current;
      if (!currentPerf) return best;

      // Considera taxa de sucesso e tempo de resposta
      const bestScore =
        bestPerf.successRate * (1 / (bestPerf.averageResponseTime + 1));
      const currentScore =
        currentPerf.successRate * (1 / (currentPerf.averageResponseTime + 1));

      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Verifica limites de uso
   */
  private async checkUsageLimits(
    provider: PremiumProvider,
    query: AIQuery
  ): Promise<boolean> {
    const config = this.providers.get(provider);
    const usage = this.usageTracker[provider];

    if (!config || !usage) return false;

    // Verifica limite mensal
    if (usage.monthlyUsage >= config.monthlyLimit) {
      logger.warn(`Limite mensal atingido para ${provider}`, {
        component: 'PremiumAccountManager'
      });
      return false;
    }

    // Verifica limite de rate (requests por minuto)
    const recentRequests = usage.requestHistory.filter(
      (req) => Date.now() - req.timestamp.getTime() < 60000
    );

    if (recentRequests.length >= DEFAULT_CONFIG.rateLimits.requestsPerMinute) {
      logger.warn(`Rate limit atingido para ${provider}`, {
        component: 'PremiumAccountManager'
      });
      return false;
    }

    return true;
  }

  /**
   * Registra uso do provedor
   */
  private async recordUsage(
    provider: PremiumProvider,
    query: AIQuery,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    const providerKey = provider as string;

    if (!this.usageTracker[providerKey]) {
      this.usageTracker[providerKey] = {
        monthlyUsage: 0,
        dailyUsage: 0,
        lastReset: new Date(),
        requestHistory: [],
      };
    }

    const tracker = this.usageTracker[providerKey];

    // Estima tokens usados (implementação simplificada)
    const estimatedTokens = query.content.length * 0.75; // Aproximação

    tracker.monthlyUsage += estimatedTokens;
    tracker.dailyUsage += estimatedTokens;
    tracker.requestHistory.push({
      timestamp: new Date(),
      tokensUsed: estimatedTokens,
      queryType: query.type,
      success,
      responseTime,
    });

    // Limita histórico a últimas 1000 requests
    if (tracker.requestHistory.length > 1000) {
      tracker.requestHistory = tracker.requestHistory.slice(-1000);
    }

    // Persiste no storage
    await this.saveUsageToStorage();

    // Envia métricas para monitoramento
    monitoringService.recordProviderUsage(provider, {
      tokensUsed: estimatedTokens,
      responseTime,
      success,
      queryType: query.type,
    });
  }

  /**
   * Atualiza métricas de performance
   */
  private updatePerformanceMetrics(
    provider: PremiumProvider,
    responseTime: number,
    success: boolean
  ): void {
    let perf = this.performance.get(provider);

    if (!perf) {
      perf = {
        averageResponseTime: responseTime,
        successRate: success ? 1 : 0,
        lastSuccessfulQuery: success ? new Date() : null,
        consecutiveFailures: success ? 0 : 1,
        isHealthy: success,
      };
      this.performance.set(provider, perf);
      return;
    }

    // Atualiza média de tempo de resposta (média móvel)
    perf.averageResponseTime =
      perf.averageResponseTime * 0.8 + responseTime * 0.2;

    // Atualiza taxa de sucesso
    const recentHistory =
      this.usageTracker[provider]?.requestHistory.slice(-100) || [];
    const recentSuccesses = recentHistory.filter((r) => r.success).length;
    perf.successRate =
      recentHistory.length > 0 ? recentSuccesses / recentHistory.length : 0;

    // Atualiza falhas consecutivas
    if (success) {
      perf.consecutiveFailures = 0;
      perf.lastSuccessfulQuery = new Date();
    } else {
      perf.consecutiveFailures++;
    }

    // Determina se está saudável
    perf.isHealthy = perf.consecutiveFailures < 3 && perf.successRate > 0.7;
  }

  /**
   * Obtém status de uso de todos os provedores
   */
  async getUsageStatus(): Promise<UsageStatus[]> {
    const status: UsageStatus[] = [];

    for (const [provider, config] of this.providers.entries()) {
      const usage = this.usageTracker[provider];
      const performance = this.performance.get(provider);

      status.push({
        provider,
        enabled: config.enabled,
        monthlyUsage: usage?.monthlyUsage || 0,
        monthlyLimit: config.monthlyLimit,
        dailyUsage: usage?.dailyUsage || 0,
        isHealthy: performance?.isHealthy || false,
        averageResponseTime: performance?.averageResponseTime || 0,
        successRate: performance?.successRate || 0,
        lastSuccessfulQuery: performance?.lastSuccessfulQuery || null,
      });
    }

    return status;
  }

  /**
   * Força health check de todos os provedores
   */
  async performHealthCheck(): Promise<void> {
    logger.info('Iniciando health check dos provedores', {
      component: 'PremiumAccountManager'
    });

    const promises = Array.from(this.providerClients.entries()).map(
      async ([provider, client]) => {
        try {
          const isHealthy = await client.testConnection();
          const perf = this.performance.get(provider);

          if (perf) {
            perf.isHealthy = isHealthy;
            if (!isHealthy) {
              perf.consecutiveFailures++;
            }
          }

          logger.debug(`Health check ${provider}`, {
            component: 'PremiumAccountManager',
            isHealthy
          });
        } catch (error) {
          logger.error(`Health check falhou ${provider}`, {
            component: 'PremiumAccountManager',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });

          const perf = this.performance.get(provider);
          if (perf) {
            perf.isHealthy = false;
            perf.consecutiveFailures++;
          }
        }
      }
    );

    await Promise.allSettled(promises);
  }

  /**
   * Persiste dados de uso no localStorage
   */
  private async saveUsageToStorage(): Promise<void> {
    try {
      const data = {
        usageTracker: this.usageTracker,
        performance: Object.fromEntries(this.performance.entries()),
        lastSaved: Date.now(),
      };

      localStorage.setItem('ai-economica-usage', JSON.stringify(data));
    } catch (error) {
      logger.error('Erro ao salvar dados de uso', {
        component: 'PremiumAccountManager',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Carrega dados de uso do localStorage
   */
  private loadUsageFromStorage(): void {
    try {
      const data = localStorage.getItem('ai-economica-usage');
      if (!data) return;

      const parsed = JSON.parse(data);

      if (parsed.usageTracker) {
        this.usageTracker = parsed.usageTracker;
      }

      if (parsed.performance) {
        this.performance = new Map(Object.entries(parsed.performance));
      }

      logger.debug('Dados de uso carregados do storage', {
        component: 'PremiumAccountManager'
      });
    } catch (error) {
      logger.error('Erro ao carregar dados de uso', {
        component: 'PremiumAccountManager',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Inicia health checking periódico
   */
  private startHealthChecking(): void {
    // Health check inicial
    setTimeout(() => this.performHealthCheck(), 5000);

    // Health check periódico
    setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Redefine dados de uso mensal
   */
  resetMonthlyUsage(): void {
    Object.values(this.usageTracker).forEach((tracker) => {
      tracker.monthlyUsage = 0;
      tracker.lastReset = new Date();
    });

    this.saveUsageToStorage();
    logger.info('Uso mensal resetado', {
      component: 'PremiumAccountManager'
    });
  }

  /**
   * Obtém provedor alternativo excluindo os especificados
   */
  private async selectAlternativeProvider(
    query: AIQuery,
    excludeProviders: PremiumProvider[]
  ): Promise<PremiumProvider | null> {
    const availableProviders = await this.getAvailableProviders();
    const alternatives = availableProviders.filter(
      (p) => !excludeProviders.includes(p)
    );

    if (alternatives.length === 0) return null;

    return this.selectBestPerformance(alternatives);
  }

  /**
   * Configura estratégia de rotação
   */
  setRotationStrategy(
    strategy: 'round_robin' | 'least_used' | 'best_performance'
  ): void {
    this.rotationStrategy = strategy;
    logger.info('Estratégia de rotação alterada', {
      component: 'PremiumAccountManager',
      strategy,
    });
  }

  /**
   * Inicializa provedores (implementação básica)
   */
  private initializeProviders(): void {
    // Implementação básica - em produção seria mais robusta
    logger.info('Provedores inicializados', {
      component: 'PremiumAccountManager'
    });
  }
}

// Instância singleton
export const premiumAccountManager = new PremiumAccountManager();

export default premiumAccountManager;
