/**
 * Serviço de Sincronização Offline para iOS
 * 
 * Este serviço gerencia a sincronização de dados entre o dispositivo
 * e o servidor, garantindo integridade de dados e performance otimizada.
 */

import { openDB, IDBPDatabase } from 'idb';
import { getiOSConfigForTier, isiOSDevice } from '../config/ios-config';
import { api } from './api';
import { TierType } from '../hooks/useFreemium';

export interface SyncEntity {
  id: string;
  type: string;
  data: any;
  checksum: string;
  lastModified: string;
  priority: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  retryCount: number;
  errorMessage?: string;
}

export interface SyncConflict {
  entityId: string;
  entityType: string;
  localData: any;
  serverData: any;
  localChecksum: string;
  serverChecksum: string;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingCount: number;
  syncingCount: number;
  errorCount: number;
  totalEntities: number;
  conflicts: SyncConflict[];
  progress: number;
}

export interface SyncOptions {
  force?: boolean;
  entityTypes?: string[];
  priority?: number;
  batchSize?: number;
  timeout?: number;
}

class iOSSyncService {
  private db: IDBPDatabase | null = null;
  private isInitialized = false;
  private syncInProgress = false;
  private syncQueue: SyncEntity[] = [];
  private conflictQueue: SyncConflict[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private config: any;
  private userTier: TierType = 'free';
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.config = getiOSConfigForTier('free');
    this.setupNetworkListeners();
  }

  // Inicialização
  async initialize(userTier: TierType = 'free'): Promise<void> {
    if (this.isInitialized) return;

    this.userTier = userTier;
    this.config = getiOSConfigForTier(userTier);

    try {
      // Inicializa IndexedDB
      this.db = await openDB('FisioFlowSync', 1, {
        upgrade(db) {
          // Store para entidades sincronizáveis
          if (!db.objectStoreNames.contains('entities')) {
            const entitiesStore = db.createObjectStore('entities', {
              keyPath: ['type', 'id']
            });
            entitiesStore.createIndex('syncStatus', 'syncStatus');
            entitiesStore.createIndex('priority', 'priority');
            entitiesStore.createIndex('lastModified', 'lastModified');
          }

          // Store para conflitos
          if (!db.objectStoreNames.contains('conflicts')) {
            const conflictsStore = db.createObjectStore('conflicts', {
              keyPath: ['entityType', 'entityId']
            });
            conflictsStore.createIndex('timestamp', 'timestamp');
          }

          // Store para metadados de sincronização
          if (!db.objectStoreNames.contains('syncMeta')) {
            db.createObjectStore('syncMeta', { keyPath: 'key' });
          }
        },
      });

      // Carrega conflitos pendentes
      await this.loadConflicts();

      // Inicia sincronização automática se online
      if (navigator.onLine) {
        this.startPeriodicSync();
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Erro ao inicializar iOSSyncService:', error);
      throw error;
    }
  }

  // Configuração de listeners de rede
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.emit('networkStatusChanged', { isOnline: true });
      this.startPeriodicSync();
      this.processPendingSync();
    });

    window.addEventListener('offline', () => {
      this.emit('networkStatusChanged', { isOnline: false });
      this.stopPeriodicSync();
    });
  }

  // Adiciona entidade para sincronização
  async addEntity(
    type: string,
    id: string,
    data: any,
    priority: number = 2
  ): Promise<void> {
    if (!this.db) throw new Error('Serviço não inicializado');

    const entity: SyncEntity = {
      id,
      type,
      data: this.sanitizeData(data),
      checksum: await this.calculateChecksum(data),
      lastModified: new Date().toISOString(),
      priority,
      syncStatus: 'pending',
      retryCount: 0,
    };

    try {
      await this.db.put('entities', entity);
      this.emit('entityAdded', { entity });

      // Inicia sincronização se online
      if (navigator.onLine && !this.syncInProgress) {
        this.processPendingSync();
      }
    } catch (error) {
      console.error('Erro ao adicionar entidade:', error);
      throw error;
    }
  }

  // Remove entidade da sincronização
  async removeEntity(type: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Serviço não inicializado');

    try {
      await this.db.delete('entities', [type, id]);
      this.emit('entityRemoved', { type, id });
    } catch (error) {
      console.error('Erro ao remover entidade:', error);
      throw error;
    }
  }

  // Obtém entidade local
  async getEntity(type: string, id: string): Promise<SyncEntity | null> {
    if (!this.db) throw new Error('Serviço não inicializado');

    try {
      const entity = await this.db.get('entities', [type, id]);
      return entity || null;
    } catch (error) {
      console.error('Erro ao obter entidade:', error);
      return null;
    }
  }

  // Lista entidades por tipo
  async getEntitiesByType(type: string): Promise<SyncEntity[]> {
    if (!this.db) throw new Error('Serviço não inicializado');

    try {
      const tx = this.db.transaction('entities', 'readonly');
      const store = tx.objectStore('entities');
      const entities = await store.getAll();
      
      return entities.filter(entity => entity.type === type);
    } catch (error) {
      console.error('Erro ao listar entidades:', error);
      return [];
    }
  }

  // Processa sincronização pendente
  async processPendingSync(options: SyncOptions = {}): Promise<void> {
    if (!this.db || this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;
    this.emit('syncStarted');

    try {
      // Obtém entidades pendentes
      const pendingEntities = await this.getPendingEntities(options);
      
      if (pendingEntities.length === 0) {
        this.syncInProgress = false;
        this.emit('syncCompleted', { synced: 0, errors: 0 });
        return;
      }

      // Processa em lotes
      const batchSize = options.batchSize || this.config.offline.batchSize || 10;
      let syncedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingEntities.length; i += batchSize) {
        const batch = pendingEntities.slice(i, i + batchSize);
        const results = await this.syncBatch(batch, options);
        
        syncedCount += results.synced;
        errorCount += results.errors;

        // Emite progresso
        const progress = ((i + batch.length) / pendingEntities.length) * 100;
        this.emit('syncProgress', { progress, synced: syncedCount, errors: errorCount });

        // Pausa entre lotes para não sobrecarregar
        if (i + batchSize < pendingEntities.length) {
          await this.delay(100);
        }
      }

      // Atualiza timestamp da última sincronização
      await this.updateLastSyncTime();

      this.emit('syncCompleted', { synced: syncedCount, errors: errorCount });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      this.emit('syncError', { error });
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sincroniza lote de entidades
  private async syncBatch(
    entities: SyncEntity[],
    options: SyncOptions
  ): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    const promises = entities.map(async (entity) => {
      try {
        // Marca como sincronizando
        await this.updateEntityStatus(entity, 'syncing');

        // Envia para o servidor
        const response = await this.syncEntityToServer(entity, options);

        if (response.success) {
          if (response.conflict) {
            // Adiciona conflito para resolução
            await this.addConflict({
              entityId: entity.id,
              entityType: entity.type,
              localData: entity.data,
              serverData: response.serverData,
              localChecksum: entity.checksum,
              serverChecksum: response.serverChecksum,
              conflictType: response.conflictType,
              timestamp: new Date().toISOString(),
            });
            
            await this.updateEntityStatus(entity, 'error', 'Conflito detectado');
          } else {
            // Sincronização bem-sucedida
            await this.updateEntityStatus(entity, 'synced');
            synced++;
          }
        } else {
          throw new Error(response.error || 'Erro desconhecido');
        }
      } catch (error: any) {
        console.error(`Erro ao sincronizar ${entity.type}:${entity.id}:`, error);
        
        // Incrementa contador de retry
        entity.retryCount++;
        
        if (entity.retryCount < this.config.offline.maxRetries) {
          // Agenda retry
          this.scheduleRetry(entity);
          await this.updateEntityStatus(entity, 'pending', error.message);
        } else {
          // Máximo de tentativas atingido
          await this.updateEntityStatus(entity, 'error', error.message);
        }
        
        errors++;
      }
    });

    await Promise.all(promises);
    return { synced, errors };
  }

  // Envia entidade para o servidor
  private async syncEntityToServer(
    entity: SyncEntity,
    options: SyncOptions
  ): Promise<any> {
    const timeout = options.timeout || this.config.network.timeoutMs;
    
    try {
      const response = await Promise.race([
        api.post('/sync/entity', {
          type: entity.type,
          id: entity.id,
          data: entity.data,
          checksum: entity.checksum,
          lastModified: entity.lastModified,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Conflito detectado
        return {
          success: true,
          conflict: true,
          serverData: error.response.data.serverData,
          serverChecksum: error.response.data.serverChecksum,
          conflictType: error.response.data.conflictType,
        };
      }
      
      throw error;
    }
  }

  // Obtém entidades pendentes
  private async getPendingEntities(options: SyncOptions): Promise<SyncEntity[]> {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('entities', 'readonly');
      const store = tx.objectStore('entities');
      const index = store.index('syncStatus');
      
      const pendingEntities = await index.getAll('pending');
      
      // Filtra por tipo se especificado
      let filtered = pendingEntities;
      if (options.entityTypes) {
        filtered = pendingEntities.filter(entity => 
          options.entityTypes!.includes(entity.type)
        );
      }
      
      // Filtra por prioridade se especificado
      if (options.priority !== undefined) {
        filtered = filtered.filter(entity => entity.priority <= options.priority!);
      }
      
      // Ordena por prioridade (menor número = maior prioridade)
      filtered.sort((a, b) => a.priority - b.priority);
      
      return filtered;
    } catch (error) {
      console.error('Erro ao obter entidades pendentes:', error);
      return [];
    }
  }

  // Atualiza status da entidade
  private async updateEntityStatus(
    entity: SyncEntity,
    status: SyncEntity['syncStatus'],
    errorMessage?: string
  ): Promise<void> {
    if (!this.db) return;

    try {
      entity.syncStatus = status;
      if (errorMessage) {
        entity.errorMessage = errorMessage;
      } else {
        delete entity.errorMessage;
      }
      
      await this.db.put('entities', entity);
      this.emit('entityStatusChanged', { entity, status });
    } catch (error) {
      console.error('Erro ao atualizar status da entidade:', error);
    }
  }

  // Agenda retry para entidade
  private scheduleRetry(entity: SyncEntity): void {
    const retryKey = `${entity.type}:${entity.id}`;
    
    // Cancela retry anterior se existir
    if (this.retryTimeouts.has(retryKey)) {
      clearTimeout(this.retryTimeouts.get(retryKey)!);
    }
    
    // Calcula delay exponencial
    const baseDelay = this.config.offline.retryDelayMs || 5000;
    const delay = baseDelay * Math.pow(2, entity.retryCount - 1);
    
    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(retryKey);
      
      if (navigator.onLine) {
        await this.processPendingSync({
          entityTypes: [entity.type],
          batchSize: 1,
        });
      }
    }, delay);
    
    this.retryTimeouts.set(retryKey, timeout);
  }

  // Gerenciamento de conflitos
  async addConflict(conflict: SyncConflict): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.put('conflicts', conflict);
      this.conflictQueue.push(conflict);
      this.emit('conflictDetected', { conflict });
    } catch (error) {
      console.error('Erro ao adicionar conflito:', error);
    }
  }

  async resolveConflict(
    entityType: string,
    entityId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> {
    if (!this.db) return;

    try {
      const conflict = await this.db.get('conflicts', [entityType, entityId]);
      if (!conflict) return;

      let finalData: any;
      
      switch (resolution) {
        case 'local':
          finalData = conflict.localData;
          break;
        case 'server':
          finalData = conflict.serverData;
          break;
        case 'merge':
          finalData = mergedData || conflict.localData;
          break;
      }

      // Atualiza entidade com dados resolvidos
      await this.addEntity(entityType, entityId, finalData, 1); // Alta prioridade
      
      // Remove conflito
      await this.db.delete('conflicts', [entityType, entityId]);
      
      // Remove da queue
      const index = this.conflictQueue.findIndex(
        c => c.entityType === entityType && c.entityId === entityId
      );
      if (index !== -1) {
        this.conflictQueue.splice(index, 1);
      }
      
      this.emit('conflictResolved', { entityType, entityId, resolution });
    } catch (error) {
      console.error('Erro ao resolver conflito:', error);
      throw error;
    }
  }

  async getConflicts(): Promise<SyncConflict[]> {
    return [...this.conflictQueue];
  }

  private async loadConflicts(): Promise<void> {
    if (!this.db) return;

    try {
      const conflicts = await this.db.getAll('conflicts');
      this.conflictQueue = conflicts;
    } catch (error) {
      console.error('Erro ao carregar conflitos:', error);
    }
  }

  // Status da sincronização
  async getSyncStatus(): Promise<SyncStatus> {
    if (!this.db) {
      return {
        isOnline: navigator.onLine,
        lastSync: null,
        pendingCount: 0,
        syncingCount: 0,
        errorCount: 0,
        totalEntities: 0,
        conflicts: [],
        progress: 0,
      };
    }

    try {
      const tx = this.db.transaction('entities', 'readonly');
      const store = tx.objectStore('entities');
      
      const [pending, syncing, error, total] = await Promise.all([
        store.index('syncStatus').count('pending'),
        store.index('syncStatus').count('syncing'),
        store.index('syncStatus').count('error'),
        store.count(),
      ]);

      const lastSyncMeta = await this.db.get('syncMeta', 'lastSync');
      
      return {
        isOnline: navigator.onLine,
        lastSync: lastSyncMeta?.value || null,
        pendingCount: pending,
        syncingCount: syncing,
        errorCount: error,
        totalEntities: total,
        conflicts: this.conflictQueue,
        progress: this.syncInProgress ? 50 : 0, // Simplified progress
      };
    } catch (error) {
      console.error('Erro ao obter status de sincronização:', error);
      return {
        isOnline: navigator.onLine,
        lastSync: null,
        pendingCount: 0,
        syncingCount: 0,
        errorCount: 0,
        totalEntities: 0,
        conflicts: [],
        progress: 0,
      };
    }
  }

  // Utilitários
  private async calculateChecksum(data: any): Promise<string> {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private sanitizeData(data: any): any {
    // Remove funções, símbolos e outros tipos não serializáveis
    return JSON.parse(JSON.stringify(data));
  }

  private async updateLastSyncTime(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.put('syncMeta', {
        key: 'lastSync',
        value: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erro ao atualizar timestamp de sincronização:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Sincronização periódica
  private syncInterval: NodeJS.Timeout | null = null;

  private startPeriodicSync(): void {
    if (this.syncInterval) return;

    const interval = this.config.offline.syncIntervalMs || 30000;
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.processPendingSync();
      }
    }, interval);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sistema de eventos
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no callback do evento ${event}:`, error);
        }
      });
    }
  }

  // Limpeza
  async cleanup(): Promise<void> {
    this.stopPeriodicSync();
    
    // Cancela todos os retries pendentes
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    // Fecha conexão com o banco
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    this.isInitialized = false;
    this.listeners.clear();
  }

  // Métodos de diagnóstico
  async getDiagnostics(): Promise<any> {
    const status = await this.getSyncStatus();
    
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      userTier: this.userTier,
      config: this.config.offline,
      status,
      retryQueueSize: this.retryTimeouts.size,
      listenerCount: Array.from(this.listeners.values()).reduce(
        (total, callbacks) => total + callbacks.length, 0
      ),
    };
  }
}

// Instância singleton
export const iOSSyncService = new iOSSyncService();
export default iOSSyncService;