import {
  ReminderRule,
  ScheduledReminder,
  ReminderSettings,
  NotificationDeliveryLog,
  ReminderAnalytics,
  SmartReminderInsight,
  NotificationChannel,
  ReminderType,
  Patient,
  User,
  Appointment,
  Prescription,
} from '../types';

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  newMessages: boolean;
  appointments: boolean;
  exercises: boolean;
  payments: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface EmailNotificationOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

export interface SMSNotificationOptions {
  to: string;
  message: string;
}

export interface WhatsAppNotificationOptions {
  to: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
}

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private permission: NotificationPermission = 'default';
  private reminderRules: ReminderRule[] = [];
  private scheduledReminders: ScheduledReminder[] = [];
  private reminderSettings: ReminderSettings[] = [];
  private deliveryLogs: NotificationDeliveryLog[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
    this.loadReminderData();
    this.startProcessingLoop();
  }

  private async init() {
    // Verifica se o navegador suporta notificações
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações');
      return;
    }

    // Verifica se o navegador suporta Service Workers
    if (!('serviceWorker' in navigator)) {
      console.warn('Este navegador não suporta Service Workers');
      return;
    }

    this.permission = Notification.permission;

    // Registra o Service Worker
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado com sucesso');
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }
  }

  private loadReminderData() {
    try {
      const rules = localStorage.getItem('fisioflow_reminder_rules');
      const scheduled = localStorage.getItem('fisioflow_scheduled_reminders');
      const settings = localStorage.getItem('fisioflow_reminder_settings');
      const logs = localStorage.getItem('fisioflow_delivery_logs');

      if (rules) this.reminderRules = JSON.parse(rules);
      if (scheduled) this.scheduledReminders = JSON.parse(scheduled);
      if (settings) this.reminderSettings = JSON.parse(settings);
      if (logs) this.deliveryLogs = JSON.parse(logs);
    } catch (error) {
      console.error('Erro ao carregar dados de lembretes:', error);
    }
  }

  private saveReminderData() {
    localStorage.setItem(
      'fisioflow_reminder_rules',
      JSON.stringify(this.reminderRules)
    );
    localStorage.setItem(
      'fisioflow_scheduled_reminders',
      JSON.stringify(this.scheduledReminders)
    );
    localStorage.setItem(
      'fisioflow_reminder_settings',
      JSON.stringify(this.reminderSettings)
    );
    localStorage.setItem(
      'fisioflow_delivery_logs',
      JSON.stringify(this.deliveryLogs)
    );
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    if (this.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission;
  }

  async sendNotification(options: PushNotificationOptions): Promise<void> {
    // Verifica permissão
    if (this.permission !== 'granted') {
      console.warn('Permissão de notificação não concedida');
      return;
    }

    // Verifica preferências do usuário
    const preferences = this.getNotificationPreferences();
    if (!preferences.enabled) {
      return;
    }

    try {
      if (this.registration) {
        // Usa Service Worker para notificações
        await this.registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          badge: options.badge || '/favicon.ico',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || !preferences.sound,
          vibrate: preferences.vibration ? [200, 100, 200] : [],
        });
      } else {
        // Fallback para notificações básicas
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || !preferences.sound,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  }

  async sendChatNotification(
    senderName: string,
    message: string,
    chatId: string
  ): Promise<void> {
    const preferences = this.getNotificationPreferences();
    if (!preferences.newMessages) {
      return;
    }

    await this.sendNotification({
      title: `Nova mensagem de ${senderName}`,
      body: message,
      icon: '/icons/chat-icon.png',
      tag: `chat-${chatId}`,
      data: { type: 'chat', chatId, senderName },
      requireInteraction: true,
    });
  }

  async sendAppointmentNotification(
    title: string,
    message: string,
    appointmentId: string,
    type: 'reminder' | 'confirmation' | 'cancellation' = 'reminder'
  ): Promise<void> {
    const preferences = this.getNotificationPreferences();
    if (!preferences.appointments) {
      return;
    }

    await this.sendNotification({
      title,
      body: message,
      icon: '/icons/appointment-icon.png',
      tag: `appointment-${appointmentId}`,
      data: { type: 'appointment', appointmentId, notificationType: type },
      requireInteraction: type !== 'reminder',
    });
  }

  async sendExerciseNotification(
    title: string,
    message: string,
    exerciseId: string
  ): Promise<void> {
    const preferences = this.getNotificationPreferences();
    if (!preferences.exercises) {
      return;
    }

    await this.sendNotification({
      title,
      body: message,
      icon: '/icons/exercise-icon.png',
      tag: `exercise-${exerciseId}`,
      data: { type: 'exercise', exerciseId },
    });
  }

  async sendPaymentNotification(
    title: string,
    message: string,
    transactionId: string
  ): Promise<void> {
    const preferences = this.getNotificationPreferences();
    if (!preferences.payments) {
      return;
    }

    await this.sendNotification({
      title,
      body: message,
      icon: '/icons/payment-icon.png',
      tag: `payment-${transactionId}`,
      data: { type: 'payment', transactionId },
      requireInteraction: true,
    });
  }

  getNotificationPreferences(): NotificationPreferences {
    const stored = localStorage.getItem('notificationPreferences');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Erro ao carregar preferências de notificação:', error);
      }
    }

    // Preferências padrão
    return {
      enabled: true,
      newMessages: true,
      appointments: true,
      exercises: true,
      payments: true,
      sound: true,
      vibration: true,
    };
  }

  setNotificationPreferences(preferences: NotificationPreferences): void {
    localStorage.setItem(
      'notificationPreferences',
      JSON.stringify(preferences)
    );
  }

  async clearNotifications(tag?: string): Promise<void> {
    if (this.registration) {
      const notifications = await this.registration.getNotifications({ tag });
      notifications.forEach((notification) => notification.close());
    }
  }

  async clearChatNotifications(chatId: string): Promise<void> {
    await this.clearNotifications(`chat-${chatId}`);
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  // SISTEMA DE LEMBRETES INTELIGENTES

  // Inicializar configurações padrão para um paciente
  initializePatientReminderSettings(
    patientId: string,
    tenantId: string,
    patient: Patient
  ): ReminderSettings {
    const defaultSettings: ReminderSettings = {
      id: `settings_${patientId}_${Date.now()}`,
      patientId,
      globalSettings: {
        enabled: true,
        preferredChannels: ['push', 'email'],
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '07:00',
        },
        timezone: 'America/Sao_Paulo',
        language: 'pt',
      },
      channelSettings: {
        push: {
          enabled: true,
          sound: true,
          vibration: true,
          showPreview: true,
        },
        email: {
          enabled: true,
          emailAddress: patient.email,
        },
        sms: {
          enabled: false,
          phoneNumber: patient.phone,
        },
        whatsapp: {
          enabled: false,
          phoneNumber: patient.phone,
        },
      },
      typeSettings: {
        exercise_daily: {
          enabled: true,
          preferredChannels: ['push'],
          customTime: '09:00',
          snoozeOptions: [15, 30, 60],
        },
        appointment_24h: {
          enabled: true,
          preferredChannels: ['push', 'email'],
          snoozeOptions: [30, 60, 120],
        },
        appointment_2h: {
          enabled: true,
          preferredChannels: ['push'],
          snoozeOptions: [15, 30],
        },
        medication: {
          enabled: false,
          preferredChannels: ['push'],
          snoozeOptions: [5, 15, 30],
        },
        assessment_followup: {
          enabled: true,
          preferredChannels: ['push', 'email'],
          snoozeOptions: [60, 120, 240],
        },
        payment_reminder: {
          enabled: true,
          preferredChannels: ['email', 'push'],
          snoozeOptions: [240, 480, 720],
        },
        treatment_progress: {
          enabled: true,
          preferredChannels: ['push'],
          snoozeOptions: [30, 60, 120],
        },
        custom: {
          enabled: true,
          preferredChannels: ['push'],
          snoozeOptions: [15, 30, 60],
        },
      },
      smartSettings: {
        adaptiveScheduling: true,
        skipWeekends: false,
        skipHolidays: true,
        consolidateReminders: true,
      },
      updatedAt: new Date().toISOString(),
      tenantId,
    };

    this.reminderSettings.push(defaultSettings);
    this.saveReminderData();
    return defaultSettings;
  }

  // Agendar lembretes de consulta
  scheduleAppointmentReminders(
    appointment: Appointment,
    patient: Patient,
    therapist: User
  ) {
    const settings = this.getReminderSettingsForPatient(patient.id);
    if (!settings?.globalSettings.enabled) return;

    const appointmentDate = new Date(appointment.start);
    const now = new Date();

    // Lembrete 24h antes
    if (settings.typeSettings.appointment_24h.enabled) {
      const reminder24h = new Date(appointmentDate);
      reminder24h.setHours(reminder24h.getHours() - 24);

      if (reminder24h > now) {
        this.scheduleReminder({
          ruleId: 'appointment_24h',
          patientId: patient.id,
          scheduledFor: reminder24h.toISOString(),
          title: 'Consulta Amanhã',
          message: this.personalizeMessage(
            'Olá {patientName}! Você tem uma consulta marcada para amanhã às {appointmentTime} com {therapistName}. Confirme sua presença!',
            {
              patientName: patient.name,
              therapistName: therapist.name,
              appointmentTime: new Date(appointment.start).toLocaleTimeString(
                'pt-BR',
                { hour: '2-digit', minute: '2-digit' }
              ),
              appointmentDate: new Date(appointment.start).toLocaleDateString(
                'pt-BR'
              ),
            }
          ),
          channels: settings.typeSettings.appointment_24h.preferredChannels,
          status: 'pending',
          attempts: 0,
          metadata: {
            originalScheduledTime: reminder24h.toISOString(),
            rescheduleCount: 0,
            deliveryDetails: {},
          },
          tenantId: patient.tenantId,
        });
      }
    }

    // Lembrete 2h antes
    if (settings.typeSettings.appointment_2h.enabled) {
      const reminder2h = new Date(appointmentDate);
      reminder2h.setHours(reminder2h.getHours() - 2);

      if (reminder2h > now) {
        this.scheduleReminder({
          ruleId: 'appointment_2h',
          patientId: patient.id,
          scheduledFor: reminder2h.toISOString(),
          title: 'Consulta em 2 horas',
          message: this.personalizeMessage(
            'Lembrete: Sua consulta com {therapistName} está marcada para {appointmentTime}. Chegue com 15 minutos de antecedência!',
            {
              patientName: patient.name,
              therapistName: therapist.name,
              appointmentTime: new Date(appointment.start).toLocaleTimeString(
                'pt-BR',
                { hour: '2-digit', minute: '2-digit' }
              ),
            }
          ),
          channels: settings.typeSettings.appointment_2h.preferredChannels,
          status: 'pending',
          attempts: 0,
          metadata: {
            originalScheduledTime: reminder2h.toISOString(),
            rescheduleCount: 0,
            deliveryDetails: {},
          },
          tenantId: patient.tenantId,
        });
      }
    }
  }

  // Agendar lembretes de exercícios diários
  scheduleDailyExerciseReminders(
    patient: Patient,
    prescriptions: Prescription[]
  ) {
    const settings = this.getReminderSettingsForPatient(patient.id);
    if (
      !settings?.globalSettings.enabled ||
      !settings.typeSettings.exercise_daily.enabled
    )
      return;

    if (prescriptions.length === 0) return;

    const customTime =
      settings.typeSettings.exercise_daily.customTime || '09:00';
    const [hours, minutes] = customTime.split(':').map(Number);

    // Agendar para os próximos 7 dias
    for (let i = 1; i <= 7; i++) {
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + i);
      reminderDate.setHours(hours, minutes, 0, 0);

      // Verificar se é um dia permitido
      const dayOfWeek = reminderDate.getDay();
      if (
        settings.scheduling?.allowedDays &&
        !settings.scheduling.allowedDays.includes(dayOfWeek)
      ) {
        continue;
      }

      this.scheduleReminder({
        ruleId: 'exercise_daily',
        patientId: patient.id,
        scheduledFor: reminderDate.toISOString(),
        title: 'Hora dos Exercícios!',
        message: this.personalizeMessage(
          'Olá {patientName}! Não se esqueça de fazer seus exercícios de fisioterapia. Você tem {exerciseCount} exercícios prescritos.',
          {
            patientName: patient.name,
            exerciseCount: prescriptions.length.toString(),
          }
        ),
        channels: settings.typeSettings.exercise_daily.preferredChannels,
        status: 'pending',
        attempts: 0,
        metadata: {
          originalScheduledTime: reminderDate.toISOString(),
          rescheduleCount: 0,
          deliveryDetails: {},
        },
        tenantId: patient.tenantId,
      });
    }
  }

  private scheduleReminder(reminder: Omit<ScheduledReminder, 'id'>) {
    const newReminder: ScheduledReminder = {
      ...reminder,
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.scheduledReminders.push(newReminder);
    this.saveReminderData();
  }

  private personalizeMessage(
    template: string,
    data: Record<string, string>
  ): string {
    let message = template;
    Object.entries(data).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return message;
  }

  // Processar lembretes agendados
  async processScheduledReminders(): Promise<void> {
    const now = new Date();
    const pendingReminders = this.scheduledReminders.filter(
      (r) => r.status === 'pending' && new Date(r.scheduledFor) <= now
    );

    for (const reminder of pendingReminders) {
      try {
        await this.sendScheduledReminder(reminder);
      } catch (error) {
        console.error(`Erro ao enviar lembrete ${reminder.id}:`, error);
        this.markReminderAsFailed(
          reminder.id,
          error instanceof Error ? error.message : 'Erro desconhecido'
        );
      }
    }
  }

  private async sendScheduledReminder(
    reminder: ScheduledReminder
  ): Promise<void> {
    const settings = this.getReminderSettingsForPatient(reminder.patientId);
    if (!settings?.globalSettings.enabled) {
      this.cancelReminder(reminder.id);
      return;
    }

    // Verificar horário silencioso
    if (this.isInQuietHours(settings) && !reminder.channels.includes('email')) {
      // Reagendar para após o horário silencioso
      const newTime = this.calculateNextAllowedTime(settings);
      reminder.scheduledFor = newTime.toISOString();
      reminder.metadata.rescheduleCount++;
      this.saveReminderData();
      return;
    }

    const deliveryResults: Record<
      NotificationChannel,
      { sent: boolean; timestamp?: string; error?: string; messageId?: string }
    > = {} as any;

    // Enviar por cada canal
    for (const channel of reminder.channels) {
      if (!settings.channelSettings[channel]?.enabled) continue;

      try {
        const result = await this.sendThroughChannel(
          channel,
          reminder,
          settings
        );
        deliveryResults[channel] = {
          sent: result.success,
          timestamp: new Date().toISOString(),
          messageId: result.messageId,
          error: result.error,
        };

        // Log de entrega
        this.logDelivery({
          reminderId: reminder.id,
          patientId: reminder.patientId,
          channel,
          status: result.success ? 'sent' : 'failed',
          timestamp: new Date().toISOString(),
          messageId: result.messageId,
          errorMessage: result.error,
          metadata: {
            retryCount: reminder.attempts,
          },
          tenantId: reminder.tenantId,
        });
      } catch (error) {
        deliveryResults[channel] = {
          sent: false,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
      }
    }

    // Atualizar status do lembrete
    reminder.status = Object.values(deliveryResults).some((r) => r.sent)
      ? 'sent'
      : 'failed';
    reminder.sentAt =
      reminder.status === 'sent' ? new Date().toISOString() : undefined;
    reminder.attempts++;
    reminder.lastAttempt = new Date().toISOString();
    reminder.metadata.deliveryDetails = deliveryResults;

    this.saveReminderData();
  }

  private async sendThroughChannel(
    channel: NotificationChannel,
    reminder: ScheduledReminder,
    settings: ReminderSettings
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    switch (channel) {
      case 'push':
        return this.sendPushReminder(reminder, settings);
      case 'email':
        return this.sendEmailReminder(reminder, settings);
      case 'sms':
        return this.sendSMSReminder(reminder, settings);
      case 'whatsapp':
        return this.sendWhatsAppReminder(reminder, settings);
      case 'in_app':
        return this.sendInAppReminder(reminder, settings);
      default:
        throw new Error(`Canal não suportado: ${channel}`);
    }
  }

  // Implementações específicas dos canais
  private async sendPushReminder(
    reminder: ScheduledReminder,
    settings: ReminderSettings
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      await this.sendNotification({
        title: reminder.title,
        body: reminder.message,
        icon: '/icons/reminder-icon.png',
        tag: reminder.id,
        data: {
          type: 'reminder',
          reminderId: reminder.id,
          patientId: reminder.patientId,
        },
        requireInteraction: false,
      });

      return {
        success: true,
        messageId: `push_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao enviar push notification',
      };
    }
  }

  private async sendEmailReminder(
    reminder: ScheduledReminder,
    settings: ReminderSettings
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Integração com serviço de email (SendGrid, AWS SES, etc)
      // Por enquanto, simulação
      console.log(
        `📧 Email enviado para ${settings.channelSettings.email.emailAddress}:`,
        {
          title: reminder.title,
          message: reminder.message,
        }
      );

      return {
        success: true,
        messageId: `email_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar email',
      };
    }
  }

  private async sendSMSReminder(
    reminder: ScheduledReminder,
    settings: ReminderSettings
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Integração com gateway SMS
      console.log(
        `📱 SMS enviado para ${settings.channelSettings.sms.phoneNumber}:`,
        reminder.message
      );

      return {
        success: true,
        messageId: `sms_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar SMS',
      };
    }
  }

  private async sendWhatsAppReminder(
    reminder: ScheduledReminder,
    settings: ReminderSettings
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Integração com WhatsApp Business API
      console.log(
        `💬 WhatsApp enviado para ${settings.channelSettings.whatsapp.phoneNumber}:`,
        reminder.message
      );

      return {
        success: true,
        messageId: `whatsapp_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Erro ao enviar WhatsApp',
      };
    }
  }

  private async sendInAppReminder(
    reminder: ScheduledReminder,
    settings: ReminderSettings
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Envio de notificação in-app
      window.dispatchEvent(
        new CustomEvent('fisioflow-reminder', {
          detail: {
            id: reminder.id,
            title: reminder.title,
            message: reminder.message,
            patientId: reminder.patientId,
            timestamp: new Date().toISOString(),
          },
        })
      );

      return {
        success: true,
        messageId: `inapp_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao enviar notificação in-app',
      };
    }
  }

  // Utilitários
  private isInQuietHours(settings: ReminderSettings): boolean {
    if (!settings.globalSettings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.globalSettings.quietHours.start
      .split(':')
      .map(Number);
    const [endHour, endMin] = settings.globalSettings.quietHours.end
      .split(':')
      .map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private calculateNextAllowedTime(settings: ReminderSettings): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [endHour, endMin] = settings.globalSettings.quietHours.end
      .split(':')
      .map(Number);
    tomorrow.setHours(endHour, endMin, 0, 0);

    return tomorrow;
  }

  private markReminderAsFailed(id: string, reason: string) {
    const reminder = this.scheduledReminders.find((r) => r.id === id);
    if (reminder) {
      reminder.status = 'failed';
      reminder.metadata.failureReason = reason;
      this.saveReminderData();
    }
  }

  private cancelReminder(id: string) {
    const reminder = this.scheduledReminders.find((r) => r.id === id);
    if (reminder) {
      reminder.status = 'cancelled';
      this.saveReminderData();
    }
  }

  private logDelivery(log: Omit<NotificationDeliveryLog, 'id'>) {
    const newLog: NotificationDeliveryLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.deliveryLogs.push(newLog);

    // Manter apenas os logs dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.deliveryLogs = this.deliveryLogs.filter(
      (log) => new Date(log.timestamp) >= thirtyDaysAgo
    );

    this.saveReminderData();
  }

  // Métodos públicos para gerenciar configurações
  getReminderSettingsForPatient(patientId: string): ReminderSettings | null {
    return this.reminderSettings.find((s) => s.patientId === patientId) || null;
  }

  updateReminderSettings(
    patientId: string,
    updates: Partial<ReminderSettings>
  ) {
    const settingsIndex = this.reminderSettings.findIndex(
      (s) => s.patientId === patientId
    );
    if (settingsIndex >= 0) {
      this.reminderSettings[settingsIndex] = {
        ...this.reminderSettings[settingsIndex],
        ...updates,
      };
      this.reminderSettings[settingsIndex].updatedAt = new Date().toISOString();
      this.saveReminderData();
    }
  }

  // Iniciar loop de processamento
  private startProcessingLoop() {
    // Processar lembretes a cada minuto
    this.processingInterval = setInterval(() => {
      this.processScheduledReminders();
    }, 60000);

    // Processar imediatamente
    this.processScheduledReminders();
  }

  // Parar loop de processamento
  stopProcessingLoop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Gerar analytics
  generateReminderAnalytics(
    patientId?: string,
    ruleId?: string,
    period?: { start: string; end: string }
  ): ReminderAnalytics {
    const now = new Date();
    const defaultPeriod = {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    };

    const analysisPeriod = period || defaultPeriod;

    let relevantReminders = this.scheduledReminders.filter((r) => {
      const reminderDate = new Date(r.scheduledFor);
      return (
        reminderDate >= new Date(analysisPeriod.start) &&
        reminderDate <= new Date(analysisPeriod.end)
      );
    });

    if (patientId) {
      relevantReminders = relevantReminders.filter(
        (r) => r.patientId === patientId
      );
    }

    if (ruleId) {
      relevantReminders = relevantReminders.filter((r) => r.ruleId === ruleId);
    }

    const totalScheduled = relevantReminders.length;
    const totalSent = relevantReminders.filter(
      (r) => r.status === 'sent'
    ).length;
    const totalFailed = relevantReminders.filter(
      (r) => r.status === 'failed'
    ).length;
    const totalRead = relevantReminders.filter((r) => r.readAt).length;

    const deliveryRate =
      totalScheduled > 0 ? (totalSent / totalScheduled) * 100 : 0;
    const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

    // Calcular performance por canal
    const channelPerformance: Record<NotificationChannel, any> = {
      push: { sent: 0, delivered: 0, read: 0, failed: 0, rate: 0 },
      email: { sent: 0, delivered: 0, read: 0, failed: 0, rate: 0 },
      sms: { sent: 0, delivered: 0, read: 0, failed: 0, rate: 0 },
      whatsapp: { sent: 0, delivered: 0, read: 0, failed: 0, rate: 0 },
      in_app: { sent: 0, delivered: 0, read: 0, failed: 0, rate: 0 },
    };

    relevantReminders.forEach((reminder) => {
      reminder.channels.forEach((channel) => {
        const delivery = reminder.metadata.deliveryDetails?.[channel];
        if (delivery?.sent) {
          channelPerformance[channel].sent++;
          channelPerformance[channel].delivered++;
        } else {
          channelPerformance[channel].failed++;
        }
      });
    });

    // Calcular rates
    Object.keys(channelPerformance).forEach((channel) => {
      const ch = channelPerformance[channel as NotificationChannel];
      const total = ch.sent + ch.failed;
      ch.rate = total > 0 ? (ch.sent / total) * 100 : 0;
    });

    return {
      id: `analytics_${Date.now()}`,
      patientId,
      ruleId,
      period: analysisPeriod,
      metrics: {
        totalScheduled,
        totalSent,
        totalDelivered: totalSent,
        totalRead,
        totalFailed,
        deliveryRate,
        readRate,
        responseRate: readRate,
        averageResponseTime: 0,
        channelPerformance,
        timeSlotPerformance: {},
        patientEngagement: {
          highEngagement: 0,
          mediumEngagement: 0,
          lowEngagement: 0,
          noEngagement: 0,
        },
      },
      generatedAt: new Date().toISOString(),
      tenantId: relevantReminders[0]?.tenantId || '',
    };
  }

  // Simula recebimento de notificações push do servidor
  simulateIncomingNotifications(): void {
    // Para desenvolvimento - simula notificações periódicas
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const random = Math.random();

        if (random < 0.3) {
          this.sendChatNotification(
            'Dr. Silva',
            'Como está se sentindo hoje?',
            'chat-demo'
          );
        } else if (random < 0.6) {
          this.sendExerciseNotification(
            'Lembrete de Exercício',
            'Não se esqueça de fazer seus exercícios de hoje!',
            'exercise-demo'
          );
        } else if (random < 0.8) {
          this.sendAppointmentNotification(
            'Consulta Amanhã',
            'Sua consulta com Dr. Silva é amanhã às 14:00',
            'appointment-demo',
            'reminder'
          );
        }
      }, 60000); // A cada minuto para demonstração
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();

export default notificationService;
