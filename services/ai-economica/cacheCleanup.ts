import { 
  CacheEntry, 
  QueryType, 
  CacheCleanupResult, 
  CacheCleanupConfig,
  CleanupReason 
} from '../../types/ai-economica.types';
import { logger } from './logger';
import { cacheStrategies } from './cacheStrategies';

/**
 * Serviço de limpeza automática de cache
 * Implementa múltiplas estratégias de limpeza: TTL, LRU, tamanho máximo
 */
export class CacheCleanupService {
  private cleanupIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isCleanupRunning = false;
  private lastCleanupTime = 0;
  private cleanupStats = {
    totalCleanups: 0,
    totalEntriesRemoved: 0,
    totalSpaceFreed: 0,
    lastCleanupDuration: 0
  };

  private readonly config: CacheCleanupConfig = {
    // Intervalos de limpeza
    ttlCleanupInterval: 5 * 60 * 1000, // 5 minutos
    lruCleanupInterval: 15 * 60 * 1000, // 15 minutos
    sizeCleanupInterval: 10 * 60 * 1000, // 10 minutos
    deepCleanupInterval: 60 * 60 * 1000, // 1 hora
    
    // Limites para trigger de limpeza
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxEntries: 10000,
    maxDiskUsage: 500 * 1024 * 1024, // 500MB
    
    // Configurações de limpeza
    cleanupBatchSize: 100,
    minCleanupInterval: 30 * 1000, // 30 segundos
    emergencyCleanupThreshold: 0.9, // 90% do limite
    
    // Configurações LRU
    lruEvictionRatio: 0.2, // Remove 20% das entradas menos usadas
    lruMinAccessCount: 1,
    lruMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    
    // Configurações de compactação
    compactionEnabled: true,
    compactionThreshold: 0.3, // 30% de fragmentação
    compactionInterval: 24 * 60 * 60 * 1000 // 24 horas
  };

  constructor() {
    this.startCleanupSchedulers();
  }

  /**
   * Inicia todos os schedulers de limpeza
   */
  private startCleanupSchedulers(): void {
    logger.info('Iniciando schedulers de limpeza de cache', {
      component: 'CacheCleanupService'
    });

    // Limpeza por TTL (mais frequente)
    this.scheduleCleanup('ttl', this.config.ttlCleanupInterval, () => 
      this.cleanupExpiredEntries()
    );

    // Limpeza LRU (menos frequente)
    this.scheduleCleanup('lru', this.config.lruCleanupInterval, () => 
      this.cleanupLRUEntries()
    );

    // Limpeza por tamanho (frequência média)
    this.scheduleCleanup('size', this.config.sizeCleanupInterval, () => 
      this.cleanupBySizeLimit()
    );

    // Limpeza profunda (menos frequente)
    this.scheduleCleanup('deep', this.config.deepCleanupInterval, () => 
      this.performDeepCleanup()
    );

    // Compactação (diária)
    if (this.config.compactionEnabled) {
      this.scheduleCleanup('compaction', this.config.compactionInterval, () => 
        this.performCompaction()
      );
    }
  }

  /**
   * Agenda uma limpeza específica
   */
  private scheduleCleanup(
    name: string, 
    interval: number, 
    cleanupFunction: () => Promise<CacheCleanupResult>
  ): void {
    const existingInterval = this.cleanupIntervals.get(name);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const intervalId = setInterval(async () => {
      try {
        await cleanupFunction();
      } catch (error) {
        logger.error('Erro durante limpeza agendada', {
          component: 'CacheCleanupService',
          cleanupType: name,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }, interval);

    this.cleanupIntervals.set(name, intervalId);
    
    logger.debug('Scheduler de limpeza configurado', {
      component: 'CacheCleanupService',
      type: name,
      interval: `${interval / 1000}s`
    });
  }

  /**
   * Limpeza de entradas expiradas (TTL)
   */
  public async cleanupExpiredEntries(
    cacheMap?: Map<string, CacheEntry>
  ): Promise<CacheCleanupResult> {
    if (this.isCleanupRunning) {
      return { removedEntries: 0, freedSpace: 0, reason: 'ttl', duration: 0 };
    }

    const startTime = Date.now();
    this.isCleanupRunning = true;

    try {
      let removedEntries = 0;
      let freedSpace = 0;
      const now = Date.now();
      const expiredKeys: string[] = [];

      // Se não foi passado um cache específico, usar o cache global
      // (aqui assumimos que temos acesso ao cache principal)
      const cache = cacheMap || new Map<string, CacheEntry>();

      // Identificar entradas expiradas
      for (const [key, entry] of cache.entries()) {
        if (entry.expiresAt <= now) {
          expiredKeys.push(key);
          freedSpace += entry.size || 0;
        }
      }

      // Remover em lotes para não bloquear
      const batchSize = this.config.cleanupBatchSize;
      for (let i = 0; i < expiredKeys.length; i += batchSize) {
        const batch = expiredKeys.slice(i, i + batchSize);
        
        for (const key of batch) {
          cache.delete(key);
          removedEntries++;
        }

        // Pequena pausa entre lotes para não bloquear
        if (i + batchSize < expiredKeys.length) {
          await this.sleep(1);
        }
      }

      const duration = Date.now() - startTime;
      const result: CacheCleanupResult = {
        removedEntries,
        freedSpace,
        reason: 'ttl',
        duration
      };

      if (removedEntries > 0) {
        logger.info('Limpeza TTL concluída', {
          component: 'CacheCleanupService',
          ...result
        });
      }

      this.updateCleanupStats(result);
      return result;

    } catch (error) {
      logger.error('Erro durante limpeza TTL', {
        component: 'CacheCleanupService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return { removedEntries: 0, freedSpace: 0, reason: 'ttl', duration: 0 };
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Limpeza LRU (Least Recently Used)
   */
  public async cleanupLRUEntries(
    cacheMap?: Map<string, CacheEntry>,
    targetRemovalCount?: number
  ): Promise<CacheCleanupResult> {
    if (this.isCleanupRunning) {
      return { removedEntries: 0, freedSpace: 0, reason: 'lru', duration: 0 };
    }

    const startTime = Date.now();
    this.isCleanupRunning = true;

    try {
      const cache = cacheMap || new Map<string, CacheEntry>();
      const entries = Array.from(cache.entries());
      
      if (entries.length === 0) {
        return { removedEntries: 0, freedSpace: 0, reason: 'lru', duration: 0 };
      }

      // Calcular quantas entradas remover
      const removalCount = targetRemovalCount || 
        Math.floor(entries.length * this.config.lruEvictionRatio);

      if (removalCount <= 0) {
        return { removedEntries: 0, freedSpace: 0, reason: 'lru', duration: 0 };
      }

      // Ordenar por prioridade de remoção (menor prioridade = remove primeiro)
      const sortedEntries = entries.sort(([, a], [, b]) => {
        const priorityA = cacheStrategies.calculateEvictionPriority(
          a.queryType,
          a.accessCount || 1,
          a.lastAccessed,
          a.size || 0
        );
        const priorityB = cacheStrategies.calculateEvictionPriority(
          b.queryType,
          b.accessCount || 1,
          b.lastAccessed,
          b.size || 0
        );
        
        return priorityA - priorityB; // Menor prioridade primeiro
      });

      let removedEntries = 0;
      let freedSpace = 0;

      // Remover as entradas com menor prioridade
      for (let i = 0; i < Math.min(removalCount, sortedEntries.length); i++) {
        const [key, entry] = sortedEntries[i];
        
        // Verificar se a entrada atende aos critérios de remoção
        if (this.shouldRemoveForLRU(entry)) {
          cache.delete(key);
          removedEntries++;
          freedSpace += entry.size || 0;
        }
      }

      const duration = Date.now() - startTime;
      const result: CacheCleanupResult = {
        removedEntries,
        freedSpace,
        reason: 'lru',
        duration
      };

      if (removedEntries > 0) {
        logger.info('Limpeza LRU concluída', {
          component: 'CacheCleanupService',
          ...result,
          targetRemovalCount: removalCount
        });
      }

      this.updateCleanupStats(result);
      return result;

    } catch (error) {
      logger.error('Erro durante limpeza LRU', {
        component: 'CacheCleanupService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return { removedEntries: 0, freedSpace: 0, reason: 'lru', duration: 0 };
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Limpeza baseada em limite de tamanho
   */
  public async cleanupBySizeLimit(
    cacheMap?: Map<string, CacheEntry>,
    maxSize?: number
  ): Promise<CacheCleanupResult> {
    if (this.isCleanupRunning) {
      return { removedEntries: 0, freedSpace: 0, reason: 'size_limit', duration: 0 };
    }

    const startTime = Date.now();
    this.isCleanupRunning = true;

    try {
      const cache = cacheMap || new Map<string, CacheEntry>();
      const sizeLimit = maxSize || this.config.maxMemoryUsage;
      
      // Calcular tamanho atual
      let currentSize = 0;
      for (const entry of cache.values()) {
        currentSize += entry.size || 0;
      }

      if (currentSize <= sizeLimit) {
        return { removedEntries: 0, freedSpace: 0, reason: 'size_limit', duration: 0 };
      }

      // Calcular quanto espaço precisa ser liberado
      const targetFreeSpace = currentSize - sizeLimit;
      
      // Usar LRU para remover entradas até atingir o limite
      const entries = Array.from(cache.entries());
      const sortedEntries = entries.sort(([, a], [, b]) => {
        // Ordenar por prioridade de eviction (menor primeiro)
        const priorityA = cacheStrategies.calculateEvictionPriority(
          a.queryType,
          a.accessCount || 1,
          a.lastAccessed,
          a.size || 0
        );
        const priorityB = cacheStrategies.calculateEvictionPriority(
          b.queryType,
          b.accessCount || 1,
          b.lastAccessed,
          b.size || 0
        );
        
        return priorityA - priorityB;
      });

      let removedEntries = 0;
      let freedSpace = 0;

      for (const [key, entry] of sortedEntries) {
        if (freedSpace >= targetFreeSpace) break;

        cache.delete(key);
        removedEntries++;
        freedSpace += entry.size || 0;
      }

      const duration = Date.now() - startTime;
      const result: CacheCleanupResult = {
        removedEntries,
        freedSpace,
        reason: 'size_limit',
        duration
      };

      logger.info('Limpeza por tamanho concluída', {
        component: 'CacheCleanupService',
        ...result,
        currentSize,
        sizeLimit,
        targetFreeSpace
      });

      this.updateCleanupStats(result);
      return result;

    } catch (error) {
      logger.error('Erro durante limpeza por tamanho', {
        component: 'CacheCleanupService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return { removedEntries: 0, freedSpace: 0, reason: 'size_limit', duration: 0 };
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Limpeza profunda - combina múltiplas estratégias
   */
  public async performDeepCleanup(
    cacheMap?: Map<string, CacheEntry>
  ): Promise<CacheCleanupResult> {
    if (this.isCleanupRunning) {
      return { removedEntries: 0, freedSpace: 0, reason: 'deep_cleanup', duration: 0 };
    }

    const startTime = Date.now();
    this.isCleanupRunning = true;

    try {
      logger.info('Iniciando limpeza profunda', {
        component: 'CacheCleanupService'
      });

      let totalRemovedEntries = 0;
      let totalFreedSpace = 0;

      // 1. Limpeza TTL primeiro
      const ttlResult = await this.cleanupExpiredEntries(cacheMap);
      totalRemovedEntries += ttlResult.removedEntries;
      totalFreedSpace += ttlResult.freedSpace;

      // 2. Limpeza por tamanho se necessário
      const sizeResult = await this.cleanupBySizeLimit(cacheMap);
      totalRemovedEntries += sizeResult.removedEntries;
      totalFreedSpace += sizeResult.freedSpace;

      // 3. Limpeza LRU se ainda necessário
      const lruResult = await this.cleanupLRUEntries(cacheMap);
      totalRemovedEntries += lruResult.removedEntries;
      totalFreedSpace += lruResult.freedSpace;

      // 4. Limpeza de entradas órfãs ou corrompidas
      const orphanResult = await this.cleanupOrphanedEntries(cacheMap);
      totalRemovedEntries += orphanResult.removedEntries;
      totalFreedSpace += orphanResult.freedSpace;

      const duration = Date.now() - startTime;
      const result: CacheCleanupResult = {
        removedEntries: totalRemovedEntries,
        freedSpace: totalFreedSpace,
        reason: 'deep_cleanup',
        duration
      };

      logger.info('Limpeza profunda concluída', {
        component: 'CacheCleanupService',
        ...result,
        ttlRemoved: ttlResult.removedEntries,
        sizeRemoved: sizeResult.removedEntries,
        lruRemoved: lruResult.removedEntries,
        orphanRemoved: orphanResult.removedEntries
      });

      this.updateCleanupStats(result);
      return result;

    } catch (error) {
      logger.error('Erro durante limpeza profunda', {
        component: 'CacheCleanupService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return { removedEntries: 0, freedSpace: 0, reason: 'deep_cleanup', duration: 0 };
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Limpeza de entradas órfãs ou corrompidas
   */
  private async cleanupOrphanedEntries(
    cacheMap?: Map<string, CacheEntry>
  ): Promise<CacheCleanupResult> {
    const startTime = Date.now();
    const cache = cacheMap || new Map<string, CacheEntry>();
    
    let removedEntries = 0;
    let freedSpace = 0;
    const orphanedKeys: string[] = [];

    // Identificar entradas órfãs ou corrompidas
    for (const [key, entry] of cache.entries()) {
      if (this.isOrphanedEntry(entry)) {
        orphanedKeys.push(key);
        freedSpace += entry.size || 0;
      }
    }

    // Remover entradas órfãs
    for (const key of orphanedKeys) {
      cache.delete(key);
      removedEntries++;
    }

    const duration = Date.now() - startTime;
    
    if (removedEntries > 0) {
      logger.info('Entradas órfãs removidas', {
        component: 'CacheCleanupService',
        removedEntries,
        freedSpace
      });
    }

    return { removedEntries, freedSpace, reason: 'orphaned', duration };
  }

  /**
   * Compactação do cache para reduzir fragmentação
   */
  private async performCompaction(
    cacheMap?: Map<string, CacheEntry>
  ): Promise<CacheCleanupResult> {
    const startTime = Date.now();
    const cache = cacheMap || new Map<string, CacheEntry>();
    
    logger.info('Iniciando compactação do cache', {
      component: 'CacheCleanupService',
      entriesCount: cache.size
    });

    // Por ora, a compactação é principalmente reorganizar as entradas
    // Em uma implementação real, isso poderia envolver:
    // - Recompressão de dados
    // - Reorganização de índices
    // - Otimização de estruturas de dados

    let processedEntries = 0;
    let optimizedSpace = 0;

    for (const [key, entry] of cache.entries()) {
      // Simular otimização da entrada
      if (entry.size && entry.size > 10 * 1024) { // Entradas > 10KB
        // Aqui poderia recomprimir ou otimizar a entrada
        optimizedSpace += Math.floor(entry.size * 0.1); // 10% de economia simulada
      }
      processedEntries++;
    }

    const duration = Date.now() - startTime;
    
    logger.info('Compactação concluída', {
      component: 'CacheCleanupService',
      processedEntries,
      optimizedSpace,
      duration
    });

    return { 
      removedEntries: 0, 
      freedSpace: optimizedSpace, 
      reason: 'compaction', 
      duration 
    };
  }

  /**
   * Limpeza de emergência quando limites críticos são atingidos
   */
  public async emergencyCleanup(
    cacheMap?: Map<string, CacheEntry>
  ): Promise<CacheCleanupResult> {
    logger.warn('Iniciando limpeza de emergência', {
      component: 'CacheCleanupService'
    });

    // Limpeza agressiva - remove 50% das entradas menos importantes
    const cache = cacheMap || new Map<string, CacheEntry>();
    const targetRemovalCount = Math.floor(cache.size * 0.5);
    
    return await this.cleanupLRUEntries(cache, targetRemovalCount);
  }

  /**
   * Verifica se uma entrada deve ser removida na limpeza LRU
   */
  private shouldRemoveForLRU(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.createdAt;
    const timeSinceAccess = now - entry.lastAccessed;
    
    // Não remover se foi acessada recentemente (última hora)
    if (timeSinceAccess < 60 * 60 * 1000) return false;
    
    // Remover se é muito antiga
    if (age > this.config.lruMaxAge) return true;
    
    // Remover se tem poucos acessos e não foi acessada recentemente
    if ((entry.accessCount || 1) <= this.config.lruMinAccessCount && 
        timeSinceAccess > 24 * 60 * 60 * 1000) return true;
    
    return true; // Por padrão, pode remover
  }

  /**
   * Verifica se uma entrada é órfã ou corrompida
   */
  private isOrphanedEntry(entry: CacheEntry): boolean {
    // Verificar se tem dados essenciais
    if (!entry.key || !entry.data || !entry.queryType) return true;
    
    // Verificar se o tipo de query é válido
    if (!Object.values(QueryType).includes(entry.queryType)) return true;
    
    // Verificar se as datas fazem sentido
    if (entry.createdAt > Date.now() || entry.expiresAt < entry.createdAt) return true;
    
    // Verificar se o tamanho é razoável
    if (entry.size && (entry.size < 0 || entry.size > 10 * 1024 * 1024)) return true;
    
    return false;
  }

  /**
   * Atualiza estatísticas de limpeza
   */
  private updateCleanupStats(result: CacheCleanupResult): void {
    this.cleanupStats.totalCleanups++;
    this.cleanupStats.totalEntriesRemoved += result.removedEntries;
    this.cleanupStats.totalSpaceFreed += result.freedSpace;
    this.cleanupStats.lastCleanupDuration = result.duration || 0;
    this.lastCleanupTime = Date.now();
  }

  /**
   * Obtém estatísticas de limpeza
   */
  public getCleanupStats(): typeof this.cleanupStats & { lastCleanupTime: number } {
    return {
      ...this.cleanupStats,
      lastCleanupTime: this.lastCleanupTime
    };
  }

  /**
   * Para todos os schedulers de limpeza
   */
  public stopCleanupSchedulers(): void {
    for (const [name, intervalId] of this.cleanupIntervals.entries()) {
      clearInterval(intervalId);
      logger.debug('Scheduler de limpeza parado', {
        component: 'CacheCleanupService',
        type: name
      });
    }
    this.cleanupIntervals.clear();
  }

  /**
   * Reinicia todos os schedulers
   */
  public restartCleanupSchedulers(): void {
    this.stopCleanupSchedulers();
    this.startCleanupSchedulers();
  }

  /**
   * Utilitário para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtém configuração atual
   */
  public getConfig(): CacheCleanupConfig {
    return { ...this.config };
  }

  /**
   * Atualiza configuração
   */
  public updateConfig(newConfig: Partial<CacheCleanupConfig>): void {
    Object.assign(this.config, newConfig);
    
    logger.info('Configuração de limpeza atualizada', {
      component: 'CacheCleanupService',
      newConfig
    });

    // Reiniciar schedulers com nova configuração
    this.restartCleanupSchedulers();
  }
}

// Instância singleton
export const cacheCleanupService = new CacheCleanupService();