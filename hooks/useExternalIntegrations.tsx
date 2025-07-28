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

interface Integration {
  id: string;
  name: string;
  description: string;
  category:
    | 'calendar'
    | 'communication'
    | 'payment'
    | 'health'
    | 'analytics'
    | 'storage'
    | 'ai';
  provider: string;
  isActive: boolean;
  isConnected: boolean;
  config: Record<string, any>;
  credentials?: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    webhookUrl?: string;
  };
  lastSync?: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
  features: string[];
  requiredPlan: 'free' | 'silver' | 'gold' | 'platinum';
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  timestamp: string;
}

interface ExternalIntegrationsContextType {
  integrations: Integration[];
  availableIntegrations: Integration[];
  connectedIntegrations: Integration[];
  connectIntegration: (
    integrationId: string,
    credentials: any
  ) => Promise<boolean>;
  disconnectIntegration: (integrationId: string) => Promise<boolean>;
  syncIntegration: (integrationId: string) => Promise<SyncResult>;
  syncAllIntegrations: () => Promise<SyncResult[]>;
  getIntegration: (integrationId: string) => Integration | null;
  updateIntegrationConfig: (
    integrationId: string,
    config: Record<string, any>
  ) => Promise<boolean>;
  testConnection: (integrationId: string) => Promise<boolean>;
  getIntegrationData: (
    integrationId: string,
    endpoint: string,
    params?: any
  ) => Promise<any>;
  sendToIntegration: (
    integrationId: string,
    endpoint: string,
    data: any
  ) => Promise<any>;
}

const ExternalIntegrationsContext = createContext<
  ExternalIntegrationsContextType | undefined
>(undefined);

// Available integrations
const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sincronize consultas com o Google Calendar',
    category: 'calendar',
    provider: 'Google',
    isActive: true,
    isConnected: false,
    config: {
      syncDirection: 'bidirectional',
      calendarId: 'primary',
      reminderMinutes: 15,
    },
    syncStatus: 'idle',
    features: [
      'sync_appointments',
      'create_events',
      'update_events',
      'delete_events',
    ],
    requiredPlan: 'silver',
  },
  {
    id: 'outlook_calendar',
    name: 'Outlook Calendar',
    description: 'Sincronize consultas com o Outlook/Office 365',
    category: 'calendar',
    provider: 'Microsoft',
    isActive: true,
    isConnected: false,
    config: {
      syncDirection: 'bidirectional',
      calendarId: 'primary',
      reminderMinutes: 15,
    },
    syncStatus: 'idle',
    features: [
      'sync_appointments',
      'create_events',
      'update_events',
      'delete_events',
    ],
    requiredPlan: 'silver',
  },
  {
    id: 'whatsapp_business',
    name: 'WhatsApp Business',
    description: 'Envie lembretes e comunicações via WhatsApp',
    category: 'communication',
    provider: 'Meta',
    isActive: true,
    isConnected: false,
    config: {
      phoneNumberId: '',
      templateMessages: true,
      autoReminders: true,
    },
    syncStatus: 'idle',
    features: [
      'send_messages',
      'send_templates',
      'receive_messages',
      'appointment_reminders',
    ],
    requiredPlan: 'gold',
  },
  {
    id: 'telegram_bot',
    name: 'Telegram Bot',
    description: 'Comunicação automatizada via Telegram',
    category: 'communication',
    provider: 'Telegram',
    isActive: true,
    isConnected: false,
    config: {
      botToken: '',
      chatId: '',
      notifications: true,
    },
    syncStatus: 'idle',
    features: [
      'send_messages',
      'receive_messages',
      'notifications',
      'commands',
    ],
    requiredPlan: 'silver',
  },
  {
    id: 'mercado_pago',
    name: 'Mercado Pago',
    description: 'Processamento de pagamentos via Mercado Pago',
    category: 'payment',
    provider: 'Mercado Libre',
    isActive: true,
    isConnected: false,
    config: {
      sandboxMode: true,
      webhookUrl: '',
      autoCapture: true,
    },
    syncStatus: 'idle',
    features: ['process_payments', 'create_links', 'webhooks', 'refunds'],
    requiredPlan: 'silver',
  },
  {
    id: 'pix_payments',
    name: 'PIX Payments',
    description: 'Recebimento via PIX integrado',
    category: 'payment',
    provider: 'Banco Central',
    isActive: true,
    isConnected: false,
    config: {
      pixKey: '',
      bankCode: '',
      autoGenerate: true,
    },
    syncStatus: 'idle',
    features: ['generate_pix', 'qr_codes', 'payment_status', 'webhooks'],
    requiredPlan: 'silver',
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Backup automático de documentos no Google Drive',
    category: 'storage',
    provider: 'Google',
    isActive: true,
    isConnected: false,
    config: {
      folderId: '',
      autoBackup: true,
      backupFrequency: 'daily',
    },
    syncStatus: 'idle',
    features: ['upload_files', 'download_files', 'auto_backup', 'folder_sync'],
    requiredPlan: 'gold',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Sincronização de arquivos com Dropbox',
    category: 'storage',
    provider: 'Dropbox',
    isActive: true,
    isConnected: false,
    config: {
      folderPath: '/FisioFlow',
      autoSync: true,
      syncFrequency: 'realtime',
    },
    syncStatus: 'idle',
    features: [
      'upload_files',
      'download_files',
      'auto_sync',
      'version_control',
    ],
    requiredPlan: 'gold',
  },
  {
    id: 'openai_gpt',
    name: 'OpenAI GPT',
    description: 'IA avançada para análises e relatórios',
    category: 'ai',
    provider: 'OpenAI',
    isActive: true,
    isConnected: false,
    config: {
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
    },
    syncStatus: 'idle',
    features: ['text_generation', 'analysis', 'summaries', 'recommendations'],
    requiredPlan: 'platinum',
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    description: 'Análise avançada de uso e performance',
    category: 'analytics',
    provider: 'Google',
    isActive: true,
    isConnected: false,
    config: {
      propertyId: '',
      trackingId: '',
      customEvents: true,
    },
    syncStatus: 'idle',
    features: ['track_events', 'custom_metrics', 'reports', 'real_time_data'],
    requiredPlan: 'gold',
  },
  {
    id: 'sus_datasus',
    name: 'DATASUS/SUS',
    description: 'Integração com sistemas do SUS',
    category: 'health',
    provider: 'Ministério da Saúde',
    isActive: true,
    isConnected: false,
    config: {
      cnesCode: '',
      professionalRegistry: '',
      reportingEnabled: true,
    },
    syncStatus: 'idle',
    features: ['patient_lookup', 'procedure_codes', 'reporting', 'validation'],
    requiredPlan: 'platinum',
  },
  {
    id: 'cfito_integration',
    name: 'COFFITO/CREFITO',
    description: 'Validação de registros profissionais',
    category: 'health',
    provider: 'COFFITO',
    isActive: true,
    isConnected: false,
    config: {
      professionalRegistry: '',
      autoValidation: true,
      renewalAlerts: true,
    },
    syncStatus: 'idle',
    features: [
      'validate_registry',
      'renewal_alerts',
      'professional_data',
      'compliance_check',
    ],
    requiredPlan: 'gold',
  },
];

interface ExternalIntegrationsProviderProps {
  children: ReactNode;
}

export const ExternalIntegrationsProvider: React.FC<
  ExternalIntegrationsProviderProps
> = ({ children }) => {
  const { user } = useAuth();
  const { saveAuditLog } = useData();
  const { addNotification } = useNotification();
  const { isFeatureEnabled } = useFeatureFlags();

  const [integrations, setIntegrations] = useState<Integration[]>(
    AVAILABLE_INTEGRATIONS
  );

  // Load integrations from localStorage on mount
  useEffect(() => {
    const savedIntegrations = localStorage.getItem('fisioflow_integrations');
    if (savedIntegrations) {
      try {
        const parsed = JSON.parse(savedIntegrations);
        // Merge with available integrations to ensure we have latest features
        const merged = AVAILABLE_INTEGRATIONS.map((available) => {
          const saved = parsed.find((p: Integration) => p.id === available.id);
          return saved
            ? { ...available, ...saved, features: available.features }
            : available;
        });
        setIntegrations(merged);
      } catch (error) {
        console.error('Error loading integrations:', error);
      }
    }
  }, []);

  // Save integrations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      'fisioflow_integrations',
      JSON.stringify(integrations)
    );
  }, [integrations]);

  const availableIntegrations = integrations.filter((integration) => {
    return integration.isActive && isFeatureEnabled('external_integrations');
  });

  const connectedIntegrations = integrations.filter((integration) => {
    return integration.isConnected && integration.isActive;
  });

  const connectIntegration = async (
    integrationId: string,
    credentials: any
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const integration = integrations.find((i) => i.id === integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Check if user has required plan
      if (!isFeatureEnabled('external_integrations')) {
        addNotification({
          type: 'error',
          title: 'Recurso Não Disponível',
          message: `Integrações externas requerem plano ${integration.requiredPlan.toUpperCase()} ou superior.`,
        });
        return false;
      }

      // Simulate connection process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Test connection with provided credentials
      const connectionTest = await testConnectionWithCredentials(
        integrationId,
        credentials
      );
      if (!connectionTest) {
        throw new Error('Connection test failed');
      }

      // Update integration
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId
            ? {
                ...i,
                isConnected: true,
                credentials,
                lastSync: new Date().toISOString(),
                syncStatus: 'success' as const,
                errorMessage: undefined,
              }
            : i
        )
      );

      // Log the connection
      saveAuditLog(
        {
          action: 'integration_connected',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            integrationId,
            integrationName: integration.name,
            provider: integration.provider,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'success',
        title: 'Integração Conectada!',
        message: `${integration.name} foi conectado com sucesso.`,
      });

      return true;
    } catch (error) {
      console.error('Integration connection failed:', error);

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId
            ? {
                ...i,
                syncStatus: 'error' as const,
                errorMessage:
                  error instanceof Error ? error.message : 'Connection failed',
              }
            : i
        )
      );

      addNotification({
        type: 'error',
        title: 'Erro na Conexão',
        message:
          'Não foi possível conectar a integração. Verifique as credenciais.',
      });

      return false;
    }
  };

  const disconnectIntegration = async (
    integrationId: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const integration = integrations.find((i) => i.id === integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Update integration
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId
            ? {
                ...i,
                isConnected: false,
                credentials: undefined,
                syncStatus: 'idle' as const,
                errorMessage: undefined,
              }
            : i
        )
      );

      // Log the disconnection
      saveAuditLog(
        {
          action: 'integration_disconnected',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            integrationId,
            integrationName: integration.name,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'info',
        title: 'Integração Desconectada',
        message: `${integration.name} foi desconectado.`,
      });

      return true;
    } catch (error) {
      console.error('Integration disconnection failed:', error);
      return false;
    }
  };

  const syncIntegration = async (
    integrationId: string
  ): Promise<SyncResult> => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration || !integration.isConnected) {
      return {
        success: false,
        recordsProcessed: 0,
        errors: ['Integration not found or not connected'],
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Update sync status
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId ? { ...i, syncStatus: 'syncing' as const } : i
        )
      );

      // Simulate sync process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Mock sync result
      const recordsProcessed = Math.floor(Math.random() * 50) + 1;
      const result: SyncResult = {
        success: true,
        recordsProcessed,
        errors: [],
        timestamp: new Date().toISOString(),
      };

      // Update integration
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId
            ? {
                ...i,
                syncStatus: 'success' as const,
                lastSync: new Date().toISOString(),
                errorMessage: undefined,
              }
            : i
        )
      );

      // Log the sync
      if (user) {
        saveAuditLog(
          {
            action: 'integration_synced',
            userId: user.id,
            tenantId: user.tenantId,
            details: {
              integrationId,
              recordsProcessed,
              syncResult: result,
            },
            timestamp: new Date().toISOString(),
          },
          user
        );
      }

      return result;
    } catch (error) {
      console.error('Integration sync failed:', error);

      const result: SyncResult = {
        success: false,
        recordsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        timestamp: new Date().toISOString(),
      };

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId
            ? {
                ...i,
                syncStatus: 'error' as const,
                errorMessage:
                  error instanceof Error ? error.message : 'Sync failed',
              }
            : i
        )
      );

      return result;
    }
  };

  const syncAllIntegrations = async (): Promise<SyncResult[]> => {
    const results: SyncResult[] = [];

    for (const integration of connectedIntegrations) {
      const result = await syncIntegration(integration.id);
      results.push(result);
    }

    return results;
  };

  const getIntegration = (integrationId: string): Integration | null => {
    return integrations.find((i) => i.id === integrationId) || null;
  };

  const updateIntegrationConfig = async (
    integrationId: string,
    config: Record<string, any>
  ): Promise<boolean> => {
    try {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId
            ? { ...i, config: { ...i.config, ...config } }
            : i
        )
      );
      return true;
    } catch (error) {
      console.error('Failed to update integration config:', error);
      return false;
    }
  };

  const testConnection = async (integrationId: string): Promise<boolean> => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration || !integration.credentials) {
      return false;
    }

    return testConnectionWithCredentials(
      integrationId,
      integration.credentials
    );
  };

  const testConnectionWithCredentials = async (
    integrationId: string,
    credentials: any
  ): Promise<boolean> => {
    try {
      // Simulate connection test
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock test - always return true for development
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  const getIntegrationData = async (
    integrationId: string,
    endpoint: string,
    params?: any
  ): Promise<any> => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration || !integration.isConnected) {
      throw new Error('Integration not connected');
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock response based on integration type
      switch (integrationId) {
        case 'google_calendar':
          return {
            events: [
              {
                id: 'event1',
                summary: 'Consulta - João Silva',
                start: { dateTime: new Date().toISOString() },
                end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
              },
            ],
          };
        default:
          return { data: 'mock_data' };
      }
    } catch (error) {
      console.error('Failed to get integration data:', error);
      throw error;
    }
  };

  const sendToIntegration = async (
    integrationId: string,
    endpoint: string,
    data: any
  ): Promise<any> => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration || !integration.isConnected) {
      throw new Error('Integration not connected');
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful response
      return {
        success: true,
        id: `${integrationId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to send to integration:', error);
      throw error;
    }
  };

  const value: ExternalIntegrationsContextType = {
    integrations,
    availableIntegrations,
    connectedIntegrations,
    connectIntegration,
    disconnectIntegration,
    syncIntegration,
    syncAllIntegrations,
    getIntegration,
    updateIntegrationConfig,
    testConnection,
    getIntegrationData,
    sendToIntegration,
  };

  return (
    <ExternalIntegrationsContext.Provider value={value}>
      {children}
    </ExternalIntegrationsContext.Provider>
  );
};

export const useExternalIntegrations = (): ExternalIntegrationsContextType => {
  const context = useContext(ExternalIntegrationsContext);
  if (!context) {
    throw new Error(
      'useExternalIntegrations must be used within an ExternalIntegrationsProvider'
    );
  }
  return context;
};

export default useExternalIntegrations;
export type { Integration, SyncResult };
export { AVAILABLE_INTEGRATIONS };
