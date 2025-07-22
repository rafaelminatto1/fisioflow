import { SystemEvent } from '../hooks/useSystemEvents';
import {
  Patient,
  Appointment,
  Task,
  Assessment,
  Transaction,
  User,
  ClinicalCase,
  ClinicalProtocol,
  MentorshipSession,
  Equipment,
  OperationalAlert,
} from '../types';

export interface CrossModuleNotification {
  id: string;
  type: 'patient_action' | 'appointment_reminder' | 'task_assignment' | 'protocol_update' | 'mentorship_update' | 'financial_alert' | 'equipment_alert' | 'quality_alert';
  sourceModule: string;
  targetModules: string[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  recipientId?: string;
  recipientRole?: string;
  timestamp: string;
  isRead: boolean;
  expiresAt?: string;
  requiresAcknowledgment?: boolean;
  acknowledged?: boolean;
  tenantId: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  sourceModule: string;
  targetModules: string[];
  triggerEvent: string;
  conditions?: Record<string, any>;
  template: {
    title: string;
    message: string;
    priority: CrossModuleNotification['priority'];
    actionUrl?: string;
  };
  recipients: {
    roles?: string[];
    specificUsers?: string[];
    conditions?: Record<string, any>;
  };
  isActive: boolean;
  tenantId: string;
}

export class CrossModuleNotificationService {
  private static notifications: CrossModuleNotification[] = [];
  private static rules: NotificationRule[] = [];
  private static subscribers: Map<string, Array<(notification: CrossModuleNotification) => void>> = new Map();

  /**
   * Inicializa regras padrão de notificação
   */
  static initializeDefaultRules(tenantId: string): void {
    const defaultRules: Omit<NotificationRule, 'id' | 'tenantId'>[] = [
      // Patient Module Notifications
      {
        name: 'Novo Paciente Cadastrado',
        sourceModule: 'patients',
        targetModules: ['appointments', 'tasks', 'mentorship'],
        triggerEvent: 'patient_created',
        template: {
          title: 'Novo Paciente Cadastrado',
          message: 'O paciente {{patientName}} foi cadastrado e está disponível para agendamento.',
          priority: 'normal',
          actionUrl: '/patients/{{patientId}}',
        },
        recipients: {
          roles: ['fisioterapeuta', 'admin'],
        },
        isActive: true,
      },
      {
        name: 'Paciente Próximo ao Abandono',
        sourceModule: 'patients',
        targetModules: ['mentorship', 'management'],
        triggerEvent: 'patient_abandonment_risk',
        template: {
          title: 'Alerta: Risco de Abandono',
          message: 'O paciente {{patientName}} apresenta alto risco de abandono do tratamento.',
          priority: 'high',
          actionUrl: '/patients/{{patientId}}',
        },
        recipients: {
          roles: ['fisioterapeuta', 'admin'],
        },
        isActive: true,
      },
      
      // Appointment Module Notifications
      {
        name: 'Consulta Agendada',
        sourceModule: 'appointments',
        targetModules: ['patients', 'tasks'],
        triggerEvent: 'appointment_created',
        template: {
          title: 'Nova Consulta Agendada',
          message: 'Consulta agendada para {{patientName}} em {{appointmentDate}}.',
          priority: 'normal',
          actionUrl: '/appointments',
        },
        recipients: {
          roles: ['fisioterapeuta', 'estagiario'],
        },
        isActive: true,
      },
      {
        name: 'Lembrete de Consulta',
        sourceModule: 'appointments',
        targetModules: ['patients'],
        triggerEvent: 'appointment_reminder',
        template: {
          title: 'Lembrete de Consulta',
          message: 'Você tem uma consulta agendada para hoje às {{appointmentTime}}.',
          priority: 'high',
          actionUrl: '/patient-portal',
        },
        recipients: {
          roles: ['paciente'],
        },
        isActive: true,
      },
      
      // Task Module Notifications
      {
        name: 'Nova Tarefa Atribuída',
        sourceModule: 'tasks',
        targetModules: ['mentorship', 'patients'],
        triggerEvent: 'task_assigned',
        template: {
          title: 'Nova Tarefa Atribuída',
          message: 'Uma nova tarefa foi atribuída: {{taskTitle}}',
          priority: 'normal',
          actionUrl: '/tasks/{{taskId}}',
        },
        recipients: {
          roles: ['estagiario', 'fisioterapeuta'],
        },
        isActive: true,
      },
      {
        name: 'Tarefa Vencida',
        sourceModule: 'tasks',
        targetModules: ['mentorship', 'management'],
        triggerEvent: 'task_overdue',
        template: {
          title: 'Tarefa Vencida',
          message: 'A tarefa "{{taskTitle}}" está vencida desde {{overdueDate}}.',
          priority: 'high',
          actionUrl: '/tasks/{{taskId}}',
        },
        recipients: {
          roles: ['fisioterapeuta', 'admin'],
        },
        isActive: true,
      },
      
      // Protocol Module Notifications
      {
        name: 'Protocolo Atualizado',
        sourceModule: 'protocols',
        targetModules: ['patients', 'mentorship'],
        triggerEvent: 'protocol_updated',
        template: {
          title: 'Protocolo Atualizado',
          message: 'O protocolo "{{protocolName}}" foi atualizado com novas evidências.',
          priority: 'normal',
          actionUrl: '/protocols/{{protocolId}}',
        },
        recipients: {
          roles: ['fisioterapeuta', 'estagiario'],
        },
        isActive: true,
      },
      
      // Financial Module Notifications
      {
        name: 'Pagamento Recebido',
        sourceModule: 'financial',
        targetModules: ['patients', 'management'],
        triggerEvent: 'payment_received',
        template: {
          title: 'Pagamento Recebido',
          message: 'Pagamento de R$ {{amount}} recebido do paciente {{patientName}}.',
          priority: 'low',
          actionUrl: '/financial/transactions',
        },
        recipients: {
          roles: ['admin', 'fisioterapeuta'],
        },
        isActive: true,
      },
      {
        name: 'Pagamento Pendente',
        sourceModule: 'financial',
        targetModules: ['patients', 'management'],
        triggerEvent: 'payment_overdue',
        template: {
          title: 'Pagamento Pendente',
          message: 'Pagamento de {{patientName}} está {{daysPending}} dias em atraso.',
          priority: 'high',
          actionUrl: '/financial/transactions',
        },
        recipients: {
          roles: ['admin'],
        },
        isActive: true,
      },
      
      // Equipment Module Notifications
      {
        name: 'Manutenção de Equipamento',
        sourceModule: 'equipment',
        targetModules: ['appointments', 'management'],
        triggerEvent: 'equipment_maintenance_due',
        template: {
          title: 'Manutenção Programada',
          message: 'O equipamento {{equipmentName}} precisa de manutenção em {{maintenanceDate}}.',
          priority: 'normal',
          actionUrl: '/equipment/{{equipmentId}}',
        },
        recipients: {
          roles: ['admin', 'fisioterapeuta'],
        },
        isActive: true,
      },
      
      // Mentorship Module Notifications
      {
        name: 'Sessão de Mentoria Agendada',
        sourceModule: 'mentorship',
        targetModules: ['tasks', 'education'],
        triggerEvent: 'mentorship_session_scheduled',
        template: {
          title: 'Sessão de Mentoria Agendada',
          message: 'Sessão de mentoria agendada para {{sessionDate}} com {{mentorName}}.',
          priority: 'normal',
          actionUrl: '/mentorship/sessions/{{sessionId}}',
        },
        recipients: {
          roles: ['estagiario'],
        },
        isActive: true,
      },
    ];

    this.rules = defaultRules.map(rule => ({
      ...rule,
      id: crypto.randomUUID(),
      tenantId,
    }));
  }

  /**
   * Processa evento do sistema e gera notificações cross-module
   */
  static processSystemEvent(event: SystemEvent): void {
    const applicableRules = this.rules.filter(
      rule => 
        rule.sourceModule === event.module &&
        rule.triggerEvent === event.action &&
        rule.isActive &&
        rule.tenantId === event.tenantId
    );

    applicableRules.forEach(rule => {
      this.generateNotificationFromRule(rule, event);
    });
  }

  /**
   * Gera notificação baseada em regra e evento
   */
  private static generateNotificationFromRule(rule: NotificationRule, event: SystemEvent): void {
    // Apply template variables
    let title = rule.template.title;
    let message = rule.template.message;
    let actionUrl = rule.template.actionUrl;

    // Replace template variables with event data
    if (event.metadata) {
      Object.entries(event.metadata).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        title = title.replace(placeholder, String(value));
        message = message.replace(placeholder, String(value));
        if (actionUrl) {
          actionUrl = actionUrl.replace(placeholder, String(value));
        }
      });
    }

    const notification: CrossModuleNotification = {
      id: crypto.randomUUID(),
      type: this.mapEventToNotificationType(event.action),
      sourceModule: rule.sourceModule,
      targetModules: rule.targetModules,
      priority: rule.template.priority,
      title,
      message,
      data: event.metadata,
      actionUrl,
      timestamp: new Date().toISOString(),
      isRead: false,
      tenantId: event.tenantId,
      requiresAcknowledgment: rule.template.priority === 'critical',
      acknowledged: false,
    };

    // Determine recipients
    if (rule.recipients.specificUsers) {
      rule.recipients.specificUsers.forEach(userId => {
        this.addNotification({ ...notification, recipientId: userId });
      });
    }

    if (rule.recipients.roles) {
      rule.recipients.roles.forEach(role => {
        this.addNotification({ ...notification, recipientRole: role });
      });
    }

    // If no specific recipients, add as general notification
    if (!rule.recipients.specificUsers && !rule.recipients.roles) {
      this.addNotification(notification);
    }
  }

  /**
   * Mapeia ação do evento para tipo de notificação
   */
  private static mapEventToNotificationType(action: string): CrossModuleNotification['type'] {
    const mapping: Record<string, CrossModuleNotification['type']> = {
      'patient_created': 'patient_action',
      'patient_updated': 'patient_action',
      'patient_abandonment_risk': 'patient_action',
      'appointment_created': 'appointment_reminder',
      'appointment_reminder': 'appointment_reminder',
      'task_assigned': 'task_assignment',
      'task_overdue': 'task_assignment',
      'protocol_updated': 'protocol_update',
      'mentorship_session_scheduled': 'mentorship_update',
      'payment_received': 'financial_alert',
      'payment_overdue': 'financial_alert',
      'equipment_maintenance_due': 'equipment_alert',
    };

    return mapping[action] || 'patient_action';
  }

  /**
   * Adiciona nova notificação
   */
  static addNotification(notification: CrossModuleNotification): void {
    this.notifications.push(notification);
    
    // Notify subscribers
    notification.targetModules.forEach(module => {
      const moduleSubscribers = this.subscribers.get(module) || [];
      moduleSubscribers.forEach(callback => callback(notification));
    });

    // Store in localStorage
    this.saveToStorage();
  }

  /**
   * Obtém notificações por módulo
   */
  static getNotificationsByModule(
    module: string,
    tenantId: string,
    recipientId?: string,
    recipientRole?: string
  ): CrossModuleNotification[] {
    return this.notifications.filter(notification => 
      notification.targetModules.includes(module) &&
      notification.tenantId === tenantId &&
      (!recipientId || notification.recipientId === recipientId || !notification.recipientId) &&
      (!recipientRole || notification.recipientRole === recipientRole || !notification.recipientRole)
    );
  }

  /**
   * Marca notificação como lida
   */
  static markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveToStorage();
    }
  }

  /**
   * Marca notificação como reconhecida
   */
  static acknowledgeNotification(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.acknowledged = true;
      notification.isRead = true;
      this.saveToStorage();
    }
  }

  /**
   * Remove notificações expiradas
   */
  static cleanExpiredNotifications(): void {
    const now = new Date();
    this.notifications = this.notifications.filter(notification => {
      if (!notification.expiresAt) return true;
      return new Date(notification.expiresAt) > now;
    });
    this.saveToStorage();
  }

  /**
   * Subscreve a notificações de um módulo
   */
  static subscribe(module: string, callback: (notification: CrossModuleNotification) => void): () => void {
    if (!this.subscribers.has(module)) {
      this.subscribers.set(module, []);
    }
    
    const moduleSubscribers = this.subscribers.get(module)!;
    moduleSubscribers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = moduleSubscribers.indexOf(callback);
      if (index > -1) {
        moduleSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Cria notificação manual
   */
  static createManualNotification(
    notification: Omit<CrossModuleNotification, 'id' | 'timestamp' | 'isRead' | 'acknowledged'>
  ): void {
    this.addNotification({
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      isRead: false,
      acknowledged: false,
    });
  }

  /**
   * Obtém estatísticas de notificações
   */
  static getNotificationStats(tenantId: string): {
    total: number;
    unread: number;
    byPriority: Record<string, number>;
    byModule: Record<string, number>;
  } {
    const tenantNotifications = this.notifications.filter(n => n.tenantId === tenantId);
    
    return {
      total: tenantNotifications.length,
      unread: tenantNotifications.filter(n => !n.isRead).length,
      byPriority: tenantNotifications.reduce((acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byModule: tenantNotifications.reduce((acc, n) => {
        n.targetModules.forEach(module => {
          acc[module] = (acc[module] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Adiciona nova regra de notificação
   */
  static addNotificationRule(rule: Omit<NotificationRule, 'id'>): void {
    this.rules.push({
      ...rule,
      id: crypto.randomUUID(),
    });
    this.saveToStorage();
  }

  /**
   * Atualiza regra de notificação
   */
  static updateNotificationRule(ruleId: string, updates: Partial<NotificationRule>): void {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex > -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
      this.saveToStorage();
    }
  }

  /**
   * Remove regra de notificação
   */
  static removeNotificationRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.saveToStorage();
  }

  /**
   * Obtém todas as regras
   */
  static getNotificationRules(tenantId: string): NotificationRule[] {
    return this.rules.filter(r => r.tenantId === tenantId);
  }

  /**
   * Salva dados no localStorage
   */
  private static saveToStorage(): void {
    try {
      localStorage.setItem('fisioflow_cross_notifications', JSON.stringify(this.notifications));
      localStorage.setItem('fisioflow_notification_rules', JSON.stringify(this.rules));
    } catch (error) {
      console.error('Error saving cross-module notifications to storage:', error);
    }
  }

  /**
   * Carrega dados do localStorage
   */
  static loadFromStorage(): void {
    try {
      const notificationsData = localStorage.getItem('fisioflow_cross_notifications');
      if (notificationsData) {
        this.notifications = JSON.parse(notificationsData);
      }

      const rulesData = localStorage.getItem('fisioflow_notification_rules');
      if (rulesData) {
        this.rules = JSON.parse(rulesData);
      }
    } catch (error) {
      console.error('Error loading cross-module notifications from storage:', error);
    }
  }

  /**
   * Inicializa o serviço
   */
  static initialize(tenantId: string): void {
    this.loadFromStorage();
    
    // Se não há regras carregadas, inicializa com regras padrão
    if (this.rules.length === 0) {
      this.initializeDefaultRules(tenantId);
    }

    // Limpa notificações expiradas
    this.cleanExpiredNotifications();
  }
}

export default CrossModuleNotificationService;