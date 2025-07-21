import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import { useData } from './useData';
import { useNotification } from './useNotification';
import { useFeatureFlags } from './useFeatureFlags';
import { useExternalIntegrations } from './useExternalIntegrations';

interface BackupConfig {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  includeFiles: boolean;
  includeImages: boolean;
  compression: boolean;
  encryption: boolean;
  destinations: BackupDestination[];
  lastBackup?: string;
  nextBackup?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  errorMessage?: string;
}

interface BackupDestination {
  id: string;
  type: 'local' | 'cloud' | 'external';
  name: string;
  config: {
    path?: string;
    integrationId?: string;
    bucket?: string;
    region?: string;
    credentials?: Record<string, string>;
  };
  isActive: boolean;
  lastSync?: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

interface BackupData {
  id: string;
  configId: string;
  timestamp: string;
  size: number;
  checksum: string;
  status: 'creating' | 'completed' | 'failed' | 'corrupted';
  destinations: {
    destinationId: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    url?: string;
    size?: number;
  }[];
  metadata: {
    version: string;
    dataTypes: string[];
    recordCounts: Record<string, number>;
    createdBy: string;
    tenantId: string;
  };
  errorMessage?: string;
}

interface SyncConflict {
  id: string;
  type: 'data_conflict' | 'version_conflict' | 'schema_conflict';
  entityType: string;
  entityId: string;
  localData: any;
  remoteData: any;
  timestamp: string;
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
  resolvedBy?: string;
  resolvedAt?: string;
}

interface BackupSyncContextType {
  configs: BackupConfig[];
  destinations: BackupDestination[];
  backups: BackupData[];
  conflicts: SyncConflict[];
  isBackupRunning: boolean;
  isSyncRunning: boolean;
  createBackupConfig: (
    config: Omit<BackupConfig, 'id' | 'lastBackup' | 'nextBackup' | 'status'>
  ) => void;
  updateBackupConfig: (
    configId: string,
    updates: Partial<BackupConfig>
  ) => void;
  deleteBackupConfig: (configId: string) => void;
  createDestination: (
    destination: Omit<BackupDestination, 'id' | 'lastSync' | 'status'>
  ) => void;
  updateDestination: (
    destinationId: string,
    updates: Partial<BackupDestination>
  ) => void;
  deleteDestination: (destinationId: string) => void;
  runBackup: (configId: string) => Promise<BackupData | null>;
  runAllBackups: () => Promise<BackupData[]>;
  restoreBackup: (backupId: string, destinationId?: string) => Promise<boolean>;
  deleteBackup: (backupId: string) => Promise<boolean>;
  syncData: (force?: boolean) => Promise<boolean>;
  resolveConflict: (
    conflictId: string,
    resolution: SyncConflict['resolution'],
    data?: any
  ) => Promise<boolean>;
  validateBackup: (backupId: string) => Promise<boolean>;
  getBackupStats: () => {
    totalBackups: number;
    totalSize: number;
    successRate: number;
    lastBackup?: string;
    nextBackup?: string;
  };
  exportData: (
    format: 'json' | 'csv' | 'xml',
    dataTypes?: string[]
  ) => Promise<Blob>;
  importData: (
    file: File,
    options?: { merge: boolean; validate: boolean }
  ) => Promise<boolean>;
}

const BackupSyncContext = createContext<BackupSyncContextType | undefined>(
  undefined
);

// Default backup configurations
const DEFAULT_CONFIGS: BackupConfig[] = [
  {
    id: 'daily_full_backup',
    name: 'Backup Diário Completo',
    description: 'Backup completo de todos os dados executado diariamente',
    isActive: true,
    frequency: 'daily',
    retentionDays: 30,
    includeFiles: true,
    includeImages: true,
    compression: true,
    encryption: true,
    destinations: [],
    status: 'idle',
  },
  {
    id: 'hourly_incremental',
    name: 'Backup Incremental por Hora',
    description: 'Backup incremental dos dados modificados a cada hora',
    isActive: true,
    frequency: 'hourly',
    retentionDays: 7,
    includeFiles: false,
    includeImages: false,
    compression: true,
    encryption: true,
    destinations: [],
    status: 'idle',
  },
  {
    id: 'realtime_critical',
    name: 'Backup em Tempo Real (Crítico)',
    description: 'Backup em tempo real para dados críticos',
    isActive: false,
    frequency: 'realtime',
    retentionDays: 3,
    includeFiles: false,
    includeImages: false,
    compression: false,
    encryption: true,
    destinations: [],
    status: 'idle',
  },
];

// Default destinations
const DEFAULT_DESTINATIONS: BackupDestination[] = [
  {
    id: 'local_storage',
    type: 'local',
    name: 'Armazenamento Local',
    config: {
      path: '/backups/fisioflow',
    },
    isActive: true,
    status: 'idle',
  },
];

interface BackupSyncProviderProps {
  children: ReactNode;
}

export const BackupSyncProvider: React.FC<BackupSyncProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const { saveAuditLog, getAllData } = useData();
  const { addNotification } = useNotification();
  const { isFeatureEnabled } = useFeatureFlags();
  const { connectedIntegrations, sendToIntegration } =
    useExternalIntegrations();

  const [configs, setConfigs] = useState<BackupConfig[]>(DEFAULT_CONFIGS);
  const [destinations, setDestinations] =
    useState<BackupDestination[]>(DEFAULT_DESTINATIONS);
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [isSyncRunning, setIsSyncRunning] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedConfigs = localStorage.getItem('fisioflow_backup_configs');
    const savedDestinations = localStorage.getItem(
      'fisioflow_backup_destinations'
    );
    const savedBackups = localStorage.getItem('fisioflow_backups');
    const savedConflicts = localStorage.getItem('fisioflow_sync_conflicts');

    if (savedConfigs) {
      try {
        setConfigs(JSON.parse(savedConfigs));
      } catch (error) {
        console.error('Error loading backup configs:', error);
      }
    }

    if (savedDestinations) {
      try {
        setDestinations(JSON.parse(savedDestinations));
      } catch (error) {
        console.error('Error loading destinations:', error);
      }
    }

    if (savedBackups) {
      try {
        setBackups(JSON.parse(savedBackups));
      } catch (error) {
        console.error('Error loading backups:', error);
      }
    }

    if (savedConflicts) {
      try {
        setConflicts(JSON.parse(savedConflicts));
      } catch (error) {
        console.error('Error loading conflicts:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fisioflow_backup_configs', JSON.stringify(configs));
  }, [configs]);

  useEffect(() => {
    localStorage.setItem(
      'fisioflow_backup_destinations',
      JSON.stringify(destinations)
    );
  }, [destinations]);

  useEffect(() => {
    localStorage.setItem('fisioflow_backups', JSON.stringify(backups));
  }, [backups]);

  useEffect(() => {
    localStorage.setItem('fisioflow_sync_conflicts', JSON.stringify(conflicts));
  }, [conflicts]);

  // Auto-backup scheduler
  useEffect(() => {
    if (!isFeatureEnabled('backup_sync')) return;

    const interval = setInterval(() => {
      const now = new Date();

      configs.forEach((config) => {
        if (!config.isActive || !config.nextBackup) return;

        const nextBackupTime = new Date(config.nextBackup);
        if (now >= nextBackupTime) {
          runBackup(config.id);
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [configs, isFeatureEnabled]);

  const generateChecksum = (data: string): string => {
    // Simple checksum implementation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  };

  const calculateNextBackup = (
    frequency: BackupConfig['frequency'],
    lastBackup?: string
  ): string => {
    const now = new Date(lastBackup || Date.now());

    switch (frequency) {
      case 'realtime':
        return new Date(now.getTime() + 60000).toISOString(); // 1 minute
      case 'hourly':
        return new Date(now.getTime() + 3600000).toISOString(); // 1 hour
      case 'daily':
        return new Date(now.getTime() + 86400000).toISOString(); // 1 day
      case 'weekly':
        return new Date(now.getTime() + 604800000).toISOString(); // 1 week
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
      default:
        return new Date(now.getTime() + 86400000).toISOString();
    }
  };

  const createBackupConfig = (
    config: Omit<BackupConfig, 'id' | 'lastBackup' | 'nextBackup' | 'status'>
  ) => {
    const newConfig: BackupConfig = {
      ...config,
      id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'idle',
      nextBackup: calculateNextBackup(config.frequency),
    };

    setConfigs((prev) => [...prev, newConfig]);

    if (user) {
      saveAuditLog(
        {
          action: 'backup_config_created',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            configId: newConfig.id,
            configName: newConfig.name,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );
    }
  };

  const updateBackupConfig = (
    configId: string,
    updates: Partial<BackupConfig>
  ) => {
    setConfigs((prev) =>
      prev.map((config) => {
        if (config.id === configId) {
          const updated = { ...config, ...updates };
          if (updates.frequency && updates.frequency !== config.frequency) {
            updated.nextBackup = calculateNextBackup(
              updates.frequency,
              config.lastBackup
            );
          }
          return updated;
        }
        return config;
      })
    );
  };

  const deleteBackupConfig = (configId: string) => {
    setConfigs((prev) => prev.filter((config) => config.id !== configId));

    if (user) {
      saveAuditLog(
        {
          action: 'backup_config_deleted',
          userId: user.id,
          tenantId: user.tenantId,
          details: { configId },
          timestamp: new Date().toISOString(),
        },
        user
      );
    }
  };

  const createDestination = (
    destination: Omit<BackupDestination, 'id' | 'lastSync' | 'status'>
  ) => {
    const newDestination: BackupDestination = {
      ...destination,
      id: `dest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'idle',
    };

    setDestinations((prev) => [...prev, newDestination]);
  };

  const updateDestination = (
    destinationId: string,
    updates: Partial<BackupDestination>
  ) => {
    setDestinations((prev) =>
      prev.map((dest) =>
        dest.id === destinationId ? { ...dest, ...updates } : dest
      )
    );
  };

  const deleteDestination = (destinationId: string) => {
    setDestinations((prev) => prev.filter((dest) => dest.id !== destinationId));
  };

  const runBackup = async (configId: string): Promise<BackupData | null> => {
    if (!user || !isFeatureEnabled('backup_sync')) return null;

    const config = configs.find((c) => c.id === configId);
    if (!config || !config.isActive) return null;

    try {
      setIsBackupRunning(true);

      // Update config status
      updateBackupConfig(configId, { status: 'running' });

      // Get all data
      const allData = getAllData();

      // Filter data based on config
      const backupData = {
        ...allData,
        files: config.includeFiles ? allData.files || [] : [],
        images: config.includeImages ? allData.images || [] : [],
      };

      // Create backup data string
      const dataString = JSON.stringify(backupData);
      const checksum = generateChecksum(dataString);

      // Compress if enabled
      let finalData = dataString;
      if (config.compression) {
        // In a real implementation, you would use a compression library
        finalData = dataString; // Placeholder
      }

      // Encrypt if enabled
      if (config.encryption) {
        // In a real implementation, you would encrypt the data
        finalData = finalData; // Placeholder
      }

      const backup: BackupData = {
        id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        configId,
        timestamp: new Date().toISOString(),
        size: finalData.length,
        checksum,
        status: 'creating',
        destinations: config.destinations.map((dest) => ({
          destinationId: dest.id,
          status: 'pending' as const,
        })),
        metadata: {
          version: '1.0.0',
          dataTypes: Object.keys(backupData),
          recordCounts: Object.entries(backupData).reduce(
            (acc, [key, value]) => {
              acc[key] = Array.isArray(value) ? value.length : 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          createdBy: user.id,
          tenantId: user.tenantId,
        },
      };

      // Add backup to state
      setBackups((prev) => [backup, ...prev]);

      // Upload to destinations
      for (const destConfig of config.destinations) {
        if (!destConfig.isActive) continue;

        const destination = destinations.find((d) => d.id === destConfig.id);
        if (!destination) continue;

        try {
          // Update destination status
          setBackups((prev) =>
            prev.map((b) =>
              b.id === backup.id
                ? {
                    ...b,
                    destinations: b.destinations.map((d) =>
                      d.destinationId === destConfig.id
                        ? { ...d, status: 'uploading' as const }
                        : d
                    ),
                  }
                : b
            )
          );

          // Simulate upload based on destination type
          await new Promise((resolve) => setTimeout(resolve, 2000));

          if (
            destination.type === 'cloud' &&
            destination.config.integrationId
          ) {
            // Upload to cloud via integration
            const integration = connectedIntegrations.find(
              (i) => i.id === destination.config.integrationId
            );
            if (integration) {
              await sendToIntegration(integration.id, 'upload', {
                filename: `backup_${backup.id}.json`,
                data: finalData,
                path: destination.config.path || '/backups',
              });
            }
          }

          // Update destination status to completed
          setBackups((prev) =>
            prev.map((b) =>
              b.id === backup.id
                ? {
                    ...b,
                    destinations: b.destinations.map((d) =>
                      d.destinationId === destConfig.id
                        ? {
                            ...d,
                            status: 'completed' as const,
                            size: finalData.length,
                            url: `${destination.config.path}/${backup.id}.json`,
                          }
                        : d
                    ),
                  }
                : b
            )
          );
        } catch (error) {
          console.error(
            `Failed to upload to destination ${destination.name}:`,
            error
          );

          // Update destination status to failed
          setBackups((prev) =>
            prev.map((b) =>
              b.id === backup.id
                ? {
                    ...b,
                    destinations: b.destinations.map((d) =>
                      d.destinationId === destConfig.id
                        ? { ...d, status: 'failed' as const }
                        : d
                    ),
                  }
                : b
            )
          );
        }
      }

      // Update backup status
      const finalBackup = {
        ...backup,
        status: 'completed' as const,
      };

      setBackups((prev) =>
        prev.map((b) => (b.id === backup.id ? finalBackup : b))
      );

      // Update config
      const now = new Date().toISOString();
      updateBackupConfig(configId, {
        status: 'completed',
        lastBackup: now,
        nextBackup: calculateNextBackup(config.frequency, now),
      });

      // Log the backup
      saveAuditLog(
        {
          action: 'backup_created',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            backupId: backup.id,
            configId,
            size: backup.size,
            destinations: backup.destinations.length,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'success',
        title: 'Backup Concluído',
        message: `Backup "${config.name}" foi criado com sucesso.`,
      });

      return finalBackup;
    } catch (error) {
      console.error('Backup failed:', error);

      updateBackupConfig(configId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Backup failed',
      });

      addNotification({
        type: 'error',
        title: 'Erro no Backup',
        message: 'Não foi possível criar o backup. Tente novamente.',
      });

      return null;
    } finally {
      setIsBackupRunning(false);
    }
  };

  const runAllBackups = async (): Promise<BackupData[]> => {
    const results: BackupData[] = [];

    for (const config of configs) {
      if (config.isActive) {
        const backup = await runBackup(config.id);
        if (backup) {
          results.push(backup);
        }
      }
    }

    return results;
  };

  const restoreBackup = async (
    backupId: string,
    destinationId?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const backup = backups.find((b) => b.id === backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // In a real implementation, you would:
      // 1. Download the backup from the specified destination
      // 2. Decrypt if necessary
      // 3. Decompress if necessary
      // 4. Validate the data
      // 5. Restore the data to the application

      // For now, we'll simulate the process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Log the restore
      saveAuditLog(
        {
          action: 'backup_restored',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            backupId,
            destinationId,
            timestamp: backup.timestamp,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'success',
        title: 'Backup Restaurado',
        message: 'Os dados foram restaurados com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Restore failed:', error);

      addNotification({
        type: 'error',
        title: 'Erro na Restauração',
        message: 'Não foi possível restaurar o backup.',
      });

      return false;
    }
  };

  const deleteBackup = async (backupId: string): Promise<boolean> => {
    try {
      const backup = backups.find((b) => b.id === backupId);
      if (!backup) return false;

      // Delete from all destinations
      for (const dest of backup.destinations) {
        if (dest.status === 'completed' && dest.url) {
          // In a real implementation, delete from the destination
          console.log(
            `Deleting backup from ${dest.destinationId}: ${dest.url}`
          );
        }
      }

      // Remove from local state
      setBackups((prev) => prev.filter((b) => b.id !== backupId));

      if (user) {
        saveAuditLog(
          {
            action: 'backup_deleted',
            userId: user.id,
            tenantId: user.tenantId,
            details: { backupId },
            timestamp: new Date().toISOString(),
          },
          user
        );
      }

      return true;
    } catch (error) {
      console.error('Delete backup failed:', error);
      return false;
    }
  };

  const syncData = async (force: boolean = false): Promise<boolean> => {
    if (!user || !isFeatureEnabled('backup_sync')) return false;

    try {
      setIsSyncRunning(true);

      // In a real implementation, this would:
      // 1. Compare local data with remote data
      // 2. Identify conflicts
      // 3. Apply automatic resolution rules
      // 4. Create conflict records for manual resolution

      // Simulate sync process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      addNotification({
        type: 'success',
        title: 'Sincronização Concluída',
        message: 'Os dados foram sincronizados com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Sync failed:', error);

      addNotification({
        type: 'error',
        title: 'Erro na Sincronização',
        message: 'Não foi possível sincronizar os dados.',
      });

      return false;
    } finally {
      setIsSyncRunning(false);
    }
  };

  const resolveConflict = async (
    conflictId: string,
    resolution: SyncConflict['resolution'],
    data?: any
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const conflict = conflicts.find((c) => c.id === conflictId);
      if (!conflict) return false;

      // Apply resolution
      const resolvedConflict: SyncConflict = {
        ...conflict,
        resolution,
        resolvedBy: user.id,
        resolvedAt: new Date().toISOString(),
      };

      setConflicts((prev) =>
        prev.map((c) => (c.id === conflictId ? resolvedConflict : c))
      );

      // Log the resolution
      saveAuditLog(
        {
          action: 'sync_conflict_resolved',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            conflictId,
            resolution,
            entityType: conflict.entityType,
            entityId: conflict.entityId,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      return true;
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      return false;
    }
  };

  const validateBackup = async (backupId: string): Promise<boolean> => {
    try {
      const backup = backups.find((b) => b.id === backupId);
      if (!backup) return false;

      // In a real implementation, this would:
      // 1. Download the backup data
      // 2. Verify the checksum
      // 3. Validate the data structure
      // 4. Check for corruption

      // Simulate validation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error('Backup validation failed:', error);
      return false;
    }
  };

  const getBackupStats = () => {
    const totalBackups = backups.length;
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const successfulBackups = backups.filter(
      (b) => b.status === 'completed'
    ).length;
    const successRate =
      totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0;

    const lastBackup =
      backups.length > 0
        ? backups.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0].timestamp
        : undefined;

    const nextBackup = configs
      .filter((c) => c.isActive && c.nextBackup)
      .sort(
        (a, b) =>
          new Date(a.nextBackup!).getTime() - new Date(b.nextBackup!).getTime()
      )[0]?.nextBackup;

    return {
      totalBackups,
      totalSize,
      successRate,
      lastBackup,
      nextBackup,
    };
  };

  const exportData = async (
    format: 'json' | 'csv' | 'xml',
    dataTypes?: string[]
  ): Promise<Blob> => {
    const allData = getAllData();

    // Filter data types if specified
    const exportData = dataTypes
      ? Object.fromEntries(
          Object.entries(allData).filter(([key]) => dataTypes.includes(key))
        )
      : allData;

    let content: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        break;
      case 'csv':
        // Simple CSV export (would need proper CSV library in real implementation)
        content = Object.entries(exportData)
          .map(
            ([key, value]) =>
              `${key},${Array.isArray(value) ? value.length : 1}`
          )
          .join('\n');
        mimeType = 'text/csv';
        break;
      case 'xml':
        // Simple XML export (would need proper XML library in real implementation)
        content = `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${Object.entries(
          exportData
        )
          .map(([key, value]) => `  <${key}>${JSON.stringify(value)}</${key}>`)
          .join('\n')}\n</data>`;
        mimeType = 'application/xml';
        break;
      default:
        throw new Error('Unsupported format');
    }

    return new Blob([content], { type: mimeType });
  };

  const importData = async (
    file: File,
    options: { merge: boolean; validate: boolean } = {
      merge: false,
      validate: true,
    }
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const content = await file.text();
      let importedData: any;

      // Parse based on file type
      if (file.name.endsWith('.json')) {
        importedData = JSON.parse(content);
      } else {
        throw new Error('Unsupported file format');
      }

      // Validate data structure if enabled
      if (options.validate) {
        // In a real implementation, validate against schema
        if (!importedData || typeof importedData !== 'object') {
          throw new Error('Invalid data structure');
        }
      }

      // Import data (in a real implementation, this would update the actual data store)
      console.log('Importing data:', importedData);

      // Log the import
      saveAuditLog(
        {
          action: 'data_imported',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            filename: file.name,
            size: file.size,
            merge: options.merge,
            validate: options.validate,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'success',
        title: 'Dados Importados',
        message: 'Os dados foram importados com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Import failed:', error);

      addNotification({
        type: 'error',
        title: 'Erro na Importação',
        message: 'Não foi possível importar os dados.',
      });

      return false;
    }
  };

  const value: BackupSyncContextType = {
    configs,
    destinations,
    backups,
    conflicts,
    isBackupRunning,
    isSyncRunning,
    createBackupConfig,
    updateBackupConfig,
    deleteBackupConfig,
    createDestination,
    updateDestination,
    deleteDestination,
    runBackup,
    runAllBackups,
    restoreBackup,
    deleteBackup,
    syncData,
    resolveConflict,
    validateBackup,
    getBackupStats,
    exportData,
    importData,
  };

  return (
    <BackupSyncContext.Provider value={value}>
      {children}
    </BackupSyncContext.Provider>
  );
};

export const useBackupSync = (): BackupSyncContextType => {
  const context = useContext(BackupSyncContext);
  if (!context) {
    throw new Error('useBackupSync must be used within a BackupSyncProvider');
  }
  return context;
};

export default useBackupSync;
export type { BackupConfig, BackupDestination, BackupData, SyncConflict };
