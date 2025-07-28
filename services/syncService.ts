/**
 * Sistema de Sincronização Multi-Device
 * Permite sincronização de dados entre diferentes dispositivos do mesmo usuário
 */

import { auditLogger, AuditAction, LegalBasis } from './auditLogger';
import { encryption } from './encryption';
import { secureStorage } from './secureStorage';

interface SyncConfig {
  userId: string;
  tenantId: string;
  deviceId: string;
  deviceName: string;
  syncKey: string; // Chave de sincronização específica do usuário
}

interface SyncData {
  id: string;
  type: 'patient' | 'appointment' | 'exercise' | 'assessment' | 'preference';
  entityId: string;
  data: any;
  timestamp: string;
  version: number;
  deviceId: string;
  checksum: string;
  isDeleted?: boolean;
}

interface SyncBatch {
  batchId: string;
  userId: string;
  tenantId: string;
  timestamp: string;
  changes: SyncData[];
  totalSize: number;
  compressed: boolean;
}

interface ConflictResolution {
  strategy: 'latest_wins' | 'manual' | 'merge' | 'keep_both';
  resolver?: (local: SyncData, remote: SyncData) => SyncData;
}

interface SyncStatus {
  lastSync: string;
  pendingChanges: number;
  conflicts: number;
  deviceCount: number;
  totalSynced: number;
  status: 'idle' | 'syncing' | 'error' | 'conflict';
  error?: string;
}

class SyncService {
  private config: SyncConfig | null = null;
  private syncEndpoint = '/api/sync'; // Em produção seria configurável
  private pendingChanges: Map<string, SyncData> = new Map();
  private lastSyncTimestamp: string = '';
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Inicializar o serviço de sincronização
   */
  async initialize(userId: string, tenantId: string, masterKey: string): Promise<void> {
    try {
      // Gerar device ID único
      let deviceId = localStorage.getItem('fisioflow_device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('fisioflow_device_id', deviceId);
      }

      // Gerar chave de sincronização
      const syncKey = await this.generateSyncKey(userId, masterKey);

      this.config = {
        userId,
        tenantId,
        deviceId,
        deviceName: this.getDeviceName(),
        syncKey,
      };

      // Carregar estado de sincronização
      await this.loadSyncState();

      // Configurar listeners
      this.setupEventListeners();

      // Iniciar heartbeat
      this.startHeartbeat();

      console.log('🔄 Sync Service inicializado:', {
        deviceId,
        deviceName: this.config.deviceName,
      });

      // Log de auditoria
      await auditLogger.logAction(
        tenantId,
        userId,
        'USER',
        AuditAction.LOGIN, // Usar ação existente
        'sync_device',
        deviceId,
        {
          entityName: this.config.deviceName,
          legalBasis: LegalBasis.LEGITIMATE_INTEREST,
          dataAccessed: ['device_info', 'sync_preferences'],
        }
      );

    } catch (error) {
      console.error('❌ Erro ao inicializar Sync Service:', error);
      throw error;
    }
  }

  /**
   * Registrar mudança para sincronização
   */
  async recordChange(
    type: SyncData['type'],
    entityId: string,
    data: any,
    isDeleted: boolean = false
  ): Promise<void> {
    if (!this.config) {
      console.warn('⚠️ Sync não inicializado, mudança não será sincronizada');
      return;
    }

    try {
      const syncData: SyncData = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        entityId,
        data: isDeleted ? null : data,
        timestamp: new Date().toISOString(),
        version: Date.now(),
        deviceId: this.config.deviceId,
        checksum: await this.generateChecksum(data),
        isDeleted,
      };

      // Criptografar dados sensíveis
      if (type === 'patient' || type === 'assessment') {
        syncData.data = await this.encryptSyncData(syncData.data);
      }

      // Armazenar mudança pendente
      this.pendingChanges.set(syncData.id, syncData);

      // Salvar no storage local
      await this.savePendingChanges();

      console.log(`📝 Mudança registrada para sync: ${type}:${entityId}`);

      // Tentar sincronizar se online
      if (this.isOnline && !this.syncInProgress) {
        this.queueSync();
      }

    } catch (error) {
      console.error('❌ Erro ao registrar mudança:', error);
    }
  }

  /**
   * Executar sincronização completa
   */
  async performSync(force: boolean = false): Promise<SyncStatus> {
    if (!this.config) {
      throw new Error('Sync não inicializado');
    }

    if (this.syncInProgress && !force) {
      console.log('⏳ Sync já em andamento');
      return this.getSyncStatus();
    }

    try {
      this.syncInProgress = true;
      console.log('🔄 Iniciando sincronização...');

      // 1. Enviar mudanças locais
      await this.pushLocalChanges();

      // 2. Buscar mudanças remotas
      await this.pullRemoteChanges();

      // 3. Resolver conflitos
      await this.resolveConflicts();

      // 4. Atualizar timestamp de sincronização
      this.lastSyncTimestamp = new Date().toISOString();
      await this.saveSyncState();

      console.log('✅ Sincronização completa');

      return this.getSyncStatus();

    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Obter status atual da sincronização
   */
  getSyncStatus(): SyncStatus {
    return {
      lastSync: this.lastSyncTimestamp,
      pendingChanges: this.pendingChanges.size,
      conflicts: 0, // TODO: Implementar contagem de conflitos
      deviceCount: 1, // TODO: Buscar do servidor
      totalSynced: 0, // TODO: Implementar contador
      status: this.syncInProgress ? 'syncing' : 'idle',
    };
  }

  /**
   * Pausar/retomar sincronização
   */
  async pauseSync(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    console.log('⏸️ Sincronização pausada');
  }

  async resumeSync(): Promise<void> {
    if (!this.heartbeatInterval) {
      this.startHeartbeat();
    }
    
    console.log('▶️ Sincronização retomada');
  }

  /**
   * Limpar dados de sincronização (logout)
   */
  async cleanup(): Promise<void> {
    await this.pauseSync();
    
    this.pendingChanges.clear();
    this.config = null;
    this.lastSyncTimestamp = '';
    
    // Limpar storage local
    localStorage.removeItem('fisioflow_sync_state');
    localStorage.removeItem('fisioflow_pending_changes');
    
    console.log('🧹 Sync Service limpo');
  }

  // === MÉTODOS PRIVADOS ===

  private async generateSyncKey(userId: string, masterKey: string): Promise<string> {
    const syncSeed = `${userId}_${masterKey}_sync`;
    return await encryption.hashSensitiveData(syncSeed).then(h => h.hash);
  }

  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'Mobile Device';
    } else if (/Tablet/.test(userAgent)) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  private async generateChecksum(data: any): Promise<string> {
    const dataString = JSON.stringify(data);
    return await encryption.hashSensitiveData(dataString).then(h => h.hash.substring(0, 16));
  }

  private async encryptSyncData(data: any): Promise<string> {
    if (!this.config) throw new Error('Config não disponível');
    
    const key = await encryption.deriveKey(this.config.syncKey, new Uint8Array(32));
    const encrypted = await encryption.encryptSensitiveData(data, key);
    return JSON.stringify(encrypted);
  }

  private async decryptSyncData(encryptedData: string): Promise<any> {
    if (!this.config) throw new Error('Config não disponível');
    
    const key = await encryption.deriveKey(this.config.syncKey, new Uint8Array(32));
    const parsedData = JSON.parse(encryptedData);
    return await encryption.decryptSensitiveData(parsedData, key);
  }

  private setupEventListeners(): void {
    // Detectar mudanças de conectividade
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Device online - retomando sync');
      this.queueSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 Device offline - pausando sync');
    });

    // Detectar quando a aba volta ao foco
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.queueSync();
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isOnline && this.pendingChanges.size > 0) {
        this.queueSync();
      }
    }, 30000); // A cada 30 segundos
  }

  private queueSync(): void {
    // Debounce para evitar muitas chamadas
    setTimeout(() => {
      if (!this.syncInProgress && this.pendingChanges.size > 0) {
        this.performSync().catch(error => {
          console.error('❌ Erro no sync automático:', error);
        });
      }
    }, 1000);
  }

  private async pushLocalChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    const batch: SyncBatch = {
      batchId: `batch_${Date.now()}`,
      userId: this.config!.userId,
      tenantId: this.config!.tenantId,
      timestamp: new Date().toISOString(),
      changes: Array.from(this.pendingChanges.values()),
      totalSize: 0,
      compressed: false,
    };

    // Simular envio para servidor (em produção seria HTTP request)
    console.log('📤 Enviando mudanças locais:', batch.changes.length);
    
    // TODO: Implementar envio real para servidor
    // const response = await fetch(this.syncEndpoint + '/push', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(batch)
    // });

    // Simular sucesso
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Limpar mudanças enviadas
    this.pendingChanges.clear();
    await this.savePendingChanges();
  }

  private async pullRemoteChanges(): Promise<void> {
    // TODO: Implementar busca de mudanças do servidor
    console.log('📥 Buscando mudanças remotas...');
    
    // Simular busca
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Em produção, aplicaria as mudanças recebidas
  }

  private async resolveConflicts(): Promise<void> {
    // TODO: Implementar resolução de conflitos
    console.log('🔧 Resolvendo conflitos...');
  }

  private async loadSyncState(): Promise<void> {
    try {
      const state = localStorage.getItem('fisioflow_sync_state');
      if (state) {
        const parsed = JSON.parse(state);
        this.lastSyncTimestamp = parsed.lastSync || '';
      }

      const pending = localStorage.getItem('fisioflow_pending_changes');
      if (pending) {
        const parsedPending = JSON.parse(pending);
        this.pendingChanges = new Map(Object.entries(parsedPending));
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar estado de sync:', error);
    }
  }

  private async saveSyncState(): Promise<void> {
    try {
      const state = {
        lastSync: this.lastSyncTimestamp,
      };
      localStorage.setItem('fisioflow_sync_state', JSON.stringify(state));
    } catch (error) {
      console.error('❌ Erro ao salvar estado de sync:', error);
    }
  }

  private async savePendingChanges(): Promise<void> {
    try {
      const pendingObj = Object.fromEntries(this.pendingChanges);
      localStorage.setItem('fisioflow_pending_changes', JSON.stringify(pendingObj));
    } catch (error) {
      console.error('❌ Erro ao salvar mudanças pendentes:', error);
    }
  }
}

// Instância singleton
export const syncService = new SyncService();

// Hook para usar o sync service
export const useSyncService = () => {
  const [status, setStatus] = React.useState<SyncStatus | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    const updateStatus = () => {
      if (isInitialized) {
        setStatus(syncService.getSyncStatus());
      }
    };

    const interval = setInterval(updateStatus, 5000); // Atualizar a cada 5s
    updateStatus();

    return () => clearInterval(interval);
  }, [isInitialized]);

  return {
    status,
    isInitialized,
    initialize: (userId: string, tenantId: string, masterKey: string) => {
      return syncService.initialize(userId, tenantId, masterKey).then(() => {
        setIsInitialized(true);
      });
    },
    recordChange: syncService.recordChange.bind(syncService),
    performSync: syncService.performSync.bind(syncService),
    pauseSync: syncService.pauseSync.bind(syncService),
    resumeSync: syncService.resumeSync.bind(syncService),
    cleanup: () => {
      return syncService.cleanup().then(() => {
        setIsInitialized(false);
        setStatus(null);
      });
    },
  };
};

export default syncService;

// Adicionar import do React para o hook
import React from 'react';