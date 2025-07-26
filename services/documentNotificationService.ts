/**
 * Serviço de Notificações e Lembretes Automáticos para Documentos
 * Sistema inteligente de notificações multicanal com templates personalizáveis
 */

import type {
  BaseDocument,
  DocumentStatus,
  DocumentType,
  DigitalSignature
} from '../types/legalDocuments';

import type { WorkflowInstance, WorkflowStatus } from './documentWorkflowService';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  content: string;
  variables: string[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  isActive: boolean;
  conditions?: NotificationCondition[];
  scheduling?: NotificationScheduling;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  trigger: NotificationTrigger;
  templateId: string;
  recipients: NotificationRecipient[];
  conditions: NotificationCondition[];
  scheduling: NotificationScheduling;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationInstance {
  id: string;
  ruleId: string;
  templateId: string;
  recipientId: string;
  recipientType: 'user' | 'patient' | 'email' | 'phone';
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: NotificationPriority;
  scheduledFor: string;
  sentAt?: string;
  readAt?: string;
  clickedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  data: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  nextRetry?: string;
  createdAt: string;
}

export interface ReminderRule {
  id: string;
  name: string;
  documentTypes: DocumentType[];
  reminderType: 'expiration' | 'signature_pending' | 'renewal' | 'compliance_check';
  frequency: ReminderFrequency;
  advanceNotice: number; // em dias
  recipients: NotificationRecipient[];
  templateId: string;
  conditions: NotificationCondition[];
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export enum NotificationType {
  DOCUMENT_CREATED = 'document_created',
  DOCUMENT_SIGNED = 'document_signed',
  DOCUMENT_EXPIRED = 'document_expired',
  SIGNATURE_PENDING = 'signature_pending',
  WORKFLOW_ASSIGNED = 'workflow_assigned',
  WORKFLOW_APPROVED = 'workflow_approved',
  WORKFLOW_REJECTED = 'workflow_rejected',
  COMPLIANCE_ISSUE = 'compliance_issue',
  REMINDER = 'reminder',
  SYSTEM_ALERT = 'system_alert'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  IN_APP = 'in_app',
  PUSH = 'push',
  WEBHOOK = 'webhook'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum NotificationTrigger {
  DOCUMENT_CREATED = 'document_created',
  DOCUMENT_UPDATED = 'document_updated',
  DOCUMENT_SIGNED = 'document_signed',
  DOCUMENT_EXPIRED = 'document_expired',
  WORKFLOW_STEP_ASSIGNED = 'workflow_step_assigned',
  WORKFLOW_COMPLETED = 'workflow_completed',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  SCHEDULED_REMINDER = 'scheduled_reminder'
}

export enum ReminderFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export interface NotificationRecipient {
  type: 'user' | 'patient' | 'role' | 'email' | 'phone';
  value: string;
  channels: NotificationChannel[];
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface NotificationScheduling {
  type: 'immediate' | 'scheduled' | 'recurring';
  scheduleDate?: string;
  cron?: string;
  timezone?: string;
  maxOccurrences?: number;
}

class DocumentNotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private reminders: Map<string, ReminderRule> = new Map();
  private notifications: Map<string, NotificationInstance> = new Map();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultTemplates();
    this.initializeDefaultRules();
    this.startPeriodicTasks();
  }

  /**
   * ============== INICIALIZAÇÃO ==============
   */

  private initializeDefaultTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'document_created',
        name: 'Documento Criado',
        type: NotificationType.DOCUMENT_CREATED,
        subject: 'Novo documento: {{document.title}}',
        content: `
          <h2>Novo Documento Criado</h2>
          <p>Olá {{recipient.name}},</p>
          <p>Um novo documento foi criado para você:</p>
          <ul>
            <li><strong>Título:</strong> {{document.title}}</li>
            <li><strong>Tipo:</strong> {{document.type}}</li>
            <li><strong>Paciente:</strong> {{patient.name}}</li>
            <li><strong>Terapeuta:</strong> {{therapist.name}}</li>
            <li><strong>Data:</strong> {{document.createdAt}}</li>
          </ul>
          <p><a href="{{document.url}}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visualizar Documento</a></p>
          <p>Este documento requer sua assinatura. Por favor, acesse o sistema para revisar e assinar.</p>
        `,
        variables: ['recipient.name', 'document.title', 'document.type', 'patient.name', 'therapist.name', 'document.createdAt', 'document.url'],
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'signature_pending',
        name: 'Assinatura Pendente',
        type: NotificationType.SIGNATURE_PENDING,
        subject: 'Lembrete: Documento aguardando assinatura',
        content: `
          <h2>Documento Aguardando Assinatura</h2>
          <p>Olá {{recipient.name}},</p>
          <p>Você tem um documento pendente de assinatura há {{days_pending}} dias:</p>
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #92400E;">{{document.title}}</h3>
            <p style="margin: 0; color: #92400E;">Criado em: {{document.createdAt}}</p>
          </div>
          <p><a href="{{document.url}}" style="background: #F59E0B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Assinar Agora</a></p>
          <p><small>Este é um lembrete automático. Se você já assinou este documento, pode ignorar esta mensagem.</small></p>
        `,
        variables: ['recipient.name', 'document.title', 'document.createdAt', 'document.url', 'days_pending'],
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WHATSAPP],
        priority: NotificationPriority.HIGH,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'document_signed',
        name: 'Documento Assinado',
        type: NotificationType.DOCUMENT_SIGNED,
        subject: 'Documento assinado com sucesso: {{document.title}}',
        content: `
          <h2>Documento Assinado</h2>
          <p>Olá {{recipient.name}},</p>
          <p>O documento "{{document.title}}" foi assinado com sucesso.</p>
          <div style="background: #D1FAE5; border: 1px solid #10B981; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #065F46;">✓ Assinatura Confirmada</h3>
            <p style="margin: 0; color: #065F46;">Assinado por: {{signer.name}} em {{signature.timestamp}}</p>
          </div>
          <p><a href="{{document.url}}" style="background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Documento</a></p>
          <p>Uma cópia do documento assinado está disponível em sua conta.</p>
        `,
        variables: ['recipient.name', 'document.title', 'document.url', 'signer.name', 'signature.timestamp'],
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'workflow_assigned',
        name: 'Aprovação Atribuída',
        type: NotificationType.WORKFLOW_ASSIGNED,
        subject: 'Documento para aprovação: {{document.title}}',
        content: `
          <h2>Documento Requer Sua Aprovação</h2>
          <p>Olá {{recipient.name}},</p>
          <p>Um documento foi atribuído para sua aprovação:</p>
          <ul>
            <li><strong>Documento:</strong> {{document.title}}</li>
            <li><strong>Etapa do Workflow:</strong> {{workflow.stepName}}</li>
            <li><strong>Descrição:</strong> {{workflow.stepDescription}}</li>
            <li><strong>Prazo:</strong> {{workflow.deadline}}</li>
          </ul>
          <p><a href="{{workflow.url}}" style="background: #8B5CF6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Revisar e Aprovar</a></p>
          <p><strong>Atenção:</strong> Este documento precisa ser aprovado até {{workflow.deadline}}.</p>
        `,
        variables: ['recipient.name', 'document.title', 'workflow.stepName', 'workflow.stepDescription', 'workflow.deadline', 'workflow.url'],
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.SMS],
        priority: NotificationPriority.HIGH,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'compliance_issue',
        name: 'Problema de Compliance',
        type: NotificationType.COMPLIANCE_ISSUE,
        subject: 'URGENTE: Problema de compliance detectado',
        content: `
          <h2 style="color: #DC2626;">⚠️ Problema de Compliance Detectado</h2>
          <p>Olá {{recipient.name}},</p>
          <p>Foi detectado um problema crítico de compliance no documento:</p>
          <div style="background: #FEE2E2; border: 1px solid #DC2626; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #991B1B;">{{document.title}}</h3>
            <p style="margin: 0; color: #991B1B;"><strong>Problema:</strong> {{compliance.issue}}</p>
            <p style="margin: 5px 0 0 0; color: #991B1B;"><strong>Regulamentação:</strong> {{compliance.regulation}}</p>
          </div>
          <p><strong>Ação Requerida:</strong> {{compliance.action}}</p>
          <p><a href="{{document.url}}" style="background: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Corrigir Agora</a></p>
          <p><small>Este problema deve ser corrigido imediatamente para manter a conformidade regulatória.</small></p>
        `,
        variables: ['recipient.name', 'document.title', 'document.url', 'compliance.issue', 'compliance.regulation', 'compliance.action'],
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
        priority: NotificationPriority.URGENT,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  private initializeDefaultRules(): void {
    // Regra para notificar quando documento é criado
    const documentCreatedRule: NotificationRule = {
      id: 'notify_document_created',
      name: 'Notificar Criação de Documento',
      description: 'Envia notificação quando um novo documento é criado',
      trigger: NotificationTrigger.DOCUMENT_CREATED,
      templateId: 'document_created',
      recipients: [
        { type: 'patient', value: '{{document.patientId}}', channels: [NotificationChannel.EMAIL, NotificationChannel.SMS] }
      ],
      conditions: [],
      scheduling: { type: 'immediate' },
      isActive: true,
      tenantId: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Regra para lembrete de assinatura pendente
    const signaturePendingRule: NotificationRule = {
      id: 'reminder_signature_pending',
      name: 'Lembrete de Assinatura Pendente',
      description: 'Lembra usuários sobre documentos pendentes de assinatura',
      trigger: NotificationTrigger.SCHEDULED_REMINDER,
      templateId: 'signature_pending',
      recipients: [
        { type: 'patient', value: '{{document.patientId}}', channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP] }
      ],
      conditions: [
        { field: 'status', operator: 'equals', value: DocumentStatus.PENDING_SIGNATURE },
        { field: 'daysSinceCreated', operator: 'greater_than', value: 2 }
      ],
      scheduling: { type: 'recurring', cron: '0 9 * * *' }, // Diariamente às 9h
      isActive: true,
      tenantId: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rules.set(documentCreatedRule.id, documentCreatedRule);
    this.rules.set(signaturePendingRule.id, signaturePendingRule);

    // Lembrete para documentos prestes a expirar
    const expirationReminder: ReminderRule = {
      id: 'expiration_reminder',
      name: 'Lembrete de Expiração',
      documentTypes: [DocumentType.CONSENT_TREATMENT, DocumentType.CONSENT_TELEMEDICINE],
      reminderType: 'expiration',
      frequency: ReminderFrequency.WEEKLY,
      advanceNotice: 30, // 30 dias antes
      recipients: [
        { type: 'patient', value: '{{document.patientId}}', channels: [NotificationChannel.EMAIL] },
        { type: 'user', value: '{{document.therapistId}}', channels: [NotificationChannel.IN_APP] }
      ],
      templateId: 'signature_pending', // Reutiliza template
      conditions: [],
      isActive: true,
      tenantId: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.reminders.set(expirationReminder.id, expirationReminder);
  }

  /**
   * ============== PROCESSAMENTO DE EVENTOS ==============
   */

  async handleDocumentEvent(
    event: NotificationTrigger, 
    document: BaseDocument, 
    additionalData?: Record<string, any>
  ): Promise<void> {
    try {
      // Buscar regras aplicáveis
      const applicableRules = Array.from(this.rules.values())
        .filter(rule => 
          rule.isActive && 
          rule.trigger === event &&
          this.evaluateConditions(rule.conditions, { document, ...additionalData })
        );

      // Processar cada regra
      for (const rule of applicableRules) {
        await this.processNotificationRule(rule, document, additionalData);
      }

    } catch (error) {
      console.error('Erro ao processar evento de documento:', error);
    }
  }

  async handleWorkflowEvent(
    event: NotificationTrigger,
    workflow: WorkflowInstance,
    document: BaseDocument,
    additionalData?: Record<string, any>
  ): Promise<void> {
    try {
      const applicableRules = Array.from(this.rules.values())
        .filter(rule => 
          rule.isActive && 
          rule.trigger === event &&
          this.evaluateConditions(rule.conditions, { document, workflow, ...additionalData })
        );

      for (const rule of applicableRules) {
        await this.processNotificationRule(rule, document, { workflow, ...additionalData });
      }

    } catch (error) {
      console.error('Erro ao processar evento de workflow:', error);
    }
  }

  private async processNotificationRule(
    rule: NotificationRule, 
    document: BaseDocument, 
    additionalData?: Record<string, any>
  ): Promise<void> {
    const template = this.templates.get(rule.templateId);
    if (!template) {
      console.error(`Template ${rule.templateId} não encontrado`);
      return;
    }

    // Processar cada destinatário
    for (const recipient of rule.recipients) {
      const recipientId = this.resolveRecipientId(recipient, document, additionalData);
      if (!recipientId) continue;

      // Criar notificação para cada canal
      for (const channel of recipient.channels) {
        if (template.channels.includes(channel)) {
          await this.createNotification(rule, template, recipientId, recipient.type, channel, document, additionalData);
        }
      }
    }
  }

  private resolveRecipientId(
    recipient: NotificationRecipient, 
    document: BaseDocument, 
    additionalData?: Record<string, any>
  ): string | null {
    if (recipient.type === 'email' || recipient.type === 'phone') {
      return recipient.value;
    }

    // Resolver variáveis
    let resolvedValue = recipient.value;
    if (resolvedValue.includes('{{document.patientId}}')) {
      resolvedValue = document.patientId;
    } else if (resolvedValue.includes('{{document.therapistId}}')) {
      resolvedValue = document.therapistId;
    }

    return resolvedValue;
  }

  private async createNotification(
    rule: NotificationRule,
    template: NotificationTemplate,
    recipientId: string,
    recipientType: string,
    channel: NotificationChannel,
    document: BaseDocument,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const notification: NotificationInstance = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      templateId: template.id,
      recipientId,
      recipientType: recipientType as any,
      channel,
      status: NotificationStatus.PENDING,
      priority: template.priority,
      scheduledFor: this.calculateScheduledTime(rule.scheduling),
      data: {
        document,
        ...additionalData,
        recipient: await this.getRecipientData(recipientId, recipientType)
      },
      attempts: 0,
      maxAttempts: this.getMaxAttempts(channel),
      createdAt: new Date().toISOString()
    };

    this.notifications.set(notification.id, notification);

    // Agendar envio
    await this.scheduleNotification(notification);

    console.log(`[NOTIFICATION] Criada: ${template.name} para ${recipientId} via ${channel}`);
  }

  private calculateScheduledTime(scheduling: NotificationScheduling): string {
    switch (scheduling.type) {
      case 'immediate':
        return new Date().toISOString();
      case 'scheduled':
        return scheduling.scheduleDate || new Date().toISOString();
      case 'recurring':
        // Para recorrente, agendar próxima execução baseada no cron
        return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Próximo dia por padrão
      default:
        return new Date().toISOString();
    }
  }

  private getMaxAttempts(channel: NotificationChannel): number {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return 3;
      case NotificationChannel.SMS:
        return 2;
      case NotificationChannel.WHATSAPP:
        return 3;
      case NotificationChannel.IN_APP:
        return 1;
      default:
        return 1;
    }
  }

  private async getRecipientData(recipientId: string, recipientType: string): Promise<Record<string, any>> {
    // Em produção, buscar dados reais do usuário/paciente
    return {
      id: recipientId,
      name: `Usuário ${recipientId}`,
      email: `${recipientId}@example.com`,
      phone: '+5511999999999'
    };
  }

  /**
   * ============== ENVIO DE NOTIFICAÇÕES ==============
   */

  private async scheduleNotification(notification: NotificationInstance): Promise<void> {
    const scheduledTime = new Date(notification.scheduledFor);
    const now = new Date();
    const delay = Math.max(0, scheduledTime.getTime() - now.getTime());

    const timeoutId = setTimeout(async () => {
      await this.sendNotification(notification.id);
    }, delay);

    this.scheduledTasks.set(notification.id, timeoutId);
  }

  private async sendNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.status !== NotificationStatus.PENDING) {
      return;
    }

    const template = this.templates.get(notification.templateId);
    if (!template) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = 'Template não encontrado';
      notification.failedAt = new Date().toISOString();
      return;
    }

    try {
      notification.attempts++;
      notification.status = NotificationStatus.SENT;

      // Renderizar conteúdo
      const renderedContent = this.renderTemplate(template, notification.data);

      // Simular envio baseado no canal
      const success = await this.sendToChannel(notification.channel, {
        recipientId: notification.recipientId,
        subject: renderedContent.subject,
        content: renderedContent.content,
        priority: notification.priority
      });

      if (success) {
        notification.sentAt = new Date().toISOString();
        notification.status = NotificationStatus.DELIVERED;
        console.log(`[NOTIFICATION] Enviada com sucesso: ${notificationId}`);
      } else {
        throw new Error('Falha no envio');
      }

    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      notification.failedAt = new Date().toISOString();

      // Agendar retry se ainda há tentativas
      if (notification.attempts < notification.maxAttempts) {
        const retryDelay = this.calculateRetryDelay(notification.attempts);
        notification.nextRetry = new Date(Date.now() + retryDelay).toISOString();
        
        setTimeout(() => {
          this.sendNotification(notificationId);
        }, retryDelay);
      }

      console.error(`[NOTIFICATION] Falha no envio: ${notificationId}`, error);
    }

    await this.saveToStorage();
  }

  private renderTemplate(template: NotificationTemplate, data: Record<string, any>): { subject: string; content: string } {
    let subject = template.subject;
    let content = template.content;

    // Substituir variáveis
    for (const variable of template.variables) {
      const value = this.getVariableValue(variable, data);
      const regex = new RegExp(`\\{\\{${variable.replace(/\./g, '\\.')}\\}\\}`, 'g');
      
      subject = subject.replace(regex, String(value || `[${variable}]`));
      content = content.replace(regex, String(value || `[${variable}]`));
    }

    return { subject, content };
  }

  private getVariableValue(variable: string, data: Record<string, any>): any {
    const parts = variable.split('.');
    let value = data;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    // Formatação especial para datas
    if (variable.includes('Date') || variable.includes('At')) {
      if (value && typeof value === 'string') {
        return new Date(value).toLocaleDateString('pt-BR');
      }
    }

    return value;
  }

  private async sendToChannel(
    channel: NotificationChannel, 
    message: {
      recipientId: string;
      subject: string;
      content: string;
      priority: NotificationPriority;
    }
  ): Promise<boolean> {
    // Simulação de envio - em produção, integrar com serviços reais
    switch (channel) {
      case NotificationChannel.EMAIL:
        console.log(`[EMAIL] Para: ${message.recipientId}, Assunto: ${message.subject}`);
        return Math.random() > 0.1; // 90% de sucesso

      case NotificationChannel.SMS:
        console.log(`[SMS] Para: ${message.recipientId}, Mensagem: ${message.subject}`);
        return Math.random() > 0.05; // 95% de sucesso

      case NotificationChannel.WHATSAPP:
        console.log(`[WHATSAPP] Para: ${message.recipientId}, Mensagem: ${message.subject}`);
        return Math.random() > 0.15; // 85% de sucesso

      case NotificationChannel.IN_APP:
        console.log(`[IN_APP] Para: ${message.recipientId}, Notificação: ${message.subject}`);
        return true; // Sempre sucesso para notificações in-app

      case NotificationChannel.PUSH:
        console.log(`[PUSH] Para: ${message.recipientId}, Push: ${message.subject}`);
        return Math.random() > 0.2; // 80% de sucesso

      default:
        return false;
    }
  }

  private calculateRetryDelay(attempt: number): number {
    // Backoff exponencial: 1min, 5min, 15min
    const delays = [60000, 300000, 900000];
    return delays[Math.min(attempt - 1, delays.length - 1)];
  }

  /**
   * ============== LEMBRETES AUTOMÁTICOS ==============
   */

  private startPeriodicTasks(): void {
    // Verificar lembretes a cada hora
    setInterval(() => {
      this.processReminders();
    }, 60 * 60 * 1000);

    // Processar fila de notificações a cada minuto
    setInterval(() => {
      this.processNotificationQueue();
    }, 60 * 1000);
  }

  private async processReminders(): Promise<void> {
    const now = new Date();

    for (const reminder of this.reminders.values()) {
      if (!reminder.isActive) continue;

      try {
        await this.executeReminder(reminder, now);
      } catch (error) {
        console.error(`Erro ao processar lembrete ${reminder.id}:`, error);
      }
    }
  }

  private async executeReminder(reminder: ReminderRule, now: Date): Promise<void> {
    // Buscar documentos que precisam de lembrete
    const documents = await this.getDocumentsForReminder(reminder, now);

    for (const document of documents) {
      // Verificar se já foi enviado recentemente
      if (await this.wasReminderRecentlySent(reminder.id, document.id)) {
        continue;
      }

      // Criar notificação de lembrete
      const template = this.templates.get(reminder.templateId);
      if (!template) continue;

      for (const recipient of reminder.recipients) {
        const recipientId = this.resolveRecipientId(recipient, document);
        if (!recipientId) continue;

        for (const channel of recipient.channels) {
          await this.createNotification(
            {
              id: reminder.id,
              trigger: NotificationTrigger.SCHEDULED_REMINDER,
              templateId: reminder.templateId,
              recipients: [recipient],
              conditions: [],
              scheduling: { type: 'immediate' }
            } as NotificationRule,
            template,
            recipientId,
            recipient.type,
            channel,
            document,
            {
              reminder: {
                type: reminder.reminderType,
                frequency: reminder.frequency,
                advanceNotice: reminder.advanceNotice
              }
            }
          );
        }
      }

      // Marcar lembrete como enviado
      await this.markReminderSent(reminder.id, document.id);
    }
  }

  private async getDocumentsForReminder(reminder: ReminderRule, now: Date): Promise<BaseDocument[]> {
    // Em produção, seria uma consulta ao banco de dados
    const saved = localStorage.getItem('fisioflow_legal_documents');
    if (!saved) return [];

    const documents: BaseDocument[] = JSON.parse(saved);
    
    return documents.filter(doc => {
      // Filtrar por tipo de documento
      if (!reminder.documentTypes.includes(doc.type)) return false;

      // Filtrar por condições
      if (!this.evaluateConditions(reminder.conditions, { document: doc })) return false;

      // Verificar se precisa de lembrete baseado no tipo
      switch (reminder.reminderType) {
        case 'signature_pending':
          const daysSinceCreated = Math.floor((now.getTime() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return doc.status === DocumentStatus.PENDING_SIGNATURE && daysSinceCreated >= reminder.advanceNotice;

        case 'expiration':
          if (!doc.validUntil) return false;
          const daysUntilExpiration = Math.floor((new Date(doc.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiration <= reminder.advanceNotice && daysUntilExpiration > 0;

        case 'renewal':
          if (!doc.validUntil) return false;
          const renewalDate = new Date(doc.validUntil);
          renewalDate.setDate(renewalDate.getDate() - reminder.advanceNotice);
          return now >= renewalDate;

        default:
          return false;
      }
    });
  }

  private async wasReminderRecentlySent(reminderId: string, documentId: string): Promise<boolean> {
    // Verificar se foi enviado nas últimas 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return Array.from(this.notifications.values()).some(notification => 
      notification.ruleId === reminderId &&
      notification.data.document?.id === documentId &&
      notification.status === NotificationStatus.DELIVERED &&
      new Date(notification.sentAt || 0) > cutoff
    );
  }

  private async markReminderSent(reminderId: string, documentId: string): Promise<void> {
    // Em um sistema real, salvaria no banco que o lembrete foi enviado
    console.log(`[REMINDER] Marcado como enviado: ${reminderId} para documento ${documentId}`);
  }

  private async processNotificationQueue(): Promise<void> {
    const pendingNotifications = Array.from(this.notifications.values())
      .filter(n => n.status === NotificationStatus.PENDING && new Date(n.scheduledFor) <= new Date())
      .sort((a, b) => {
        // Ordenar por prioridade e depois por data
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      });

    // Processar até 10 notificações por vez
    const toProcess = pendingNotifications.slice(0, 10);
    
    for (const notification of toProcess) {
      try {
        await this.sendNotification(notification.id);
      } catch (error) {
        console.error(`Erro ao processar notificação ${notification.id}:`, error);
      }
    }
  }

  /**
   * ============== UTILITÁRIOS ==============
   */

  private evaluateConditions(conditions: NotificationCondition[], data: Record<string, any>): boolean {
    return conditions.every(condition => {
      const value = this.getVariableValue(condition.field, data);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(value);
        default:
          return true;
      }
    });
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = localStorage.getItem('fisioflow_notifications');
      if (saved) {
        const data = JSON.parse(saved);
        this.templates = new Map(data.templates || []);
        this.rules = new Map(data.rules || []);
        this.reminders = new Map(data.reminders || []);
        this.notifications = new Map(data.notifications || []);
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de notificações:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        templates: Array.from(this.templates.entries()),
        rules: Array.from(this.rules.entries()),
        reminders: Array.from(this.reminders.entries()),
        notifications: Array.from(this.notifications.entries())
      };
      localStorage.setItem('fisioflow_notifications', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar dados de notificações:', error);
    }
  }

  /**
   * ============== API PÚBLICA ==============
   */

  async createCustomNotification(
    recipientId: string,
    recipientType: 'user' | 'patient' | 'email' | 'phone',
    channel: NotificationChannel,
    subject: string,
    content: string,
    priority: NotificationPriority = NotificationPriority.NORMAL
  ): Promise<string> {
    const notification: NotificationInstance = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: 'custom',
      templateId: 'custom',
      recipientId,
      recipientType,
      channel,
      status: NotificationStatus.PENDING,
      priority,
      scheduledFor: new Date().toISOString(),
      data: { custom: true, subject, content },
      attempts: 0,
      maxAttempts: this.getMaxAttempts(channel),
      createdAt: new Date().toISOString()
    };

    this.notifications.set(notification.id, notification);
    await this.scheduleNotification(notification);
    await this.saveToStorage();

    return notification.id;
  }

  getNotificationStats(): {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    byChannel: Record<NotificationChannel, number>;
    byPriority: Record<NotificationPriority, number>;
  } {
    const notifications = Array.from(this.notifications.values());
    
    const byChannel = {} as Record<NotificationChannel, number>;
    const byPriority = {} as Record<NotificationPriority, number>;
    
    Object.values(NotificationChannel).forEach(channel => {
      byChannel[channel] = notifications.filter(n => n.channel === channel).length;
    });
    
    Object.values(NotificationPriority).forEach(priority => {
      byPriority[priority] = notifications.filter(n => n.priority === priority).length;
    });

    return {
      total: notifications.length,
      sent: notifications.filter(n => n.status === NotificationStatus.SENT || n.status === NotificationStatus.DELIVERED).length,
      delivered: notifications.filter(n => n.status === NotificationStatus.DELIVERED).length,
      failed: notifications.filter(n => n.status === NotificationStatus.FAILED).length,
      pending: notifications.filter(n => n.status === NotificationStatus.PENDING).length,
      byChannel,
      byPriority
    };
  }

  markNotificationAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification && notification.status === NotificationStatus.DELIVERED) {
      notification.readAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  cancelNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification && notification.status === NotificationStatus.PENDING) {
      notification.status = NotificationStatus.CANCELLED;
      
      // Cancelar task agendado
      const taskId = this.scheduledTasks.get(notificationId);
      if (taskId) {
        clearTimeout(taskId);
        this.scheduledTasks.delete(notificationId);
      }
      
      this.saveToStorage();
    }
  }

  getUserNotifications(userId: string, limit: number = 50): NotificationInstance[] {
    return Array.from(this.notifications.values())
      .filter(n => n.recipientId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

// Instância singleton
export const documentNotificationService = new DocumentNotificationService();

// Funções de conveniência
export async function notifyDocumentCreated(document: BaseDocument): Promise<void> {
  await documentNotificationService.handleDocumentEvent(NotificationTrigger.DOCUMENT_CREATED, document);
}

export async function notifyDocumentSigned(document: BaseDocument, signature: DigitalSignature): Promise<void> {
  await documentNotificationService.handleDocumentEvent(NotificationTrigger.DOCUMENT_SIGNED, document, { signature });
}

export async function notifyWorkflowAssigned(workflow: WorkflowInstance, document: BaseDocument, stepData: any): Promise<void> {
  await documentNotificationService.handleWorkflowEvent(NotificationTrigger.WORKFLOW_STEP_ASSIGNED, workflow, document, stepData);
}

export async function sendCustomNotification(
  recipientId: string,
  channel: NotificationChannel,
  subject: string,
  content: string,
  priority?: NotificationPriority
): Promise<string> {
  return await documentNotificationService.createCustomNotification(recipientId, 'user', channel, subject, content, priority);
}

export function getNotificationStats() {
  return documentNotificationService.getNotificationStats();
}

export default documentNotificationService;