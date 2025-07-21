import React, { useState, useEffect } from 'react';
import {
  useExternalIntegrations,
  Integration,
} from '../hooks/useExternalIntegrations';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useNotification } from '../hooks/useNotification';
import { PaywallModal } from './PaywallModal';

interface IntegrationCardProps {
  integration: Integration;
  onConnect: (integration: Integration) => void;
  onDisconnect: (integrationId: string) => void;
  onSync: (integrationId: string) => void;
  onConfigure: (integration: Integration) => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onConnect,
  onDisconnect,
  onSync,
  onConfigure,
}) => {
  const getStatusColor = () => {
    if (!integration.isConnected) return 'bg-gray-100 text-gray-600';
    switch (integration.syncStatus) {
      case 'syncing':
        return 'bg-yellow-100 text-yellow-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = () => {
    if (!integration.isConnected) return 'Desconectado';
    switch (integration.syncStatus) {
      case 'syncing':
        return 'Sincronizando...';
      case 'success':
        return 'Conectado';
      case 'error':
        return 'Erro';
      default:
        return 'Conectado';
    }
  };

  const getCategoryIcon = () => {
    switch (integration.category) {
      case 'calendar':
        return '📅';
      case 'communication':
        return '💬';
      case 'payment':
        return '💳';
      case 'health':
        return '🏥';
      case 'analytics':
        return '📊';
      case 'storage':
        return '☁️';
      case 'ai':
        return '🤖';
      default:
        return '🔗';
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{getCategoryIcon()}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {integration.name}
            </h3>
            <p className="text-sm text-gray-500">{integration.provider}</p>
          </div>
        </div>
        <div
          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor()}`}
        >
          {getStatusText()}
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-600">{integration.description}</p>

      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">Recursos:</h4>
        <div className="flex flex-wrap gap-1">
          {integration.features.map((feature, index) => (
            <span
              key={index}
              className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
            >
              {feature.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-xs text-gray-500">
          Plano necessário:{' '}
          <span className="font-medium capitalize">
            {integration.requiredPlan}
          </span>
        </span>
      </div>

      {integration.isConnected && integration.lastSync && (
        <div className="mb-4 text-xs text-gray-500">
          Última sincronização:{' '}
          {new Date(integration.lastSync).toLocaleString('pt-BR')}
        </div>
      )}

      {integration.errorMessage && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
          {integration.errorMessage}
        </div>
      )}

      <div className="flex space-x-2">
        {!integration.isConnected ? (
          <button
            onClick={() => onConnect(integration)}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Conectar
          </button>
        ) : (
          <>
            <button
              onClick={() => onSync(integration.id)}
              disabled={integration.syncStatus === 'syncing'}
              className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {integration.syncStatus === 'syncing'
                ? 'Sincronizando...'
                : 'Sincronizar'}
            </button>
            <button
              onClick={() => onConfigure(integration)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Configurar
            </button>
            <button
              onClick={() => onDisconnect(integration.id)}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
            >
              Desconectar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

interface ConnectionModalProps {
  integration: Integration | null;
  isOpen: boolean;
  onClose: () => void;
  onConnect: (credentials: any) => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  integration,
  isOpen,
  onClose,
  onConnect,
}) => {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (integration) {
      // Initialize credentials based on integration type
      const initialCredentials: Record<string, string> = {};

      switch (integration.id) {
        case 'google_calendar':
        case 'google_drive':
        case 'google_analytics':
          initialCredentials.clientId = '';
          initialCredentials.clientSecret = '';
          break;
        case 'whatsapp_business':
          initialCredentials.accessToken = '';
          initialCredentials.phoneNumberId = '';
          break;
        case 'telegram_bot':
          initialCredentials.botToken = '';
          break;
        case 'mercado_pago':
          initialCredentials.accessToken = '';
          initialCredentials.publicKey = '';
          break;
        case 'openai_gpt':
          initialCredentials.apiKey = '';
          break;
        default:
          initialCredentials.apiKey = '';
      }

      setCredentials(initialCredentials);
    }
  }, [integration]);

  const handleConnect = async () => {
    if (!integration) return;

    setIsConnecting(true);
    try {
      await onConnect(credentials);
      onClose();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen || !integration) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Conectar {integration.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <p className="mb-6 text-gray-600">{integration.description}</p>

        <div className="space-y-4">
          {Object.keys(credentials).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {key.charAt(0).toUpperCase() +
                  key.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type={
                  key.includes('secret') ||
                  key.includes('token') ||
                  key.includes('key')
                    ? 'password'
                    : 'text'
                }
                value={credentials[key]}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Digite seu ${key}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConnect}
            disabled={
              isConnecting || Object.values(credentials).some((v) => !v.trim())
            }
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfigurationModalProps {
  integration: Integration | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Record<string, any>) => void;
}

const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  integration,
  isOpen,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (integration) {
      setConfig(integration.config);
    }
  }, [integration]);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  if (!isOpen || !integration) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Configurar {integration.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(config).map(([key, value]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {key.charAt(0).toUpperCase() +
                  key.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
              {typeof value === 'boolean' ? (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Ativado</span>
                </label>
              ) : typeof value === 'number' ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      [key]: parseInt(e.target.value),
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export const IntegrationsPage: React.FC = () => {
  const {
    availableIntegrations,
    connectedIntegrations,
    connectIntegration,
    disconnectIntegration,
    syncIntegration,
    syncAllIntegrations,
    updateIntegrationConfig,
  } = useExternalIntegrations();

  const { isFeatureEnabled } = useFeatureFlags();
  const { addNotification } = useNotification();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [connectionModal, setConnectionModal] = useState<{
    isOpen: boolean;
    integration: Integration | null;
  }>({ isOpen: false, integration: null });

  const [configModal, setConfigModal] = useState<{
    isOpen: boolean;
    integration: Integration | null;
  }>({ isOpen: false, integration: null });

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const categories = [
    { id: 'all', name: 'Todas', icon: '🔗' },
    { id: 'calendar', name: 'Calendário', icon: '📅' },
    { id: 'communication', name: 'Comunicação', icon: '💬' },
    { id: 'payment', name: 'Pagamentos', icon: '💳' },
    { id: 'health', name: 'Saúde', icon: '🏥' },
    { id: 'analytics', name: 'Analytics', icon: '📊' },
    { id: 'storage', name: 'Armazenamento', icon: '☁️' },
    { id: 'ai', name: 'Inteligência Artificial', icon: '🤖' },
  ];

  const filteredIntegrations =
    selectedCategory === 'all'
      ? availableIntegrations
      : availableIntegrations.filter((i) => i.category === selectedCategory);

  const handleConnect = async (integration: Integration) => {
    if (!isFeatureEnabled('external_integrations')) {
      setPaywallReason(
        `Integrações externas requerem plano ${integration.requiredPlan.toUpperCase()} ou superior.`
      );
      setShowPaywall(true);
      return;
    }

    setConnectionModal({ isOpen: true, integration });
  };

  const handleConnectionSubmit = async (credentials: any) => {
    if (!connectionModal.integration) return;

    const success = await connectIntegration(
      connectionModal.integration.id,
      credentials
    );
    if (success) {
      setConnectionModal({ isOpen: false, integration: null });
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (window.confirm('Tem certeza que deseja desconectar esta integração?')) {
      await disconnectIntegration(integrationId);
    }
  };

  const handleSync = async (integrationId: string) => {
    const result = await syncIntegration(integrationId);
    if (result.success) {
      addNotification({
        type: 'success',
        title: 'Sincronização Concluída',
        message: `${result.recordsProcessed} registros processados.`,
      });
    } else {
      addNotification({
        type: 'error',
        title: 'Erro na Sincronização',
        message: result.errors.join(', '),
      });
    }
  };

  const handleSyncAll = async () => {
    if (connectedIntegrations.length === 0) {
      addNotification({
        type: 'info',
        title: 'Nenhuma Integração',
        message: 'Não há integrações conectadas para sincronizar.',
      });
      return;
    }

    setIsSyncingAll(true);
    try {
      const results = await syncAllIntegrations();
      const totalRecords = results.reduce(
        (sum, r) => sum + r.recordsProcessed,
        0
      );
      const errors = results.flatMap((r) => r.errors);

      if (errors.length === 0) {
        addNotification({
          type: 'success',
          title: 'Sincronização Completa',
          message: `${totalRecords} registros processados em ${results.length} integrações.`,
        });
      } else {
        addNotification({
          type: 'warning',
          title: 'Sincronização com Erros',
          message: `${totalRecords} registros processados, mas ${errors.length} erros encontrados.`,
        });
      }
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleConfigure = (integration: Integration) => {
    setConfigModal({ isOpen: true, integration });
  };

  const handleConfigSave = async (config: Record<string, any>) => {
    if (!configModal.integration) return;

    const success = await updateIntegrationConfig(
      configModal.integration.id,
      config
    );
    if (success) {
      addNotification({
        type: 'success',
        title: 'Configuração Salva',
        message: 'As configurações da integração foram atualizadas.',
      });
    }
  };

  if (!isFeatureEnabled('external_integrations')) {
    return (
      <div className="p-6">
        <div className="py-12 text-center">
          <div className="mb-4 text-6xl">🔗</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Integrações Externas
          </h2>
          <p className="mb-6 text-gray-600">
            Conecte o FisioFlow com suas ferramentas favoritas para automatizar
            processos e aumentar a produtividade.
          </p>
          <button
            onClick={() => setShowPaywall(true)}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Fazer Upgrade para Acessar
          </button>
        </div>

        {showPaywall && (
          <PaywallModal
            isOpen={showPaywall}
            onClose={() => setShowPaywall(false)}
            feature="Integrações Externas"
            description={paywallReason}
            recommendedPlan="silver"
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Integrações Externas
          </h1>
          <p className="text-gray-600">
            Conecte o FisioFlow com suas ferramentas favoritas
          </p>
        </div>

        {connectedIntegrations.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncingAll ? 'Sincronizando...' : 'Sincronizar Todas'}
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-blue-600">
            {availableIntegrations.length}
          </div>
          <div className="text-sm text-gray-600">Integrações Disponíveis</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-green-600">
            {connectedIntegrations.length}
          </div>
          <div className="text-sm text-gray-600">Integrações Conectadas</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-purple-600">
            {
              connectedIntegrations.filter((i) => i.syncStatus === 'success')
                .length
            }
          </div>
          <div className="text-sm text-gray-600">Sincronizações Ativas</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            onConfigure={handleConfigure}
          />
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="py-12 text-center">
          <div className="mb-4 text-4xl">🔍</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Nenhuma integração encontrada
          </h3>
          <p className="text-gray-600">
            Não há integrações disponíveis para a categoria selecionada.
          </p>
        </div>
      )}

      {/* Modals */}
      <ConnectionModal
        integration={connectionModal.integration}
        isOpen={connectionModal.isOpen}
        onClose={() => setConnectionModal({ isOpen: false, integration: null })}
        onConnect={handleConnectionSubmit}
      />

      <ConfigurationModal
        integration={configModal.integration}
        isOpen={configModal.isOpen}
        onClose={() => setConfigModal({ isOpen: false, integration: null })}
        onSave={handleConfigSave}
      />

      {showPaywall && (
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          feature="Integrações Externas"
          description={paywallReason}
          recommendedPlan="silver"
        />
      )}
    </div>
  );
};

export default IntegrationsPage;
