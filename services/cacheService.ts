/**
 * Serviço de Cache Avançado para Analytics
 * Implementa cache inteligente com TTL e invalidação automática
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
}

class AdvancedCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: CacheMetrics = { hits: 0, misses: 0, hitRate: 0 };
  private defaultTTL = 10 * 60 * 1000; // 10 minutos

  async set<T>(key: string, data: T, customTTL?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: customTTL || this.defaultTTL,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    entry.hits++;
    this.metrics.hits++;
    this.updateHitRate();
    return entry.data;
  }

  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    customTTL?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    await this.set(key, data, customTTL);
    return data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }
}

export const cacheService = new AdvancedCacheService();

export const CacheKeys = {
  DASHBOARD_DATA: (timeRange: string, filters: string) => `dashboard:${timeRange}:${filters}`,
  PREDICTIONS: (patientIds: string[]) => `predictions:${patientIds.sort().join(',')}`,
  INSIGHTS: (dataHash: string) => `insights:${dataHash}`,
  ALERTS: () => `alerts:active`
};

export default cacheService;