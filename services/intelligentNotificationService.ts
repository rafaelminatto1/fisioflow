/**
 * Sistema de Notificações Inteligentes
 * Gerencia notificações personalizadas, lembretes automáticos e alertas contextuais
 */

import { auditLogger, AuditAction, LegalBasis } from './auditLogger';
import { secureAIService } from './secureAIService';

// === INTERFACES ===
interface NotificationRule {
  id: string;
  name: string;
  description: string;
  
  // Trigger conditions
  triggers: NotificationTrigger[];
  
  // Target settings
  targetType: 'all_users' | 'role_based' | 'specific_users' | 'patient_related';
  targetRoles?: string[];
  targetUsers?: string[];
  
  // Content
  title: string;
  message: string;
  category: 'appointment' | 'treatment' | 'system' | 'reminder' | 'alert' | 'marketing';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Behavior
  channels: NotificationChannel[];
  frequency: 'once' | 'daily' | 'weekly' | 'per_trigger';
  cooldownMinutes: number; // Prevent spam
  
  // Personalization
  personalized: boolean;
  aiEnhanced: boolean;
  
  // Lifecycle
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  tenantId: string;
}

interface NotificationTrigger {
  type: 'time_based' | 'event_based' | 'condition_based' | 'ai_predicted';
  
  // Time-based triggers
  scheduleType?: 'fixed_time' | 'relative_time' | 'recurring';
  fixedTime?: string; // HH:mm
  relativeTime?: {
    amount: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks';
    before: boolean; // true = before event, false = after
    referenceEvent: 'appointment' | 'treatment_end' | 'assessment_due';
  };
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    days?: number[]; // For weekly: 0-6, for monthly: 1-31
    time: string; // HH:mm
  };
  
  // Event-based triggers
  eventType?: 'appointment_created' | 'appointment_cancelled' | 'patient_no_show' | 
            'treatment_completed' | 'payment_overdue' | 'system_error';
  
  // Condition-based triggers
  conditions?: NotificationCondition[];
  
  // AI prediction triggers
  aiModel?: 'abandonment_risk' | 'outcome_prediction' | 'scheduling_optimization';
  threshold?: number; // 0-1 confidence threshold
}

interface NotificationCondition {
  field: string; // e.g., 'patient.lastVisit', 'appointment.status'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface NotificationChannel {
  type: 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
  enabled: boolean;
  settings?: {
    template?: string;
    priority?: 'high' | 'normal' | 'low';
    sound?: boolean;
    vibrate?: boolean;
  };
}

interface QueuedNotification {
  id: string;
  ruleId: string;
  
  // Recipients
  recipientType: 'user' | 'patient';
  recipientId: string;
  recipientName: string; // Cache for performance
  
  // Content (can be personalized)
  title: string;
  message: string;
  category: string;
  priority: string;
  
  // Metadata
  data?: Record<string, any>;
  channels: NotificationChannel[];
  
  // Delivery
  scheduledFor: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
  
  // Context
  contextType?: 'appointment' | 'patient' | 'treatment' | 'system';
  contextId?: string;
  
  // Tracking
  opened: boolean;
  openedAt?: string;
  actionTaken?: string;
  
  createdAt: string;
  tenantId: string;
}

interface NotificationStats {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  actionRate: number;
  
  byCategory: Record<string, {
    sent: number;
    delivered: number;
    opened: number;
    actions: number;
  }>;
  
  byChannel: Record<string, {
    sent: number;
    delivered: number;
    opened: number;
  }>;
  
  engagement: {
    averageTimeToOpen: number;
    bestPerformingTime: { hour: number; rate: number };
    bestPerformingDay: { day: string; rate: number };
  };
}

interface PersonalizationContext {
  userId: string;
  userRole: string;
  preferences: {
    language: string;
    timezone: string;
    quietHours: { start: string; end: string };
  };
  
  // Behavioral data
  loginFrequency: number;
  avgSessionDuration: number;
  preferredFeatures: string[];
  
  // Clinical context (for patients)
  currentTreatments?: string[];
  nextAppointment?: {
    date: string;
    therapist: string;
    type: string;
  };
  
  // Professional context (for staff)
  specializations?: string[];
  patientLoad?: number;
  schedule?: any;
}

// === CLASSE PRINCIPAL ===
class IntelligentNotificationService {
  private rules: Map<string, NotificationRule> = new Map();
  private queue: QueuedNotification[] = [];
  private deliveryStats: Map<string, any> = new Map();
  private aiPersonalizationEnabled = true;
  
  constructor() {
    this.initialize();
  }

  /**
   * Inicializar o serviço
   */
  private async initialize(): Promise<void> {
    await this.loadRules();
    await this.loadQueue();
    this.setupDefaultRules();
    this.startProcessingQueue();
    
    console.log('🔔 Intelligent Notification Service inicializado');
  }

  /**
   * Criar regra de notificação
   */
  async createRule(rule: Omit<NotificationRule, 'id' | 'createdAt'>): Promise<string> {
    const ruleId = this.generateRuleId();
    const fullRule: NotificationRule = {
      ...rule,
      id: ruleId,
      createdAt: new Date().toISOString(),
    };

    this.rules.set(ruleId, fullRule);
    await this.saveRules();

    console.log(`📝 Regra de notificação criada: ${rule.name}`);
    
    // Log de auditoria
    await auditLogger.logAction(
      rule.tenantId,
      rule.createdBy,
      'USER',
      AuditAction.CREATE,
      'notification_rule',
      ruleId,
      {
        entityName: rule.name,
        legalBasis: LegalBasis.LEGITIMATE_INTEREST,
        dataAccessed: ['notification_settings'],
        metadata: {
          category: rule.category,
          priority: rule.priority,
          aiEnhanced: rule.aiEnhanced,
        },
      }
    );

    return ruleId;
  }

  /**
   * Processar triggers e gerar notificações
   */
  async processTriggers(tenantId: string): Promise<void> {
    const activeRules = Array.from(this.rules.values())
      .filter(rule => rule.isActive && rule.tenantId === tenantId);

    for (const rule of activeRules) {
      await this.processRule(rule);
    }
  }

  /**
   * Enviar notificação manual
   */
  async sendNotification(
    recipientId: string,
    recipientType: 'user' | 'patient',
    notification: {
      title: string;
      message: string;
      category: string;
      priority?: string;
      channels?: NotificationChannel[];
      data?: Record<string, any>;
    },
    tenantId: string
  ): Promise<string> {
    const notificationId = this.generateNotificationId();
    
    const queuedNotification: QueuedNotification = {
      id: notificationId,
      ruleId: 'manual',
      recipientType,
      recipientId,
      recipientName: await this.getRecipientName(recipientId, recipientType),
      title: notification.title,
      message: notification.message,
      category: notification.category,
      priority: notification.priority || 'medium',
      data: notification.data,
      channels: notification.channels || [{ type: 'in_app', enabled: true }],
      scheduledFor: new Date().toISOString(),
      status: 'pending',
      opened: false,
      createdAt: new Date().toISOString(),
      tenantId,
    };

    // Personalizar se habilitado
    if (this.aiPersonalizationEnabled) {
      await this.personalizeNotification(queuedNotification);
    }

    this.queue.push(queuedNotification);
    await this.saveQueue();

    console.log(`🔔 Notificação manual enfileirada: ${notification.title}`);
    return notificationId;
  }

  /**
   * Marcar notificação como aberta
   */
  async markAsOpened(notificationId: string): Promise<void> {
    const notification = this.queue.find(n => n.id === notificationId);
    if (!notification) return;

    notification.opened = true;
    notification.openedAt = new Date().toISOString();
    
    await this.saveQueue();
    this.updateDeliveryStats(notification);

    console.log(`👁️ Notificação aberta: ${notificationId}`);
  }

  /**
   * Registrar ação da notificação
   */
  async recordAction(notificationId: string, action: string): Promise<void> {
    const notification = this.queue.find(n => n.id === notificationId);
    if (!notification) return;

    notification.actionTaken = action;
    
    await this.saveQueue();
    this.updateDeliveryStats(notification);

    console.log(`✅ Ação registrada: ${action} para ${notificationId}`);
  }

  /**
   * Obter notificações para usuário
   */
  getNotificationsForUser(
    userId: string, 
    filters: {
      unreadOnly?: boolean;
      category?: string;
      limit?: number;
      since?: string;
    } = {}
  ): QueuedNotification[] {
    let notifications = this.queue.filter(n => 
      n.recipientId === userId && n.recipientType === 'user'
    );

    if (filters.unreadOnly) {
      notifications = notifications.filter(n => !n.opened);
    }

    if (filters.category) {
      notifications = notifications.filter(n => n.category === filters.category);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      notifications = notifications.filter(n => 
        new Date(n.createdAt) > sinceDate
      );
    }

    // Ordem: urgente primeiro, depois por data
    notifications.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return notifications.slice(0, filters.limit || 50);
  }

  /**
   * Obter estatísticas de notificações
   */
  getNotificationStats(tenantId: string, timeframe: 'day' | 'week' | 'month' = 'week'): NotificationStats {
    const now = Date.now();
    const timeframes = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    
    const cutoff = now - timeframes[timeframe];
    const notifications = this.queue.filter(n => 
      n.tenantId === tenantId && 
      new Date(n.createdAt).getTime() > cutoff
    );

    const totalSent = notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length;
    const totalDelivered = notifications.filter(n => n.status === 'delivered').length;
    const totalOpened = notifications.filter(n => n.opened).length;
    const totalActions = notifications.filter(n => n.actionTaken).length;

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const actionRate = totalOpened > 0 ? (totalActions / totalOpened) * 100 : 0;

    // Stats by category
    const byCategory: Record<string, any> = {};
    notifications.forEach(n => {
      if (!byCategory[n.category]) {
        byCategory[n.category] = { sent: 0, delivered: 0, opened: 0, actions: 0 };
      }
      
      if (n.status === 'sent' || n.status === 'delivered') byCategory[n.category].sent++;
      if (n.status === 'delivered') byCategory[n.category].delivered++;
      if (n.opened) byCategory[n.category].opened++;
      if (n.actionTaken) byCategory[n.category].actions++;
    });

    // Stats by channel
    const byChannel: Record<string, any> = {};
    notifications.forEach(n => {
      n.channels.forEach(channel => {
        if (!byChannel[channel.type]) {
          byChannel[channel.type] = { sent: 0, delivered: 0, opened: 0 };
        }
        
        if (n.status === 'sent' || n.status === 'delivered') byChannel[channel.type].sent++;
        if (n.status === 'delivered') byChannel[channel.type].delivered++;
        if (n.opened) byChannel[channel.type].opened++;
      });
    });

    // Engagement analysis
    const openTimes = notifications
      .filter(n => n.openedAt)
      .map(n => new Date(n.openedAt!).getHours());
    
    const bestHour = this.getMostFrequent(openTimes);
    const bestDay = this.getMostFrequent(
      notifications
        .filter(n => n.openedAt)
        .map(n => new Date(n.openedAt!).toLocaleDateString('pt-BR', { weekday: 'long' }))
    );

    return {
      totalSent,
      deliveryRate,
      openRate,
      actionRate,
      byCategory,
      byChannel,
      engagement: {
        averageTimeToOpen: this.calculateAverageTimeToOpen(notifications),
        bestPerformingTime: { hour: bestHour.value || 9, rate: bestHour.rate || 0 },
        bestPerformingDay: { day: bestDay.value || 'Segunda-feira', rate: bestDay.rate || 0 },
      },
    };
  }

  /**
   * Configurar preferências de notificação do usuário
   */
  async setUserPreferences(
    userId: string,
    preferences: {
      channels: NotificationChannel[];
      quietHours: { start: string; end: string };
      categories: Record<string, boolean>;
      frequency: 'all' | 'important_only' | 'minimal';
    }
  ): Promise<void> {
    // Salvar preferências do usuário
    const userPrefs = {
      userId,
      ...preferences,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      `fisioflow_notification_prefs_${userId}`,
      JSON.stringify(userPrefs)
    );

    console.log(`⚙️ Preferências de notificação atualizadas para usuário ${userId}`);
  }

  // === MÉTODOS PRIVADOS ===

  private async processRule(rule: NotificationRule): Promise<void> {
    for (const trigger of rule.triggers) {
      const shouldTrigger = await this.evaluateTrigger(trigger, rule);
      
      if (shouldTrigger) {
        await this.generateNotificationsFromRule(rule, trigger);
      }
    }
  }

  private async evaluateTrigger(trigger: NotificationTrigger, rule: NotificationRule): Promise<boolean> {
    switch (trigger.type) {
      case 'time_based':
        return this.evaluateTimeTrigger(trigger);
      
      case 'event_based':
        return this.evaluateEventTrigger(trigger, rule);
      
      case 'condition_based':
        return this.evaluateConditionTrigger(trigger, rule);
      
      case 'ai_predicted':
        return this.evaluateAITrigger(trigger, rule);
      
      default:
        return false;
    }
  }

  private evaluateTimeTrigger(trigger: NotificationTrigger): boolean {
    if (!trigger.scheduleType) return false;

    const now = new Date();
    
    switch (trigger.scheduleType) {
      case 'fixed_time':
        if (!trigger.fixedTime) return false;
        const [hour, minute] = trigger.fixedTime.split(':').map(Number);
        return now.getHours() === hour && now.getMinutes() === minute;
      
      case 'recurring':
        if (!trigger.recurring) return false;
        // Implementar lógica de recorrência
        return this.checkRecurringPattern(trigger.recurring, now);
      
      default:
        return false;
    }
  }

  private evaluateEventTrigger(trigger: NotificationTrigger, rule: NotificationRule): boolean {
    // Esta função seria chamada quando eventos específicos ocorrem no sistema
    // Por enquanto, simular com falso para não gerar spam
    return false;
  }

  private evaluateConditionTrigger(trigger: NotificationTrigger, rule: NotificationRule): boolean {
    if (!trigger.conditions) return false;
    
    // Implementar avaliação de condições
    // Por enquanto, retornar falso para evitar spam
    return false;
  }

  private async evaluateAITrigger(trigger: NotificationTrigger, rule: NotificationRule): Promise<boolean> {
    if (!trigger.aiModel || !trigger.threshold) return false;
    
    try {
      // Simular chamada de IA para predição
      const prediction = await this.getAIPrediction(trigger.aiModel, rule.tenantId);
      return prediction.confidence >= trigger.threshold;
    } catch (error) {
      console.error('❌ Erro na avaliação de trigger IA:', error);
      return false;
    }
  }

  private checkRecurringPattern(pattern: any, now: Date): boolean {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [patternHour, patternMinute] = pattern.time.split(':').map(Number);
    
    if (currentHour !== patternHour || currentMinute !== patternMinute) {
      return false;
    }

    switch (pattern.pattern) {
      case 'daily':
        return true;
      
      case 'weekly':
        return pattern.days?.includes(now.getDay()) || false;
      
      case 'monthly':
        return pattern.days?.includes(now.getDate()) || false;
      
      default:
        return false;
    }
  }

  private async generateNotificationsFromRule(rule: NotificationRule, trigger: NotificationTrigger): Promise<void> {
    const recipients = await this.getRecipients(rule);
    
    for (const recipient of recipients) {
      // Verificar cooldown
      if (this.isInCooldown(rule.id, recipient.id)) {
        continue;
      }

      const notification: QueuedNotification = {
        id: this.generateNotificationId(),
        ruleId: rule.id,
        recipientType: recipient.type,
        recipientId: recipient.id,
        recipientName: recipient.name,
        title: rule.title,
        message: rule.message,
        category: rule.category,
        priority: rule.priority,
        channels: rule.channels,
        scheduledFor: new Date().toISOString(),
        status: 'pending',
        opened: false,
        createdAt: new Date().toISOString(),
        tenantId: rule.tenantId,
      };

      // Personalizar se habilitado
      if (rule.personalized || rule.aiEnhanced) {
        await this.personalizeNotification(notification);
      }

      this.queue.push(notification);
      this.setCooldown(rule.id, recipient.id, rule.cooldownMinutes);
    }

    await this.saveQueue();
  }

  private async personalizeNotification(notification: QueuedNotification): Promise<void> {
    try {
      const context = await this.getPersonalizationContext(
        notification.recipientId,
        notification.recipientType
      );

      if (this.aiPersonalizationEnabled) {
        const personalizedContent = await secureAIService.personalizeNotification(
          notification.title,
          notification.message,
          context,
          notification.recipientId,
          notification.tenantId
        );

        notification.title = personalizedContent.title;
        notification.message = personalizedContent.message;
      }

      // Aplicar preferências do usuário
      const userPrefs = this.getUserPreferences(notification.recipientId);
      if (userPrefs) {
        notification.channels = notification.channels.filter(channel =>
          userPrefs.channels.some(prefChannel => 
            prefChannel.type === channel.type && prefChannel.enabled
          )
        );
      }
    } catch (error) {
      console.error('❌ Erro na personalização:', error);
    }
  }

  private async getRecipients(rule: NotificationRule): Promise<Array<{id: string; name: string; type: 'user' | 'patient'}>> {
    // Simular busca de destinatários
    // Em produção, consultaria banco de dados
    return [
      { id: 'user1', name: 'Dr. João Silva', type: 'user' },
      { id: 'patient1', name: 'Maria Santos', type: 'patient' },
    ];
  }

  private async getPersonalizationContext(recipientId: string, type: 'user' | 'patient'): Promise<PersonalizationContext> {
    // Simular contexto de personalização
    return {
      userId: recipientId,
      userRole: type === 'user' ? 'therapist' : 'patient',
      preferences: {
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        quietHours: { start: '22:00', end: '08:00' },
      },
      loginFrequency: 5,
      avgSessionDuration: 45,
      preferredFeatures: ['calendar', 'patients'],
    };
  }

  private async getAIPrediction(model: string, tenantId: string): Promise<{confidence: number; prediction: any}> {
    // Simular predição de IA
    return {
      confidence: Math.random(),
      prediction: { risk: 'low', recommendation: 'continue_treatment' },
    };
  }

  private isInCooldown(ruleId: string, recipientId: string): boolean {
    const key = `${ruleId}_${recipientId}`;
    const cooldownData = this.deliveryStats.get(key);
    
    if (!cooldownData) return false;
    
    return Date.now() < cooldownData.cooldownUntil;
  }

  private setCooldown(ruleId: string, recipientId: string, cooldownMinutes: number): void {
    const key = `${ruleId}_${recipientId}`;
    this.deliveryStats.set(key, {
      cooldownUntil: Date.now() + (cooldownMinutes * 60 * 1000),
    });
  }

  private getUserPreferences(userId: string): any {
    try {
      const prefs = localStorage.getItem(`fisioflow_notification_prefs_${userId}`);
      return prefs ? JSON.parse(prefs) : null;
    } catch {
      return null;
    }
  }

  private startProcessingQueue(): void {
    setInterval(async () => {
      await this.processNotificationQueue();
    }, 30000); // A cada 30 segundos
  }

  private async processNotificationQueue(): Promise<void> {
    const pending = this.queue.filter(n => 
      n.status === 'pending' && 
      new Date(n.scheduledFor) <= new Date()
    );

    for (const notification of pending) {
      await this.deliverNotification(notification);
    }
  }

  private async deliverNotification(notification: QueuedNotification): Promise<void> {
    try {
      // Simular entrega por diferentes canais
      for (const channel of notification.channels) {
        if (channel.enabled) {
          await this.deliverToChannel(notification, channel);
        }
      }

      notification.status = 'delivered';
      notification.deliveredAt = new Date().toISOString();
      
      await this.saveQueue();
      
      console.log(`📤 Notificação entregue: ${notification.title}`);
    } catch (error) {
      notification.status = 'failed';
      notification.error = String(error);
      console.error('❌ Erro na entrega:', error);
    }
  }

  private async deliverToChannel(notification: QueuedNotification, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'in_app':
        // Notificação já está na queue para exibição in-app
        break;
      
      case 'push':
        await this.sendPushNotification(notification);
        break;
      
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      
      case 'sms':
        await this.sendSMSNotification(notification);
        break;
      
      default:
        console.log(`📱 Entrega simulada via ${channel.type}`);
    }
  }

  private async sendPushNotification(notification: QueuedNotification): Promise<void> {
    // Simular push notification
    console.log(`🔔 Push notification enviada: ${notification.title}`);
  }

  private async sendEmailNotification(notification: QueuedNotification): Promise<void> {
    // Simular email
    console.log(`📧 Email enviado: ${notification.title}`);
  }

  private async sendSMSNotification(notification: QueuedNotification): Promise<void> {
    // Simular SMS
    console.log(`📱 SMS enviado: ${notification.title}`);
  }

  private updateDeliveryStats(notification: QueuedNotification): void {
    // Atualizar estatísticas de entrega
    const key = `stats_${notification.category}_${notification.tenantId}`;
    const currentStats = this.deliveryStats.get(key) || {
      total: 0,
      opened: 0,
      actions: 0,
    };

    if (notification.opened && !currentStats.openedNotifications?.includes(notification.id)) {
      currentStats.opened++;
      currentStats.openedNotifications = currentStats.openedNotifications || [];
      currentStats.openedNotifications.push(notification.id);
    }

    if (notification.actionTaken && !currentStats.actionNotifications?.includes(notification.id)) {
      currentStats.actions++;
      currentStats.actionNotifications = currentStats.actionNotifications || [];
      currentStats.actionNotifications.push(notification.id);
    }

    this.deliveryStats.set(key, currentStats);
  }

  private getMostFrequent(array: any[]): { value: any; rate: number } {
    if (array.length === 0) return { value: null, rate: 0 };
    
    const frequency: Record<any, number> = {};
    array.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    const mostFrequent = Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );

    return {
      value: mostFrequent,
      rate: (frequency[mostFrequent] / array.length) * 100,
    };
  }

  private calculateAverageTimeToOpen(notifications: QueuedNotification[]): number {
    const openedNotifications = notifications.filter(n => n.openedAt && n.deliveredAt);
    
    if (openedNotifications.length === 0) return 0;

    const totalTime = openedNotifications.reduce((sum, n) => {
      const delivered = new Date(n.deliveredAt!).getTime();
      const opened = new Date(n.openedAt!).getTime();
      return sum + (opened - delivered);
    }, 0);

    return totalTime / openedNotifications.length / (1000 * 60); // em minutos
  }

  private setupDefaultRules(): void {
    // Configurar regras padrão do sistema
    const defaultRules = [
      {
        name: 'Lembrete de Consulta',
        description: 'Lembrar pacientes sobre consulta 1 dia antes',
        triggers: [{
          type: 'time_based' as const,
          scheduleType: 'relative_time' as const,
          relativeTime: {
            amount: 1,
            unit: 'days' as const,
            before: true,
            referenceEvent: 'appointment' as const,
          },
        }],
        targetType: 'patient_related' as const,
        title: 'Lembrete de Consulta',
        message: 'Você tem uma consulta agendada para amanhã às {time} com {therapist}',
        category: 'reminder' as const,
        priority: 'medium' as const,
        channels: [
          { type: 'in_app' as const, enabled: true },
          { type: 'sms' as const, enabled: true },
        ],
        frequency: 'once' as const,
        cooldownMinutes: 1440, // 24 horas
        personalized: true,
        aiEnhanced: false,
        isActive: true,
        createdBy: 'system',
        tenantId: 'default',
      },
    ];

    // Em produção, carregaria do banco de dados
    console.log('📋 Regras padrão configuradas');
  }

  private async loadRules(): Promise<void> {
    try {
      const stored = localStorage.getItem('fisioflow_notification_rules');
      if (stored) {
        const rules = JSON.parse(stored);
        rules.forEach((rule: NotificationRule) => {
          this.rules.set(rule.id, rule);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar regras:', error);
    }
  }

  private async saveRules(): Promise<void> {
    try {
      const rules = Array.from(this.rules.values());
      localStorage.setItem('fisioflow_notification_rules', JSON.stringify(rules));
    } catch (error) {
      console.error('❌ Erro ao salvar regras:', error);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem('fisioflow_notification_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar queue:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      // Manter apenas as últimas 1000 notificações
      const recentQueue = this.queue.slice(-1000);
      localStorage.setItem('fisioflow_notification_queue', JSON.stringify(recentQueue));
      this.queue = recentQueue;
    } catch (error) {
      console.error('❌ Erro ao salvar queue:', error);
    }
  }

  private async getRecipientName(recipientId: string, type: 'user' | 'patient'): Promise<string> {
    // Em produção, consultaria banco de dados
    return type === 'user' ? `Usuário ${recipientId}` : `Paciente ${recipientId}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === INSTÂNCIA SINGLETON ===
export const intelligentNotificationService = new IntelligentNotificationService();

// === HOOKS REACT ===
export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = React.useState<QueuedNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const loadNotifications = () => {
      const userNotifications = intelligentNotificationService.getNotificationsForUser(userId);
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.opened).length);
    };

    loadNotifications();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const markAsRead = React.useCallback((notificationId: string) => {
    intelligentNotificationService.markAsOpened(notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, opened: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const recordAction = React.useCallback((notificationId: string, action: string) => {
    intelligentNotificationService.recordAction(notificationId, action);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    recordAction,
  };
};

export default intelligentNotificationService;

// Adicionar import do React
import React from 'react';