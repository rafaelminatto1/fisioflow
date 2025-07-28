import React, { useState, useEffect } from 'react';

import { useNotification } from '../hooks/useNotification';
import { notificationService } from '../services/notificationService';
import {
  ReminderSettings,
  NotificationChannel,
  ReminderType,
  Patient,
} from '../types';

interface PatientNotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
}

const REMINDER_TYPE_LABELS: Record<
  ReminderType,
  { label: string; description: string; icon: string }
> = {
  exercise_daily: {
    label: 'Exercícios Diários',
    description: 'Lembretes para fazer exercícios de fisioterapia',
    icon: '🏃‍♂️',
  },
  appointment_24h: {
    label: 'Consulta (24h antes)',
    description: 'Lembrete enviado 24 horas antes da consulta',
    icon: '📅',
  },
  appointment_2h: {
    label: 'Consulta (2h antes)',
    description: 'Lembrete enviado 2 horas antes da consulta',
    icon: '⏰',
  },
  medication: {
    label: 'Medicamentos',
    description: 'Lembretes para tomar medicamentos',
    icon: '💊',
  },
  assessment_followup: {
    label: 'Avaliações de Acompanhamento',
    description: 'Lembretes para agendar reavaliações',
    icon: '📋',
  },
  payment_reminder: {
    label: 'Pagamentos',
    description: 'Lembretes de pagamentos pendentes',
    icon: '💳',
  },
  treatment_progress: {
    label: 'Progresso do Tratamento',
    description: 'Atualizações sobre evolução do tratamento',
    icon: '📈',
  },
  custom: {
    label: 'Personalizados',
    description: 'Lembretes customizados pelo terapeuta',
    icon: '⚙️',
  },
};

const CHANNEL_LABELS: Record<
  NotificationChannel,
  { label: string; icon: string; description: string }
> = {
  push: {
    label: 'Notificações Push',
    icon: '📱',
    description: 'Notificações no aplicativo e navegador',
  },
  email: {
    label: 'Email',
    icon: '📧',
    description: 'Notificações por email',
  },
  sms: {
    label: 'SMS',
    icon: '💬',
    description: 'Mensagens de texto',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: '📞',
    description: 'Mensagens via WhatsApp',
  },
  in_app: {
    label: 'No App',
    icon: '🔔',
    description: 'Notificações dentro do aplicativo',
  },
};

const SNOOZE_OPTIONS = [
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 240, label: '4 horas' },
  { value: 480, label: '8 horas' },
  { value: 720, label: '12 horas' },
];

export const PatientNotificationSettings: React.FC<
  PatientNotificationSettingsProps
> = ({ isOpen, onClose, patient }) => {
  const { addNotification } = useNotification();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'general' | 'channels' | 'types' | 'smart'
  >('general');

  useEffect(() => {
    if (isOpen && patient) {
      loadPatientSettings();
    }
  }, [isOpen, patient]);

  const loadPatientSettings = async () => {
    setLoading(true);
    try {
      let patientSettings = notificationService.getReminderSettingsForPatient(
        patient.id
      );

      if (!patientSettings) {
        // Inicializar configurações padrão se não existirem
        patientSettings = notificationService.initializePatientReminderSettings(
          patient.id,
          patient.tenantId,
          patient
        );
      }

      setSettings(patientSettings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao carregar configurações de notificação',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = (updates: Partial<ReminderSettings>) => {
    if (!settings) return;

    const updatedSettings = { ...settings, ...updates };
    setSettings(updatedSettings);

    notificationService.updateReminderSettings(patient.id, updates);

    addNotification({
      type: 'success',
      title: 'Configurações Salvas',
      message: 'As configurações de notificação foram atualizadas com sucesso.',
    });
  };

  const toggleGlobalSetting = (
    key: keyof ReminderSettings['globalSettings'],
    value: any
  ) => {
    if (!settings) return;

    updateSettings({
      globalSettings: {
        ...settings.globalSettings,
        [key]: value,
      },
    });
  };

  const toggleChannelSetting = (
    channel: NotificationChannel,
    key: string,
    value: any
  ) => {
    if (!settings) return;

    updateSettings({
      channelSettings: {
        ...settings.channelSettings,
        [channel]: {
          ...settings.channelSettings[channel],
          [key]: value,
        },
      },
    });
  };

  const toggleTypeSetting = (type: ReminderType, key: string, value: any) => {
    if (!settings) return;

    updateSettings({
      typeSettings: {
        ...settings.typeSettings,
        [type]: {
          ...settings.typeSettings[type],
          [key]: value,
        },
      },
    });
  };

  const toggleSmartSetting = (
    key: keyof ReminderSettings['smartSettings'],
    value: boolean
  ) => {
    if (!settings) return;

    updateSettings({
      smartSettings: {
        ...settings.smartSettings,
        [key]: value,
      },
    });
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await notificationService.requestPermission();
      if (permission === 'granted') {
        addNotification({
          type: 'success',
          title: 'Permissão Concedida',
          message: 'Agora você receberá notificações do FisioFlow!',
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Permissão Negada',
          message: 'Você pode alterar isso nas configurações do navegador.',
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao solicitar permissão de notificação',
      });
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="rounded-lg bg-white p-8">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span>Carregando configurações...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="rounded-lg bg-white p-8">
          <h2 className="mb-4 text-xl font-semibold">Erro</h2>
          <p className="mb-4">
            Não foi possível carregar as configurações de notificação.
          </p>
          <button
            onClick={onClose}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold">
              Configurações de Notificações
            </h2>
            <p className="text-sm text-gray-500">Paciente: {patient.name}</p>
          </div>
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
              { id: 'channels', label: 'Canais', icon: '📡' },
              { id: 'types', label: 'Tipos', icon: '📋' },
              { id: 'smart', label: 'Inteligente', icon: '🤖' },
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

        {/* Content */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-6">
          {/* Aba Geral */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Status das Notificações */}
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Status das Notificações
                    </h3>
                    <p className="text-sm text-gray-500">
                      {settings.globalSettings.enabled
                        ? 'Notificações estão ativadas'
                        : 'Notificações estão desativadas'}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.globalSettings.enabled}
                      onChange={(e) =>
                        toggleGlobalSetting('enabled', e.target.checked)
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>

                {!settings.globalSettings.enabled && (
                  <div className="mt-3">
                    <button
                      onClick={requestNotificationPermission}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      Ativar Notificações
                    </button>
                  </div>
                )}
              </div>

              {/* Horário Silencioso */}
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
                      checked={settings.globalSettings.quietHours.enabled}
                      onChange={(e) =>
                        toggleGlobalSetting('quietHours', {
                          ...settings.globalSettings.quietHours,
                          enabled: e.target.checked,
                        })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>

                {settings.globalSettings.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Início
                      </label>
                      <input
                        type="time"
                        value={settings.globalSettings.quietHours.start}
                        onChange={(e) =>
                          toggleGlobalSetting('quietHours', {
                            ...settings.globalSettings.quietHours,
                            start: e.target.value,
                          })
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
                        value={settings.globalSettings.quietHours.end}
                        onChange={(e) =>
                          toggleGlobalSetting('quietHours', {
                            ...settings.globalSettings.quietHours,
                            end: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Idioma */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Idioma das Notificações
                </label>
                <select
                  value={settings.globalSettings.language}
                  onChange={(e) =>
                    toggleGlobalSetting('language', e.target.value)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
          )}

          {/* Aba Canais */}
          {activeTab === 'channels' && (
            <div className="space-y-4">
              <h3 className="mb-4 font-medium text-gray-900">
                Configurações por Canal
              </h3>

              {Object.entries(CHANNEL_LABELS).map(([channel, info]) => (
                <div
                  key={channel}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{info.icon}</div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {info.label}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {info.description}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={
                          settings.channelSettings[
                            channel as NotificationChannel
                          ]?.enabled || false
                        }
                        onChange={(e) =>
                          toggleChannelSetting(
                            channel as NotificationChannel,
                            'enabled',
                            e.target.checked
                          )
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                    </label>
                  </div>

                  {/* Configurações específicas do canal */}
                  {settings.channelSettings[channel as NotificationChannel]
                    ?.enabled && (
                    <div className="mt-4 space-y-3">
                      {channel === 'push' && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Som</span>
                            <input
                              type="checkbox"
                              checked={settings.channelSettings.push.sound}
                              onChange={(e) =>
                                toggleChannelSetting(
                                  'push',
                                  'sound',
                                  e.target.checked
                                )
                              }
                              className="rounded border-gray-300"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                              Vibração
                            </span>
                            <input
                              type="checkbox"
                              checked={settings.channelSettings.push.vibration}
                              onChange={(e) =>
                                toggleChannelSetting(
                                  'push',
                                  'vibration',
                                  e.target.checked
                                )
                              }
                              className="rounded border-gray-300"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                              Mostrar Prévia
                            </span>
                            <input
                              type="checkbox"
                              checked={
                                settings.channelSettings.push.showPreview
                              }
                              onChange={(e) =>
                                toggleChannelSetting(
                                  'push',
                                  'showPreview',
                                  e.target.checked
                                )
                              }
                              className="rounded border-gray-300"
                            />
                          </div>
                        </>
                      )}

                      {channel === 'email' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input
                            type="email"
                            value={
                              settings.channelSettings.email.emailAddress || ''
                            }
                            onChange={(e) =>
                              toggleChannelSetting(
                                'email',
                                'emailAddress',
                                e.target.value
                              )
                            }
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="seu@email.com"
                          />
                        </div>
                      )}

                      {(channel === 'sms' || channel === 'whatsapp') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Telefone
                          </label>
                          <input
                            type="tel"
                            value={
                              settings.channelSettings[
                                channel as 'sms' | 'whatsapp'
                              ].phoneNumber || ''
                            }
                            onChange={(e) =>
                              toggleChannelSetting(
                                channel as NotificationChannel,
                                'phoneNumber',
                                e.target.value
                              )
                            }
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Aba Tipos */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <h3 className="mb-4 font-medium text-gray-900">
                Tipos de Lembrete
              </h3>

              {Object.entries(REMINDER_TYPE_LABELS).map(([type, info]) => (
                <div
                  key={type}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{info.icon}</div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {info.label}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {info.description}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={
                          settings.typeSettings[type as ReminderType]
                            ?.enabled || false
                        }
                        onChange={(e) =>
                          toggleTypeSetting(
                            type as ReminderType,
                            'enabled',
                            e.target.checked
                          )
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                    </label>
                  </div>

                  {settings.typeSettings[type as ReminderType]?.enabled && (
                    <div className="mt-4 space-y-3">
                      {/* Horário personalizado para exercícios */}
                      {type === 'exercise_daily' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Horário Preferido
                          </label>
                          <input
                            type="time"
                            value={
                              settings.typeSettings.exercise_daily.customTime ||
                              '09:00'
                            }
                            onChange={(e) =>
                              toggleTypeSetting(
                                'exercise_daily',
                                'customTime',
                                e.target.value
                              )
                            }
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {/* Canais preferidos */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Canais Preferidos
                        </label>
                        <div className="space-y-2">
                          {Object.entries(CHANNEL_LABELS).map(
                            ([channel, channelInfo]) => (
                              <label
                                key={channel}
                                className="flex items-center"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    settings.typeSettings[
                                      type as ReminderType
                                    ]?.preferredChannels?.includes(
                                      channel as NotificationChannel
                                    ) || false
                                  }
                                  onChange={(e) => {
                                    const currentChannels =
                                      settings.typeSettings[
                                        type as ReminderType
                                      ]?.preferredChannels || [];
                                    const newChannels = e.target.checked
                                      ? [
                                          ...currentChannels,
                                          channel as NotificationChannel,
                                        ]
                                      : currentChannels.filter(
                                          (c) => c !== channel
                                        );
                                    toggleTypeSetting(
                                      type as ReminderType,
                                      'preferredChannels',
                                      newChannels
                                    );
                                  }}
                                  className="mr-2 rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">
                                  {channelInfo.icon} {channelInfo.label}
                                </span>
                              </label>
                            )
                          )}
                        </div>
                      </div>

                      {/* Opções de Soneca */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Opções de Soneca (minutos)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {SNOOZE_OPTIONS.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  settings.typeSettings[
                                    type as ReminderType
                                  ]?.snoozeOptions?.includes(option.value) ||
                                  false
                                }
                                onChange={(e) => {
                                  const currentOptions =
                                    settings.typeSettings[type as ReminderType]
                                      ?.snoozeOptions || [];
                                  const newOptions = e.target.checked
                                    ? [...currentOptions, option.value]
                                    : currentOptions.filter(
                                        (o) => o !== option.value
                                      );
                                  toggleTypeSetting(
                                    type as ReminderType,
                                    'snoozeOptions',
                                    newOptions
                                  );
                                }}
                                className="mr-1 rounded border-gray-300"
                              />
                              <span className="text-xs text-gray-600">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Aba Inteligente */}
          {activeTab === 'smart' && (
            <div className="space-y-6">
              <h3 className="mb-4 font-medium text-gray-900">
                Configurações Inteligentes
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Agendamento Adaptativo
                    </h4>
                    <p className="text-sm text-gray-500">
                      Ajustar horários baseado no seu comportamento de resposta
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.smartSettings.adaptiveScheduling}
                      onChange={(e) =>
                        toggleSmartSetting(
                          'adaptiveScheduling',
                          e.target.checked
                        )
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Pular Fins de Semana
                    </h4>
                    <p className="text-sm text-gray-500">
                      Não enviar lembretes de exercícios aos fins de semana
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.smartSettings.skipWeekends}
                      onChange={(e) =>
                        toggleSmartSetting('skipWeekends', e.target.checked)
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Pular Feriados
                    </h4>
                    <p className="text-sm text-gray-500">
                      Não enviar lembretes em feriados nacionais
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.smartSettings.skipHolidays}
                      onChange={(e) =>
                        toggleSmartSetting('skipHolidays', e.target.checked)
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Consolidar Lembretes
                    </h4>
                    <p className="text-sm text-gray-500">
                      Agrupar múltiplos lembretes em uma única notificação
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.smartSettings.consolidateReminders}
                      onChange={(e) =>
                        toggleSmartSetting(
                          'consolidateReminders',
                          e.target.checked
                        )
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>
              </div>

              {/* Estatísticas de Engajamento */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-3 font-medium text-gray-900">
                  Estatísticas de Engajamento
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Taxa de Leitura:</span>
                    <span className="ml-2 font-medium">85%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Taxa de Resposta:</span>
                    <span className="ml-2 font-medium">72%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Melhor Horário:</span>
                    <span className="ml-2 font-medium">09:30</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Canal Preferido:</span>
                    <span className="ml-2 font-medium">📱 Push</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                addNotification({
                  type: 'success',
                  title: 'Teste de Notificação',
                  message: 'Esta é uma notificação de teste!',
                });
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Testar Notificação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientNotificationSettings;
