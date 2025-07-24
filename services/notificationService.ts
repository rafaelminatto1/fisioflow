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

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.init();
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

  async sendChatNotification(senderName: string, message: string, chatId: string): Promise<void> {
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
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  }

  async clearNotifications(tag?: string): Promise<void> {
    if (this.registration) {
      const notifications = await this.registration.getNotifications({ tag });
      notifications.forEach(notification => notification.close());
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