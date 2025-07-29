// services/ai-economica/cacheService.ts
// Sistema de cache inteligente multi-camada para IA econômica

import { AIResponse, CacheEntry, QueryType } from '../../types/ai-economica.types';
import { AI_ECONOMICA_CONFIG } from '../../config/ai-economica.config';
import { aiEconomicaLogger } from './logger';

interface CacheStats {
  totalEntries: number;
  totalSize: number; // em bytes
  hitRate: number;
  missRate: number;
  avgResponseTime: number;
  entriesByTTL: Record<string, number>;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

interface CacheCleanupResult {
  removedEntries: number;
  freedSpace: number; // em bytes
  reason: 'expired' | 'size_limit' | 'manual';
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private indexedDBCache: IDBDatabase | null = null;
  private dbName = 'ai_economica_cache';
  private dbVersion = 1;
  private maxMemoryCacheSize = 50; // máximo de entradas na memória
  private maxTotalSize = 100 * 1024 * 1024; // 100MB em bytes
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalResponseTime: 0
  };

  constructor() {
    this.initializeIndexedDB();
    this.startCleanupScheduler();
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.indexedDBCache = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Criar object store para cache
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async set(key: string, response: AIResponse, ttl?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      const cacheEntry: CacheEntry = {
        key,
        response,
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttl || this.getDefaultTTL(response.metadata?.type)),
        accessCount: 0,
        lastAccessed: Date.now()
      };

      const entrySize = this.calculateEntrySize(cacheEntry);

      // Decidir onde armazenar baseado no tamanho
      if (entrySize < 1024 && this.memoryCache.size < this.maxMemoryCacheSize) {
        // Cache em memória para entradas pequenas
        this.memoryCache.set(key, cacheEntry);
        aiEconomicaLogger.logCacheHit(key);
      } else {
        // Cache no IndexedDB para entradas maiores
        await this.storeInIndexedDB(cacheEntry);
      }

      // Verificar limite de tamanho total
      await this.enforceSize Limits();

      const responseTime = Date.now() - startTime;
      this.updateStats('set', responseTime);

    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
      aiEconomicaLogger.logQueryError('cache_set', error as Error);
    }
  }

  async get(key: string): Promise<AIResponse | null> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Tentar cache em memória primeiro
      let entry = this.memoryCache.get(key);
      
      if (entry) {
        if (entry.expiresAt > Date.now()) {
          entry.accessCount++;
          entry.lastAccessed = Date.now();
          this.memoryCache.set(key, entry);
          
          this.stats.hits++;
          const responseTime = Date.now() - startTime;
          this.updateStats('hit', responseTime);
          
          aiEconomicaLogger.logCacheHit(key);
          return entry.response;
        } else {
          // Entrada expirada
          this.memoryCache.delete(key);
        }
      }

      // Tentar IndexedDB
      entry = await this.getFromIndexedDB(key);
      
      if (entry && entry.expiresAt > Date.now()) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        
        // Promover para cache em memória se for pequena e acessada frequentemente
        if (this.calculateEntrySize(entry) < 1024 && entry.accessCount > 3) {
          if (this.memoryCache.size < this.maxMemoryCacheSize) {
            this.memoryCache.set(key, entry);
          }
        } else {
          // Atualizar no IndexedDB
          await this.storeInIndexedDB(entry);
        }
        
        this.stats.hits++;
        const responseTime = Date.now() - startTime;
        this.updateStats('hit', responseTime);
        
        aiEconomicaLogger.logCacheHit(key);
        return entry.response;
      } else if (entry) {
        // Entrada expirada no IndexedDB
        await this.removeFromIndexedDB(key);
      }

      // Cache miss
      this.stats.misses++;
      const responseTime = Date.now() - startTime;
      this.updateStats('miss', responseTime);
      
      aiEconomicaLogger.logCacheMiss(key);
      return null;

    } catch (error) {
      console.error('Erro ao buscar no cache:', error);
      this.stats.misses++;
      aiEconomicaLogger.logQueryError('cache_get', error as Error);
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      // Verificar cache em memória
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
        return true;
      }

      // Verificar IndexedDB
      const dbEntry = await this.getFromIndexedDB(key);
      return dbEntry !== null && dbEntry.expiresAt > Date.now();
    } catch (error) {
      console.error('Erro ao verificar cache:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;
      
      // Remover da memória
      if (this.memoryCache.has(key)) {
        this.memoryCache.delete(key);
        deleted = true;
      }
      
      // Remover do IndexedDB
      const dbDeleted = await this.removeFromIndexedDB(key);
      
      return deleted || dbDeleted;
    } catch (error) {
      console.error('Erro ao deletar do cache:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      // Limpar cache em memória
      this.memoryCache.clear();
      
      // Limpar IndexedDB
      await this.clearIndexedDB();
      
      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        totalResponseTime: 0
      };
      
      aiEconomicaLogger.log('INFO', 'CACHE_CLEAR', 'Cache cleared manually');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  async cleanup(): Promise<CacheCleanupResult> {
    let removedEntries = 0;
    let freedSpace = 0;

    try {
      // Limpar entradas expiradas da memória
      const expiredMemoryKeys: string[] = [];
      for (const [key, entry] of this.memoryCache) {
        if (entry.expiresAt <= Date.now()) {
          expiredMemoryKeys.push(key);
          freedSpace += this.calculateEntrySize(entry);
        }
      }
      
      expiredMemoryKeys.forEach(key => {
        this.memoryCache.delete(key);
        removedEntries++;
      });

      // Limpar entradas expiradas do IndexedDB
      const dbCleanupResult = await this.cleanupIndexedDB();
      removedEntries += dbCleanupResult.removedEntries;
      freedSpace += dbCleanupResult.freedSpace;

      aiEconomicaLogger.logCacheCleanup(removedEntries);

      return {
        removedEntries,
        freedSpace,
        reason: 'expired'
      };
    } catch (error) {
      console.error('Erro durante limpeza do cache:', error);
      return {
        removedEntries,
        freedSpace,
        reason: 'expired'
      };
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const memoryEntries = Array.from(this.memoryCache.values());
      const dbEntries = await this.getAllFromIndexedDB();
      const allEntries = [...memoryEntries, ...dbEntries];

      const totalSize = allEntries.reduce((sum, entry) => sum + this.calculateEntrySize(entry), 0);
      const hitRate = this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0;
      const missRate = this.stats.totalRequests > 0 ? this.stats.misses / this.stats.totalRequests : 0;
      const avgResponseTime = this.stats.hits > 0 ? this.stats.totalResponseTime / this.stats.hits : 0;

      // Agrupar por TTL
      const entriesByTTL: Record<string, number> = {};
      allEntries.forEach(entry => {
        const ttl = entry.expiresAt - entry.createdAt;
        const ttlKey = this.getTTLCategory(ttl);
        entriesByTTL[ttlKey] = (entriesByTTL[ttlKey] || 0) + 1;
      });

      const timestamps = allEntries.map(e => new Date(e.createdAt));
      const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(d => d.getTime()))) : null;
      const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))) : null;

      return {
        totalEntries: allEntries.length,
        totalSize,
        hitRate,
        missRate,
        avgResponseTime,
        entriesByTTL,
        oldestEntry,
        newestEntry
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas do cache:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 0,
        avgResponseTime: 0,
        entriesByTTL: {},
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  // Métodos privados

  private async storeInIndexedDB(entry: CacheEntry): Promise<void> {
    if (!this.indexedDBCache) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.indexedDBCache) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    if (!this.indexedDBCache) {
      await this.initializeIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.indexedDBCache) {
        resolve(null);
        return;
      }

      const transaction = this.indexedDBCache.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        console.error('Erro ao buscar no IndexedDB:', request.error);
        resolve(null);
      };
    });
  }

  private async removeFromIndexedDB(key: string): Promise<boolean> {
    if (!this.indexedDBCache) {
      return false;
    }

    return new Promise((resolve) => {
      if (!this.indexedDBCache) {
        resolve(false);
        return;
      }

      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  private async getAllFromIndexedDB(): Promise<CacheEntry[]> {
    if (!this.indexedDBCache) {
      return [];
    }

    return new Promise((resolve) => {
      if (!this.indexedDBCache) {
        resolve([]);
        return;
      }

      const transaction = this.indexedDBCache.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        console.error('Erro ao buscar todas as entradas:', request.error);
        resolve([]);
      };
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.indexedDBCache) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.indexedDBCache) {
        resolve();
        return;
      }

      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Erro ao limpar IndexedDB:', request.error);
        resolve();
      };
    });
  }

  private async cleanupIndexedDB(): Promise<{ removedEntries: number; freedSpace: number }> {
    if (!this.indexedDBCache) {
      return { removedEntries: 0, freedSpace: 0 };
    }

    return new Promise((resolve) => {
      if (!this.indexedDBCache) {
        resolve({ removedEntries: 0, freedSpace: 0 });
        return;
      }

      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);

      let removedEntries = 0;
      let freedSpace = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          freedSpace += this.calculateEntrySize(entry);
          cursor.delete();
          removedEntries++;
          cursor.continue();
        } else {
          resolve({ removedEntries, freedSpace });
        }
      };

      request.onerror = () => {
        console.error('Erro durante limpeza do IndexedDB:', request.error);
        resolve({ removedEntries, freedSpace });
      };
    });
  }

  private async enforceSizeLimits(): Promise<void> {
    const stats = await this.getStats();
    
    if (stats.totalSize > this.maxTotalSize) {
      // Remover entradas menos acessadas até ficar dentro do limite
      const allEntries = [
        ...Array.from(this.memoryCache.values()),
        ...await this.getAllFromIndexedDB()
      ];

      // Ordenar por frequência de acesso (menos acessadas primeiro)
      allEntries.sort((a, b) => {
        const scoreA = a.accessCount / Math.max(1, (Date.now() - a.createdAt) / (1000 * 60 * 60)); // acessos por hora
        const scoreB = b.accessCount / Math.max(1, (Date.now() - b.createdAt) / (1000 * 60 * 60));
        return scoreA - scoreB;
      });

      let currentSize = stats.totalSize;
      let removedCount = 0;

      for (const entry of allEntries) {
        if (currentSize <= this.maxTotalSize * 0.8) break; // Deixar 20% de margem

        await this.delete(entry.key);
        currentSize -= this.calculateEntrySize(entry);
        removedCount++;
      }

      if (removedCount > 0) {
        aiEconomicaLogger.log('INFO', 'CACHE_SIZE_LIMIT', `Removed ${removedCount} entries to enforce size limit`);
      }
    }
  }

  private calculateEntrySize(entry: CacheEntry): number {
    // Estimativa aproximada do tamanho em bytes
    const jsonString = JSON.stringify(entry);
    return new Blob([jsonString]).size;
  }

  private getDefaultTTL(queryType?: string): number {
    if (!queryType) return AI_ECONOMICA_CONFIG.CACHE_TTL.GENERAL_QUESTION;
    
    return AI_ECONOMICA_CONFIG.CACHE_TTL[queryType as keyof typeof AI_ECONOMICA_CONFIG.CACHE_TTL] 
      || AI_ECONOMICA_CONFIG.CACHE_TTL.GENERAL_QUESTION;
  }

  private getTTLCategory(ttl: number): string {
    const hours = ttl / (1000 * 60 * 60);
    
    if (hours < 24) return '< 1 dia';
    if (hours < 24 * 7) return '1-7 dias';
    if (hours < 24 * 30) return '1-4 semanas';
    return '> 1 mês';
  }

  private updateStats(operation: 'hit' | 'miss' | 'set', responseTime: number): void {
    if (operation === 'hit' || operation === 'miss') {
      this.stats.totalResponseTime += responseTime;
    }
  }

  private startCleanupScheduler(): void {
    // Limpeza automática a cada hora
    setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('Erro na limpeza automática do cache:', error);
      }
    }, 60 * 60 * 1000); // 1 hora

    // Limpeza de emergência se o cache ficar muito grande
    setInterval(async () => {
      try {
        const stats = await this.getStats();
        if (stats.totalSize > this.maxTotalSize * 0.9) {
          await this.enforceSizeLimits();
        }
      } catch (error) {
        console.error('Erro na verificação de tamanho do cache:', error);
      }
    }, 10 * 60 * 1000); // 10 minutos
  }

  // Métodos para pré-cache e warming

  async preCache(queries: Array<{ key: string; response: AIResponse; ttl?: number }>): Promise<void> {
    for (const query of queries) {
      try {
        await this.set(query.key, query.response, query.ttl);
      } catch (error) {
        console.error(`Erro ao fazer pré-cache de ${query.key}:`, error);
      }
    }
  }

  async warmCache(popularQueries: string[]): Promise<void> {
    // Este método seria chamado com consultas populares para pré-aquecer o cache
    // Por enquanto, apenas log da intenção
    aiEconomicaLogger.log('INFO', 'CACHE_WARM', `Warming cache with ${popularQueries.length} popular queries`);
  }
}