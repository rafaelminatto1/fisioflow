// services/ai-economica/cacheService.ts
// Sistema de cache inteligente multi-camada para IA econômica

import { AIResponse, CacheEntry, QueryType } from '../../types/ai-economica.types'
import { CACHE_TTL, DEFAULT_CONFIG } from '../../config/ai-economica.config'
import { aiLogger } from './logger'

interface CacheStats {
  totalEntries: number
  totalSize: number // em bytes
  hitRate: number
  missRate: number
  avgResponseTime: number
  entriesByTTL: Record<string, number>
  oldestEntry: Date | null
  newestEntry: Date | null
}

interface CacheCleanupResult {
  removedEntries: number
  freedSpace: number // em bytes
  reason: 'expired' | 'size_limit' | 'manual' | 'lru'
}

interface CacheStrategy {
  ttl: number
  priority: number // 1-5, onde 5 é mais importante
  compressionEnabled: boolean
  persistToDisk: boolean
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map()
  private indexedDBCache: IDBDatabase | null = null
  private dbName = 'ai_economica_cache'
  private dbVersion = 1
  private maxMemoryCacheSize = 100 // máximo de entradas na memória
  private maxTotalSize = DEFAULT_CONFIG.cache.maxSize
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalResponseTime: 0
  }

  // Estratégias de cache por tipo de consulta
  private cacheStrategies: Record<string, CacheStrategy> = {
    [QueryType.PROTOCOL_SUGGESTION]: {
      ttl: CACHE_TTL.PROTOCOL_SUGGESTION,
      priority: 5,
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.DIAGNOSIS_HELP]: {
      ttl: CACHE_TTL.DIAGNOSIS_HELP,
      priority: 4,
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.EXERCISE_RECOMMENDATION]: {
      ttl: CACHE_TTL.EXERCISE_RECOMMENDATION,
      priority: 4,
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.CASE_ANALYSIS]: {
      ttl: CACHE_TTL.CASE_ANALYSIS,
      priority: 3,
      compressionEnabled: true,
      persistToDisk: false
    },
    [QueryType.RESEARCH_QUERY]: {
      ttl: CACHE_TTL.RESEARCH_QUERY,
      priority: 3,
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.DOCUMENT_ANALYSIS]: {
      ttl: CACHE_TTL.DOCUMENT_ANALYSIS,
      priority: 2,
      compressionEnabled: true,
      persistToDisk: false
    },
    [QueryType.GENERAL_QUESTION]: {
      ttl: CACHE_TTL.GENERAL_QUESTION,
      priority: 1,
      compressionEnabled: false,
      persistToDisk: false
    }
  }

  constructor() {
    this.initializeIndexedDB()
    this.startCleanupInterval()
    aiLogger.info('CACHE_SERVICE', 'Serviço de cache inicializado')
  }

  // Inicializar IndexedDB
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => {
        aiLogger.error('CACHE_SERVICE', 'Erro ao abrir IndexedDB', { error: request.error })
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.indexedDBCache = request.result
        aiLogger.info('CACHE_SERVICE', 'IndexedDB inicializado com sucesso')
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Criar object store para cache
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
          store.createIndex('priority', 'priority', { unique: false })
        }
      }
    })
  }

  // Obter entrada do cache
  async get(key: string, queryType?: QueryType): Promise<AIResponse | null> {
    const startTime = Date.now()
    this.stats.totalRequests++

    try {
      // Tentar cache em memória primeiro
      const memoryEntry = this.memoryCache.get(key)
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        this.updateAccessInfo(memoryEntry)
        this.stats.hits++
        this.stats.totalResponseTime += Date.now() - startTime
        
        aiLogger.debug('CACHE_SERVICE', 'Cache hit (memória)', {
          key,
          queryType,
          responseTime: Date.now() - startTime
        })
        
        return memoryEntry.response
      }

      // Tentar IndexedDB se não encontrou na memória
      if (this.indexedDBCache) {
        const diskEntry = await this.getFromIndexedDB(key)
        if (diskEntry && !this.isExpired(diskEntry)) {
          // Promover para cache em memória se for importante
          const strategy = queryType ? this.cacheStrategies[queryType] : null
          if (strategy && strategy.priority >= 3) {
            this.memoryCache.set(key, diskEntry)
            this.enforceMemoryCacheLimit()
          }
          
          this.updateAccessInfo(diskEntry)
          this.stats.hits++
          this.stats.totalResponseTime += Date.now() - startTime
          
          aiLogger.debug('CACHE_SERVICE', 'Cache hit (disco)', {
            key,
            queryType,
            responseTime: Date.now() - startTime
          })
          
          return diskEntry.response
        }
      }

      // Cache miss
      this.stats.misses++
      aiLogger.debug('CACHE_SERVICE', 'Cache miss', { key, queryType })
      return null
      
    } catch (error) {
      aiLogger.error('CACHE_SERVICE', 'Erro ao obter do cache', { error, key })
      this.stats.misses++
      return null
    }
  }

  // Armazenar no cache
  async set(key: string, response: AIResponse, queryType?: QueryType): Promise<void> {
    try {
      const strategy = queryType ? this.cacheStrategies[queryType] : this.getDefaultStrategy()
      const now = Date.now()
      
      const cacheEntry: CacheEntry = {
        key,
        response: strategy.compressionEnabled ? this.compressResponse(response) : response,
        createdAt: now,
        expiresAt: now + strategy.ttl,
        accessCount: 1,
        lastAccessed: now
      }

      // Sempre armazenar na memória primeiro
      this.memoryCache.set(key, cacheEntry)
      this.enforceMemoryCacheLimit()

      // Armazenar no disco se a estratégia permitir
      if (strategy.persistToDisk && this.indexedDBCache) {
        await this.setInIndexedDB(cacheEntry, strategy.priority)
      }

      aiLogger.debug('CACHE_SERVICE', 'Entrada armazenada no cache', {
        key,
        queryType,
        ttl: strategy.ttl,
        priority: strategy.priority,
        persistToDisk: strategy.persistToDisk,
        compressed: strategy.compressionEnabled
      })
      
    } catch (error) {
      aiLogger.error('CACHE_SERVICE', 'Erro ao armazenar no cache', { error, key })
    }
  }

  // Limpar cache expirado
  async cleanup(): Promise<CacheCleanupResult> {
    let removedEntries = 0
    let freedSpace = 0

    try {
      // Limpar cache em memória
      const memoryKeysToRemove: string[] = []
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          memoryKeysToRemove.push(key)
          freedSpace += this.estimateEntrySize(entry)
        }
      }

      memoryKeysToRemove.forEach(key => {
        this.memoryCache.delete(key)
        removedEntries++
      })

      // Limpar IndexedDB
      if (this.indexedDBCache) {
        const diskCleanup = await this.cleanupIndexedDB()
        removedEntries += diskCleanup.removedEntries
        freedSpace += diskCleanup.freedSpace
      }

      aiLogger.info('CACHE_SERVICE', 'Limpeza de cache concluída', {
        removedEntries,
        freedSpace,
        reason: 'expired'
      })

      return {
        removedEntries,
        freedSpace,
        reason: 'expired'
      }
      
    } catch (error) {
      aiLogger.error('CACHE_SERVICE', 'Erro na limpeza do cache', { error })
      return { removedEntries: 0, freedSpace: 0, reason: 'expired' }
    }
  }

  // Limpar cache manualmente
  async clear(): Promise<CacheCleanupResult> {
    try {
      const memoryEntries = this.memoryCache.size
      let freedSpace = 0

      // Calcular espaço liberado
      for (const entry of this.memoryCache.values()) {
        freedSpace += this.estimateEntrySize(entry)
      }

      // Limpar memória
      this.memoryCache.clear()

      // Limpar IndexedDB
      let diskEntries = 0
      if (this.indexedDBCache) {
        const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        const clearRequest = store.clear()
        
        await new Promise((resolve, reject) => {
          clearRequest.onsuccess = () => resolve(undefined)
          clearRequest.onerror = () => reject(clearRequest.error)
        })
      }

      const totalRemoved = memoryEntries + diskEntries

      aiLogger.info('CACHE_SERVICE', 'Cache limpo manualmente', {
        removedEntries: totalRemoved,
        freedSpace
      })

      return {
        removedEntries: totalRemoved,
        freedSpace,
        reason: 'manual'
      }
      
    } catch (error) {
      aiLogger.error('CACHE_SERVICE', 'Erro ao limpar cache manualmente', { error })
      return { removedEntries: 0, freedSpace: 0, reason: 'manual' }
    }
  }

  // Obter estatísticas do cache
  getStats(): CacheStats {
    const entries = Array.from(this.memoryCache.values())
    const totalSize = entries.reduce((sum, entry) => sum + this.estimateEntrySize(entry), 0)
    
    const hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0
    
    const avgResponseTime = this.stats.hits > 0 
      ? this.stats.totalResponseTime / this.stats.hits 
      : 0

    const entriesByTTL: Record<string, number> = {}
    entries.forEach(entry => {
      const ttl = entry.expiresAt - entry.createdAt
      const ttlKey = this.getTTLCategory(ttl)
      entriesByTTL[ttlKey] = (entriesByTTL[ttlKey] || 0) + 1
    })

    const timestamps = entries.map(e => new Date(e.createdAt))
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(d => d.getTime()))) : null
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))) : null

    return {
      totalEntries: entries.length,
      totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round((1 - hitRate) * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      entriesByTTL,
      oldestEntry,
      newestEntry
    }
  }

  // Pré-cache para consultas frequentes
  async warmCache(queries: Array<{ key: string; response: AIResponse; queryType: QueryType }>): Promise<void> {
    try {
      for (const query of queries) {
        await this.set(query.key, query.response, query.queryType)
      }
      
      aiLogger.info('CACHE_SERVICE', 'Cache warming concluído', {
        queriesWarmed: queries.length
      })
    } catch (error) {
      aiLogger.error('CACHE_SERVICE', 'Erro no cache warming', { error })
    }
  }

  // Métodos privados

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt
  }

  private updateAccessInfo(entry: CacheEntry): void {
    entry.accessCount++
    entry.lastAccessed = Date.now()
  }

  private enforceMemoryCacheLimit(): void {
    if (this.memoryCache.size <= this.maxMemoryCacheSize) return

    // Remover entradas menos usadas (LRU)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

    const toRemove = entries.slice(0, entries.length - this.maxMemoryCacheSize)
    toRemove.forEach(([key]) => {
      this.memoryCache.delete(key)
    })

    aiLogger.debug('CACHE_SERVICE', 'Limite de cache em memória aplicado', {
      removedEntries: toRemove.length,
      currentSize: this.memoryCache.size
    })
  }

  private compressResponse(response: AIResponse): AIResponse {
    // Implementação simples de compressão (pode ser melhorada)
    try {
      const compressed = {
        ...response,
        content: this.compressString(response.content)
      }
      return compressed
    } catch (error) {
      aiLogger.warn('CACHE_SERVICE', 'Erro na compressão, usando resposta original', { error })
      return response
    }
  }

  private compressString(str: string): string {
    // Implementação básica de compressão de string
    // Em produção, usar uma biblioteca como pako ou similar
    return str
  }

  private estimateEntrySize(entry: CacheEntry): number {
    // Estimativa aproximada do tamanho da entrada em bytes
    const jsonString = JSON.stringify(entry)
    return new Blob([jsonString]).size
  }

  private getTTLCategory(ttl: number): string {
    const hours = ttl / (1000 * 60 * 60)
    if (hours < 1) return 'menos de 1h'
    if (hours < 24) return 'menos de 1 dia'
    if (hours < 168) return 'menos de 1 semana'
    return 'mais de 1 semana'
  }

  private getDefaultStrategy(): CacheStrategy {
    return this.cacheStrategies[QueryType.GENERAL_QUESTION]
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup()
    }, DEFAULT_CONFIG.cache.cleanupInterval)
  }

  // Métodos para IndexedDB

  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    if (!this.indexedDBCache) return null

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result : null)
      }

      request.onerror = () => {
        aiLogger.error('CACHE_SERVICE', 'Erro ao ler do IndexedDB', { error: request.error })
        resolve(null)
      }
    })
  }

  private async setInIndexedDB(entry: CacheEntry, priority: number): Promise<void> {
    if (!this.indexedDBCache) return

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      
      const entryWithPriority = { ...entry, priority }
      const request = store.put(entryWithPriority)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        aiLogger.error('CACHE_SERVICE', 'Erro ao escrever no IndexedDB', { error: request.error })
        resolve() // Não falhar se não conseguir persistir
      }
    })
  }

  private async cleanupIndexedDB(): Promise<{ removedEntries: number; freedSpace: number }> {
    if (!this.indexedDBCache) return { removedEntries: 0, freedSpace: 0 }

    return new Promise((resolve) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const index = store.index('expiresAt')
      
      const now = Date.now()
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)
      
      let removedEntries = 0
      let freedSpace = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const entry = cursor.value as CacheEntry
          freedSpace += this.estimateEntrySize(entry)
          cursor.delete()
          removedEntries++
          cursor.continue()
        } else {
          resolve({ removedEntries, freedSpace })
        }
      }

      request.onerror = () => {
        aiLogger.error('CACHE_SERVICE', 'Erro na limpeza do IndexedDB', { error: request.error })
        resolve({ removedEntries: 0, freedSpace: 0 })
      }
    })
  }
}
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.DIAGNOSIS_HELP]: {
      ttl: CACHE_TTL.DIAGNOSIS_HELP,
      priority: 4,
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.EXERCISE_RECOMMENDATION]: {
      ttl: CACHE_TTL.EXERCISE_RECOMMENDATION,
      priority: 4,
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.CASE_ANALYSIS]: {
      ttl: CACHE_TTL.CASE_ANALYSIS,
      priority: 3,
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.RESEARCH_QUERY]: {
      ttl: CACHE_TTL.RESEARCH_QUERY,
      priority: 2,
      compressionEnabled: true,
      persistToDisk: false
    },
    [QueryType.DOCUMENT_ANALYSIS]: {
      ttl: CACHE_TTL.DOCUMENT_ANALYSIS,
      priority: 3,
      compressionEnabled: true,
      persistToDisk: true
    },
    [QueryType.GENERAL_QUESTION]: {
      ttl: CACHE_TTL.GENERAL_QUESTION,
      priority: 1,
      compressionEnabled: false,
      persistToDisk: false
    }
  }

  constructor() {
    this.initializeIndexedDB()
    this.startCleanupScheduler()
    this.loadMemoryCacheFromDisk()
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        aiLogger.error('CACHE', 'Erro ao abrir IndexedDB', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.indexedDBCache = request.result
        aiLogger.info('CACHE', 'IndexedDB inicializado com sucesso')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
          store.createIndex('priority', 'priority', { unique: false })
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false })
        }
      }
    })
  }

  async set(
    key: string, 
    response: AIResponse, 
    queryType: QueryType = QueryType.GENERAL_QUESTION,
    customTTL?: number
  ): Promise<void> {
    try {
      const strategy = this.cacheStrategies[queryType]
      const ttl = customTTL || strategy.ttl
      const now = Date.now()

      let content = JSON.stringify(response)
      let compressed = false

      // Comprimir se necessário e habilitado
      if (strategy.compressionEnabled && content.length > 1024) {
        content = await this.compressContent(content)
        compressed = true
      }

      const cacheEntry: CacheEntry & {
        priority: number
        compressed: boolean
        queryType: QueryType
      } = {
        key,
        response,
        createdAt: now,
        expiresAt: now + ttl,
        accessCount: 0,
        lastAccessed: now,
        priority: strategy.priority,
        compressed,
        queryType
      }

      // Sempre armazenar na memória primeiro
      this.memoryCache.set(key, cacheEntry)

      // Persistir no disco se necessário
      if (strategy.persistToDisk && this.indexedDBCache) {
        await this.storeInIndexedDB(cacheEntry)
      }

      // Gerenciar tamanho da memória
      if (this.memoryCache.size > this.maxMemoryCacheSize) {
        await this.evictLRUFromMemory()
      }

      aiLogger.debug('CACHE', `Item cacheado: ${key}`, {
        queryType,
        ttl,
        compressed,
        persistToDisk: strategy.persistToDisk,
        priority: strategy.priority
      })

    } catch (error) {
      aiLogger.error('CACHE', `Erro ao cachear item ${key}`, error)
      throw error
    }
  }

  async get(key: string): Promise<AIResponse | null> {
    const startTime = Date.now()
    this.stats.totalRequests++

    try {
      // Tentar memória primeiro
      let entry = this.memoryCache.get(key)
      let fromDisk = false

      // Se não estiver na memória, tentar disco
      if (!entry && this.indexedDBCache) {
        entry = await this.getFromIndexedDB(key)
        fromDisk = true
      }

      if (!entry) {
        this.stats.misses++
        aiLogger.debug('CACHE', `Cache miss: ${key}`)
        return null
      }

      // Verificar expiração
      if (entry.expiresAt <= Date.now()) {
        await this.remove(key)
        this.stats.misses++
        aiLogger.debug('CACHE', `Cache expired: ${key}`)
        return null
      }

      // Atualizar estatísticas de acesso
      entry.accessCount++
      entry.lastAccessed = Date.now()

      // Se veio do disco, colocar na memória
      if (fromDisk) {
        this.memoryCache.set(key, entry)
        if (this.memoryCache.size > this.maxMemoryCacheSize) {
          await this.evictLRUFromMemory()
        }
      }

      this.stats.hits++
      const responseTime = Date.now() - startTime
      this.stats.totalResponseTime += responseTime

      aiLogger.debug('CACHE', `Cache hit: ${key}`, {
        fromDisk,
        responseTime,
        accessCount: entry.accessCount
      })

      return entry.response

    } catch (error) {
      this.stats.misses++
      aiLogger.error('CACHE', `Erro ao recuperar cache ${key}`, error)
      return null
    }
  }

  async remove(key: string): Promise<boolean> {
    try {
      const memoryRemoved = this.memoryCache.delete(key)
      let diskRemoved = false

      if (this.indexedDBCache) {
        diskRemoved = await this.removeFromIndexedDB(key)
      }

      if (memoryRemoved || diskRemoved) {
        aiLogger.debug('CACHE', `Item removido: ${key}`)
        return true
      }

      return false
    } catch (error) {
      aiLogger.error('CACHE', `Erro ao remover item ${key}`, error)
      return false
    }
  }

  async clear(): Promise<CacheCleanupResult> {
    try {
      const memoryEntries = this.memoryCache.size
      let diskEntries = 0

      this.memoryCache.clear()

      if (this.indexedDBCache) {
        diskEntries = await this.clearIndexedDB()
      }

      const result: CacheCleanupResult = {
        removedEntries: memoryEntries + diskEntries,
        freedSpace: 0, // Difícil calcular exatamente
        reason: 'manual'
      }

      aiLogger.info('CACHE', 'Cache limpo manualmente', result)
      return result

    } catch (error) {
      aiLogger.error('CACHE', 'Erro ao limpar cache', error)
      throw error
    }
  }

  async cleanup(): Promise<CacheCleanupResult> {
    try {
      let removedEntries = 0
      let freedSpace = 0
      const now = Date.now()

      // Limpar itens expirados da memória
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt <= now) {
          const size = this.estimateEntrySize(entry)
          this.memoryCache.delete(key)
          removedEntries++
          freedSpace += size
        }
      }

      // Limpar itens expirados do disco
      if (this.indexedDBCache) {
        const diskCleanup = await this.cleanupIndexedDB()
        removedEntries += diskCleanup.removedEntries
        freedSpace += diskCleanup.freedSpace
      }

      const result: CacheCleanupResult = {
        removedEntries,
        freedSpace,
        reason: 'expired'
      }

      if (removedEntries > 0) {
        aiLogger.info('CACHE', 'Limpeza automática concluída', result)
      }

      return result

    } catch (error) {
      aiLogger.error('CACHE', 'Erro na limpeza automática', error)
      throw error
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const memoryEntries = this.memoryCache.size
      let diskEntries = 0
      let totalSize = 0

      // Calcular tamanho da memória
      for (const entry of this.memoryCache.values()) {
        totalSize += this.estimateEntrySize(entry)
      }

      // Contar entradas do disco
      if (this.indexedDBCache) {
        diskEntries = await this.countIndexedDBEntries()
      }

      const totalEntries = memoryEntries + diskEntries
      const hitRate = this.stats.totalRequests > 0 
        ? this.stats.hits / this.stats.totalRequests 
        : 0
      const missRate = 1 - hitRate
      const avgResponseTime = this.stats.hits > 0 
        ? this.stats.totalResponseTime / this.stats.hits 
        : 0

      // Agrupar por TTL
      const entriesByTTL: Record<string, number> = {}
      for (const entry of this.memoryCache.values()) {
        const ttl = entry.expiresAt - entry.createdAt
        const ttlKey = this.getTTLCategory(ttl)
        entriesByTTL[ttlKey] = (entriesByTTL[ttlKey] || 0) + 1
      }

      // Encontrar entradas mais antigas e mais novas
      let oldestEntry: Date | null = null
      let newestEntry: Date | null = null

      for (const entry of this.memoryCache.values()) {
        const createdAt = new Date(entry.createdAt)
        if (!oldestEntry || createdAt < oldestEntry) {
          oldestEntry = createdAt
        }
        if (!newestEntry || createdAt > newestEntry) {
          newestEntry = createdAt
        }
      }

      return {
        totalEntries,
        totalSize,
        hitRate,
        missRate,
        avgResponseTime,
        entriesByTTL,
        oldestEntry,
        newestEntry
      }

    } catch (error) {
      aiLogger.error('CACHE', 'Erro ao calcular estatísticas', error)
      throw error
    }
  }

  // Métodos privados
  private async storeInIndexedDB(entry: CacheEntry): Promise<void> {
    if (!this.indexedDBCache) return

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      
      const request = store.put(entry)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    if (!this.indexedDBCache) return null

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      
      const request = store.get(key)
      
      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async removeFromIndexedDB(key: string): Promise<boolean> {
    if (!this.indexedDBCache) return false

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      
      const request = store.delete(key)
      
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  private async clearIndexedDB(): Promise<number> {
    if (!this.indexedDBCache) return 0

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      
      // Contar antes de limpar
      const countRequest = store.count()
      countRequest.onsuccess = () => {
        const count = countRequest.result
        
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => resolve(count)
        clearRequest.onerror = () => reject(clearRequest.error)
      }
      countRequest.onerror = () => reject(countRequest.error)
    })
  }

  private async cleanupIndexedDB(): Promise<CacheCleanupResult> {
    if (!this.indexedDBCache) {
      return { removedEntries: 0, freedSpace: 0, reason: 'expired' }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const index = store.index('expiresAt')
      
      const now = Date.now()
      const range = IDBKeyRange.upperBound(now)
      
      let removedEntries = 0
      let freedSpace = 0
      
      const request = index.openCursor(range)
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const entry = cursor.value as CacheEntry
          freedSpace += this.estimateEntrySize(entry)
          cursor.delete()
          removedEntries++
          cursor.continue()
        } else {
          resolve({ removedEntries, freedSpace, reason: 'expired' })
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  private async countIndexedDBEntries(): Promise<number> {
    if (!this.indexedDBCache) return 0

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDBCache!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      
      const request = store.count()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private async evictLRUFromMemory(): Promise<void> {
    // Encontrar entrada menos recentemente usada com menor prioridade
    let lruEntry: { key: string; entry: CacheEntry & { priority: number } } | null = null
    
    for (const [key, entry] of this.memoryCache.entries()) {
      const extendedEntry = entry as CacheEntry & { priority: number }
      
      if (!lruEntry || 
          extendedEntry.priority < lruEntry.entry.priority ||
          (extendedEntry.priority === lruEntry.entry.priority && 
           extendedEntry.lastAccessed < lruEntry.entry.lastAccessed)) {
        lruEntry = { key, entry: extendedEntry }
      }
    }

    if (lruEntry) {
      this.memoryCache.delete(lruEntry.key)
      aiLogger.debug('CACHE', `LRU eviction: ${lruEntry.key}`, {
        priority: lruEntry.entry.priority,
        lastAccessed: new Date(lruEntry.entry.lastAccessed)
      })
    }
  }

  private async loadMemoryCacheFromDisk(): Promise<void> {
    if (!this.indexedDBCache) return

    try {
      // Carregar entradas de alta prioridade na memória
      const transaction = this.indexedDBCache.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      const index = store.index('priority')
      
      const request = index.openCursor(IDBKeyRange.lowerBound(3), 'prev') // Prioridade >= 3
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor && this.memoryCache.size < this.maxMemoryCacheSize) {
          const entry = cursor.value as CacheEntry
          
          // Verificar se não expirou
          if (entry.expiresAt > Date.now()) {
            this.memoryCache.set(entry.key, entry)
          }
          
          cursor.continue()
        }
      }

    } catch (error) {
      aiLogger.error('CACHE', 'Erro ao carregar cache do disco', error)
    }
  }

  private startCleanupScheduler(): void {
    // Limpeza a cada hora
    setInterval(() => {
      this.cleanup()
    }, DEFAULT_CONFIG.cache.cleanupInterval)

    // Estatísticas a cada 5 minutos
    setInterval(() => {
      this.logStats()
    }, 5 * 60 * 1000)
  }

  private async logStats(): Promise<void> {
    try {
      const stats = await this.getStats()
      aiLogger.info('CACHE', 'Estatísticas do cache', {
        totalEntries: stats.totalEntries,
        totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`,
        hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
        avgResponseTime: `${stats.avgResponseTime.toFixed(1)}ms`
      })
    } catch (error) {
      aiLogger.error('CACHE', 'Erro ao gerar estatísticas', error)
    }
  }

  private estimateEntrySize(entry: CacheEntry): number {
    return JSON.stringify(entry).length * 2 // Aproximação em bytes
  }

  private getTTLCategory(ttl: number): string {
    const hours = ttl / (1000 * 60 * 60)
    
    if (hours < 1) return 'menos de 1h'
    if (hours < 24) return `${Math.round(hours)}h`
    
    const days = Math.round(hours / 24)
    return `${days} dias`
  }

  private async compressContent(content: string): Promise<string> {
    // Implementação simples de compressão
    // Em produção, usar uma biblioteca como pako para gzip
    try {
      const compressed = btoa(content)
      return compressed.length < content.length ? compressed : content
    } catch (error) {
      return content
    }
  }

  private async decompressContent(content: string): Promise<string> {
    try {
      return atob(content)
    } catch (error) {
      return content
    }
  }
}

// Instância singleton
export const cacheService = new CacheService()

export default cacheService