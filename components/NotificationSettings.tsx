import React, { useState, useEffect } from 'react';

import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useNotification } from '../hooks/useNotification';
import {
  usePushNotifications,
  NotificationSettings as Settings,
  NotificationTemplate,
} from '../hooks/usePushNotifications';

import PaywallModal from './PaywallModal';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationTypeCard: React.FC<{
  type: keyof Settings['types'];
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}> = ({ type, label, description, icon, enabled, onToggle }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <h3 className="font-medium text-gray-900">{label}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
        </label>
      </div>
    </div>
  );
};

const TemplateCard: React.FC<{
  template: NotificationTemplate;
  onEdit: (template: NotificationTemplate) => void;
  onToggle: (templateId: string, enabled: boolean) => void;
  onDelete: (templateId: string) => void;
}> = ({ template, onEdit, onToggle, onDelete }) => {
  const getTypeIcon = () => {
    switch (template.type) {
      case 'appointment':
        return '📅';
      case 'reminder':
        return '⏰';
      case 'exercise':
        return '🏃';
      case 'message':
        return '💬';
      case 'system':
        return '⚙️';
      case 'marketing':
        return '📢';
      case 'emergency':
        return '🚨';
      default:
        return '📱';
    }
  };

  const getPriorityColor = () => {
    switch (template.priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-xl">{getTypeIcon()}</div>
          <div>
            <h3 className="font-medium text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-500">{template.title}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor()}`}
          >
            {template.priority}
          </span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={template.isActive}
              onChange={(e) => onToggle(template.id, e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
          </label>
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-600">{template.body}</p>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {template.triggers.map((trigger, index) => (
            <span
              key={index}
              className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
            >
              {trigger.event}
              {trigger.delay && ` (${trigger.delay}min)`}
            </span>
          ))}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(template)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

const TemplateEditor: React.FC<{
  template: NotificationTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Partial<NotificationTemplate>) => void;
}> = ({ template, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<NotificationTemplate>>({});

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        name: '',
        title: '',
        body: '',
        type: 'system',
        priority: 'normal',
        isActive: true,
        triggers: [{ event: '' }],
        personalization: {},
        scheduling: {},
      });
    }
  }, [template]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {template ? 'Editar Template' : 'Novo Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome do Template
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Lembrete de Consulta"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tipo
              </label>
              <select
                value={formData.type || 'system'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as any,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="appointment">Consulta</option>
                <option value="reminder">Lembrete</option>
                <option value="exercise">Exercício</option>
                <option value="message">Mensagem</option>
                <option value="system">Sistema</option>
                <option value="marketing">Marketing</option>
                <option value="emergency">Emergência</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Prioridade
              </label>
              <select
                value={formData.priority || 'normal'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: e.target.value as any,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Som
              </label>
              <input
                type="text"
                value={formData.sound || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sound: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="default, message, alert"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Título
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Use {variavel} para personalização"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mensagem
            </label>
            <textarea
              value={formData.body || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, body: e.target.value }))
              }
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Use {variavel} para personalização"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Template ativo</span>
            </label>
          </div>
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

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    settings,
    templates,
    isPermissionGranted,
    requestPermission,
    updateSettings,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getNotificationStats,
    registerForPushNotifications,
    unregisterFromPushNotifications,
  } = usePushNotifications();

  const { isFeatureEnabled } = useFeatureFlags();
  const { addNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<
    'general' | 'types' | 'templates' | 'stats'
  >('general');
  const [templateEditor, setTemplateEditor] = useState<{
    isOpen: boolean;
    template: NotificationTemplate | null;
  }>({ isOpen: false, template: null });
  const [showPaywall, setShowPaywall] = useState(false);
  const [stats, setStats] = useState(getNotificationStats());

  useEffect(() => {
    if (isOpen) {
      setStats(getNotificationStats());
    }
  }, [isOpen, getNotificationStats]);

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      await registerForPushNotifications();
    }
  };

  const handlePermissionRevoke = async () => {
    await unregisterFromPushNotifications();
  };

  const handleTypeToggle = (
    type: keyof Settings['types'],
    enabled: boolean
  ) => {
    updateSettings({
      types: {
        ...settings.types,
        [type]: enabled,
      },
    });
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    updateSettings({
      quietHours: {
        ...settings.quietHours,
        enabled,
      },
    });
  };

  const handleQuietHoursChange = (field: 'start' | 'end', value: string) => {
    updateSettings({
      quietHours: {
        ...settings.quietHours,
        [field]: value,
      },
    });
  };

  const handleTemplateToggle = (templateId: string, enabled: boolean) => {
    updateTemplate(templateId, { isActive: enabled });
  };

  const handleTemplateEdit = (template: NotificationTemplate) => {
    setTemplateEditor({ isOpen: true, template });
  };

  const handleTemplateCreate = () => {
    setTemplateEditor({ isOpen: true, template: null });
  };

  const handleTemplateSave = (templateData: Partial<NotificationTemplate>) => {
    if (templateEditor.template) {
      updateTemplate(templateEditor.template.id, templateData);
    } else {
      createTemplate(templateData as Omit<NotificationTemplate, 'id'>);
    }
    addNotification({
      type: 'success',
      title: 'Template Salvo',
      message: 'O template de notificação foi salvo com sucesso.',
    });
  };

  const handleTemplateDelete = (templateId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este template?')) {
      deleteTemplate(templateId);
      addNotification({
        type: 'success',
        title: 'Template Excluído',
        message: 'O template foi excluído com sucesso.',
      });
    }
  };

  if (!isOpen) return null;

  if (!isFeatureEnabled('push_notifications')) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <div className="text-center">
              <div className="mb-4 text-6xl">📱</div>
              <h2 className="mb-2 text-xl font-semibold">Notificações Push</h2>
              <p className="mb-6 text-gray-600">
                As notificações push estão disponíveis nos planos pagos.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  onClick={() => setShowPaywall(true)}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Fazer Upgrade
                </button>
              </div>
            </div>
          </div>
        </div>

        {showPaywall && (
          <PaywallModal
            isOpen={showPaywall}
            onClose={() => setShowPaywall(false)}
            feature="Notificações Push"
            description="Mantenha seus pacientes engajados com notificações personalizadas."
            recommendedPlan="silver"
          />
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold">
            Configurações de Notificações
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'general', label: 'Geral', icon: '⚙️' },
              { id: 'types', label: 'Tipos', icon: '📱' },
              { id: 'templates', label: 'Templates', icon: '📝' },
              { id: 'stats', label: 'Estatísticas', icon: '📊' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Permission Status */}
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Status das Permissões
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isPermissionGranted
                        ? 'Notificações estão ativadas'
                        : 'Permissão necessária para receber notificações'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isPermissionGranted ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></div>
                    <span className="text-sm font-medium">
                      {isPermissionGranted ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  {!isPermissionGranted ? (
                    <button
                      onClick={handlePermissionRequest}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      Ativar Notificações
                    </button>
                  ) : (
                    <button
                      onClick={handlePermissionRevoke}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                    >
                      Desativar Notificações
                    </button>
                  )}
                </div>
              </div>

              {/* Global Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">
                  Configurações Gerais
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">
                      Notificações Ativadas
                    </label>
                    <p className="text-sm text-gray-500">
                      Ativar/desativar todas as notificações
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) =>
                        updateSettings({ enabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Som</label>
                    <p className="text-sm text-gray-500">
                      Reproduzir som nas notificações
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.sound}
                      onChange={(e) =>
                        updateSettings({ sound: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Badge</label>
                    <p className="text-sm text-gray-500">
                      Mostrar contador no ícone do app
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.badge}
                      onChange={(e) =>
                        updateSettings({ badge: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Horário Silencioso
                    </h3>
                    <p className="text-sm text-gray-500">
                      Não receber notificações durante este período
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.quietHours.enabled}
                      onChange={(e) => handleQuietHoursToggle(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>

                {settings.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Início
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.start}
                        onChange={(e) =>
                          handleQuietHoursChange('start', e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Fim
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.end}
                        onChange={(e) =>
                          handleQuietHoursChange('end', e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Types Tab */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <h3 className="mb-4 font-medium text-gray-900">
                Tipos de Notificação
              </h3>

              <NotificationTypeCard
                type="appointments"
                label="Consultas"
                description="Lembretes e confirmações de consultas"
                icon="📅"
                enabled={settings.types.appointments}
                onToggle={(enabled) =>
                  handleTypeToggle('appointments', enabled)
                }
              />

              <NotificationTypeCard
                type="reminders"
                label="Lembretes"
                description="Lembretes gerais e tarefas"
                icon="⏰"
                enabled={settings.types.reminders}
                onToggle={(enabled) => handleTypeToggle('reminders', enabled)}
              />

              <NotificationTypeCard
                type="exercises"
                label="Exercícios"
                description="Lembretes de exercícios e fisioterapia"
                icon="🏃"
                enabled={settings.types.exercises}
                onToggle={(enabled) => handleTypeToggle('exercises', enabled)}
              />

              <NotificationTypeCard
                type="messages"
                label="Mensagens"
                description="Novas mensagens e conversas"
                icon="💬"
                enabled={settings.types.messages}
                onToggle={(enabled) => handleTypeToggle('messages', enabled)}
              />

              <NotificationTypeCard
                type="system"
                label="Sistema"
                description="Atualizações e notificações do sistema"
                icon="⚙️"
                enabled={settings.types.system}
                onToggle={(enabled) => handleTypeToggle('system', enabled)}
              />

              <NotificationTypeCard
                type="marketing"
                label="Marketing"
                description="Promoções e novidades"
                icon="📢"
                enabled={settings.types.marketing}
                onToggle={(enabled) => handleTypeToggle('marketing', enabled)}
              />
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  Templates de Notificação
                </h3>
                <button
                  onClick={handleTemplateCreate}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Novo Template
                </button>
              </div>

              <div className="space-y-3">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleTemplateEdit}
                    onToggle={handleTemplateToggle}
                    onDelete={handleTemplateDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="font-medium text-gray-900">
                Estatísticas de Notificações
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.total}
                  </div>
                  <div className="text-sm text-blue-800">
                    Total de Notificações
                  </div>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.readRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-green-800">Taxa de Leitura</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {templates.filter((t) => t.isActive).length}
                  </div>
                  <div className="text-sm text-purple-800">
                    Templates Ativos
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 font-medium text-gray-900">Por Tipo</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize text-gray-600">{type}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-medium text-gray-900">
                    Por Prioridade
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(stats.byPriority).map(
                      ([priority, count]) => (
                        <div key={priority} className="flex justify-between">
                          <span className="capitalize text-gray-600">
                            {priority}
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Editor Modal */}
      <TemplateEditor
        template={templateEditor.template}
        isOpen={templateEditor.isOpen}
        onClose={() => setTemplateEditor({ isOpen: false, template: null })}
        onSave={handleTemplateSave}
      />
    </div>
  );
};

export default NotificationSettings;
