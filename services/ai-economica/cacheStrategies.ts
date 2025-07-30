import { QueryType, CacheStrategy, CacheConfig } from '../../types/ai-economica.types';
import { logger } from './logger';

/**
 * Configurações específicas de cache por tipo de consulta
 * Cada tipo tem TTL, prioridade e estratégias otimizadas
 */
export class CacheStrategies {
  
  /**
   * Estratégias específicas por tipo de consulta
   */
  private readonly strategies: Record<QueryType, CacheStrategy> = {
    // Protocolos clínicos - Cache longo (7 dias)
    [QueryType.PROTOCOL_SUGGESTION]: {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 dias
      priority: 5, // Máxima prioridade
      compressionEnabled: true,
      persistToDisk: true,
      maxSize: 50 * 1024, // 50KB máximo por entrada
      preloadEnabled: true,
      invalidationRules: ['patient_protocol_change', 'protocol_update'],
      description: 'Sugestões de protocolos clínicos - cache longo devido à estabilidade'
    },

    // Diagnósticos - Cache médio (30 dias)
    [QueryType.DIAGNOSIS_HELP]: {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 dias
      priority: 5, // Máxima prioridade
      compressionEnabled: true,
      persistToDisk: true,
      maxSize: 100 * 1024, // 100KB máximo
      preloadEnabled: true,
      invalidationRules: ['diagnosis_criteria_update', 'medical_guidelines_change'],
      description: 'Ajuda diagnóstica - cache longo pois critérios são estáveis'
    },

    // Exercícios - Cache médio (14 dias)
    [QueryType.EXERCISE_RECOMMENDATION]: {
      ttl: 14 * 24 * 60 * 60 * 1000, // 14 dias
      priority: 4, // Alta prioridade
      compressionEnabled: true,
      persistToDisk: true,
      maxSize: 75 * 1024, // 75KB máximo
      preloadEnabled: true,
      invalidationRules: ['exercise_database_update', 'patient_condition_change'],
      description: 'Recomendações de exercícios - cache médio para permitir atualizações'
    },

    // Análise de casos - Cache médio (7 dias)
    [QueryType.CASE_ANALYSIS]: {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 dias
      priority: 3, // Prioridade média-alta
      compressionEnabled: true,
      persistToDisk: true,
      maxSize: 200 * 1024, // 200KB máximo (análises podem ser longas)
      preloadEnabled: false, // Casos são únicos, não vale a pena preload
      invalidationRules: ['case_update', 'analysis_methodology_change'],
      description: 'Análise de casos clínicos - cache médio para casos similares'
    },

    // Pesquisa científica - Cache curto (3 dias)
    [QueryType.RESEARCH_QUERY]: {
      ttl: 3 * 24 * 60 * 60 * 1000, // 3 dias
      priority: 2, // Prioridade média
      compressionEnabled: true,
      persistToDisk: false, // Pesquisas mudam rapidamente
      maxSize: 150 * 1024, // 150KB máximo
      preloadEnabled: false, // Pesquisas são específicas
      invalidationRules: ['new_research_published', 'search_algorithm_update'],
      description: 'Consultas de pesquisa - cache curto devido à natureza dinâmica'
    },

    // Análise de documentos - Cache médio (7 dias)
    [QueryType.DOCUMENT_ANALYSIS]: {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 dias
      priority: 3, // Prioridade média-alta
      compressionEnabled: true,
      persistToDisk: true,
      maxSize: 300 * 1024, // 300KB máximo (documentos podem ser grandes)
      preloadEnabled: false, // Documentos são únicos
      invalidationRules: ['document_update', 'analysis_model_change'],
      description: 'Análise de documentos - cache médio para documentos similares'
    },

    // Perguntas gerais - Cache muito curto (1 dia)
    [QueryType.GENERAL_QUESTION]: {
      ttl: 24 * 60 * 60 * 1000, // 1 dia
      priority: 1, // Menor prioridade
      compressionEnabled: false, // Geralmente são pequenas
      persistToDisk: false, // Não vale a pena persistir
      maxSize: 25 * 1024, // 25KB máximo
      preloadEnabled: false, // Muito variadas para preload
      invalidationRules: ['general_knowledge_update'],
      description: 'Perguntas gerais - cache curto devido à baixa reutilização'
    }
  };

  /**
   * Configurações de cache por contexto clínico
   */
  private readonly contextualConfigs: Record<string, Partial<CacheStrategy>> = {
    // Emergência - Cache mais agressivo
    'emergency': {
      ttl: 60 * 60 * 1000, // 1 hora apenas
      priority: 5,
      persistToDisk: false, // Acesso rápido
      description: 'Contexto de emergência - cache curto mas alta prioridade'
    },

    // Rotina - Cache padrão
    'routine': {
      // Usa configurações padrão do tipo
      description: 'Contexto de rotina - configurações padrão'
    },

    // Pesquisa/Estudo - Cache longo
    'research': {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 dias
      priority: 2, // Menor prioridade que casos clínicos
      persistToDisk: true,
      description: 'Contexto de pesquisa - cache longo para reutilização'
    },

    // Ensino - Cache muito longo
    'education': {
      ttl: 60 * 24 * 60 * 60 * 1000, // 60 dias
      priority: 3,
      persistToDisk: true,
      preloadEnabled: true, // Conteúdo educacional é reutilizado
      description: 'Contexto educacional - cache longo para reutilização em aulas'
    }
  };

  /**
   * Obtém estratégia de cache para um tipo de consulta
   */
  public getStrategy(queryType: QueryType, context?: string): CacheStrategy {
    const baseStrategy = this.strategies[queryType];
    
    if (!baseStrategy) {
      logger.warn('Tipo de consulta não reconhecido, usando estratégia padrão', {
        component: 'CacheStrategies',
        queryType
      });
      return this.getDefaultStrategy();
    }

    // Aplicar configurações contextuais se especificado
    if (context && this.contextualConfigs[context]) {
      const contextConfig = this.contextualConfigs[context];
      const mergedStrategy = { ...baseStrategy, ...contextConfig };
      
      logger.debug('Estratégia contextual aplicada', {
        component: 'CacheStrategies',
        queryType,
        context,
        ttl: mergedStrategy.ttl,
        priority: mergedStrategy.priority
      });
      
      return mergedStrategy;
    }

    return baseStrategy;
  }

  /**
   * Obtém estratégia padrão para casos não mapeados
   */
  private getDefaultStrategy(): CacheStrategy {
    return {
      ttl: 24 * 60 * 60 * 1000, // 1 dia
      priority: 2,
      compressionEnabled: true,
      persistToDisk: false,
      maxSize: 50 * 1024,
      preloadEnabled: false,
      invalidationRules: [],
      description: 'Estratégia padrão para tipos não mapeados'
    };
  }

  /**
   * Calcula TTL dinâmico baseado na frequência de uso
   */
  public calculateDynamicTTL(
    queryType: QueryType, 
    accessCount: number, 
    lastAccessed: number
  ): number {
    const baseStrategy = this.strategies[queryType];
    const baseTTL = baseStrategy.ttl;
    
    // Fator de frequência: mais acessos = TTL maior
    const frequencyFactor = Math.min(2.0, 1 + (accessCount - 1) * 0.1);
    
    // Fator de recência: acesso recente = TTL maior
    const timeSinceAccess = Date.now() - lastAccessed;
    const recencyFactor = timeSinceAccess < 60 * 60 * 1000 ? 1.5 : 1.0; // 1 hora
    
    const dynamicTTL = baseTTL * frequencyFactor * recencyFactor;
    
    // Limitar entre 1 hora e 90 dias
    const minTTL = 60 * 60 * 1000; // 1 hora
    const maxTTL = 90 * 24 * 60 * 60 * 1000; // 90 dias
    
    return Math.max(minTTL, Math.min(maxTTL, dynamicTTL));
  }

  /**
   * Determina se uma entrada deve ser pré-carregada
   */
  public shouldPreload(queryType: QueryType, context?: string): boolean {
    const strategy = this.getStrategy(queryType, context);
    return strategy.preloadEnabled || false;
  }

  /**
   * Verifica se uma entrada deve ser invalidada baseada em regras
   */
  public shouldInvalidate(
    queryType: QueryType, 
    invalidationEvent: string
  ): boolean {
    const strategy = this.strategies[queryType];
    return strategy.invalidationRules?.includes(invalidationEvent) || false;
  }

  /**
   * Obtém configuração de compressão para um tipo
   */
  public getCompressionConfig(queryType: QueryType): {
    enabled: boolean;
    threshold: number;
    algorithm: 'gzip' | 'lz4' | 'simple';
  } {
    const strategy = this.strategies[queryType];
    
    return {
      enabled: strategy.compressionEnabled,
      threshold: strategy.maxSize ? strategy.maxSize * 0.5 : 25 * 1024, // 50% do tamanho máximo
      algorithm: strategy.maxSize && strategy.maxSize > 100 * 1024 ? 'gzip' : 'simple'
    };
  }

  /**
   * Calcula prioridade de eviction (menor = remove primeiro)
   */
  public calculateEvictionPriority(
    queryType: QueryType,
    accessCount: number,
    lastAccessed: number,
    size: number
  ): number {
    const strategy = this.strategies[queryType];
    let priority = strategy.priority;
    
    // Ajustar baseado na frequência de uso
    const frequencyBonus = Math.min(2, accessCount * 0.1);
    priority += frequencyBonus;
    
    // Penalizar entradas antigas
    const ageInHours = (Date.now() - lastAccessed) / (1000 * 60 * 60);
    const agePenalty = Math.min(2, ageInHours / 24); // Máximo 2 pontos de penalidade
    priority -= agePenalty;
    
    // Penalizar entradas muito grandes
    const sizePenalty = size > (strategy.maxSize || 100 * 1024) ? 1 : 0;
    priority -= sizePenalty;
    
    return Math.max(0, priority);
  }

  /**
   * Obtém estatísticas das estratégias
   */
  public getStrategiesStats(): {
    totalStrategies: number;
    strategiesByTTL: Record<string, number>;
    strategiesByPriority: Record<number, number>;
    averageTTL: number;
    averagePriority: number;
  } {
    const strategies = Object.values(this.strategies);
    const totalStrategies = strategies.length;
    
    // Agrupar por TTL
    const strategiesByTTL: Record<string, number> = {};
    strategies.forEach(strategy => {
      const ttlDays = Math.round(strategy.ttl / (24 * 60 * 60 * 1000));
      const key = ttlDays === 0 ? '< 1 dia' : `${ttlDays} dias`;
      strategiesByTTL[key] = (strategiesByTTL[key] || 0) + 1;
    });
    
    // Agrupar por prioridade
    const strategiesByPriority: Record<number, number> = {};
    strategies.forEach(strategy => {
      strategiesByPriority[strategy.priority] = (strategiesByPriority[strategy.priority] || 0) + 1;
    });
    
    // Calcular médias
    const averageTTL = strategies.reduce((sum, s) => sum + s.ttl, 0) / totalStrategies;
    const averagePriority = strategies.reduce((sum, s) => sum + s.priority, 0) / totalStrategies;
    
    return {
      totalStrategies,
      strategiesByTTL,
      strategiesByPriority,
      averageTTL,
      averagePriority
    };
  }

  /**
   * Valida se uma estratégia está bem configurada
   */
  public validateStrategy(queryType: QueryType): {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const strategy = this.strategies[queryType];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Validar TTL
    if (strategy.ttl < 60 * 1000) { // Menos de 1 minuto
      warnings.push('TTL muito baixo pode causar overhead');
    }
    if (strategy.ttl > 90 * 24 * 60 * 60 * 1000) { // Mais de 90 dias
      warnings.push('TTL muito alto pode causar dados obsoletos');
    }
    
    // Validar prioridade
    if (strategy.priority < 1 || strategy.priority > 5) {
      warnings.push('Prioridade deve estar entre 1 e 5');
    }
    
    // Validar tamanho máximo
    if (strategy.maxSize && strategy.maxSize > 1024 * 1024) { // 1MB
      warnings.push('Tamanho máximo muito alto pode impactar performance');
    }
    
    // Recomendações
    if (strategy.priority >= 4 && !strategy.persistToDisk) {
      recommendations.push('Considere persistir no disco para alta prioridade');
    }
    
    if (strategy.maxSize && strategy.maxSize > 50 * 1024 && !strategy.compressionEnabled) {
      recommendations.push('Considere habilitar compressão para entradas grandes');
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  /**
   * Obtém todas as estratégias configuradas
   */
  public getAllStrategies(): Record<QueryType, CacheStrategy> {
    return { ...this.strategies };
  }

  /**
   * Obtém configurações contextuais
   */
  public getContextualConfigs(): Record<string, Partial<CacheStrategy>> {
    return { ...this.contextualConfigs };
  }
}

// Instância singleton
export const cacheStrategies = new CacheStrategies();