import { Patient, Appointment, Exercise } from '../types';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'media';
  content: string;
  templateName?: string;
  templateData?: Record<string, string>;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
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
}

class WhatsAppService {
  private apiUrl: string;
  private accessToken: string;
  private businessAccountId: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '';
    this.businessAccountId = import.meta.env.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID || '';
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

  // Enviar mensagem de texto simples
  async sendTextMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

  return {
    sendAppointmentReminder,
    sendAppointmentConfirmation,
    sendExercisePrescription,
    sendWelcomeMessage,
    scheduleAppointmentReminder,
    validatePhone,
  };
};