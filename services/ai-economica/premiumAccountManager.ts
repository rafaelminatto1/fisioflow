// services/ai-economica/premiumAccountManager.ts
// Gerenciador inteligente das contas premium de IA

import { PremiumProvider, QueryType, AIQuery, AIResponse, UsageStatus, ProviderConfig } from '../../types/ai-economica.types';
import { AI_ECONOMICA_CONFIG, getProviderConfig, getProviderStrategy } from '../../config/ai-economica.config';
import { aiEconomicaLogger } from './logger';
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
    }>;
  };
}

interface ProviderClient {
  query(query: AIQuery): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
  getEstimatedTokens(query: string): number;
}

export class PremiumAccountManager {
  private providers: Map<PremiumProvider, ProviderConfig> = new Map();
  private usageTracker: UsageTracker = {};
  private providerClients: Map<PremiumProvider, ProviderClient> = new Map();
  private lastHealthCheck: Date = new Date();

  constructor() {
    this.initializeProviders();
    this.loadUsageFromStorage();
    this.startUsageResetScheduler();
    this.startHealthCheckScheduler();
  }

  private initializeProviders(): void {
    Object.entries(AI_ECONOMICA_CONFIG.PREMIUM_ACCOUNTS).forEach(([provider, config]) => {
      const providerEnum = provider as PremiumProvider;
      
      this.providers.set(providerEnum, {
        enabled: config.enabled,
        endpoint: config.endpoint,
        monthlyLimit: config.monthlyLimit,
        currentUsage: 0,
        resetDate: this.getNextResetDate()
      });

      // Inicializar tracking de uso
      this.usageTracker[provider] = {
        monthlyUsage: 0,
        dailyUsage: 0,
        lastReset: new Date(),
        requestHistory: []
      };

      // Inicializar cliente específico do provedor
      if (config.enabled) {
        this.initializeProviderClient(providerEnum);
      }
    });
  }

  private initializeProviderClient(provider: PremiumProvider): void {
    switch (provider) {
      case PremiumProvider.CHATGPT_PLUS:
        this.providerClients.set(provider, new ChatGPTClient());
        break;
      case PremiumProvider.GEMINI_PRO:
        this.providerClients.set(provider, new GeminiClient());
        break;
      case PremiumProvider.CLAUDE_PRO:
        this.providerClients.set(provider, new ClaudeClient());
        break;
      case PremiumProvider.PERPLEXITY_PRO:
        this.providerClients.set(provider, new PerplexityClient());
        break;
      case PremiumProvider.MARS_AI_PRO:
        this.providerClients.set(provider, new MarsAIClient());
        break;
    }
  }

  async selectBestProvider(queryType: QueryType): Promise<PremiumProvider | null> {
    try {
      // Obter provedores preferenciais para este tipo de consulta
      const preferredProviders = getProviderStrategy(queryType);
      const availableProviders = await this.getAvailableProviders();
      
      // Encontrar o primeiro provedor preferido que está disponível
      for (const provider of preferredProviders) {
        if (availableProviders.includes(provider)) {
          const usage = await this.getCurrentUsage(provider);
          
          // Verificar se ainda tem quota disponível
          if (usage.status === 'available' || usage.status === 'warning') {
            aiEconomicaLogger.logPremiumUsage(provider, 0, usage.remainingQuota);
            return provider;
          }
        }
      }
      
      // Se nenhum preferido está disponível, usar qualquer um disponível
      for (const provider of availableProviders) {
        const usage = await this.getCurrentUsage(provider);
        if (usage.status === 'available') {
          return provider;
        }
      }
      
      // Nenhum provedor disponível
      aiEconomicaLogger.log('WARN', 'PREMIUM_SELECTION', 'No premium providers available');
      return null;
      
    } catch (error) {
      aiEconomicaLogger.logQueryError('provider_selection', error as Error);
      return null;
    }
  }

  async getAvailableProviders(): Promise<PremiumProvider[]> {
    const available: PremiumProvider[] = [];
    
    for (const [provider, config] of this.providers) {
      if (!config.enabled) continue;
      
      try {
        const client = this.providerClients.get(provider);
        if (client && await client.isAvailable()) {
          const usage = await this.getCurrentUsage(provider);
          if (usage.status !== 'limit_reached') {
            available.push(provider);
          }
        }
      } catch (error) {
        aiEconomicaLogger.log('WARN', 'PROVIDER_CHECK', `Provider ${provider} unavailable: ${error}`);
      }
    }
    
    return available;
  }

  async query(provider: PremiumProvider, query: AIQuery): Promise<AIResponse> {
    const config = this.providers.get(provider);
    if (!config || !config.enabled) {
      throw new Error(`Provider ${provider} not configured or disabled`);
    }

    const client = this.providerClients.get(provider);
    if (!client) {
      throw new Error(`Client for ${provider} not initialized`);
    }

    // Verificar quota antes da consulta
    const usage = await this.getCurrentUsage(provider);
    if (usage.status === 'limit_reached') {
      throw new Error(`Monthly limit reached for ${provider}`);
    }

    const startTime = Date.now();
    let success = false;
    let tokensUsed = 0;

    try {
      // Estimar tokens que serão usados
      tokensUsed = client.getEstimatedTokens(query.text);
      
      // Verificar se a consulta não vai estourar o limite
      if (usage.currentUsage + tokensUsed > usage.monthlyLimit) {
        throw new Error(`Query would exceed monthly limit for ${provider}`);
      }

      // Fazer a consulta
      const response = await client.query(query);
      
      // Atualizar tokens reais usados se disponível
      if (response.tokensUsed) {
        tokensUsed = response.tokensUsed;
      }

      success = true;
      
      // Registrar uso
      await this.trackUsage(provider, tokensUsed, query.type, true);
      
      // Adicionar metadados da resposta
      response.provider = provider;
      response.responseTime = Date.now() - startTime;
      
      return response;
      
    } catch (error) {
      // Registrar tentativa falhada
      await this.trackUsage(provider, tokensUsed, query.type, false);
      
      aiEconomicaLogger.logQueryError(`${provider}_query`, error as Error);
      throw error;
    }
  }

  async trackUsage(provider: PremiumProvider, tokensUsed: number, queryType: QueryType, success: boolean): Promise<void> {
    try {
      const tracker = this.usageTracker[provider];
      if (!tracker) return;

      // Atualizar contadores
      if (success) {
        tracker.monthlyUsage += tokensUsed;
        tracker.dailyUsage += tokensUsed;
      }

      // Adicionar ao histórico
      tracker.requestHistory.push({
        timestamp: new Date(),
        tokensUsed,
        queryType,
        success
      });

      // Manter apenas os últimos 100 registros
      if (tracker.requestHistory.length > 100) {
        tracker.requestHistory = tracker.requestHistory.slice(-100);
      }

      // Atualizar configuração do provedor
      const config = this.providers.get(provider);
      if (config) {
        config.currentUsage = tracker.monthlyUsage;
      }

      // Salvar no storage
      await this.saveUsageToStorage();

      // Verificar alertas
      const usage = await this.getCurrentUsage(provider);
      monitoringService.checkUsageAlert(provider, usage);

      aiEconomicaLogger.logPremiumUsage(provider, tokensUsed, usage.remainingQuota);
      
    } catch (error) {
      console.error(`Erro ao rastrear uso do ${provider}:`, error);
    }
  }

  async getCurrentUsage(provider: PremiumProvider): Promise<UsageStatus> {
    const config = this.providers.get(provider);
    const tracker = this.usageTracker[provider];
    
    if (!config || !tracker) {
      throw new Error(`Provider ${provider} not found`);
    }

    const currentUsage = tracker.monthlyUsage;
    const monthlyLimit = config.monthlyLimit;
    const remainingQuota = Math.max(0, monthlyLimit - currentUsage);
    const usagePercentage = monthlyLimit > 0 ? currentUsage / monthlyLimit : 0;

    let status: UsageStatus['status'] = 'available';
    if (usagePercentage >= 1.0) {
      status = 'limit_reached';
    } else if (usagePercentage >= AI_ECONOMICA_CONFIG.USAGE_ALERTS.CRITICAL_THRESHOLD) {
      status = 'warning';
    }

    return {
      provider,
      monthlyLimit,
      currentUsage,
      remainingQuota,
      resetDate: config.resetDate,
      status
    };
  }

  async getAllUsageStatus(): Promise<UsageStatus[]> {
    const statuses: UsageStatus[] = [];
    
    for (const provider of this.providers.keys()) {
      try {
        const status = await this.getCurrentUsage(provider);
        statuses.push(status);
      } catch (error) {
        console.error(`Erro ao obter status de ${provider}:`, error);
      }
    }
    
    return statuses;
  }

  async resetMonthlyUsage(provider?: PremiumProvider): Promise<void> {
    try {
      if (provider) {
        // Reset específico de um provedor
        const tracker = this.usageTracker[provider];
        if (tracker) {
          tracker.monthlyUsage = 0;
          tracker.lastReset = new Date();
        }
        
        const config = this.providers.get(provider);
        if (config) {
          config.currentUsage = 0;
          config.resetDate = this.getNextResetDate();
        }
        
        aiEconomicaLogger.log('INFO', 'USAGE_RESET', `Monthly usage reset for ${provider}`);
      } else {
        // Reset de todos os provedores
        Object.keys(this.usageTracker).forEach(providerKey => {
          const tracker = this.usageTracker[providerKey];
          tracker.monthlyUsage = 0;
          tracker.lastReset = new Date();
        });
        
        this.providers.forEach((config, provider) => {
          config.currentUsage = 0;
          config.resetDate = this.getNextResetDate();
        });
        
        aiEconomicaLogger.log('INFO', 'USAGE_RESET', 'Monthly usage reset for all providers');
      }
      
      await this.saveUsageToStorage();
      
    } catch (error) {
      console.error('Erro ao resetar uso mensal:', error);
    }
  }

  async getProviderHealth(): Promise<Record<PremiumProvider, {
    available: boolean;
    responseTime: number;
    errorRate: number;
    lastCheck: Date;
  }>> {
    const health: any = {};
    
    for (const [provider, client] of this.providerClients) {
      try {
        const startTime = Date.now();
        const available = await client.isAvailable();
        const responseTime = Date.now() - startTime;
        
        const tracker = this.usageTracker[provider];
        const recentRequests = tracker?.requestHistory.slice(-20) || [];
        const errorRate = recentRequests.length > 0 
          ? recentRequests.filter(r => !r.success).length / recentRequests.length 
          : 0;
        
        health[provider] = {
          available,
          responseTime,
          errorRate,
          lastCheck: new Date()
        };
        
      } catch (error) {
        health[provider] = {
          available: false,
          responseTime: -1,
          errorRate: 1,
          lastCheck: new Date()
        };
      }
    }
    
    return health;
  }

  // Métodos de configuração

  async updateProviderConfig(provider: PremiumProvider, updates: Partial<ProviderConfig>): Promise<void> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not found`);
    }

    Object.assign(config, updates);
    
    // Se foi habilitado, inicializar cliente
    if (updates.enabled && !this.providerClients.has(provider)) {
      this.initializeProviderClient(provider);
    }
    
    // Se foi desabilitado, remover cliente
    if (updates.enabled === false) {
      this.providerClients.delete(provider);
    }
    
    await this.saveConfigToStorage();
    
    aiEconomicaLogger.log('INFO', 'PROVIDER_CONFIG', `Updated config for ${provider}`, updates);
  }

  async testProvider(provider: PremiumProvider): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    try {
      const client = this.providerClients.get(provider);
      if (!client) {
        return {
          success: false,
          responseTime: 0,
          error: 'Client not initialized'
        };
      }

      const startTime = Date.now();
      const testQuery: AIQuery = {
        id: 'test_' + Date.now(),
        text: 'Test query for connectivity',
        type: QueryType.GENERAL_QUESTION,
        context: { userRole: 'admin' },
        priority: 'low',
        maxResponseTime: 10000,
        hash: 'test_hash',
        createdAt: new Date().toISOString()
      };

      await client.query(testQuery);
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime
      };

    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        error: (error as Error).message
      };
    }
  }

  // Métodos privados

  private getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  private async saveUsageToStorage(): Promise<void> {
    try {
      const data = {
        usageTracker: this.usageTracker,
        providers: Array.from(this.providers.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('ai_economica_usage', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar uso no storage:', error);
    }
  }

  private loadUsageFromStorage(): void {
    try {
      const stored = localStorage.getItem('ai_economica_usage');
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.usageTracker) {
        this.usageTracker = data.usageTracker;
      }
      
      if (data.providers) {
        const providersMap = new Map(data.providers);
        providersMap.forEach((config, provider) => {
          const existingConfig = this.providers.get(provider);
          if (existingConfig) {
            existingConfig.currentUsage = config.currentUsage;
            existingConfig.resetDate = new Date(config.resetDate);
          }
        });
      }
      
    } catch (error) {
      console.error('Erro ao carregar uso do storage:', error);
    }
  }

  private async saveConfigToStorage(): Promise<void> {
    try {
      const data = {
        providers: Array.from(this.providers.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('ai_economica_config', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar config no storage:', error);
    }
  }

  private startUsageResetScheduler(): void {
    // Verificar reset mensal a cada hora
    setInterval(async () => {
      const now = new Date();
      
      for (const [provider, config] of this.providers) {
        if (now >= config.resetDate) {
          await this.resetMonthlyUsage(provider);
        }
      }
    }, 60 * 60 * 1000); // 1 hora
  }

  private startHealthCheckScheduler(): void {
    // Health check a cada 15 minutos
    setInterval(async () => {
      try {
        await this.getProviderHealth();
        this.lastHealthCheck = new Date();
      } catch (error) {
        console.error('Erro no health check:', error);
      }
    }, 15 * 60 * 1000); // 15 minutos
  }
}

// Classes de cliente para cada provedor (implementações básicas)

class ChatGPTClient implements ProviderClient {
  async query(query: AIQuery): Promise<AIResponse> {
    // Implementação específica para ChatGPT Plus
    // Por enquanto, simulação
    return {
      id: 'chatgpt_' + Date.now(),
      queryId: query.id,
      content: 'Resposta simulada do ChatGPT Plus',
      confidence: 0.8,
      source: 'premium',
      provider: PremiumProvider.CHATGPT_PLUS,
      references: [],
      suggestions: [],
      followUpQuestions: [],
      tokensUsed: this.getEstimatedTokens(query.text),
      responseTime: 2000,
      createdAt: new Date().toISOString(),
      metadata: {
        reliability: 0.9,
        relevance: 0.8
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    // Verificação real de disponibilidade seria implementada aqui
    return true;
  }

  getEstimatedTokens(query: string): number {
    // Estimativa aproximada: ~4 caracteres por token
    return Math.ceil(query.length / 4);
  }
}

class GeminiClient implements ProviderClient {
  async query(query: AIQuery): Promise<AIResponse> {
    // Implementação específica para Gemini Pro
    return {
      id: 'gemini_' + Date.now(),
      queryId: query.id,
      content: 'Resposta simulada do Gemini Pro',
      confidence: 0.85,
      source: 'premium',
      provider: PremiumProvider.GEMINI_PRO,
      references: [],
      suggestions: [],
      followUpQuestions: [],
      tokensUsed: this.getEstimatedTokens(query.text),
      responseTime: 1500,
      createdAt: new Date().toISOString(),
      metadata: {
        reliability: 0.9,
        relevance: 0.85
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getEstimatedTokens(query: string): number {
    return Math.ceil(query.length / 4);
  }
}

class ClaudeClient implements ProviderClient {
  async query(query: AIQuery): Promise<AIResponse> {
    return {
      id: 'claude_' + Date.now(),
      queryId: query.id,
      content: 'Resposta simulada do Claude Pro',
      confidence: 0.9,
      source: 'premium',
      provider: PremiumProvider.CLAUDE_PRO,
      references: [],
      suggestions: [],
      followUpQuestions: [],
      tokensUsed: this.getEstimatedTokens(query.text),
      responseTime: 1800,
      createdAt: new Date().toISOString(),
      metadata: {
        reliability: 0.95,
        relevance: 0.9
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getEstimatedTokens(query: string): number {
    return Math.ceil(query.length / 4);
  }
}

class PerplexityClient implements ProviderClient {
  async query(query: AIQuery): Promise<AIResponse> {
    return {
      id: 'perplexity_' + Date.now(),
      queryId: query.id,
      content: 'Resposta simulada do Perplexity Pro',
      confidence: 0.8,
      source: 'premium',
      provider: PremiumProvider.PERPLEXITY_PRO,
      references: [],
      suggestions: [],
      followUpQuestions: [],
      tokensUsed: this.getEstimatedTokens(query.text),
      responseTime: 2200,
      createdAt: new Date().toISOString(),
      metadata: {
        reliability: 0.85,
        relevance: 0.8
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getEstimatedTokens(query: string): number {
    return Math.ceil(query.length / 4);
  }
}

class MarsAIClient implements ProviderClient {
  async query(query: AIQuery): Promise<AIResponse> {
    return {
      id: 'marsai_' + Date.now(),
      queryId: query.id,
      content: 'Resposta simulada do Mars AI Pro',
      confidence: 0.75,
      source: 'premium',
      provider: PremiumProvider.MARS_AI_PRO,
      references: [],
      suggestions: [],
      followUpQuestions: [],
      tokensUsed: this.getEstimatedTokens(query.text),
      responseTime: 2500,
      createdAt: new Date().toISOString(),
      metadata: {
        reliability: 0.8,
        relevance: 0.75
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getEstimatedTokens(query: string): number {
    return Math.ceil(query.length / 4);
  }
}