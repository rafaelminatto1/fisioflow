import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Schema do banco IndexedDB
interface FisioFlowDB extends DBSchema {
  patients: {
    key: string;
    value: {
      id: string;
      tenantId: string;
      encryptedData: string;
      publicData: {
        name: string;
        email: string;
        phone: string;
        avatarUrl: string;
        createdAt: string;
      };
      lastModified: string;
      version: number;
    };
  };
  assessments: {
    key: string;
    value: {
      id: string;
      patientId: string;
      tenantId: string;
      encryptedData: string;
      publicData: {
        date: string;
        therapistId: string;
      };
      lastModified: string;
      version: number;
    };
  };
  documents: {
    key: string;
    value: {
      id: string;
      patientId: string;
      tenantId: string;
      encryptedData: string;
      publicData: {
        fileName: string;
        fileType: string;
        uploadDate: string;
        uploadedById: string;
      };
      lastModified: string;
      version: number;
    };
  };
  exerciseLogs: {
    key: string;
    value: {
      id: string;
      patientId: string;
      tenantId: string;
      encryptedData: string;
      publicData: {
        date: string;
        prescriptionId: string;
      };
      lastModified: string;
      version: number;
    };
  };
  backups: {
    key: string;
    value: {
      id: string;
      tenantId: string;
      timestamp: string;
      dataSnapshot: string; // JSON comprimido
      checksum: string;
      size: number;
    };
  };
  auditLogs: {
    key: string;
    value: {
      id: string;
      timestamp: string;
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      tenantId: string;
      dataHash: string;
      ipAddress?: string;
      userAgent?: string;
      gdprCompliant: boolean;
    };
  };
}

type StorageType = 'indexedDB' | 'localStorage' | 'sessionStorage';

interface StorageStrategy {
  // Dados grandes e sensíveis
  indexedDB: string[];
  // Configurações e preferências
  localStorage: string[];
  // Cache temporário
  sessionStorage: string[];
}

class SecureStorageManager {
  private db: IDBPDatabase<FisioFlowDB> | null = null;
  private readonly dbName = 'FisioFlowDB';
  private readonly version = 1;

  // Estratégia de armazenamento baseada no tipo de dado
  private readonly storageStrategy: StorageStrategy = {
    indexedDB: [
      'patients',
      'assessments', 
      'documents',
      'exerciseLogs',
      'clinicalCases',
      'patientProtocols',
      'auditLogs'
    ],
    localStorage: [
      'userPreferences',
      'appSettings',
      'theme',
      'language',
      'notifications'
    ],
    sessionStorage: [
      'searchResults',
      'tempForms',
      'pageCache',
      'filterStates'
    ]
  };

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<FisioFlowDB>(this.dbName, this.version, {
        upgrade(db) {
          // Store para pacientes
          if (!db.objectStoreNames.contains('patients')) {
            const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
            patientsStore.createIndex('tenantId', 'tenantId');
            patientsStore.createIndex('lastModified', 'lastModified');
          }

          // Store para avaliações
          if (!db.objectStoreNames.contains('assessments')) {
            const assessmentsStore = db.createObjectStore('assessments', { keyPath: 'id' });
            assessmentsStore.createIndex('patientId', 'patientId');
            assessmentsStore.createIndex('tenantId', 'tenantId');
            assessmentsStore.createIndex('lastModified', 'lastModified');
          }

          // Store para documentos
          if (!db.objectStoreNames.contains('documents')) {
            const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
            documentsStore.createIndex('patientId', 'patientId');
            documentsStore.createIndex('tenantId', 'tenantId');
            documentsStore.createIndex('lastModified', 'lastModified');
          }

          // Store para logs de exercícios
          if (!db.objectStoreNames.contains('exerciseLogs')) {
            const logsStore = db.createObjectStore('exerciseLogs', { keyPath: 'id' });
            logsStore.createIndex('patientId', 'patientId');
            logsStore.createIndex('tenantId', 'tenantId');
            logsStore.createIndex('lastModified', 'lastModified');
          }

          // Store para backups
          if (!db.objectStoreNames.contains('backups')) {
            const backupsStore = db.createObjectStore('backups', { keyPath: 'id' });
            backupsStore.createIndex('tenantId', 'tenantId');
            backupsStore.createIndex('timestamp', 'timestamp');
          }

          // Store para logs de auditoria LGPD
          if (!db.objectStoreNames.contains('auditLogs')) {
            const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
            auditStore.createIndex('tenantId', 'tenantId');
            auditStore.createIndex('userId', 'userId');
            auditStore.createIndex('timestamp', 'timestamp');
            auditStore.createIndex('entityType', 'entityType');
          }
        },
      });

      console.log('✅ IndexedDB inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar IndexedDB:', error);
      throw new Error('Falha na inicialização do armazenamento seguro');
    }
  }

  // Determina qual tipo de storage usar baseado no tipo de dado
  private getStorageType(dataType: string): StorageType {
    if (this.storageStrategy.indexedDB.includes(dataType)) {
      return 'indexedDB';
    }
    if (this.storageStrategy.localStorage.includes(dataType)) {
      return 'localStorage';
    }
    if (this.storageStrategy.sessionStorage.includes(dataType)) {
      return 'sessionStorage';
    }
    // Default para dados médicos sensíveis
    return 'indexedDB';
  }

  // Salvar dados baseado na estratégia
  async save<T>(
    dataType: string, 
    key: string, 
    data: T, 
    tenantId: string,
    isEncrypted = false
  ): Promise<void> {
    const storageType = this.getStorageType(dataType);

    try {
      switch (storageType) {
        case 'indexedDB':
          await this.saveToIndexedDB(dataType, key, data, tenantId, isEncrypted);
          break;
        case 'localStorage':
          this.saveToLocalStorage(dataType, key, data, tenantId);
          break;
        case 'sessionStorage':
          this.saveToSessionStorage(dataType, key, data, tenantId);
          break;
      }
    } catch (error) {
      console.error(`Erro ao salvar ${dataType}:`, error);
      throw error;
    }
  }

  private async saveToIndexedDB<T>(
    dataType: string, 
    key: string, 
    data: T, 
    tenantId: string,
    isEncrypted: boolean
  ): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB não inicializado');
    }

    const tx = this.db.transaction([dataType as keyof FisioFlowDB], 'readwrite');
    const store = tx.objectStore(dataType as keyof FisioFlowDB);

    const record = {
      id: key,
      tenantId,
      encryptedData: isEncrypted ? JSON.stringify(data) : '',
      publicData: isEncrypted ? {} : data,
      lastModified: new Date().toISOString(),
      version: 1
    };

    await store.put(record as any);
    await tx.done;
  }

  private saveToLocalStorage<T>(
    dataType: string, 
    key: string, 
    data: T, 
    tenantId: string
  ): void {
    const storageKey = `fisioflow_${tenantId}_${dataType}_${key}`;
    localStorage.setItem(storageKey, JSON.stringify({
      data,
      timestamp: new Date().toISOString(),
      version: 1
    }));
  }

  private saveToSessionStorage<T>(
    dataType: string, 
    key: string, 
    data: T, 
    tenantId: string
  ): void {
    const storageKey = `fisioflow_${tenantId}_${dataType}_${key}`;
    sessionStorage.setItem(storageKey, JSON.stringify({
      data,
      timestamp: new Date().toISOString(),
      version: 1
    }));
  }

  // Recuperar dados baseado na estratégia
  async get<T>(
    dataType: string, 
    key: string, 
    tenantId: string
  ): Promise<T | null> {
    const storageType = this.getStorageType(dataType);

    try {
      switch (storageType) {
        case 'indexedDB':
          return await this.getFromIndexedDB<T>(dataType, key, tenantId);
        case 'localStorage':
          return this.getFromLocalStorage<T>(dataType, key, tenantId);
        case 'sessionStorage':
          return this.getFromSessionStorage<T>(dataType, key, tenantId);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Erro ao recuperar ${dataType}:`, error);
      return null;
    }
  }

  private async getFromIndexedDB<T>(
    dataType: string, 
    key: string, 
    tenantId: string
  ): Promise<T | null> {
    if (!this.db) {
      throw new Error('IndexedDB não inicializado');
    }

    const tx = this.db.transaction([dataType as keyof FisioFlowDB], 'readonly');
    const store = tx.objectStore(dataType as keyof FisioFlowDB);
    const record = await store.get(key);

    if (!record || record.tenantId !== tenantId) {
      return null;
    }

    // Se dados estão criptografados, retorna os dados criptografados
    if (record.encryptedData) {
      return JSON.parse(record.encryptedData) as T;
    }

    return record.publicData as T;
  }

  private getFromLocalStorage<T>(
    dataType: string, 
    key: string, 
    tenantId: string
  ): T | null {
    const storageKey = `fisioflow_${tenantId}_${dataType}_${key}`;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      return parsed.data as T;
    } catch {
      return null;
    }
  }

  private getFromSessionStorage<T>(
    dataType: string, 
    key: string, 
    tenantId: string
  ): T | null {
    const storageKey = `fisioflow_${tenantId}_${dataType}_${key}`;
    const stored = sessionStorage.getItem(storageKey);
    
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      return parsed.data as T;
    } catch {
      return null;
    }
  }

  // Listar todos os itens de um tipo para um tenant
  async getAll<T>(dataType: string, tenantId: string): Promise<T[]> {
    const storageType = this.getStorageType(dataType);

    if (storageType === 'indexedDB') {
      return await this.getAllFromIndexedDB<T>(dataType, tenantId);
    }

    // Para localStorage/sessionStorage, implementar listagem por prefixo
    return this.getAllFromWebStorage<T>(dataType, tenantId, storageType);
  }

  private async getAllFromIndexedDB<T>(
    dataType: string, 
    tenantId: string
  ): Promise<T[]> {
    if (!this.db) {
      throw new Error('IndexedDB não inicializado');
    }

    const tx = this.db.transaction([dataType as keyof FisioFlowDB], 'readonly');
    const store = tx.objectStore(dataType as keyof FisioFlowDB);
    const index = store.index('tenantId');
    const records = await index.getAll(tenantId);

    return records.map(record => {
      if (record.encryptedData) {
        return JSON.parse(record.encryptedData) as T;
      }
      return record.publicData as T;
    });
  }

  private getAllFromWebStorage<T>(
    dataType: string, 
    tenantId: string,
    storageType: 'localStorage' | 'sessionStorage'
  ): T[] {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const prefix = `fisioflow_${tenantId}_${dataType}_`;
    const results: T[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) {
        const stored = storage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            results.push(parsed.data as T);
          } catch (error) {
            console.warn(`Erro ao parsear ${key}:`, error);
          }
        }
      }
    }

    return results;
  }

  // Deletar item
  async delete(dataType: string, key: string, tenantId: string): Promise<void> {
    const storageType = this.getStorageType(dataType);

    switch (storageType) {
      case 'indexedDB':
        await this.deleteFromIndexedDB(dataType, key, tenantId);
        break;
      case 'localStorage':
        this.deleteFromWebStorage(dataType, key, tenantId, 'localStorage');
        break;
      case 'sessionStorage':
        this.deleteFromWebStorage(dataType, key, tenantId, 'sessionStorage');
        break;
    }
  }

  private async deleteFromIndexedDB(
    dataType: string, 
    key: string, 
    tenantId: string
  ): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB não inicializado');
    }

    const tx = this.db.transaction([dataType as keyof FisioFlowDB], 'readwrite');
    const store = tx.objectStore(dataType as keyof FisioFlowDB);
    
    // Verificar se o item pertence ao tenant correto antes de deletar
    const record = await store.get(key);
    if (record && record.tenantId === tenantId) {
      await store.delete(key);
    }
    
    await tx.done;
  }

  private deleteFromWebStorage(
    dataType: string, 
    key: string, 
    tenantId: string,
    storageType: 'localStorage' | 'sessionStorage'
  ): void {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const storageKey = `fisioflow_${tenantId}_${dataType}_${key}`;
    storage.removeItem(storageKey);
  }

  // Limpeza e manutenção
  async clearTenantData(tenantId: string): Promise<void> {
    // Limpar IndexedDB
    if (this.db) {
      for (const storeName of this.storageStrategy.indexedDB) {
        const tx = this.db.transaction([storeName as keyof FisioFlowDB], 'readwrite');
        const store = tx.objectStore(storeName as keyof FisioFlowDB);
        const index = store.index('tenantId');
        const records = await index.getAllKeys(tenantId);
        
        for (const key of records) {
          await store.delete(key);
        }
        await tx.done;
      }
    }

    // Limpar localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`fisioflow_${tenantId}_`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Limpar sessionStorage
    sessionStorage.clear(); // Session storage é limpo completamente
  }

  // Informações de uso do storage
  async getStorageInfo(): Promise<{
    indexedDBSize: number;
    localStorageSize: number;
    sessionStorageSize: number;
    totalUsage: number;
  }> {
    const info = {
      indexedDBSize: 0,
      localStorageSize: 0,
      sessionStorageSize: 0,
      totalUsage: 0
    };

    // Calcular uso do localStorage
    let localStorageUsed = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fisioflow_')) {
        const value = localStorage.getItem(key);
        localStorageUsed += (key.length + (value?.length || 0)) * 2; // UTF-16
      }
    }
    info.localStorageSize = localStorageUsed;

    // Calcular uso do sessionStorage
    let sessionStorageUsed = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('fisioflow_')) {
        const value = sessionStorage.getItem(key);
        sessionStorageUsed += (key.length + (value?.length || 0)) * 2;
      }
    }
    info.sessionStorageSize = sessionStorageUsed;

    // IndexedDB size estimation (aproximado)
    if (this.db) {
      // Seria necessário implementar uma estimativa mais precisa
      info.indexedDBSize = 0; // Placeholder
    }

    info.totalUsage = info.indexedDBSize + info.localStorageSize + info.sessionStorageSize;

    return info;
  }
}

// Instância singleton
export const secureStorage = new SecureStorageManager();

// Inicializar automaticamente quando o módulo for carregado
secureStorage.initialize().catch(error => {
  console.error('Falha na inicialização do storage seguro:', error);
});

export default secureStorage;