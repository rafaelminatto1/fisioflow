import React, { useState } from 'react';

import { useBackupSync } from '../hooks/useBackupSync';
import type {
  BackupConfig,
  BackupDestination,
  BackupData,
} from '../hooks/useBackupSync';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

import PaywallModal from './PaywallModal';

interface BackupManagerProps {
  className?: string;
}

const BackupManager: React.FC<BackupManagerProps> = ({ className = '' }) => {
  const {
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
  } = useBackupSync();

  const { isFeatureEnabled } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState<
    'configs' | 'destinations' | 'backups' | 'conflicts' | 'stats'
  >('configs');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BackupConfig | null>(null);
  const [editingDestination, setEditingDestination] =
    useState<BackupDestination | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupData | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Check if backup feature is enabled
  if (!isFeatureEnabled('backup_sync')) {
    return (
      <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Backup e Sincronização
          </h3>
          <p className="mb-4 text-gray-500">
            Proteja seus dados com backup automático e sincronização em nuvem.
          </p>
          <button
            onClick={() => setShowPaywall(true)}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Fazer Upgrade
          </button>
        </div>

        {showPaywall && (
          <PaywallModal
            isOpen={showPaywall}
            onClose={() => setShowPaywall(false)}
            reason="Backup e sincronização automática estão disponíveis apenas nos planos pagos."
            blockedResource="backup_sync"
            currentPlan="free"
            recommendedPlan="gold"
            onUpgrade={(plan) => {
              console.log('Upgrade to:', plan);
              setShowPaywall(false);
            }}
            feature="backup_sync"
            title="Backup e Sincronização"
            description="Mantenha seus dados seguros com backup automático e sincronização em tempo real."
          />
        )}
      </div>
    );
  }

  const stats = getBackupStats();

  const handleCreateConfig = (
    configData: Omit<
      BackupConfig,
      'id' | 'lastBackup' | 'nextBackup' | 'status'
    >
  ) => {
    createBackupConfig(configData);
    setShowConfigModal(false);
    setEditingConfig(null);
  };

  const handleUpdateConfig = (configData: Partial<BackupConfig>) => {
    if (editingConfig) {
      updateBackupConfig(editingConfig.id, configData);
      setShowConfigModal(false);
      setEditingConfig(null);
    }
  };

  const handleCreateDestination = (
    destData: Omit<BackupDestination, 'id' | 'lastSync' | 'status'>
  ) => {
    createDestination(destData);
    setShowDestinationModal(false);
    setEditingDestination(null);
  };

  const handleUpdateDestination = (destData: Partial<BackupDestination>) => {
    if (editingDestination) {
      updateDestination(editingDestination.id, destData);
      setShowDestinationModal(false);
      setEditingDestination(null);
    }
  };

  const handleExportData = async (format: 'json' | 'csv' | 'xml') => {
    try {
      const blob = await exportData(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fisioflow_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImportData = async () => {
    if (importFile) {
      const success = await importData(importFile, {
        merge: false,
        validate: true,
      });
      if (success) {
        setImportFile(null);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'running':
      case 'syncing':
      case 'uploading':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
      case 'error':
      case 'corrupted':
        return 'text-red-600 bg-red-100';
      case 'idle':
      case 'pending':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`rounded-lg bg-white shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Backup e Sincronização
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie backups e sincronização de dados
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => syncData()}
              disabled={isSyncRunning}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isSyncRunning ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              <span>{isSyncRunning ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
            <button
              onClick={() => runAllBackups()}
              disabled={isBackupRunning}
              className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isBackupRunning ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
              )}
              <span>{isBackupRunning ? 'Executando...' : 'Backup Agora'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'configs', label: 'Configurações', count: configs.length },
            {
              id: 'destinations',
              label: 'Destinos',
              count: destinations.length,
            },
            { id: 'backups', label: 'Backups', count: backups.length },
            {
              id: 'conflicts',
              label: 'Conflitos',
              count: conflicts.filter((c) => !c.resolution).length,
            },
            { id: 'stats', label: 'Estatísticas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Configurations Tab */}
        {activeTab === 'configs' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Configurações de Backup
              </h3>
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setShowConfigModal(true);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Nova Configuração
              </button>
            </div>

            <div className="space-y-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">
                          {config.name}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(config.status)}`}
                        >
                          {config.status === 'idle'
                            ? 'Inativo'
                            : config.status === 'running'
                              ? 'Executando'
                              : config.status === 'completed'
                                ? 'Concluído'
                                : 'Erro'}
                        </span>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.isActive}
                            onChange={(e) =>
                              updateBackupConfig(config.id, {
                                isActive: e.target.checked,
                              })
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">
                            Ativo
                          </span>
                        </label>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {config.description}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Frequência: {config.frequency}</span>
                        <span>Retenção: {config.retentionDays} dias</span>
                        <span>Destinos: {config.destinations.length}</span>
                        {config.lastBackup && (
                          <span>Último: {formatDate(config.lastBackup)}</span>
                        )}
                        {config.nextBackup && (
                          <span>Próximo: {formatDate(config.nextBackup)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => runBackup(config.id)}
                        disabled={isBackupRunning || !config.isActive}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1M9 6h6"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setEditingConfig(config);
                          setShowConfigModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteBackupConfig(config.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Destinations Tab */}
        {activeTab === 'destinations' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Destinos de Backup
              </h3>
              <button
                onClick={() => {
                  setEditingDestination(null);
                  setShowDestinationModal(true);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Novo Destino
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {destinations.map((destination) => (
                <div
                  key={destination.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      {destination.name}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(destination.status)}`}
                    >
                      {destination.status === 'idle'
                        ? 'Inativo'
                        : destination.status === 'syncing'
                          ? 'Sincronizando'
                          : destination.status === 'success'
                            ? 'Sucesso'
                            : 'Erro'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Tipo:</span>
                      <span className="capitalize">{destination.type}</span>
                    </div>
                    {destination.config.path && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Caminho:</span>
                        <span className="truncate">
                          {destination.config.path}
                        </span>
                      </div>
                    )}
                    {destination.lastSync && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Última Sync:</span>
                        <span>{formatDate(destination.lastSync)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={destination.isActive}
                        onChange={(e) =>
                          updateDestination(destination.id, {
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Ativo</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingDestination(destination);
                          setShowDestinationModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteDestination(destination.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backups Tab */}
        {activeTab === 'backups' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Histórico de Backups
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExportData('json')}
                  className="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                >
                  Exportar JSON
                </button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                    Importar Dados
                  </button>
                </div>
                {importFile && (
                  <button
                    onClick={handleImportData}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
                  >
                    Processar
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">
                          Backup {formatDate(backup.timestamp)}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(backup.status)}`}
                        >
                          {backup.status === 'creating'
                            ? 'Criando'
                            : backup.status === 'completed'
                              ? 'Concluído'
                              : backup.status === 'failed'
                                ? 'Falhou'
                                : 'Corrompido'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Tamanho: {formatBytes(backup.size)}</span>
                        <span>
                          Checksum: {backup.checksum.substring(0, 8)}...
                        </span>
                        <span>
                          Destinos:{' '}
                          {
                            backup.destinations.filter(
                              (d) => d.status === 'completed'
                            ).length
                          }
                          /{backup.destinations.length}
                        </span>
                      </div>
                      {backup.errorMessage && (
                        <p className="mt-2 text-sm text-red-600">
                          {backup.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => validateBackup(backup.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Validar Backup"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowRestoreModal(true);
                        }}
                        className="text-green-600 hover:text-green-800"
                        title="Restaurar Backup"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir Backup"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts Tab */}
        {activeTab === 'conflicts' && (
          <div>
            <h3 className="mb-6 text-lg font-medium text-gray-900">
              Conflitos de Sincronização
            </h3>

            {conflicts.filter((c) => !c.resolution).length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 className="mb-2 text-lg font-medium text-gray-900">
                  Nenhum Conflito
                </h4>
                <p className="text-gray-500">
                  Todos os dados estão sincronizados corretamente.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts
                  .filter((c) => !c.resolution)
                  .map((conflict) => (
                    <div
                      key={conflict.id}
                      className="rounded-lg border border-red-200 bg-red-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-red-900">
                          Conflito em {conflict.entityType} (ID:{' '}
                          {conflict.entityId})
                        </h4>
                        <span className="text-xs text-red-600">
                          {formatDate(conflict.timestamp)}
                        </span>
                      </div>
                      <p className="mb-4 text-sm text-red-700">
                        {conflict.type === 'data_conflict'
                          ? 'Conflito de dados'
                          : conflict.type === 'version_conflict'
                            ? 'Conflito de versão'
                            : 'Conflito de esquema'}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => resolveConflict(conflict.id, 'local')}
                          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                        >
                          Usar Local
                        </button>
                        <button
                          onClick={() => resolveConflict(conflict.id, 'remote')}
                          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                        >
                          Usar Remoto
                        </button>
                        <button
                          onClick={() => resolveConflict(conflict.id, 'merge')}
                          className="rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
                        >
                          Mesclar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div>
            <h3 className="mb-6 text-lg font-medium text-gray-900">
              Estatísticas de Backup
            </h3>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Total de Backups
                    </p>
                    <p className="text-2xl font-semibold text-blue-900">
                      {stats.totalBackups}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-green-50 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">
                      Tamanho Total
                    </p>
                    <p className="text-2xl font-semibold text-green-900">
                      {formatBytes(stats.totalSize)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-purple-50 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">
                      Taxa de Sucesso
                    </p>
                    <p className="text-2xl font-semibold text-purple-900">
                      {stats.successRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-orange-50 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-600">
                      Último Backup
                    </p>
                    <p className="text-sm font-semibold text-orange-900">
                      {stats.lastBackup
                        ? formatDate(stats.lastBackup)
                        : 'Nunca'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg bg-gray-50 p-6">
              <h4 className="mb-4 text-lg font-medium text-gray-900">
                Atividade Recente
              </h4>
              <div className="space-y-3">
                {backups.slice(0, 5).map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          getStatusColor(backup.status).includes('green')
                            ? 'bg-green-500'
                            : getStatusColor(backup.status).includes('red')
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                        }`}
                      ></div>
                      <span className="text-sm text-gray-900">
                        Backup {formatDate(backup.timestamp)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatBytes(backup.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals would go here - simplified for brevity */}
      {/* In a real implementation, you would have full modals for creating/editing configs and destinations */}
    </div>
  );
};

export default BackupManager;
