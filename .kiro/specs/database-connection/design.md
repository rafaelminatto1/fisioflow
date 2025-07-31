# Design Document - Conexão com Banco de Dados

## Overview

O design da conexão com banco de dados para o FisioFlow implementa uma arquitetura híbrida que combina a flexibilidade do localStorage atual com a robustez de bancos de dados relacionais. O sistema suporta múltiplos provedores (Supabase, PostgreSQL, SQLite) com fallback automático e sincronização inteligente.

## Architecture

### Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  React Components + Hooks (usePatients, useData, etc.)     │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                     │
│  Data Services + Validation + Business Rules               │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                        │
│  Database Abstraction + Connection Management               │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                            │
│  Supabase │ PostgreSQL │ SQLite │ LocalStorage (Fallback)  │
└─────────────────────────────────────────────────────────────┘
```

### Estratégia Híbrida

```typescript
interface HybridStorageStrategy {
  primary: DatabaseProvider;     // Supabase/PostgreSQL
  fallback: LocalStorageProvider; // localStorage atual
  cache: IndexedDBProvider;      // Cache local otimizado
  sync: SyncManager;            // Gerenciador de sincronização
}
```

## Components and Interfaces

### 1. Database Abstraction Layer

```typescript
// services/database/DatabaseProvider.ts
export interface DatabaseProvider {
  name: string;
  isConnected(): Promise<boolean>;
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  
  // CRUD Operations
  create<T>(table: string, data: T): Promise<T>;
  read<T>(table: string, id: string): Promise<T | null>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;
  delete(table: string, id: string): Promise<boolean>;
  
  // Batch Operations
  createMany<T>(table: string, data: T[]): Promise<T[]>;
  updateMany<T>(table: string, updates: Array<{id: string, data: Partial<T>}>): Promise<T[]>;
  deleteMany(table: string, ids: string[]): Promise<boolean>;
  
  // Query Operations
  find<T>(table: string, query: QueryOptions): Promise<T[]>;
  count(table: string, query?: QueryOptions): Promise<number>;
  
  // Real-time subscriptions
  subscribe<T>(table: string, callback: (data: T[]) => void): Promise<() => void>;
}

// Implementações específicas
export class SupabaseProvider implements DatabaseProvider { }
export class PostgreSQLProvider implements DatabaseProvider { }
export class SQLiteProvider implements DatabaseProvider { }
export class LocalStorageProvider implements DatabaseProvider { }
```

### 2. Connection Manager

```typescript
// services/database/ConnectionManager.ts
export class ConnectionManager {
  private providers: Map<string, DatabaseProvider> = new Map();
  private activeProvider: DatabaseProvider | null = null;
  private fallbackProvider: DatabaseProvider;
  private connectionPool: ConnectionPool;
  
  constructor(config: DatabaseConfig) {
    this.initializeProviders(config);
    this.setupHealthChecks();
    this.setupAutoReconnect();
  }
  
  async connect(): Promise<void> {
    // Tentar conectar com provedor primário
    for (const provider of this.getProvidersInOrder()) {
      try {
        await provider.connect();
        this.activeProvider = provider;
        this.logConnection(provider.name, 'success');
        return;
      } catch (error) {
        this.logConnection(provider.name, 'failed', error);
      }
    }
    
    // Fallback para localStorage se todos falharem
    this.activeProvider = this.fallbackProvider;
    await this.fallbackProvider.connect();
  }
  
  getActiveProvider(): DatabaseProvider {
    return this.activeProvider || this.fallbackProvider;
  }
  
  async executeWithFallback<T>(
    operation: (provider: DatabaseProvider) => Promise<T>
  ): Promise<T> {
    try {
      return await operation(this.getActiveProvider());
    } catch (error) {
      if (this.activeProvider !== this.fallbackProvider) {
        // Tentar com fallback
        return await operation(this.fallbackProvider);
      }
      throw error;
    }
  }
}
```

### 3. Sync Manager

```typescript
// services/database/SyncManager.ts
export class SyncManager {
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInterval: number = 30000; // 30 segundos
  
  constructor(
    private connectionManager: ConnectionManager,
    private cacheManager: CacheManager
  ) {
    this.setupOnlineDetection();
    this.startSyncLoop();
  }
  
  async queueOperation(operation: SyncOperation): Promise<void> {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }
  
  async processSyncQueue(): Promise<void> {
    const provider = this.connectionManager.getActiveProvider();
    
    for (const operation of this.syncQueue) {
      try {
        await this.executeOperation(provider, operation);
        this.removeSyncOperation(operation.id);
      } catch (error) {
        operation.retryCount++;
        if (operation.retryCount >= 3) {
          this.handleFailedOperation(operation, error);
        }
      }
    }
  }
  
  async syncFromServer(): Promise<void> {
    const provider = this.connectionManager.getActiveProvider();
    const lastSync = await this.getLastSyncTimestamp();
    
    // Buscar dados modificados desde a última sincronização
    const modifiedData = await provider.find('*', {
      where: { updatedAt: { gt: lastSync } },
      orderBy: { updatedAt: 'asc' }
    });
    
    // Atualizar cache local
    await this.cacheManager.updateFromServer(modifiedData);
    await this.setLastSyncTimestamp(Date.now());
  }
}
```

### 4. Data Migration Service

```typescript
// services/database/MigrationService.ts
export class MigrationService {
  constructor(
    private connectionManager: ConnectionManager,
    private validator: DataValidator
  ) {}
  
  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const migrationResult: MigrationResult = {
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };
    
    const localStorageData = this.extractLocalStorageData();
    migrationResult.totalRecords = this.countTotalRecords(localStorageData);
    
    for (const [table, records] of Object.entries(localStorageData)) {
      try {
        const validatedRecords = await this.validateRecords(table, records);
        const migratedCount = await this.migrateTable(table, validatedRecords);
        migrationResult.migratedRecords += migratedCount;
      } catch (error) {
        migrationResult.errors.push({
          table,
          error: error.message,
          recordCount: records.length
        });
        migrationResult.failedRecords += records.length;
      }
    }
    
    return migrationResult;
  }
  
  private async migrateTable(table: string, records: any[]): Promise<number> {
    const provider = this.connectionManager.getActiveProvider();
    const batchSize = 100;
    let migratedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      try {
        await provider.createMany(table, batch);
        migratedCount += batch.length;
      } catch (error) {
        // Tentar migrar registros individualmente
        for (const record of batch) {
          try {
            await provider.create(table, record);
            migratedCount++;
          } catch (recordError) {
            console.error(`Failed to migrate record:`, record, recordError);
          }
        }
      }
    }
    
    return migratedCount;
  }
}
```

### 5. Enhanced Data Hooks

```typescript
// hooks/database/useDatabaseData.ts
export function useDatabaseData<T>(
  table: string,
  query?: QueryOptions
): DatabaseDataHook<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const connectionManager = useConnectionManager();
  const syncManager = useSyncManager();
  
  // Carregar dados (cache primeiro, depois servidor)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Tentar cache primeiro para resposta rápida
      const cachedData = await loadFromCache(table, query);
      if (cachedData.length > 0) {
        setData(cachedData);
        setLoading(false);
      }
      
      // Buscar dados atualizados do servidor
      if (isOnline) {
        const provider = connectionManager.getActiveProvider();
        const serverData = await provider.find<T>(table, query);
        setData(serverData);
        
        // Atualizar cache
        await updateCache(table, serverData);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [table, query, isOnline]);
  
  // Criar registro
  const create = useCallback(async (newData: Omit<T, 'id'>) => {
    try {
      const provider = connectionManager.getActiveProvider();
      const created = await provider.create<T>(table, newData);
      
      // Atualizar estado local imediatamente
      setData(prev => [...prev, created]);
      
      // Enfileirar para sincronização se offline
      if (!isOnline) {
        await syncManager.queueOperation({
          type: 'create',
          table,
          data: created
        });
      }
      
      return created;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [table, isOnline]);
  
  // Atualizar registro
  const update = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      const provider = connectionManager.getActiveProvider();
      const updated = await provider.update<T>(table, id, updates);
      
      // Atualizar estado local
      setData(prev => prev.map(item => 
        (item as any).id === id ? updated : item
      ));
      
      // Enfileirar para sincronização se offline
      if (!isOnline) {
        await syncManager.queueOperation({
          type: 'update',
          table,
          id,
          data: updates
        });
      }
      
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [table, isOnline]);
  
  // Deletar registro
  const remove = useCallback(async (id: string) => {
    try {
      const provider = connectionManager.getActiveProvider();
      await provider.delete(table, id);
      
      // Atualizar estado local
      setData(prev => prev.filter(item => (item as any).id !== id));
      
      // Enfileirar para sincronização se offline
      if (!isOnline) {
        await syncManager.queueOperation({
          type: 'delete',
          table,
          id
        });
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [table, isOnline]);
  
  // Subscription para atualizações em tempo real
  useEffect(() => {
    if (!isOnline) return;
    
    const provider = connectionManager.getActiveProvider();
    let unsubscribe: (() => void) | null = null;
    
    provider.subscribe<T>(table, (updatedData) => {
      setData(updatedData);
    }).then(unsub => {
      unsubscribe = unsub;
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [table, isOnline]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  return {
    data,
    loading,
    error,
    isOnline,
    create,
    update,
    remove,
    refresh: loadData
  };
}
```

## Data Models

### Database Configuration

```typescript
interface DatabaseConfig {
  primary: {
    provider: 'supabase' | 'postgresql' | 'sqlite';
    connectionString: string;
    options?: Record<string, any>;
  };
  fallback: {
    provider: 'localStorage' | 'indexedDB';
    options?: Record<string, any>;
  };
  sync: {
    enabled: boolean;
    interval: number;
    batchSize: number;
    retryAttempts: number;
  };
  cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
}
```

### Sync Operation

```typescript
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
}
```

### Migration Result

```typescript
interface MigrationResult {
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  errors: Array<{
    table: string;
    error: string;
    recordCount: number;
  }>;
  duration: number;
  timestamp: string;
}
```

## Error Handling

### Connection Resilience

```typescript
class ConnectionResilience {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  async handleConnectionError(error: Error): Promise<void> {
    console.error('Database connection error:', error);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(async () => {
        try {
          await this.connectionManager.connect();
          this.reconnectAttempts = 0;
        } catch (retryError) {
          await this.handleConnectionError(retryError);
        }
      }, delay);
    } else {
      // Fallback para localStorage permanentemente
      await this.switchToFallbackMode();
    }
  }
  
  private async switchToFallbackMode(): Promise<void> {
    this.connectionManager.setFallbackMode(true);
    this.notifyUser('Modo offline ativado. Dados serão sincronizados quando a conexão for restaurada.');
  }
}
```

### Data Validation

```typescript
class DataValidator {
  private schemas: Map<string, ValidationSchema> = new Map();
  
  async validate<T>(table: string, data: T): Promise<ValidationResult<T>> {
    const schema = this.schemas.get(table);
    if (!schema) {
      throw new Error(`No validation schema found for table: ${table}`);
    }
    
    try {
      const validatedData = await schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      return {
        success: false,
        errors: this.formatValidationErrors(error),
        data: null
      };
    }
  }
  
  registerSchema(table: string, schema: ValidationSchema): void {
    this.schemas.set(table, schema);
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/database/ConnectionManager.test.ts
describe('ConnectionManager', () => {
  it('should connect to primary provider first', async () => {
    const manager = new ConnectionManager(mockConfig);
    await manager.connect();
    expect(manager.getActiveProvider().name).toBe('supabase');
  });
  
  it('should fallback to localStorage when primary fails', async () => {
    const manager = new ConnectionManager(mockConfigWithFailingPrimary);
    await manager.connect();
    expect(manager.getActiveProvider().name).toBe('localStorage');
  });
});
```

### Integration Tests

```typescript
// tests/database/SyncManager.integration.test.ts
describe('SyncManager Integration', () => {
  it('should sync offline operations when connection is restored', async () => {
    const syncManager = new SyncManager(connectionManager, cacheManager);
    
    // Simular operações offline
    await syncManager.queueOperation({
      type: 'create',
      table: 'patients',
      data: mockPatient
    });
    
    // Simular reconexão
    await syncManager.processSyncQueue();
    
    // Verificar se dados foram sincronizados
    const patients = await connectionManager.getActiveProvider().find('patients');
    expect(patients).toContainEqual(mockPatient);
  });
});
```

### Performance Tests

```typescript
// tests/database/Performance.test.ts
describe('Database Performance', () => {
  it('should handle batch operations efficiently', async () => {
    const startTime = Date.now();
    const provider = new SupabaseProvider();
    
    await provider.createMany('patients', generateMockPatients(1000));
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Menos de 5 segundos
  });
});
```

## Implementation Plan

### Fase 1: Core Infrastructure
- Implementar DatabaseProvider interface
- Criar ConnectionManager básico
- Implementar SupabaseProvider
- Configurar variáveis de ambiente

### Fase 2: Sync & Migration
- Implementar SyncManager
- Criar MigrationService
- Implementar cache com IndexedDB
- Testes de migração

### Fase 3: Enhanced Hooks
- Refatorar hooks existentes
- Implementar useDatabaseData
- Adicionar real-time subscriptions
- Otimizar performance

### Fase 4: Production Ready
- Implementar monitoring
- Adicionar error tracking
- Otimizar batch operations
- Documentação completa

Esta arquitetura garante uma transição suave do localStorage atual para um sistema de banco de dados robusto, mantendo compatibilidade e adicionando funcionalidades avançadas de sincronização e colaboração.