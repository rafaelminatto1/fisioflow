/**
 * Sistema de Backup Automático para dados críticos
 * Implementa backup incremental, compressão e verificação de integridade
 */

import { secureStorage } from './secureStorage';
import { encryption } from './encryption';

export interface BackupMetadata {
  id: string;
  tenantId: string;
  timestamp: string;
  version: string;
  type: 'full' | 'incremental' | 'differential';
  dataTypes: string[];
  checksums: Record<string, string>;
  size: number; // bytes
  compressed: boolean;
  encrypted: boolean;
  dependencies?: string[]; // For incremental backups
}

export interface BackupConfig {
  tenantId: string;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  retentionPeriod: number; // days
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  encryptionEnabled: boolean;
  dataTypes: string[];
  maxBackupSize: number; // MB
  autoCleanup: boolean;
}

export interface RestorePoint {
  backupId: string;
  timestamp: string;
  description: string;
  dataSnapshot: any;
  canRestore: boolean;
  requiredBackups: string[]; // Chain of incremental backups
}

class BackupSystem {
  private readonly BACKUP_VERSION = '1.0';
  private readonly MAX_RETENTION_DAYS = 365;
  private configs: Map<string, BackupConfig> = new Map();
  private isBackupRunning = false;
  private backupQueue: Array<{ tenantId: string; type: 'full' | 'incremental' }> = [];

  /**
   * Configurar backup para um tenant
   */
  async configureBackup(config: BackupConfig): Promise<void> {
    this.configs.set(config.tenantId, config);
    
    // Salvar configuração no storage
    await secureStorage.save(
      'backupConfigs',
      config.tenantId,
      config,
      config.tenantId,
      false
    );

    // Agendar próximo backup
    this.scheduleNextBackup(config.tenantId);
    
    console.log(`✅ Backup configurado para tenant ${config.tenantId}`);
  }

  /**
   * Criar backup completo
   */
  async createFullBackup(
    tenantId: string,
    masterKey: string,
    description?: string
  ): Promise<string> {
    const config = this.configs.get(tenantId);
    if (!config) {
      throw new Error('Configuração de backup não encontrada');
    }

    const backupId = `backup_${tenantId}_${Date.now()}`;
    console.log(`🔄 Iniciando backup completo: ${backupId}`);

    try {
      // Coletar todos os dados
      const dataSnapshot: Record<string, any> = {};
      const checksums: Record<string, string> = {};

      for (const dataType of config.dataTypes) {
        const data = await secureStorage.getAll(dataType, tenantId);
        dataSnapshot[dataType] = data;
        
        // Calcular checksum
        const dataString = JSON.stringify(data);
        const hash = await encryption.hashSensitiveData(dataString);
        checksums[dataType] = hash.hash;
      }

      // Comprimir se habilitado
      let finalData = dataSnapshot;
      if (config.compressionLevel !== 'none') {
        finalData = await this.compressData(dataSnapshot, config.compressionLevel);
      }

      // Criptografar se habilitado
      if (config.encryptionEnabled) {
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const encryptionKey = await encryption.deriveKey(masterKey, salt);
        finalData = await encryption.encryptSensitiveData(finalData, encryptionKey);
      }

      // Calcular tamanho
      const dataSize = new Blob([JSON.stringify(finalData)]).size;

      // Verificar limite de tamanho
      if (dataSize > config.maxBackupSize * 1024 * 1024) {
        throw new Error(`Backup excede o limite de ${config.maxBackupSize}MB`);
      }

      // Criar metadata
      const metadata: BackupMetadata = {
        id: backupId,
        tenantId,
        timestamp: new Date().toISOString(),
        version: this.BACKUP_VERSION,
        type: 'full',
        dataTypes: config.dataTypes,
        checksums,
        size: dataSize,
        compressed: config.compressionLevel !== 'none',
        encrypted: config.encryptionEnabled
      };

      // Salvar backup
      await secureStorage.save('backups', backupId, {
        metadata,
        data: finalData,
        description: description || 'Backup automático completo'
      }, tenantId, false);

      console.log(`✅ Backup completo criado: ${backupId} (${(dataSize / 1024 / 1024).toFixed(2)}MB)`);
      return backupId;

    } catch (error) {
      console.error(`❌ Erro no backup completo ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Criar backup incremental
   */
  async createIncrementalBackup(
    tenantId: string,
    masterKey: string,
    lastBackupId: string
  ): Promise<string> {
    const config = this.configs.get(tenantId);
    if (!config) {
      throw new Error('Configuração de backup não encontrada');
    }

    const backupId = `backup_inc_${tenantId}_${Date.now()}`;
    console.log(`🔄 Iniciando backup incremental: ${backupId}`);

    try {
      // Recuperar último backup
      const lastBackup = await secureStorage.get('backups', lastBackupId, tenantId);
      if (!lastBackup) {
        throw new Error('Backup base não encontrado, criando backup completo');
      }

      const lastTimestamp = lastBackup.metadata.timestamp;
      const changes: Record<string, any> = {};
      const checksums: Record<string, string> = {};

      // Detectar mudanças desde o último backup
      for (const dataType of config.dataTypes) {
        const currentData = await secureStorage.getAll(dataType, tenantId);
        const lastChecksums = lastBackup.metadata.checksums;
        
        const currentDataString = JSON.stringify(currentData);
        const currentHash = await encryption.hashSensitiveData(currentDataString);
        
        // Se o hash mudou, incluir no backup incremental
        if (currentHash.hash !== lastChecksums[dataType]) {
          changes[dataType] = currentData;
          checksums[dataType] = currentHash.hash;
        }
      }

      // Se não há mudanças, pular backup
      if (Object.keys(changes).length === 0) {
        console.log(`ℹ️ Nenhuma mudança detectada desde ${lastBackupId}`);
        return lastBackupId; // Retorna o ID do último backup válido
      }

      // Comprimir e criptografar se necessário
      let finalData = changes;
      if (config.compressionLevel !== 'none') {
        finalData = await this.compressData(changes, config.compressionLevel);
      }

      if (config.encryptionEnabled) {
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const encryptionKey = await encryption.deriveKey(masterKey, salt);
        finalData = await encryption.encryptSensitiveData(finalData, encryptionKey);
      }

      const dataSize = new Blob([JSON.stringify(finalData)]).size;

      // Criar metadata
      const metadata: BackupMetadata = {
        id: backupId,
        tenantId,
        timestamp: new Date().toISOString(),
        version: this.BACKUP_VERSION,
        type: 'incremental',
        dataTypes: Object.keys(changes),
        checksums,
        size: dataSize,
        compressed: config.compressionLevel !== 'none',
        encrypted: config.encryptionEnabled,
        dependencies: [lastBackupId] // Backup necessário para restauração
      };

      // Salvar backup incremental
      await secureStorage.save('backups', backupId, {
        metadata,
        data: finalData,
        description: `Backup incremental baseado em ${lastBackupId}`
      }, tenantId, false);

      console.log(`✅ Backup incremental criado: ${backupId} (${(dataSize / 1024).toFixed(2)}KB)`);
      return backupId;

    } catch (error) {
      console.error(`❌ Erro no backup incremental ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Listar pontos de restauração disponíveis
   */
  async getRestorePoints(tenantId: string): Promise<RestorePoint[]> {
    try {
      const allBackups = await secureStorage.getAll('backups', tenantId);
      const restorePoints: RestorePoint[] = [];

      for (const backup of allBackups) {
        const metadata = backup.metadata as BackupMetadata;
        
        // Verificar se pode ser restaurado
        const canRestore = await this.verifyBackupIntegrity(backup);
        
        // Para backups incrementais, listar dependências
        const requiredBackups: string[] = [];
        if (metadata.type === 'incremental' && metadata.dependencies) {
          requiredBackups.push(...metadata.dependencies);
        }

        restorePoints.push({
          backupId: metadata.id,
          timestamp: metadata.timestamp,
          description: backup.description || 'Backup automático',
          dataSnapshot: backup.data,
          canRestore,
          requiredBackups
        });
      }

      // Ordenar por timestamp (mais recente primeiro)
      return restorePoints.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    } catch (error) {
      console.error('Erro ao listar pontos de restauração:', error);
      return [];
    }
  }

  /**
   * Restaurar dados de um backup
   */
  async restoreFromBackup(
    backupId: string,
    tenantId: string,
    masterKey: string,
    options: {
      dataTypes?: string[];
      overwrite?: boolean;
      createBackupFirst?: boolean;
    } = {}
  ): Promise<void> {
    console.log(`🔄 Iniciando restauração do backup: ${backupId}`);

    try {
      // Criar backup antes da restauração, se solicitado
      if (options.createBackupFirst) {
        await this.createFullBackup(tenantId, masterKey, 'Backup antes da restauração');
      }

      // Recuperar o backup
      const backup = await secureStorage.get('backups', backupId, tenantId);
      if (!backup) {
        throw new Error('Backup não encontrado');
      }

      const metadata = backup.metadata as BackupMetadata;

      // Verificar integridade
      const isValid = await this.verifyBackupIntegrity(backup);
      if (!isValid) {
        throw new Error('Backup corrompido ou inválido');
      }

      // Descriptografar se necessário
      let restoredData = backup.data;
      if (metadata.encrypted) {
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const encryptionKey = await encryption.deriveKey(masterKey, salt);
        restoredData = await encryption.decryptSensitiveData(restoredData, encryptionKey);
      }

      // Descomprimir se necessário
      if (metadata.compressed) {
        restoredData = await this.decompressData(restoredData);
      }

      // Para backups incrementais, recuperar cadeia de dependências
      if (metadata.type === 'incremental') {
        restoredData = await this.reconstructFromIncremental(
          backupId,
          tenantId,
          masterKey
        );
      }

      // Restaurar dados
      const dataTypesToRestore = options.dataTypes || metadata.dataTypes;
      
      for (const dataType of dataTypesToRestore) {
        if (restoredData[dataType]) {
          // Limpar dados existentes se overwrite estiver habilitado
          if (options.overwrite) {
            await this.clearDataType(dataType, tenantId);
          }

          // Restaurar dados
          const items = restoredData[dataType];
          for (const item of items) {
            await secureStorage.save(dataType, item.id, item, tenantId, false);
          }

          console.log(`✅ Restaurado ${dataType}: ${items.length} itens`);
        }
      }

      console.log(`✅ Restauração concluída do backup: ${backupId}`);

    } catch (error) {
      console.error(`❌ Erro na restauração do backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Verificar integridade de um backup
   */
  async verifyBackupIntegrity(backup: any): Promise<boolean> {
    try {
      const metadata = backup.metadata as BackupMetadata;
      
      // Verificar se todos os campos obrigatórios estão presentes
      if (!metadata.id || !metadata.timestamp || !metadata.version) {
        return false;
      }

      // Verificar checksums se disponíveis
      if (metadata.checksums && backup.data) {
        for (const [dataType, expectedChecksum] of Object.entries(metadata.checksums)) {
          if (backup.data[dataType]) {
            const currentHash = await encryption.hashSensitiveData(
              JSON.stringify(backup.data[dataType])
            );
            if (currentHash.hash !== expectedChecksum) {
              console.warn(`Checksum inválido para ${dataType}`);
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Erro na verificação de integridade:', error);
      return false;
    }
  }

  /**
   * Limpeza automática de backups antigos
   */
  async cleanupOldBackups(tenantId: string): Promise<void> {
    const config = this.configs.get(tenantId);
    if (!config || !config.autoCleanup) return;

    try {
      const allBackups = await secureStorage.getAll('backups', tenantId);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.retentionPeriod);

      let deletedCount = 0;
      
      for (const backup of allBackups) {
        const metadata = backup.metadata as BackupMetadata;
        const backupDate = new Date(metadata.timestamp);
        
        if (backupDate < cutoffDate) {
          await secureStorage.delete('backups', metadata.id, tenantId);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`🧹 Limpeza automática: ${deletedCount} backups antigos removidos`);
      }

    } catch (error) {
      console.error('Erro na limpeza de backups:', error);
    }
  }

  /**
   * Agendar próximo backup
   */
  private scheduleNextBackup(tenantId: string): void {
    const config = this.configs.get(tenantId);
    if (!config) return;

    let intervalMs = 0;
    switch (config.frequency) {
      case 'hourly':
        intervalMs = 60 * 60 * 1000;
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'realtime':
        // Para realtime, usar backup incremental a cada 15 minutos
        intervalMs = 15 * 60 * 1000;
        break;
    }

    if (intervalMs > 0) {
      setTimeout(async () => {
        await this.performScheduledBackup(tenantId);
        this.scheduleNextBackup(tenantId); // Reagendar
      }, intervalMs);
    }
  }

  /**
   * Executar backup agendado
   */
  private async performScheduledBackup(tenantId: string): Promise<void> {
    if (this.isBackupRunning) {
      this.backupQueue.push({ tenantId, type: 'incremental' });
      return;
    }

    this.isBackupRunning = true;

    try {
      // Encontrar último backup
      const restorePoints = await this.getRestorePoints(tenantId);
      const lastBackup = restorePoints[0];

      if (lastBackup) {
        // Criar backup incremental
        await this.createIncrementalBackup(
          tenantId,
          'backup_master_key', // TODO: Implementar gestão segura de chaves
          lastBackup.backupId
        );
      } else {
        // Primeiro backup - criar completo
        await this.createFullBackup(tenantId, 'backup_master_key');
      }

      // Executar limpeza
      await this.cleanupOldBackups(tenantId);

    } catch (error) {
      console.error(`Erro no backup agendado para ${tenantId}:`, error);
    } finally {
      this.isBackupRunning = false;
      
      // Processar fila
      if (this.backupQueue.length > 0) {
        const next = this.backupQueue.shift()!;
        await this.performScheduledBackup(next.tenantId);
      }
    }
  }

  /**
   * Comprimir dados
   */
  private async compressData(data: any, level: 'low' | 'medium' | 'high'): Promise<any> {
    // Implementação simplificada - na prática usaria bibliotecas como pako
    const jsonString = JSON.stringify(data);
    
    // Simular compressão removendo espaços e otimizando estrutura
    const compressed = jsonString
      .replace(/\s+/g, '') // Remove espaços
      .replace(/null/g, 'N') // Substitui null por N
      .replace(/true/g, 'T') // Substitui true por T
      .replace(/false/g, 'F'); // Substitui false por F

    return {
      _compressed: true,
      _level: level,
      _originalSize: jsonString.length,
      _compressedSize: compressed.length,
      data: compressed
    };
  }

  /**
   * Descomprimir dados
   */
  private async decompressData(compressedData: any): Promise<any> {
    if (!compressedData._compressed) {
      return compressedData;
    }

    // Reverter compressão
    const decompressed = compressedData.data
      .replace(/N/g, 'null')
      .replace(/T/g, 'true')
      .replace(/F/g, 'false');

    return JSON.parse(decompressed);
  }

  /**
   * Reconstruir dados de backup incremental
   */
  private async reconstructFromIncremental(
    backupId: string,
    tenantId: string,
    masterKey: string
  ): Promise<any> {
    // Implementação simplificada - reconstruir cadeia de backups
    const backup = await secureStorage.get('backups', backupId, tenantId);
    if (!backup) {
      throw new Error('Backup não encontrado');
    }

    const metadata = backup.metadata as BackupMetadata;
    let reconstructedData = backup.data;

    // Se tem dependências, reconstruir recursivamente
    if (metadata.dependencies && metadata.dependencies.length > 0) {
      for (const depId of metadata.dependencies) {
        const baseData = await this.reconstructFromIncremental(depId, tenantId, masterKey);
        
        // Merge dos dados (incremental sobrescreve base)
        reconstructedData = {
          ...baseData,
          ...reconstructedData
        };
      }
    }

    return reconstructedData;
  }

  /**
   * Limpar tipo de dados
   */
  private async clearDataType(dataType: string, tenantId: string): Promise<void> {
    const items = await secureStorage.getAll(dataType, tenantId);
    for (const item of items) {
      await secureStorage.delete(dataType, item.id, tenantId);
    }
  }

  /**
   * Estatísticas de backup
   */
  async getBackupStatistics(tenantId: string): Promise<{
    totalBackups: number;
    totalSize: number;
    lastBackup?: string;
    nextScheduled?: string;
    storageUsed: number;
    retentionDays: number;
  }> {
    const allBackups = await secureStorage.getAll('backups', tenantId);
    const config = this.configs.get(tenantId);

    const totalSize = allBackups.reduce((sum, backup) => 
      sum + (backup.metadata?.size || 0), 0
    );

    const lastBackup = allBackups
      .sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime())
      [0]?.metadata.timestamp;

    return {
      totalBackups: allBackups.length,
      totalSize,
      lastBackup,
      storageUsed: totalSize,
      retentionDays: config?.retentionPeriod || 30
    };
  }
}

// Instância singleton
export const backupSystem = new BackupSystem();

export default backupSystem;