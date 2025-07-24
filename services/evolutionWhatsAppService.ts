import { Patient, Appointment, Exercise } from '../types';

interface EvolutionAPIConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

interface WhatsAppMessage {
  number: string;
  text: string;
}

interface MediaMessage extends WhatsAppMessage {
  mediatype: 'image' | 'video' | 'audio' | 'document';
  media: string; // URL ou base64
  caption?: string;
}

interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface InstanceStatus {
  instance: string;
  status: 'open' | 'close' | 'connecting';
  qrcode?: string;
}

class EvolutionWhatsAppService {
  private config: EvolutionAPIConfig;

  constructor() {
    this.config = {
      baseUrl: 'http://localhost:8080',
      apiKey: 'fisioflow-2024-secret-key',
      instanceName: 'fisioflow',
    };
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Evolution API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // Criar instância WhatsApp
  async createInstance(): Promise<{ success: boolean; qrcode?: string; error?: string }> {
    try {
      const response = await this.makeRequest('/instance/create', 'POST', {
        instanceName: this.config.instanceName,
        token: this.config.apiKey,
        qrcode: true,
        webhook: `${window.location.origin}/api/webhook/whatsapp`,
        webhookByEvents: true,
        webhookBase64: false,
      });

      return {
        success: true,
        qrcode: response.qrcode,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // Verificar status da instância
  async getInstanceStatus(): Promise<InstanceStatus | null> {
    try {
      const response = await this.makeRequest(`/instance/connectionState/${this.config.instanceName}`);
      return {
        instance: this.config.instanceName,
        status: response.state,
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return null;
    }
  }

  // Conectar instância (obter QR code)
  async connectInstance(): Promise<{ success: boolean; qrcode?: string; error?: string }> {
    try {
      const response = await this.makeRequest(`/instance/connect/${this.config.instanceName}`);
      return {
        success: true,
        qrcode: response.qrcode,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao conectar',
      };
    }
  }

  // Validar e formatar número brasileiro
  private formatBrazilianNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se já tem código do país, retorna como está
    if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
      return cleanPhone;
    }
    
    // Se tem 11 dígitos (com DDD), adiciona código do país
    if (cleanPhone.length === 11) {
      return `55${cleanPhone}`;
    }
    
    // Se tem 10 dígitos (sem 9 no celular), adiciona 9 e código do país
    if (cleanPhone.length === 10) {
      const ddd = cleanPhone.substring(0, 2);
      const number = cleanPhone.substring(2);
      return `55${ddd}9${number}`;
    }
    
    // Retorna como estava se não conseguir formatar
    return cleanPhone;
  }

  // Enviar mensagem de texto
  async sendTextMessage(to: string, message: string): Promise<MessageResponse> {
    try {
      const formattedNumber = this.formatBrazilianNumber(to);
      
      const response = await this.makeRequest(`/message/sendText/${this.config.instanceName}`, 'POST', {
        number: formattedNumber,
        text: message,
      });

      if (response.key?.id) {
        return {
          success: true,
          messageId: response.key.id,
        };
      } else {
        return {
          success: false,
          error: 'Resposta inválida da API',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
      };
    }
  }

  // Enviar mídia
  async sendMediaMessage(to: string, mediaUrl: string, mediaType: 'image' | 'video' | 'audio' | 'document', caption?: string): Promise<MessageResponse> {
    try {
      const formattedNumber = this.formatBrazilianNumber(to);
      
      const mediaData: any = {
        number: formattedNumber,
        mediatype: mediaType,
        media: mediaUrl,
      };

      if (caption) {
        mediaData.caption = caption;
      }

      const response = await this.makeRequest(`/message/sendMedia/${this.config.instanceName}`, 'POST', mediaData);

      if (response.key?.id) {
        return {
          success: true,
          messageId: response.key.id,
        };
      } else {
        return {
          success: false,
          error: 'Resposta inválida da API',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar mídia',
      };
    }
  }

  // Templates de mensagens específicas do FisioFlow

  // Lembrete de consulta
  async sendAppointmentReminder(patient: Patient, appointment: Appointment): Promise<MessageResponse> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

    const message = `🏥 *Lembrete de Consulta - FisioFlow*

Olá, ${patient.name}! 

📅 Você tem uma consulta agendada para AMANHÃ:
🗓️ *Data:* ${formattedDate}
⏰ *Horário:* ${appointment.time}
📍 *Tipo:* ${appointment.type}

${appointment.notes ? `📝 *Observações:* ${appointment.notes}\n\n` : ''}⚠️ *Importante:* Chegue 15 minutos antes do horário marcado.

Se precisar reagendar, entre em contato conosco o quanto antes.

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Confirmação de consulta
  async sendAppointmentConfirmation(patient: Patient, appointment: Appointment): Promise<MessageResponse> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

    const message = `✅ *Consulta Confirmada - FisioFlow*

Olá, ${patient.name}!

Sua consulta foi *confirmada* com sucesso:

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${appointment.time}
📍 *Tipo:* ${appointment.type}

🎉 Estamos ansiosos para atendê-lo(a)!

Para qualquer dúvida, entre em contato conosco.

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Exercícios prescritos
  async sendExercisePrescription(patient: Patient, exercises: Exercise[]): Promise<MessageResponse> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    let message = `💪 *Exercícios Prescritos - FisioFlow*

Olá, ${patient.name}!

Seus exercícios foram atualizados. Confira abaixo:

`;

    exercises.forEach((exercise, index) => {
      message += `*${index + 1}. ${exercise.name}*
📝 ${exercise.description}
⏱️ ${exercise.duration ? `${exercise.duration} minutos` : `${exercise.sets} séries de ${exercise.repetitions} repetições`}
📊 Nível: ${exercise.difficultyLevel}

`;
    });

    message += `⚠️ *Orientações importantes:*
• Execute os exercícios conforme orientado
• Respeite seus limites e não force além do confortável
• Em caso de dor, pare imediatamente e nos informe
• Tire suas dúvidas na próxima consulta

💡 *Dica:* Mantenha regularidade para melhores resultados!

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Mensagem de boas-vindas
  async sendWelcomeMessage(patient: Patient): Promise<MessageResponse> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    const message = `🎉 *Bem-vindo(a) ao FisioFlow!*

Olá, ${patient.name}!

É um prazer tê-lo(a) conosco! 

🏥 Agora você faz parte da nossa família FisioFlow e terá acesso a:

✅ Agendamentos personalizados
✅ Exercícios exclusivos para seu caso
✅ Acompanhamento profissional contínuo
✅ Lembretes automáticos
✅ Suporte especializado da nossa equipe

📱 *Por este WhatsApp você receberá:*
• Lembretes de consultas
• Exercícios prescritos
• Orientações importantes
• Atualizações do seu tratamento
• Dicas de saúde

Se tiver alguma dúvida, nossa equipe está sempre disponível para ajudar!

Vamos juntos cuidar da sua saúde! 💪

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Cancelamento de consulta
  async sendAppointmentCancellation(patient: Patient, appointment: Appointment, reason?: string): Promise<MessageResponse> {
    if (!patient.phone) {
      return { success: false, error: 'Paciente não possui telefone cadastrado' };
    }

    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

    const message = `❌ *Consulta Cancelada - FisioFlow*

Olá, ${patient.name}!

Informamos que sua consulta foi cancelada:

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${appointment.time}
📍 *Tipo:* ${appointment.type}

${reason ? `📝 *Motivo:* ${reason}\n\n` : ''}🔄 *Para reagendar:*
Entre em contato conosco para marcar uma nova data que seja conveniente para você.

Pedimos desculpas por qualquer inconveniente.

Att,
Equipe FisioFlow 💙`;

    return this.sendTextMessage(patient.phone, message);
  }

  // Verificar se instância está conectada
  async isConnected(): Promise<boolean> {
    try {
      const status = await this.getInstanceStatus();
      return status?.status === 'open';
    } catch {
      return false;
    }
  }

  // Obter informações da conta conectada
  async getAccountInfo(): Promise<any> {
    try {
      return await this.makeRequest(`/instance/fetchInstances`);
    } catch (error) {
      console.error('Erro ao obter info da conta:', error);
      return null;
    }
  }
}

// Instância singleton
export const evolutionWhatsAppService = new EvolutionWhatsAppService();

// Hook React para usar o WhatsApp
export const useEvolutionWhatsApp = () => {
  const sendAppointmentReminder = async (patient: Patient, appointment: Appointment) => {
    return evolutionWhatsAppService.sendAppointmentReminder(patient, appointment);
  };

  const sendAppointmentConfirmation = async (patient: Patient, appointment: Appointment) => {
    return evolutionWhatsAppService.sendAppointmentConfirmation(patient, appointment);
  };

  const sendExercisePrescription = async (patient: Patient, exercises: Exercise[]) => {
    return evolutionWhatsAppService.sendExercisePrescription(patient, exercises);
  };

  const sendWelcomeMessage = async (patient: Patient) => {
    return evolutionWhatsAppService.sendWelcomeMessage(patient);
  };

  const sendAppointmentCancellation = async (patient: Patient, appointment: Appointment, reason?: string) => {
    return evolutionWhatsAppService.sendAppointmentCancellation(patient, appointment, reason);
  };

  const getInstanceStatus = async () => {
    return evolutionWhatsAppService.getInstanceStatus();
  };

  const connectInstance = async () => {
    return evolutionWhatsAppService.connectInstance();
  };

  const isConnected = async () => {
    return evolutionWhatsAppService.isConnected();
  };

  return {
    sendAppointmentReminder,
    sendAppointmentConfirmation,
    sendExercisePrescription,
    sendWelcomeMessage,
    sendAppointmentCancellation,
    getInstanceStatus,
    connectInstance,
    isConnected,
  };
};