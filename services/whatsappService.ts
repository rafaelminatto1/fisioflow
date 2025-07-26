import { Patient, Appointment, Exercise } from '../types';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'media' | 'interactive';
  content: string;
  templateName?: string;
  templateData?: Record<string, string>;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  interactive?: InteractiveMessage;
}

interface InteractiveMessage {
  type: 'button' | 'list';
  header?: string;
  body: string;
  footer?: string;
  action: ButtonAction | ListAction;
}

interface ButtonAction {
  buttons: Array<{
    id: string;
    title: string;
  }>;
}

interface ListAction {
  button: string;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

interface MessageTemplate {
  id: string;
  name: string;
  category: 'appointment_reminder' | 'confirmation' | 'exercise' | 'results' | 'general' | 'welcome';
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  components: Array<{
    type: 'header' | 'body' | 'footer' | 'button';
    text?: string;
    parameters?: Array<{ type: 'text'; text: string }>;
  }>;
}

interface WhatsAppContact {
  phone: string;
  name: string;
  isValid?: boolean;
}

interface ScheduledMessage {
  id: string;
  patientId: string;
  appointmentId?: string;
  exerciseId?: string;
  message: WhatsAppMessage;
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdAt: string;
  tenantId: string;
}

interface IncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'button' | 'list';
  content: any;
  tenantId: string;
  patientId?: string;
  processed: boolean;
}

interface ChatbotRule {
  id: string;
  keywords: string[];
  response: string;
  responseType: 'text' | 'template' | 'transfer';
  templateName?: string;
  transferTo?: string;
  priority: number;
  isActive: boolean;
}

interface MessageAnalytics {
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  messagesFailed: number;
  responseRate: number;
  averageResponseTime: number;
  botResolutionRate: number;
  topQuestions: Array<{ question: string; count: number }>;
  period: 'day' | 'week' | 'month';
  date: string;
  tenantId: string;
}

class WhatsAppService {
  private apiUrl: string;
  private accessToken: string;
  private businessAccountId: string;
  private phoneNumberId: string;
  private webhookToken: string;
  private templates: MessageTemplate[] = [];
  private chatbotRules: ChatbotRule[] = [];
  private messageQueue: ScheduledMessage[] = [];
  private incomingMessages: IncomingMessage[] = [];
  private analytics: MessageAnalytics[] = [];

  constructor() {
    this.apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '';
    this.businessAccountId = import.meta.env.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '';
    this.webhookToken = import.meta.env.VITE_WHATSAPP_WEBHOOK_TOKEN || '';
    
    this.initializeTemplates();
    this.initializeChatbotRules();
    this.loadStoredData();
    this.startMessageProcessor();
  }

  private initializeTemplates(): void {
    this.templates = [
      {
        id: 'welcome_patient',
        name: 'welcome_patient',
        category: 'welcome',
        language: 'pt_BR',
        status: 'approved',
        components: [
          {
            type: 'body',
            text: '🎉 Bem-vindo(a) ao FisioFlow, {{1}}! Agora você receberá lembretes, exercícios e informações importantes por aqui. Nossa equipe está sempre disponível para ajudar!'
          }
        ]
      },
      {
        id: 'appointment_reminder_24h',
        name: 'appointment_reminder_24h',
        category: 'appointment_reminder',
        language: 'pt_BR',
        status: 'approved',
        components: [
          {
            type: 'body',
            text: '🏥 Olá {{1}}! Lembramos que você tem consulta amanhã às {{2}} com {{3}}. Confirme sua presença ou reagende se necessário.'
          }
        ]
      },
      {
        id: 'appointment_reminder_2h',
        name: 'appointment_reminder_2h',
        category: 'appointment_reminder',
        language: 'pt_BR',
        status: 'approved',
        components: [
          {
            type: 'body',
            text: '⏰ Oi {{1}}! Sua consulta é em 2 horas ({{2}}) com {{3}}. Não se esqueça! Chegar 15 min antes.'
          }
        ]
      },
      {
        id: 'exercise_notification',
        name: 'exercise_notification',
        category: 'exercise',
        language: 'pt_BR',
        status: 'approved',
        components: [
          {
            type: 'body',
            text: '💪 {{1}}, seus novos exercícios estão disponíveis! Acesse o link para ver os vídeos: {{2}}'
          }
        ]
      }
    ];
  }

  private initializeChatbotRules(): void {
    this.chatbotRules = [
      {
        id: 'greeting',
        keywords: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'],
        response: 'Olá! Sou o assistente virtual da FisioFlow. Como posso ajudá-lo hoje?',
        responseType: 'text',
        priority: 1,
        isActive: true
      },
      {
        id: 'hours',
        keywords: ['horário', 'horarios', 'funcionamento', 'atendimento', 'aberto'],
        response: 'Nosso horário de funcionamento:\n🕐 Segunda a Sexta: 7h às 19h\n🕐 Sábados: 8h às 12h\n🚫 Domingos: Fechado',
        responseType: 'text',
        priority: 2,
        isActive: true
      },
      {
        id: 'appointment',
        keywords: ['agendar', 'marcar', 'consulta', 'agendamento', 'horario livre'],
        response: 'Para agendar sua consulta, você pode:\n📱 Ligar: (11) 99999-9999\n💻 Portal online\n🏥 Presencialmente na clínica\n\nQual opção prefere?',
        responseType: 'text',
        priority: 3,
        isActive: true
      },
      {
        id: 'exercises',
        keywords: ['exercicio', 'exercícios', 'video', 'videos', 'treino'],
        response: 'Seus exercícios estão disponíveis no portal do paciente. Posso enviar o link de acesso?',
        responseType: 'text',
        priority: 4,
        isActive: true
      },
      {
        id: 'reschedule',
        keywords: ['cancelar', 'remarcar', 'reagendar', 'transferir'],
        response: 'Vou transferir você para nossa recepção para auxiliar no reagendamento. Aguarde um momento...',
        responseType: 'transfer',
        transferTo: 'reception',
        priority: 5,
        isActive: true
      },
      {
        id: 'pain',
        keywords: ['dor', 'doendo', 'machucou', 'lesão', 'lesao'],
        response: 'Sinto muito que esteja sentindo dor. Vou conectá-lo com um fisioterapeuta para uma avaliação urgente.',
        responseType: 'transfer',
        transferTo: 'therapist',
        priority: 10,
        isActive: true
      }
    ];
  }

  private loadStoredData(): void {
    try {
      const storedQueue = localStorage.getItem('whatsapp_message_queue');
      if (storedQueue) {
        this.messageQueue = JSON.parse(storedQueue);
      }

      const storedAnalytics = localStorage.getItem('whatsapp_analytics');
      if (storedAnalytics) {
        this.analytics = JSON.parse(storedAnalytics);
      }

      const storedMessages = localStorage.getItem('whatsapp_incoming_messages');
      if (storedMessages) {
        this.incomingMessages = JSON.parse(storedMessages);
      }
    } catch (error) {
      console.error('Error loading WhatsApp stored data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('whatsapp_message_queue', JSON.stringify(this.messageQueue));
      localStorage.setItem('whatsapp_analytics', JSON.stringify(this.analytics));
      localStorage.setItem('whatsapp_incoming_messages', JSON.stringify(this.incomingMessages));
    } catch (error) {
      console.error('Error saving WhatsApp data:', error);
    }
  }

  private startMessageProcessor(): void {
    setInterval(() => {
      this.processScheduledMessages();
    }, 60000); // Check every minute

    setInterval(() => {
      this.updateAnalytics();
    }, 300000); // Update analytics every 5 minutes
  }

  // Validar número de telefone
  async validatePhoneNumber(phone: string): Promise<{ isValid: boolean; formattedPhone?: string }> {
    try {
      // Remover caracteres especiais e formatação
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Adicionar código do país se necessário (Brasil +55)
      let formattedPhone = cleanPhone;
      if (cleanPhone.length === 11 && cleanPhone.startsWith('11')) {
        formattedPhone = `55${cleanPhone}`;
      } else if (cleanPhone.length === 10) {
        formattedPhone = `5511${cleanPhone}`;
      } else if (!cleanPhone.startsWith('55')) {
        formattedPhone = `55${cleanPhone}`;
      }

      // Validar formato brasileiro
      const brazilianPhoneRegex = /^55\d{10,11}$/;
      const isValid = brazilianPhoneRegex.test(formattedPhone);

      return {
        isValid,
        formattedPhone: isValid ? formattedPhone : undefined,
      };
    } catch (error) {
      console.error('Erro ao validar telefone:', error);
      return { isValid: false };
    }
  }

  // Send template message
  async sendTemplate(
    to: string,
    templateName: string,
    parameters: string[],
    tenantId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { isValid, formattedPhone } = await this.validatePhoneNumber(to);
      
      if (!isValid || !formattedPhone) {
        return { success: false, error: 'Número de telefone inválido' };
      }

      const template = this.templates.find(t => t.name === templateName);
      if (!template) {
        return { success: false, error: `Template ${templateName} não encontrado` };
      }

      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: template.language },
            components: [
              {
                type: 'body',
                parameters: parameters.map(param => ({ type: 'text', text: param }))
              }
            ]
          }
        }),
      });

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        this.updateAnalytics('sent', tenantId);
        return {
          success: true,
          messageId: data.messages[0].id,
        };
      } else {
        this.updateAnalytics('failed', tenantId);
        return {
          success: false,
          error: data.error?.message || 'Erro ao enviar template',
        };
      }
    } catch (error) {
      console.error('Erro ao enviar template WhatsApp:', error);
      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }

  // Send interactive message with buttons
  async sendInteractiveMessage(
    to: string,
    interactive: InteractiveMessage,
    tenantId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { isValid, formattedPhone } = await this.validatePhoneNumber(to);
      
      if (!isValid || !formattedPhone) {
        return { success: false, error: 'Número de telefone inválido' };
      }

      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'interactive',
          interactive
        }),
      });

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        this.updateAnalytics('sent', tenantId);
        return {
          success: true,
          messageId: data.messages[0].id,
        };
      } else {
        this.updateAnalytics('failed', tenantId);
        return {
          success: false,
          error: data.error?.message || 'Erro ao enviar mensagem interativa',
        };
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem interativa:', error);
      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }

  // Process incoming webhook messages
  async processWebhook(webhookData: any): Promise<void> {
    try {
      if (webhookData.object !== 'whatsapp_business_account') {
        return;
      }

      for (const entry of webhookData.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            await this.handleIncomingMessages(change.value);
          } else if (change.field === 'message_status') {
            await this.handleMessageStatus(change.value);
          }
        }
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }

  private async handleIncomingMessages(messageData: any): Promise<void> {
    const messages = messageData.messages || [];
    const tenantId = await this.getTenantIdByPhone(messageData.contacts?.[0]?.wa_id);

    for (const message of messages) {
      const incomingMessage: IncomingMessage = {
        id: message.id,
        from: message.from,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        type: message.type,
        content: message,
        tenantId,
        processed: false
      };

      this.incomingMessages.push(incomingMessage);
      
      // Process with chatbot
      const botResponse = await this.processChatbot(incomingMessage);
      if (botResponse) {
        await this.sendBotResponse(message.from, botResponse, tenantId);
        incomingMessage.processed = true;
      } else {
        await this.forwardToHuman(incomingMessage);
      }
    }

    this.saveData();
  }

  private async handleMessageStatus(statusData: any): Promise<void> {
    const statuses = statusData.statuses || [];
    
    for (const status of statuses) {
      const tenantId = await this.getTenantIdByPhone(status.recipient_id);
      this.updateAnalytics(status.status, tenantId);
    }
  }

  private async processChatbot(message: IncomingMessage): Promise<string | null> {
    if (message.type !== 'text') {
      return null;
    }

    const text = message.content.text?.body?.toLowerCase() || '';
    
    // Sort rules by priority
    const sortedRules = this.chatbotRules
      .filter(rule => rule.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const hasKeyword = rule.keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        if (rule.responseType === 'transfer') {
          await this.transferToHuman(message.from, rule.transferTo || 'general', message.tenantId);
        }
        return rule.response;
      }
    }

    return null;
  }

  private async sendBotResponse(to: string, response: string, tenantId: string): Promise<void> {
    await this.sendTextMessage(to, response);
  }

  private async transferToHuman(phone: string, department: string, tenantId: string): Promise<void> {
    console.log(`Transferring ${phone} to ${department} department for tenant ${tenantId}`);
    // Implement human transfer logic
  }

  private async forwardToHuman(message: IncomingMessage): Promise<void> {
    console.log('Forwarding message to human operator:', message);
    // Implement forward to human logic
  }

  private async getTenantIdByPhone(phone: string): Promise<string> {
    try {
      const patients = JSON.parse(localStorage.getItem('patients') || '[]');
      const patient = patients.find((p: any) => 
        p.phone === phone || p.whatsapp === phone || p.telefone === phone
      );
      return patient?.tenantId || 'default';
    } catch {
      return 'default';
    }
  }

  private async processScheduledMessages(): Promise<void> {
    const now = new Date();
    const readyMessages = this.messageQueue.filter(
      msg => msg.status === 'pending' && new Date(msg.scheduledFor) <= now
    );

    for (const scheduledMsg of readyMessages) {
      try {
        let result;
        
        if (scheduledMsg.message.type === 'template') {
          result = await this.sendTemplate(
            scheduledMsg.message.to,
            scheduledMsg.message.templateName!,
            Object.values(scheduledMsg.message.templateData || {}),
            scheduledMsg.tenantId
          );
        } else {
          result = await this.sendTextMessage(
            scheduledMsg.message.to,
            scheduledMsg.message.content
          );
        }

        scheduledMsg.status = result.success ? 'sent' : 'failed';
      } catch (error) {
        console.error('Error processing scheduled message:', error);
        scheduledMsg.status = 'failed';
      }
    }

    this.saveData();
  }

  private updateAnalytics(action: 'sent' | 'delivered' | 'read' | 'failed', tenantId: string): void {
    const today = new Date().toISOString().split('T')[0];
    let analytics = this.analytics.find(a => a.date === today && a.tenantId === tenantId);
    
    if (!analytics) {
      analytics = {
        messagesSent: 0,
        messagesDelivered: 0,
        messagesRead: 0,
        messagesFailed: 0,
        responseRate: 0,
        averageResponseTime: 0,
        botResolutionRate: 0,
        topQuestions: [],
        period: 'day',
        date: today,
        tenantId
      };
      this.analytics.push(analytics);
    }

    switch (action) {
      case 'sent':
        analytics.messagesSent++;
        break;
      case 'delivered':
        analytics.messagesDelivered++;
        break;
      case 'read':
        analytics.messagesRead++;
        break;
      case 'failed':
        analytics.messagesFailed++;
        break;
    }

    this.saveData();
  }

  // Schedule automated reminders
  async scheduleAutomatedReminders(
    patient: Patient,
    appointment: Appointment,
    tenantId: string
  ): Promise<{ reminder24h?: ScheduledMessage; reminder2h?: ScheduledMessage }> {
    if (!patient.phone) {
      return {};
    }

    const appointmentDate = new Date(appointment.date);
    const results: { reminder24h?: ScheduledMessage; reminder2h?: ScheduledMessage } = {};

    // 24-hour reminder
    const reminder24h = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > new Date()) {
      const message24h: WhatsAppMessage = {
        to: patient.phone,
        type: 'template',
        content: '',
        templateName: 'appointment_reminder_24h',
        templateData: {
          patient_name: patient.name,
          appointment_time: appointment.time,
          therapist_name: appointment.therapist || 'Fisioterapeuta'
        }
      };

      const scheduled24h: ScheduledMessage = {
        id: `reminder_24h_${appointment.id}_${Date.now()}`,
        patientId: patient.id,
        appointmentId: appointment.id,
        message: message24h,
        scheduledFor: reminder24h.toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        tenantId
      };

      this.messageQueue.push(scheduled24h);
      results.reminder24h = scheduled24h;
    }

    // 2-hour reminder
    const reminder2h = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
    if (reminder2h > new Date()) {
      const message2h: WhatsAppMessage = {
        to: patient.phone,
        type: 'template',
        content: '',
        templateName: 'appointment_reminder_2h',
        templateData: {
          patient_name: patient.name,
          appointment_time: appointment.time,
          therapist_name: appointment.therapist || 'Fisioterapeuta'
        }
      };

      const scheduled2h: ScheduledMessage = {
        id: `reminder_2h_${appointment.id}_${Date.now()}`,
        patientId: patient.id,
        appointmentId: appointment.id,
        message: message2h,
        scheduledFor: reminder2h.toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        tenantId
      };

      this.messageQueue.push(scheduled2h);
      results.reminder2h = scheduled2h;
    }

    this.saveData();
    return results;
  }

  // Send multimedia exercise content
  async sendExerciseContent(
    patient: Patient,
    exercises: Exercise[],
    tenantId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone' };
    }

    // Send exercise notification first
    const templateResult = await this.sendTemplate(
      patient.phone,
      'exercise_notification',
      [patient.name, 'https://portal.fisioflow.com/exercises'],
      tenantId
    );

    // Send individual exercise videos/images
    for (const exercise of exercises) {
      if (exercise.videoUrl) {
        await this.sendMedia(
          patient.phone,
          exercise.videoUrl,
          'video',
          `${exercise.name}: ${exercise.description}`,
          tenantId
        );
      }
      
      if (exercise.imageUrl) {
        await this.sendMedia(
          patient.phone,
          exercise.imageUrl,
          'image',
          `Demonstração: ${exercise.name}`,
          tenantId
        );
      }
    }

    return templateResult;
  }

  // Enhanced media sending with tenant support
  async sendMedia(
    to: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document' | 'audio',
    caption?: string,
    tenantId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { isValid, formattedPhone } = await this.validatePhoneNumber(to);
      
      if (!isValid || !formattedPhone) {
        return { success: false, error: 'Número de telefone inválido' };
      }

      const mediaObject: any = {
        link: mediaUrl,
      };

      if (caption && (mediaType === 'image' || mediaType === 'video')) {
        mediaObject.caption = caption;
      }

      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: mediaType,
          [mediaType]: mediaObject,
        }),
      });

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        if (tenantId) {
          this.updateAnalytics('sent', tenantId);
        }
        return {
          success: true,
          messageId: data.messages[0].id,
        };
      } else {
        if (tenantId) {
          this.updateAnalytics('failed', tenantId);
        }
        return {
          success: false,
          error: data.error?.message || 'Erro ao enviar mídia',
        };
      }
    } catch (error) {
      console.error('Erro ao enviar mídia WhatsApp:', error);
      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }

  // Get analytics data
  getAnalytics(tenantId: string, period: 'day' | 'week' | 'month' = 'day'): MessageAnalytics[] {
    return this.analytics.filter(a => a.tenantId === tenantId && a.period === period);
  }

  // Get message queue status
  getMessageQueue(tenantId: string): ScheduledMessage[] {
    return this.messageQueue.filter(q => q.tenantId === tenantId);
  }

  // Get incoming messages
  getIncomingMessages(tenantId: string): IncomingMessage[] {
    return this.incomingMessages.filter(m => m.tenantId === tenantId);
  }

  // Configure chatbot rules
  updateChatbotRules(rules: ChatbotRule[]): void {
    this.chatbotRules = rules;
    this.saveData();
  }

  // Get templates
  getTemplates(): MessageTemplate[] {
    return this.templates;
  }

  // Verify webhook
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookToken) {
      return challenge;
    }
    return null;
  }

  // Enviar mensagem de texto simples
  async sendTextMessage(to: string, message: string, tenantId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { isValid, formattedPhone } = await this.validatePhoneNumber(to);
      
      if (!isValid || !formattedPhone) {
        return { success: false, error: 'Número de telefone inválido' };
      }

      const response = await fetch(`${this.apiUrl}/${this.businessAccountId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          messageId: data.messages[0].id,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Erro ao enviar mensagem',
        };
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }

  // Enviar template de lembrete de consulta
  async sendAppointmentReminder(
    patient: Patient, 
    appointment: Appointment
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
    const formattedTime = appointment.time;

    const message = `🏥 *Lembrete de Consulta - FisioFlow*

Olá, ${patient.name}! 

📅 Você tem uma consulta agendada:
🗓️ Data: ${formattedDate}
⏰ Horário: ${formattedTime}
📍 Tipo: ${appointment.type}

${appointment.notes ? `📝 Observações: ${appointment.notes}` : ''}

⚠️ Lembre-se de chegar 15 minutos antes do horário marcado.

Se precisar reagendar, entre em contato conosco o quanto antes.

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Enviar confirmação de consulta
  async sendAppointmentConfirmation(
    patient: Patient, 
    appointment: Appointment
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

    const message = `✅ *Consulta Confirmada - FisioFlow*

Olá, ${patient.name}!

Sua consulta foi confirmada com sucesso:

📅 Data: ${formattedDate}
⏰ Horário: ${appointment.time}
📍 Tipo: ${appointment.type}

Aguardamos você! 

Para qualquer dúvida, entre em contato conosco.

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Enviar exercícios prescritos
  async sendExercisePrescription(
    patient: Patient, 
    exercises: Exercise[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    let message = `💪 *Exercícios Prescritos - FisioFlow*

Olá, ${patient.name}!

Seus exercícios foram atualizados. Confira abaixo:

`;

    exercises.forEach((exercise, index) => {
      message += `${index + 1}. *${exercise.name}*
📝 ${exercise.description}
⏱️ ${exercise.duration ? `${exercise.duration} minutos` : `${exercise.sets} séries de ${exercise.repetitions} repetições`}
📊 Nível: ${exercise.difficultyLevel}

`;
    });

    message += `⚠️ *Orientações importantes:*
• Execute os exercícios conforme orientado
• Respeite seus limites e não force além do confortável
• Em caso de dor, pare imediatamente
• Tire suas dúvidas na próxima consulta

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Enviar mensagem de boas-vindas
  async sendWelcomeMessage(patient: Patient): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    const message = `🎉 *Bem-vindo(a) ao FisioFlow!*

Olá, ${patient.name}!

É um prazer tê-lo(a) conosco! 

🏥 Agora você faz parte da nossa família FisioFlow e terá acesso a:

✅ Agendamentos personalizados
✅ Exercícios exclusivos
✅ Acompanhamento profissional
✅ Lembretes automáticos
✅ Suporte especializado

📱 Por este WhatsApp você receberá:
• Lembretes de consultas
• Exercícios prescritos
• Orientações importantes
• Atualizações do seu tratamento

Se tiver alguma dúvida, nossa equipe está sempre disponível para ajudar!

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Agendar mensagem para envio posterior
  async scheduleMessage(
    patientId: string,
    message: WhatsAppMessage,
    scheduledFor: Date,
    appointmentId?: string,
    exerciseId?: string
  ): Promise<ScheduledMessage> {
    const scheduledMessage: ScheduledMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      appointmentId,
      exerciseId,
      message,
      scheduledFor: scheduledFor.toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Em produção, salvar no banco de dados
    console.log('Mensagem agendada:', scheduledMessage);

    // Simular agendamento
    setTimeout(async () => {
      const result = await this.sendTextMessage(message.to, message.content);
      if (result.success) {
        scheduledMessage.status = 'sent';
      } else {
        scheduledMessage.status = 'failed';
      }
      console.log('Mensagem processada:', scheduledMessage);
    }, Math.max(0, scheduledFor.getTime() - Date.now()));

    return scheduledMessage;
  }

  // Cancelar mensagem agendada
  async cancelScheduledMessage(messageId: string): Promise<{ success: boolean }> {
    // Em produção, atualizar status no banco de dados
    console.log(`Mensagem ${messageId} cancelada`);
    return { success: true };
  }

  // Agendar lembrete de consulta (24h antes)
  async scheduleAppointmentReminder(
    patient: Patient,
    appointment: Appointment
  ): Promise<ScheduledMessage | null> {
    if (!patient.phone) {
      console.warn(`Paciente ${patient.name} não possui telefone`);
      return null;
    }

    const appointmentDate = new Date(appointment.date);
    const reminderDate = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000); // 24h antes

    // Não agendar se a consulta é em menos de 24h
    if (reminderDate.getTime() <= Date.now()) {
      console.warn('Consulta muito próxima para agendar lembrete');
      return null;
    }

    const appointmentDateFormatted = appointmentDate.toLocaleDateString('pt-BR');
    const message: WhatsAppMessage = {
      to: patient.phone,
      type: 'text',
      content: `🏥 *Lembrete de Consulta - FisioFlow*

Olá, ${patient.name}! 

📅 Você tem uma consulta agendada para AMANHÃ:
🗓️ Data: ${appointmentDateFormatted}
⏰ Horário: ${appointment.time}
📍 Tipo: ${appointment.type}

⚠️ Lembre-se de chegar 15 minutos antes.

Se precisar reagendar, entre em contato conosco.

Att, Equipe FisioFlow 💙`,
    };

    return this.scheduleMessage(
      patient.id,
      message,
      reminderDate,
      appointment.id
    );
  }

  // Verificar status de mensagem
  async getMessageStatus(messageId: string): Promise<{ status: string; timestamp?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      return {
        status: data.status || 'unknown',
        timestamp: data.timestamp,
      };
    } catch (error) {
      console.error('Erro ao verificar status da mensagem:', error);
      return { status: 'error' };
    }
  }

  // Enviar mídia (imagem, vídeo, documento)
  async sendMedia(
    to: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document',
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { isValid, formattedPhone } = await this.validatePhoneNumber(to);
      
      if (!isValid || !formattedPhone) {
        return { success: false, error: 'Número de telefone inválido' };
      }

      const mediaObject: any = {
        link: mediaUrl,
      };

      if (caption && (mediaType === 'image' || mediaType === 'video')) {
        mediaObject.caption = caption;
      }

      const response = await fetch(`${this.apiUrl}/${this.businessAccountId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: mediaType,
          [mediaType]: mediaObject,
        }),
      });

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          messageId: data.messages[0].id,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Erro ao enviar mídia',
        };
      }
    } catch (error) {
      console.error('Erro ao enviar mídia WhatsApp:', error);
      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }

  // Configurar webhook para receber mensagens
  async setupWebhook(webhookUrl: string, verifyToken: string): Promise<{ success: boolean; error?: string }> {
    // Esta função seria implementada no backend
    console.log('Configurando webhook:', { webhookUrl, verifyToken });
    return { success: true };
  }
}

export const whatsappService = new WhatsAppService();

// Hook React para integração fácil
export const useWhatsApp = () => {
  const sendAppointmentReminder = async (patient: Patient, appointment: Appointment) => {
    return whatsappService.sendAppointmentReminder(patient, appointment);
  };

  const sendAppointmentConfirmation = async (patient: Patient, appointment: Appointment) => {
    return whatsappService.sendAppointmentConfirmation(patient, appointment);
  };

  const sendExercisePrescription = async (patient: Patient, exercises: Exercise[]) => {
    return whatsappService.sendExercisePrescription(patient, exercises);
  };

  const sendWelcomeMessage = async (patient: Patient) => {
    return whatsappService.sendWelcomeMessage(patient);
  };

  const scheduleAppointmentReminder = async (patient: Patient, appointment: Appointment) => {
    return whatsappService.scheduleAppointmentReminder(patient, appointment);
  };

  const validatePhone = async (phone: string) => {
    return whatsappService.validatePhoneNumber(phone);
  };

  // New enhanced methods
  const sendTemplate = async (to: string, templateName: string, parameters: string[], tenantId: string) => {
    return whatsappService.sendTemplate(to, templateName, parameters, tenantId);
  };

  const sendInteractiveMessage = async (to: string, interactive: InteractiveMessage, tenantId: string) => {
    return whatsappService.sendInteractiveMessage(to, interactive, tenantId);
  };

  const sendMedia = async (to: string, mediaUrl: string, mediaType: 'image' | 'video' | 'document' | 'audio', caption?: string, tenantId?: string) => {
    return whatsappService.sendMedia(to, mediaUrl, mediaType, caption, tenantId);
  };

  const scheduleAutomatedReminders = async (patient: Patient, appointment: Appointment, tenantId: string) => {
    return whatsappService.scheduleAutomatedReminders(patient, appointment, tenantId);
  };

  const sendExerciseContent = async (patient: Patient, exercises: Exercise[], tenantId: string) => {
    return whatsappService.sendExerciseContent(patient, exercises, tenantId);
  };

  const processWebhook = async (webhookData: any) => {
    return whatsappService.processWebhook(webhookData);
  };

  const getAnalytics = (tenantId: string, period: 'day' | 'week' | 'month' = 'day') => {
    return whatsappService.getAnalytics(tenantId, period);
  };

  const getMessageQueue = (tenantId: string) => {
    return whatsappService.getMessageQueue(tenantId);
  };

  const getIncomingMessages = (tenantId: string) => {
    return whatsappService.getIncomingMessages(tenantId);
  };

  const updateChatbotRules = (rules: ChatbotRule[]) => {
    return whatsappService.updateChatbotRules(rules);
  };

  const getTemplates = () => {
    return whatsappService.getTemplates();
  };

  const verifyWebhook = (mode: string, token: string, challenge: string) => {
    return whatsappService.verifyWebhook(mode, token, challenge);
  };

  return {
    // Original methods
    sendAppointmentReminder,
    sendAppointmentConfirmation,
    sendExercisePrescription,
    sendWelcomeMessage,
    scheduleAppointmentReminder,
    validatePhone,
    
    // Enhanced methods
    sendTemplate,
    sendInteractiveMessage,
    sendMedia,
    scheduleAutomatedReminders,
    sendExerciseContent,
    processWebhook,
    getAnalytics,
    getMessageQueue,
    getIncomingMessages,
    updateChatbotRules,
    getTemplates,
    verifyWebhook,
  };
};

// Export interfaces for external use
export type {
  WhatsAppMessage,
  InteractiveMessage,
  MessageTemplate,
  ScheduledMessage,
  IncomingMessage,
  ChatbotRule,
  MessageAnalytics,
  ButtonAction,
  ListAction
};