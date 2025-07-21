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

interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  category?: string;
  threadId?: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  imageUrl?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  type:
    | 'appointment'
    | 'reminder'
    | 'exercise'
    | 'message'
    | 'system'
    | 'marketing'
    | 'emergency';
  userId: string;
  tenantId: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  type: PushNotification['type'];
  priority: PushNotification['priority'];
  category?: string;
  sound?: string;
  isActive: boolean;
  triggers: {
    event: string;
    conditions?: Record<string, any>;
    delay?: number; // minutes
  }[];
  personalization: {
    usePatientName?: boolean;
    useTherapistName?: boolean;
    useAppointmentTime?: boolean;
    useCustomFields?: string[];
  };
  scheduling: {
    allowedHours?: { start: number; end: number };
    allowedDays?: number[]; // 0-6 (Sunday-Saturday)
    timezone?: string;
  };
}

interface NotificationSettings {
  enabled: boolean;
  types: {
    appointments: boolean;
    reminders: boolean;
    exercises: boolean;
    messages: boolean;
    system: boolean;
    marketing: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
  sound: boolean;
  badge: boolean;
  preview: boolean;
  frequency: {
    appointments: 'immediate' | '15min' | '30min' | '1hour' | '2hours';
    reminders: 'daily' | 'weekly' | 'monthly';
    exercises: 'immediate' | '1hour' | 'daily';
  };
}

interface PushNotificationsContextType {
  notifications: PushNotification[];
  unreadCount: number;
  settings: NotificationSettings;
  templates: NotificationTemplate[];
  isPermissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (
    notification: Omit<PushNotification, 'id' | 'timestamp' | 'isRead'>
  ) => Promise<boolean>;
  sendTemplateNotification: (
    templateId: string,
    data: Record<string, any>
  ) => Promise<boolean>;
  scheduleNotification: (
    notification: Omit<PushNotification, 'id' | 'timestamp' | 'isRead'>,
    scheduleTime: Date
  ) => Promise<string>;
  cancelScheduledNotification: (notificationId: string) => Promise<boolean>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  createTemplate: (template: Omit<NotificationTemplate, 'id'>) => void;
  updateTemplate: (
    templateId: string,
    template: Partial<NotificationTemplate>
  ) => void;
  deleteTemplate: (templateId: string) => void;
  getNotificationHistory: (days?: number) => PushNotification[];
  getNotificationStats: () => {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    readRate: number;
  };
  registerForPushNotifications: () => Promise<string | null>;
  unregisterFromPushNotifications: () => Promise<boolean>;
}

const PushNotificationsContext = createContext<
  PushNotificationsContextType | undefined
>(undefined);

// Default notification templates
const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'appointment_reminder_24h',
    name: 'Lembrete de Consulta (24h)',
    title: 'Consulta Amanhã',
    body: 'Você tem uma consulta marcada para amanhã às {appointmentTime} com {therapistName}.',
    type: 'appointment',
    priority: 'normal',
    category: 'appointment',
    sound: 'default',
    isActive: true,
    triggers: [
      {
        event: 'appointment_created',
        delay: 1440, // 24 hours before
      },
    ],
    personalization: {
      usePatientName: true,
      useTherapistName: true,
      useAppointmentTime: true,
    },
    scheduling: {
      allowedHours: { start: 8, end: 20 },
      allowedDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
    },
  },
  {
    id: 'appointment_reminder_1h',
    name: 'Lembrete de Consulta (1h)',
    title: 'Consulta em 1 hora',
    body: 'Sua consulta com {therapistName} está marcada para {appointmentTime}. Não se esqueça!',
    type: 'appointment',
    priority: 'high',
    category: 'appointment',
    sound: 'default',
    isActive: true,
    triggers: [
      {
        event: 'appointment_created',
        delay: 60, // 1 hour before
      },
    ],
    personalization: {
      usePatientName: true,
      useTherapistName: true,
      useAppointmentTime: true,
    },
    scheduling: {
      allowedHours: { start: 6, end: 22 },
    },
  },
  {
    id: 'exercise_reminder',
    name: 'Lembrete de Exercícios',
    title: 'Hora dos Exercícios!',
    body: 'Não se esqueça de fazer seus exercícios de fisioterapia hoje.',
    type: 'exercise',
    priority: 'normal',
    category: 'exercise',
    sound: 'default',
    isActive: true,
    triggers: [
      {
        event: 'daily_exercise_reminder',
        delay: 0,
      },
    ],
    personalization: {
      usePatientName: true,
    },
    scheduling: {
      allowedHours: { start: 7, end: 21 },
      allowedDays: [1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'new_message',
    name: 'Nova Mensagem',
    title: 'Nova mensagem de {senderName}',
    body: '{messagePreview}',
    type: 'message',
    priority: 'high',
    category: 'message',
    sound: 'message',
    isActive: true,
    triggers: [
      {
        event: 'message_received',
      },
    ],
    personalization: {
      useCustomFields: ['senderName', 'messagePreview'],
    },
    scheduling: {
      allowedHours: { start: 6, end: 23 },
    },
  },
  {
    id: 'payment_reminder',
    name: 'Lembrete de Pagamento',
    title: 'Pagamento Pendente',
    body: 'Você tem um pagamento pendente de R$ {amount}. Clique para pagar agora.',
    type: 'system',
    priority: 'normal',
    category: 'payment',
    sound: 'default',
    isActive: true,
    triggers: [
      {
        event: 'payment_overdue',
        delay: 1440, // 24 hours after due date
      },
    ],
    personalization: {
      usePatientName: true,
      useCustomFields: ['amount'],
    },
    scheduling: {
      allowedHours: { start: 9, end: 18 },
      allowedDays: [1, 2, 3, 4, 5],
    },
  },
  {
    id: 'welcome_new_patient',
    name: 'Boas-vindas Novo Paciente',
    title: 'Bem-vindo ao FisioFlow!',
    body: 'Olá {patientName}! Seja bem-vindo. Sua primeira consulta está marcada para {appointmentTime}.',
    type: 'system',
    priority: 'normal',
    category: 'welcome',
    sound: 'default',
    isActive: true,
    triggers: [
      {
        event: 'patient_created',
      },
    ],
    personalization: {
      usePatientName: true,
      useAppointmentTime: true,
    },
    scheduling: {
      allowedHours: { start: 8, end: 20 },
    },
  },
];

// Default notification settings
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  types: {
    appointments: true,
    reminders: true,
    exercises: true,
    messages: true,
    system: true,
    marketing: false,
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
  },
  sound: true,
  badge: true,
  preview: true,
  frequency: {
    appointments: '1hour',
    reminders: 'daily',
    exercises: 'daily',
  },
};

interface PushNotificationsProviderProps {
  children: ReactNode;
}

export const PushNotificationsProvider: React.FC<
  PushNotificationsProviderProps
> = ({ children }) => {
  const { user } = useAuth();
  const { saveAuditLog } = useData();
  const { addNotification } = useNotification();
  const { isFeatureEnabled } = useFeatureFlags();

  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [settings, setSettings] =
    useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [templates, setTemplates] =
    useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem(
      'fisioflow_push_notifications'
    );
    const savedSettings = localStorage.getItem(
      'fisioflow_notification_settings'
    );
    const savedTemplates = localStorage.getItem(
      'fisioflow_notification_templates'
    );
    const savedToken = localStorage.getItem('fisioflow_device_token');
    const savedPermission = localStorage.getItem(
      'fisioflow_notification_permission'
    );

    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }

    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }

    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates(DEFAULT_TEMPLATES);
      }
    }

    if (savedToken) {
      setDeviceToken(savedToken);
    }

    if (savedPermission) {
      setIsPermissionGranted(savedPermission === 'granted');
    }
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      'fisioflow_push_notifications',
      JSON.stringify(notifications)
    );
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(
      'fisioflow_notification_settings',
      JSON.stringify(settings)
    );
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(
      'fisioflow_notification_templates',
      JSON.stringify(templates)
    );
  }, [templates]);

  useEffect(() => {
    if (deviceToken) {
      localStorage.setItem('fisioflow_device_token', deviceToken);
    }
  }, [deviceToken]);

  useEffect(() => {
    localStorage.setItem(
      'fisioflow_notification_permission',
      isPermissionGranted ? 'granted' : 'denied'
    );
  }, [isPermissionGranted]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const requestPermission = async (): Promise<boolean> => {
    try {
      // In a real iOS app, this would use the native notification API
      // For web/development, we'll simulate the permission request

      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        setIsPermissionGranted(granted);

        if (granted) {
          addNotification({
            type: 'success',
            title: 'Notificações Ativadas',
            message: 'Você receberá notificações importantes do FisioFlow.',
          });
        }

        return granted;
      }

      // Simulate permission granted for development
      setIsPermissionGranted(true);
      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const registerForPushNotifications = async (): Promise<string | null> => {
    try {
      if (!isPermissionGranted) {
        const granted = await requestPermission();
        if (!granted) return null;
      }

      // In a real iOS app, this would register with APNs
      // For development, we'll generate a mock token
      const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setDeviceToken(mockToken);

      // Log the registration
      if (user) {
        saveAuditLog(
          {
            action: 'push_notifications_registered',
            userId: user.id,
            tenantId: user.tenantId,
            details: {
              deviceToken: mockToken,
              platform: 'ios',
            },
            timestamp: new Date().toISOString(),
          },
          user
        );
      }

      return mockToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  };

  const unregisterFromPushNotifications = async (): Promise<boolean> => {
    try {
      setDeviceToken(null);
      setIsPermissionGranted(false);
      localStorage.removeItem('fisioflow_device_token');

      // Log the unregistration
      if (user) {
        saveAuditLog(
          {
            action: 'push_notifications_unregistered',
            userId: user.id,
            tenantId: user.tenantId,
            details: {
              platform: 'ios',
            },
            timestamp: new Date().toISOString(),
          },
          user
        );
      }

      return true;
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
      return false;
    }
  };

  const isInQuietHours = (): boolean => {
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quietHours.start
      .split(':')
      .map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  };

  const shouldSendNotification = (
    notification: Omit<PushNotification, 'id' | 'timestamp' | 'isRead'>
  ): boolean => {
    if (!settings.enabled || !isPermissionGranted) return false;
    if (!settings.types[notification.type]) return false;
    if (notification.priority !== 'critical' && isInQuietHours()) return false;

    return true;
  };

  const sendNotification = async (
    notification: Omit<PushNotification, 'id' | 'timestamp' | 'isRead'>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      if (!shouldSendNotification(notification)) {
        return false;
      }

      const newNotification: PushNotification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        isRead: false,
        userId: user.id,
        tenantId: user.tenantId,
      };

      // Add to local notifications
      setNotifications((prev) => [newNotification, ...prev]);

      // In a real iOS app, this would send via APNs
      // For web/development, we'll show a browser notification
      if ('Notification' in window && isPermissionGranted) {
        const browserNotification = new Notification(newNotification.title, {
          body: newNotification.body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: newNotification.id,
          data: newNotification.data,
          requireInteraction: newNotification.priority === 'critical',
        });

        browserNotification.onclick = () => {
          if (newNotification.actionUrl) {
            window.open(newNotification.actionUrl, '_blank');
          }
          browserNotification.close();
        };

        // Auto-close after 5 seconds for non-critical notifications
        if (newNotification.priority !== 'critical') {
          setTimeout(() => browserNotification.close(), 5000);
        }
      }

      // Log the notification
      saveAuditLog(
        {
          action: 'push_notification_sent',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            notificationId: newNotification.id,
            type: newNotification.type,
            priority: newNotification.priority,
            title: newNotification.title,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  const sendTemplateNotification = async (
    templateId: string,
    data: Record<string, any>
  ): Promise<boolean> => {
    const template = templates.find((t) => t.id === templateId);
    if (!template || !template.isActive) {
      return false;
    }

    // Replace placeholders in title and body
    let title = template.title;
    let body = template.body;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
    });

    const notification: Omit<PushNotification, 'id' | 'timestamp' | 'isRead'> =
      {
        title,
        body,
        type: template.type,
        priority: template.priority,
        category: template.category,
        sound: template.sound,
        data,
        userId: data.userId || user?.id || '',
        tenantId: data.tenantId || user?.tenantId || '',
      };

    return sendNotification(notification);
  };

  const scheduleNotification = async (
    notification: Omit<PushNotification, 'id' | 'timestamp' | 'isRead'>,
    scheduleTime: Date
  ): Promise<string> => {
    const notificationId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real iOS app, this would use UNUserNotificationCenter
    // For development, we'll use setTimeout
    const delay = scheduleTime.getTime() - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        sendNotification(notification);
      }, delay);
    }

    return notificationId;
  };

  const cancelScheduledNotification = async (
    notificationId: string
  ): Promise<boolean> => {
    try {
      // In a real iOS app, this would cancel the scheduled notification
      // For development, we'll just return true
      return true;
    } catch (error) {
      console.error('Error canceling scheduled notification:', error);
      return false;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const createTemplate = (template: Omit<NotificationTemplate, 'id'>) => {
    const newTemplate: NotificationTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setTemplates((prev) => [...prev, newTemplate]);
  };

  const updateTemplate = (
    templateId: string,
    updates: Partial<NotificationTemplate>
  ) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, ...updates } : t))
    );
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const getNotificationHistory = (days: number = 30): PushNotification[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return notifications
      .filter((n) => new Date(n.timestamp) >= cutoffDate)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  };

  const getNotificationStats = () => {
    const total = notifications.length;
    const byType = notifications.reduce(
      (acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const byPriority = notifications.reduce(
      (acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const readCount = notifications.filter((n) => n.isRead).length;
    const readRate = total > 0 ? (readCount / total) * 100 : 0;

    return {
      total,
      byType,
      byPriority,
      readRate,
    };
  };

  const value: PushNotificationsContextType = {
    notifications,
    unreadCount,
    settings,
    templates,
    isPermissionGranted,
    requestPermission,
    sendNotification,
    sendTemplateNotification,
    scheduleNotification,
    cancelScheduledNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getNotificationHistory,
    getNotificationStats,
    registerForPushNotifications,
    unregisterFromPushNotifications,
  };

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
};

export const usePushNotifications = (): PushNotificationsContextType => {
  const context = useContext(PushNotificationsContext);
  if (!context) {
    throw new Error(
      'usePushNotifications must be used within a PushNotificationsProvider'
    );
  }
  return context;
};

export default usePushNotifications;
export type { PushNotification, NotificationTemplate, NotificationSettings };
