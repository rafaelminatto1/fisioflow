/**
 * Service Worker Manager - Gerencia PWA e cache offline
 * Integração otimizada com React para funcionalidades offline
 */

import React from 'react';

interface CacheStats {
  caches: Record<string, { count: number; urls: string[] }>;
  totalCaches: number;
  totalEntries: number;
}

interface ServiceWorkerManager {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  register: () => Promise<boolean>;
  unregister: () => Promise<boolean>;
  getCacheStats: () => Promise<CacheStats>;
  clearCache: () => Promise<number>;
  precacheUrls: (urls: string[]) => Promise<string[]>;
  checkForUpdates: () => Promise<boolean>;
  skipWaiting: () => void;
  addEventListener: (event: string, callback: Function) => void;
  removeEventListener: (event: string, callback: Function) => void;
}

class ServiceWorkerManagerImpl implements ServiceWorkerManager {
  private eventListeners: Map<string, Set<Function>> = new Map();
  private messageId = 0;
  private pendingMessages: Map<number, { resolve: Function; reject: Function }> = new Map();

  public isSupported = 'serviceWorker' in navigator;
  public isRegistered = false;
  public registration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (this.isSupported) {
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  private handleMessage(event: MessageEvent) {
    const { type, payload, messageId } = event.data;
    
    if (messageId && this.pendingMessages.has(messageId)) {
      const { resolve } = this.pendingMessages.get(messageId)!;
      this.pendingMessages.delete(messageId);
      resolve(payload);
      return;
    }

    // Emit eventos para listeners
    this.emit(type, payload);
  }

  private async sendMessage(type: string, payload?: any): Promise<any> {
    if (!this.registration?.active) {
      throw new Error('Service Worker não está ativo');
    }

    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId;
      this.pendingMessages.set(messageId, { resolve, reject });
      
      this.registration!.active!.postMessage({
        type,
        payload,
        messageId,
      });
      
      // Timeout após 10 segundos
      setTimeout(() => {
        if (this.pendingMessages.has(messageId)) {
          this.pendingMessages.delete(messageId);
          reject(new Error('Service Worker timeout'));
        }
      }, 10000);
    });
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no listener do evento ${event}:`, error);
        }
      });
    }
  }

  public addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  public async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Service Workers não são suportados neste navegador');
      return false;
    }

    try {
      console.log('🔧 Registrando Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;
      this.isRegistered = true;

      // Escuta por atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.emit('update-available');
            }
          });
        }
      });

      // Escuta por mudanças no controller
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.emit('controller-changed');
        // Recarrega a página após atualização
        if (!window.location.pathname.includes('/login')) {
          window.location.reload();
        }
      });

      console.log('✅ Service Worker registrado com sucesso');
      
      // Pré-cache de recursos importantes
      await this.precacheImportantResources();
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
      return false;
    }
  }

  public async unregister(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      if (result) {
        this.isRegistered = false;
        this.registration = null;
        console.log('✅ Service Worker desregistrado');
      }
      return result;
    } catch (error) {
      console.error('❌ Erro ao desregistrar Service Worker:', error);
      return false;
    }
  }

  public async getCacheStats(): Promise<CacheStats> {
    return this.sendMessage('CACHE_STATS');
  }

  public async clearCache(): Promise<number> {
    const result = await this.sendMessage('CLEAR_CACHE');
    console.log(`🗑️ ${result.cleared} caches limpos`);
    return result.cleared;
  }

  public async precacheUrls(urls: string[]): Promise<string[]> {
    const result = await this.sendMessage('PRECACHE_URLS', { urls });
    console.log(`📦 ${result.cached.length} URLs pré-cacheadas`);
    return result.cached;
  }

  public async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('❌ Erro ao verificar atualizações:', error);
      return false;
    }
  }

  public skipWaiting(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  private async precacheImportantResources(): Promise<void> {
    try {
      const importantUrls = [
        '/',
        '/manifest.json',
        // Adicione outras URLs importantes aqui
      ];

      await this.precacheUrls(importantUrls);
    } catch (error) {
      console.error('Erro ao pré-cachear recursos:', error);
    }
  }
}

// Hook React para usar Service Worker
export const useServiceWorker = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [cacheStats, setCacheStats] = React.useState<CacheStats | null>(null);

  React.useEffect(() => {
    // Listeners de conectividade
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listeners do Service Worker
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    
    swManager.addEventListener('update-available', handleUpdateAvailable);

    // Registra Service Worker
    swManager.register();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      swManager.removeEventListener('update-available', handleUpdateAvailable);
    };
  }, []);

  const refreshCacheStats = React.useCallback(async () => {
    try {
      const stats = await swManager.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas de cache:', error);
    }
  }, []);

  const clearAllCache = React.useCallback(async () => {
    try {
      await swManager.clearCache();
      await refreshCacheStats();
      return true;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return false;
    }
  }, [refreshCacheStats]);

  const applyUpdate = React.useCallback(() => {
    swManager.skipWaiting();
    setUpdateAvailable(false);
  }, []);

  return {
    isOnline,
    updateAvailable,
    cacheStats,
    isSupported: swManager.isSupported,
    isRegistered: swManager.isRegistered,
    refreshCacheStats,
    clearAllCache,
    applyUpdate,
    precacheUrls: swManager.precacheUrls.bind(swManager),
    checkForUpdates: swManager.checkForUpdates.bind(swManager),
  };
};

// Instância global do Service Worker Manager
export const swManager = new ServiceWorkerManagerImpl();

// Auto-registra em produção
if (typeof window !== 'undefined' && swManager.isSupported) {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    swManager.register().catch(console.error);
  }
}

export default swManager;