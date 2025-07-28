import React, { createContext, useContext, useEffect, ReactNode } from 'react';

import { notificationService } from '../services/notificationService';
import {
  ReminderRule,
  ScheduledReminder,
  ReminderSettings,
  NotificationDeliveryLog,
  ReminderAnalytics,
  SmartReminderInsight,
  Patient,
  User,
  Appointment,
  Prescription,
} from '../types';

import { useAuth } from './useAuth';
// import { useData } from './useData.minimal';

interface ReminderSystemContextType {
  // Configurações de Lembrete
  initializePatientSettings: (patient: Patient) => ReminderSettings;
  getPatientSettings: (patientId: string) => ReminderSettings | null;
  updatePatientSettings: (
    patientId: string,
    updates: Partial<ReminderSettings>
  ) => void;

  // Agendamento de Lembretes
  scheduleAppointmentReminders: (
    appointment: Appointment,
    patient: Patient,
    therapist: User
  ) => void;
  scheduleDailyExerciseReminders: (
    patient: Patient,
    prescriptions: Prescription[]
  ) => void;
  schedulePaymentReminder: (
    patient: Patient,
    amount: number,
    dueDate: string
  ) => void;
  scheduleCustomReminder: (
    patient: Patient,
    title: string,
    message: string,
    scheduledFor: Date,
    channels: string[]
  ) => void;

  // Gerenciamento de Lembretes
  cancelScheduledReminder: (reminderId: string) => void;
  markReminderAsRead: (reminderId: string) => void;
  snoozeReminder: (reminderId: string, minutes: number) => void;

  // Analytics e Insights
  generateAnalytics: (
    patientId?: string,
    period?: { start: string; end: string }
  ) => ReminderAnalytics;
  getEngagementInsights: (patientId: string) => SmartReminderInsight[];

  // Monitoramento
  getPendingReminders: (patientId?: string) => ScheduledReminder[];
  getDeliveryLogs: (
    patientId?: string,
    days?: number
  ) => NotificationDeliveryLog[];

  // Configurações Globais
  getGlobalReminderRules: () => ReminderRule[];
  createReminderRule: (rule: Omit<ReminderRule, 'id'>) => ReminderRule;
  updateReminderRule: (ruleId: string, updates: Partial<ReminderRule>) => void;
  deleteReminderRule: (ruleId: string) => void;
}

const ReminderSystemContext = createContext<
  ReminderSystemContextType | undefined
>(undefined);

interface ReminderSystemProviderProps {
  children: ReactNode;
}

export const ReminderSystemProvider: React.FC<ReminderSystemProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  // const { patients, appointments, prescriptions } = useData();

  useEffect(() => {
    // Inicializar sistema de processamento quando o provedor for montado
    console.log('🔔 Sistema de Lembretes Iniciado');

    // Cleanup quando desmonta
    return () => {
      notificationService.stopProcessingLoop();
    };
  }, []);

  // Auto-agendar lembretes quando novos appointments ou prescriptions são criados
  // useEffect(() => {
  //   // Implementar lógica para detectar novos appointments e agendar lembretes automaticamente
  // }, [appointments]);

  // useEffect(() => {
  //   // Implementar lógica para detectar novas prescriptions e agendar lembretes de exercícios
  // }, [prescriptions]);

  const initializePatientSettings = (patient: Patient): ReminderSettings => {
    let settings = notificationService.getReminderSettingsForPatient(
      patient.id
    );

    if (!settings) {
      settings = notificationService.initializePatientReminderSettings(
        patient.id,
        patient.tenantId,
        patient
      );
    }

    return settings;
  };

  const getPatientSettings = (patientId: string): ReminderSettings | null => {
    return notificationService.getReminderSettingsForPatient(patientId);
  };

  const updatePatientSettings = (
    patientId: string,
    updates: Partial<ReminderSettings>
  ): void => {
    notificationService.updateReminderSettings(patientId, updates);
  };

  const scheduleAppointmentReminders = (
    appointment: Appointment,
    patient: Patient,
    therapist: User
  ): void => {
    notificationService.scheduleAppointmentReminders(
      appointment,
      patient,
      therapist
    );
  };

  const scheduleDailyExerciseReminders = (
    patient: Patient,
    prescriptions: Prescription[]
  ): void => {
    notificationService.scheduleDailyExerciseReminders(patient, prescriptions);
  };

  const schedulePaymentReminder = (
    patient: Patient,
    amount: number,
    dueDate: string
  ): void => {
    const settings = getPatientSettings(patient.id);
    if (
      !settings?.globalSettings.enabled ||
      !settings.typeSettings.payment_reminder.enabled
    )
      return;

    const reminderDate = new Date(dueDate);
    reminderDate.setHours(14, 0, 0, 0); // 14:00 do dia do vencimento

    // Programar lembrete
    const reminder = {
      ruleId: 'payment_reminder',
      patientId: patient.id,
      scheduledFor: reminderDate.toISOString(),
      title: 'Pagamento Pendente',
      message: `Olá ${patient.name}! Você tem um pagamento pendente de R$ ${amount.toFixed(2)}. Clique para regularizar sua situação.`,
      channels: settings.typeSettings.payment_reminder.preferredChannels,
      status: 'pending' as const,
      attempts: 0,
      metadata: {
        originalScheduledTime: reminderDate.toISOString(),
        rescheduleCount: 0,
        deliveryDetails: {},
      },
      tenantId: patient.tenantId,
    };

    // Adicionar o lembrete ao serviço
    (notificationService as any).scheduleReminder(reminder);
  };

  const scheduleCustomReminder = (
    patient: Patient,
    title: string,
    message: string,
    scheduledFor: Date,
    channels: string[]
  ): void => {
    const settings = getPatientSettings(patient.id);
    if (!settings?.globalSettings.enabled) return;

    const reminder = {
      ruleId: 'custom',
      patientId: patient.id,
      scheduledFor: scheduledFor.toISOString(),
      title,
      message,
      channels: channels as any[],
      status: 'pending' as const,
      attempts: 0,
      metadata: {
        originalScheduledTime: scheduledFor.toISOString(),
        rescheduleCount: 0,
        deliveryDetails: {},
      },
      tenantId: patient.tenantId,
    };

    (notificationService as any).scheduleReminder(reminder);
  };

  const cancelScheduledReminder = (reminderId: string): void => {
    (notificationService as any).cancelReminder(reminderId);
  };

  const markReminderAsRead = (reminderId: string): void => {
    const reminders = (notificationService as any).scheduledReminders;
    const reminder = reminders.find(
      (r: ScheduledReminder) => r.id === reminderId
    );
    if (reminder) {
      reminder.readAt = new Date().toISOString();
      (notificationService as any).saveReminderData();
    }
  };

  const snoozeReminder = (reminderId: string, minutes: number): void => {
    const reminders = (notificationService as any).scheduledReminders;
    const reminder = reminders.find(
      (r: ScheduledReminder) => r.id === reminderId
    );
    if (reminder && reminder.status === 'pending') {
      const newTime = new Date(reminder.scheduledFor);
      newTime.setMinutes(newTime.getMinutes() + minutes);

      reminder.scheduledFor = newTime.toISOString();
      reminder.metadata.rescheduleCount++;
      (notificationService as any).saveReminderData();
    }
  };

  const generateAnalytics = (
    patientId?: string,
    period?: { start: string; end: string }
  ): ReminderAnalytics => {
    return notificationService.generateReminderAnalytics(
      patientId,
      undefined,
      period
    );
  };

  const getEngagementInsights = (patientId: string): SmartReminderInsight[] => {
    // Implementar lógica de insights baseada nos dados de entrega e resposta
    const analytics = generateAnalytics(patientId);
    const insights: SmartReminderInsight[] = [];

    // Insight sobre melhor horário
    if (analytics.metrics.readRate < 50) {
      insights.push({
        id: `insight_timing_${Date.now()}`,
        patientId,
        type: 'timing_optimization',
        insight: 'Taxa de leitura baixa detectada',
        recommendation:
          'Considere ajustar o horário dos lembretes para períodos com maior engajamento',
        confidence: 75,
        basedOnData: {
          dataPoints: analytics.metrics.totalSent,
          timeFrame: '30 dias',
          patterns: ['Baixa taxa de leitura', 'Horários sub-ótimos'],
        },
        implementationSuggestion: {
          action: 'adjust_timing',
          parameters: {
            suggestedTimes: ['09:00', '14:00', '19:00'],
          },
          expectedImprovement: 25,
        },
        status: 'new',
        createdAt: new Date().toISOString(),
        tenantId: analytics.tenantId,
      });
    }

    // Insight sobre canal preferido
    const bestChannel = Object.entries(
      analytics.metrics.channelPerformance
    ).sort((a, b) => b[1].rate - a[1].rate)[0];

    if (bestChannel && bestChannel[1].rate > 80) {
      insights.push({
        id: `insight_channel_${Date.now()}`,
        patientId,
        type: 'channel_preference',
        insight: `Canal ${bestChannel[0]} apresenta melhor performance`,
        recommendation: `Priorizar uso do canal ${bestChannel[0]} para este paciente`,
        confidence: 85,
        basedOnData: {
          dataPoints: analytics.metrics.totalSent,
          timeFrame: '30 dias',
          patterns: [`Alta performance no canal ${bestChannel[0]}`],
        },
        implementationSuggestion: {
          action: 'prioritize_channel',
          parameters: {
            preferredChannel: bestChannel[0],
          },
          expectedImprovement: 15,
        },
        status: 'new',
        createdAt: new Date().toISOString(),
        tenantId: analytics.tenantId,
      });
    }

    return insights;
  };

  const getPendingReminders = (patientId?: string): ScheduledReminder[] => {
    const allReminders = (notificationService as any)
      .scheduledReminders as ScheduledReminder[];
    return allReminders.filter((r) => {
      const matchesPatient = !patientId || r.patientId === patientId;
      const isPending = r.status === 'pending';
      return matchesPatient && isPending;
    });
  };

  const getDeliveryLogs = (
    patientId?: string,
    days: number = 30
  ): NotificationDeliveryLog[] => {
    const allLogs = (notificationService as any)
      .deliveryLogs as NotificationDeliveryLog[];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allLogs.filter((log) => {
      const matchesPatient = !patientId || log.patientId === patientId;
      const isRecent = new Date(log.timestamp) >= cutoffDate;
      return matchesPatient && isRecent;
    });
  };

  const getGlobalReminderRules = (): ReminderRule[] => {
    return (notificationService as any).reminderRules as ReminderRule[];
  };

  const createReminderRule = (rule: Omit<ReminderRule, 'id'>): ReminderRule => {
    const newRule: ReminderRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const rules = (notificationService as any).reminderRules as ReminderRule[];
    rules.push(newRule);
    (notificationService as any).saveReminderData();

    return newRule;
  };

  const updateReminderRule = (
    ruleId: string,
    updates: Partial<ReminderRule>
  ): void => {
    const rules = (notificationService as any).reminderRules as ReminderRule[];
    const ruleIndex = rules.findIndex((r) => r.id === ruleId);
    if (ruleIndex >= 0) {
      rules[ruleIndex] = {
        ...rules[ruleIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      (notificationService as any).saveReminderData();
    }
  };

  const deleteReminderRule = (ruleId: string): void => {
    const rules = (notificationService as any).reminderRules as ReminderRule[];
    const filteredRules = rules.filter((r) => r.id !== ruleId);
    (notificationService as any).reminderRules = filteredRules;
    (notificationService as any).saveReminderData();
  };

  const value: ReminderSystemContextType = {
    initializePatientSettings,
    getPatientSettings,
    updatePatientSettings,
    scheduleAppointmentReminders,
    scheduleDailyExerciseReminders,
    schedulePaymentReminder,
    scheduleCustomReminder,
    cancelScheduledReminder,
    markReminderAsRead,
    snoozeReminder,
    generateAnalytics,
    getEngagementInsights,
    getPendingReminders,
    getDeliveryLogs,
    getGlobalReminderRules,
    createReminderRule,
    updateReminderRule,
    deleteReminderRule,
  };

  return (
    <ReminderSystemContext.Provider value={value}>
      {children}
    </ReminderSystemContext.Provider>
  );
};

export const useReminderSystem = (): ReminderSystemContextType => {
  const context = useContext(ReminderSystemContext);
  if (!context) {
    throw new Error(
      'useReminderSystem must be used within a ReminderSystemProvider'
    );
  }
  return context;
};

// Hook para uso em componentes específicos de paciente
export const usePatientReminders = (patientId: string) => {
  const reminderSystem = useReminderSystem();

  const patientSettings = reminderSystem.getPatientSettings(patientId);
  const pendingReminders = reminderSystem.getPendingReminders(patientId);
  const deliveryLogs = reminderSystem.getDeliveryLogs(patientId, 7); // últimos 7 dias
  const analytics = reminderSystem.generateAnalytics(patientId);
  const insights = reminderSystem.getEngagementInsights(patientId);

  return {
    settings: patientSettings,
    pendingReminders,
    deliveryLogs,
    analytics,
    insights,
    updateSettings: (updates: Partial<ReminderSettings>) =>
      reminderSystem.updatePatientSettings(patientId, updates),
    scheduleCustomReminder: (
      title: string,
      message: string,
      scheduledFor: Date,
      channels: string[]
    ) =>
      reminderSystem.scheduleCustomReminder(
        { id: patientId } as Patient,
        title,
        message,
        scheduledFor,
        channels
      ),
    markAsRead: reminderSystem.markReminderAsRead,
    snooze: reminderSystem.snoozeReminder,
    cancel: reminderSystem.cancelScheduledReminder,
  };
};

// Hook para administradores visualizarem estatísticas globais
export const useReminderAnalytics = () => {
  const reminderSystem = useReminderSystem();

  const globalAnalytics = reminderSystem.generateAnalytics();
  const allRules = reminderSystem.getGlobalReminderRules();
  const allPendingReminders = reminderSystem.getPendingReminders();
  const recentLogs = reminderSystem.getDeliveryLogs(undefined, 7);

  return {
    analytics: globalAnalytics,
    rules: allRules,
    pendingReminders: allPendingReminders,
    recentLogs,
    createRule: reminderSystem.createReminderRule,
    updateRule: reminderSystem.updateReminderRule,
    deleteRule: reminderSystem.deleteReminderRule,
  };
};

export default useReminderSystem;
