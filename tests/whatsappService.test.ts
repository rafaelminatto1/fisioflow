import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { whatsappService, useWhatsApp } from '../services/whatsappService';
import { Patient, Appointment, Exercise } from '../types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_WHATSAPP_ACCESS_TOKEN: 'test_token',
  VITE_WHATSAPP_PHONE_NUMBER_ID: 'test_phone_id',
  VITE_WHATSAPP_BUSINESS_ACCOUNT_ID: 'test_business_id',
  VITE_WHATSAPP_WEBHOOK_TOKEN: 'test_webhook_token',
  VITE_WHATSAPP_API_VERSION: '19.0'
}));

describe('WhatsApp Service', () => {
  const mockPatient: Patient = {
    id: '1',
    name: 'João Silva',
    phone: '11999887766',
    email: 'joao@example.com',
    dateOfBirth: '1990-01-01',
    cpf: '123.456.789-00',
    address: 'Rua Teste, 123',
    tenantId: 'tenant1',
    createdAt: '2024-01-01T00:00:00Z',
    status: 'active'
  };

  const mockAppointment: Appointment = {
    id: '1',
    patientId: '1',
    patientName: 'João Silva',
    date: '2024-07-27',
    time: '14:00',
    type: 'Fisioterapia',
    status: 'scheduled',
    therapist: 'Dr. Maria',
    tenantId: 'tenant1',
    createdAt: '2024-01-01T00:00:00Z'
  };

  const mockExercises: Exercise[] = [
    {
      id: '1',
      name: 'Alongamento de Quadríceps',
      description: 'Alongamento para fortalecimento do quadríceps',
      duration: 10,
      sets: 3,
      repetitions: 15,
      difficultyLevel: 'Intermediário',
      muscleGroup: 'Pernas',
      videoUrl: 'https://example.com/video1.mp4',
      imageUrl: 'https://example.com/image1.jpg',
      patientId: '1',
      tenantId: 'tenant1',
      createdAt: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as Mock).mockClear();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Phone Number Validation', () => {
    it('should validate a correct Brazilian phone number', async () => {
      const result = await whatsappService.validatePhoneNumber('11999887766');
      
      expect(result.isValid).toBe(true);
      expect(result.formattedPhone).toBe('5511999887766');
    });

    it('should validate a phone number with country code', async () => {
      const result = await whatsappService.validatePhoneNumber('5511999887766');
      
      expect(result.isValid).toBe(true);
      expect(result.formattedPhone).toBe('5511999887766');
    });

    it('should reject an invalid phone number', async () => {
      const result = await whatsappService.validatePhoneNumber('123');
      
      expect(result.isValid).toBe(false);
      expect(result.formattedPhone).toBeUndefined();
    });

    it('should handle phone numbers with formatting', async () => {
      const result = await whatsappService.validatePhoneNumber('(11) 99988-7766');
      
      expect(result.isValid).toBe(true);
      expect(result.formattedPhone).toBe('5511999887766');
    });
  });

  describe('Text Message Sending', () => {
    it('should send a text message successfully', async () => {
      const mockResponse = {
        messages: [{ id: 'msg_123' }]
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await whatsappService.sendTextMessage('11999887766', 'Hello, World!');
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Hello, World!')
        })
      );
    });

    it('should handle API errors', async () => {
      const mockError = {
        error: { message: 'Invalid phone number' }
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError)
      });

      const result = await whatsappService.sendTextMessage('invalid', 'Hello');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Número de telefone inválido');
    });

    it('should handle network errors', async () => {
      (fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await whatsappService.sendTextMessage('11999887766', 'Hello');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro interno do servidor');
    });
  });

  describe('Template Messaging', () => {
    it('should send a template message successfully', async () => {
      const mockResponse = {
        messages: [{ id: 'msg_template_123' }]
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { sendTemplate } = useWhatsApp();
      const result = await sendTemplate(
        '5511999887766',
        'welcome_patient',
        ['João Silva'],
        'tenant1'
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_template_123');
    });

    it('should handle missing templates', async () => {
      const { sendTemplate } = useWhatsApp();
      const result = await sendTemplate(
        '5511999887766',
        'nonexistent_template',
        ['João Silva'],
        'tenant1'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('não encontrado');
    });
  });

  describe('Interactive Messages', () => {
    it('should send interactive message with buttons', async () => {
      const mockResponse = {
        messages: [{ id: 'msg_interactive_123' }]
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { sendInteractiveMessage } = useWhatsApp();
      const interactive = {
        type: 'button' as const,
        body: 'Confirme sua presença:',
        action: {
          buttons: [
            { id: 'confirm', title: 'Confirmar' },
            { id: 'cancel', title: 'Cancelar' }
          ]
        }
      };

      const result = await sendInteractiveMessage(
        '5511999887766',
        interactive,
        'tenant1'
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_interactive_123');
    });
  });

  describe('Media Messages', () => {
    it('should send image message successfully', async () => {
      const mockResponse = {
        messages: [{ id: 'msg_media_123' }]
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { sendMedia } = useWhatsApp();
      const result = await sendMedia(
        '5511999887766',
        'https://example.com/image.jpg',
        'image',
        'Test image caption',
        'tenant1'
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_media_123');
    });

    it('should send video message successfully', async () => {
      const mockResponse = {
        messages: [{ id: 'msg_video_123' }]
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { sendMedia } = useWhatsApp();
      const result = await sendMedia(
        '5511999887766',
        'https://example.com/video.mp4',
        'video',
        'Exercise demonstration',
        'tenant1'
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_video_123');
    });

    it('should send document message successfully', async () => {
      const mockResponse = {
        messages: [{ id: 'msg_doc_123' }]
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { sendMedia } = useWhatsApp();
      const result = await sendMedia(
        '5511999887766',
        'https://example.com/document.pdf',
        'document',
        undefined,
        'tenant1'
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_doc_123');
    });
  });

  describe('Appointment Reminders', () => {
    it('should send appointment reminder successfully', async () => {
      const mockResponse = {
        messages: [{ id: 'msg_reminder_123' }]
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await whatsappService.sendAppointmentReminder(mockPatient, mockAppointment);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_reminder_123');
    });

    it('should handle patient without phone', async () => {
      const patientNoPhone = { ...mockPatient, phone: '' };
      
      const result = await whatsappService.sendAppointmentReminder(patientNoPhone, mockAppointment);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('telefone cadastrado');
    });

    it('should schedule automated reminders', async () => {
      const { scheduleAutomatedReminders } = useWhatsApp();
      
      // Mock future appointment (tomorrow)
      const futureAppointment = {
        ...mockAppointment,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const result = await scheduleAutomatedReminders(mockPatient, futureAppointment, 'tenant1');
      
      expect(result.reminder24h).toBeDefined();
      expect(result.reminder2h).toBeDefined();
      expect(result.reminder24h?.status).toBe('pending');
      expect(result.reminder2h?.status).toBe('pending');
    });

    it('should not schedule reminders for past appointments', async () => {
      const { scheduleAutomatedReminders } = useWhatsApp();
      
      // Mock past appointment
      const pastAppointment = {
        ...mockAppointment,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const result = await scheduleAutomatedReminders(mockPatient, pastAppointment, 'tenant1');
      
      expect(result.reminder24h).toBeUndefined();
      expect(result.reminder2h).toBeUndefined();
    });
  });

  describe('Exercise Content', () => {
    it('should send exercise content with media', async () => {
      const mockTemplateResponse = {
        messages: [{ id: 'msg_template_123' }]
      };

      const mockMediaResponse = {
        messages: [{ id: 'msg_media_123' }]
      };

      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTemplateResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMediaResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMediaResponse)
        });

      const { sendExerciseContent } = useWhatsApp();
      const result = await sendExerciseContent(mockPatient, mockExercises, 'tenant1');
      
      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3); // Template + video + image
    });

    it('should handle patient without phone for exercises', async () => {
      const patientNoPhone = { ...mockPatient, phone: '' };
      
      const { sendExerciseContent } = useWhatsApp();
      const result = await sendExerciseContent(patientNoPhone, mockExercises, 'tenant1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('telefone');
    });
  });

  describe('Webhook Processing', () => {
    it('should process incoming text messages', async () => {
      const webhookData = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              messages: [{
                id: 'msg_incoming_123',
                from: '5511999887766',
                type: 'text',
                timestamp: '1627846261',
                text: { body: 'Olá' }
              }],
              contacts: [{ wa_id: '5511999887766' }]
            }
          }]
        }]
      };

      // Mock patient data in localStorage
      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockPatient]));

      const { processWebhook } = useWhatsApp();
      await processWebhook(webhookData);

      // Should have processed the greeting message
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should process message status updates', async () => {
      const webhookData = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'message_status',
            value: {
              statuses: [{
                id: 'msg_123',
                recipient_id: '5511999887766',
                status: 'delivered',
                timestamp: '1627846261'
              }]
            }
          }]
        }]
      };

      const { processWebhook } = useWhatsApp();
      await processWebhook(webhookData);

      // Should have updated analytics
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should ignore non-whatsapp webhook data', async () => {
      const webhookData = {
        object: 'other_service',
        entry: []
      };

      const { processWebhook } = useWhatsApp();
      await processWebhook(webhookData);

      // Should not process anything
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Chatbot Functionality', () => {
    it('should respond to greeting messages', async () => {
      const incomingMessage = {
        id: 'msg_123',
        from: '5511999887766',
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        content: { text: { body: 'Olá' } },
        tenantId: 'tenant1',
        processed: false
      };

      // Mock the private method by calling the service directly
      const response = await (whatsappService as any).processChatbot(incomingMessage);
      
      expect(response).toContain('assistente virtual');
    });

    it('should respond to scheduling queries', async () => {
      const incomingMessage = {
        id: 'msg_124',
        from: '5511999887766',
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        content: { text: { body: 'quero agendar uma consulta' } },
        tenantId: 'tenant1',
        processed: false
      };

      const response = await (whatsappService as any).processChatbot(incomingMessage);
      
      expect(response).toContain('agendar');
      expect(response).toContain('consulta');
    });

    it('should handle priority-based rule matching', async () => {
      const incomingMessage = {
        id: 'msg_125',
        from: '5511999887766',
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        content: { text: { body: 'estou com dor' } },
        tenantId: 'tenant1',
        processed: false
      };

      const response = await (whatsappService as any).processChatbot(incomingMessage);
      
      expect(response).toContain('fisioterapeuta');
      expect(response).toContain('urgente');
    });

    it('should return null for unrecognized messages', async () => {
      const incomingMessage = {
        id: 'msg_126',
        from: '5511999887766',
        timestamp: new Date().toISOString(),
        type: 'text' as const,
        content: { text: { body: 'mensagem aleatória sem palavras-chave' } },
        tenantId: 'tenant1',
        processed: false
      };

      const response = await (whatsappService as any).processChatbot(incomingMessage);
      
      expect(response).toBeNull();
    });
  });

  describe('Analytics', () => {
    it('should track message analytics', () => {
      const { updateChatbotRules } = useWhatsApp();
      
      // Simulate analytics update
      (whatsappService as any).updateAnalytics('sent', 'tenant1');
      (whatsappService as any).updateAnalytics('delivered', 'tenant1');
      (whatsappService as any).updateAnalytics('read', 'tenant1');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'whatsapp_analytics',
        expect.stringContaining('messagesSent')
      );
    });

    it('should retrieve analytics by tenant', () => {
      const mockAnalytics = [{
        messagesSent: 10,
        messagesDelivered: 9,
        messagesRead: 7,
        messagesFailed: 1,
        responseRate: 70,
        averageResponseTime: 120,
        botResolutionRate: 85,
        topQuestions: [],
        period: 'day' as const,
        date: '2024-07-26',
        tenantId: 'tenant1'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAnalytics));

      const { getAnalytics } = useWhatsApp();
      const analytics = getAnalytics('tenant1');
      
      expect(analytics).toHaveLength(1);
      expect(analytics[0].messagesSent).toBe(10);
      expect(analytics[0].tenantId).toBe('tenant1');
    });
  });

  describe('Message Queue', () => {
    it('should retrieve message queue by tenant', () => {
      const mockQueue = [{
        id: 'scheduled_1',
        patientId: '1',
        message: {
          to: '5511999887766',
          type: 'text' as const,
          content: 'Test message'
        },
        scheduledFor: new Date().toISOString(),
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        tenantId: 'tenant1'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));

      const { getMessageQueue } = useWhatsApp();
      const queue = getMessageQueue('tenant1');
      
      expect(queue).toHaveLength(1);
      expect(queue[0].tenantId).toBe('tenant1');
      expect(queue[0].status).toBe('pending');
    });
  });

  describe('Webhook Verification', () => {
    it('should verify webhook with correct token', () => {
      const { verifyWebhook } = useWhatsApp();
      const result = verifyWebhook('subscribe', 'test_webhook_token', 'challenge_123');
      
      expect(result).toBe('challenge_123');
    });

    it('should reject webhook with incorrect token', () => {
      const { verifyWebhook } = useWhatsApp();
      const result = verifyWebhook('subscribe', 'wrong_token', 'challenge_123');
      
      expect(result).toBeNull();
    });

    it('should reject webhook with incorrect mode', () => {
      const { verifyWebhook } = useWhatsApp();
      const result = verifyWebhook('unsubscribe', 'test_webhook_token', 'challenge_123');
      
      expect(result).toBeNull();
    });
  });

  describe('Template Management', () => {
    it('should retrieve available templates', () => {
      const { getTemplates } = useWhatsApp();
      const templates = getTemplates();
      
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('category');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => {
        (whatsappService as any).loadStoredData();
      }).not.toThrow();
    });

    it('should handle JSON parsing errors', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      expect(() => {
        (whatsappService as any).loadStoredData();
      }).not.toThrow();
    });
  });
});

describe('WhatsApp Hook Integration', () => {
  it('should provide all expected methods', () => {
    const hook = useWhatsApp();
    
    expect(hook).toHaveProperty('sendAppointmentReminder');
    expect(hook).toHaveProperty('sendAppointmentConfirmation');
    expect(hook).toHaveProperty('sendExercisePrescription');
    expect(hook).toHaveProperty('sendWelcomeMessage');
    expect(hook).toHaveProperty('validatePhone');
    expect(hook).toHaveProperty('sendTemplate');
    expect(hook).toHaveProperty('sendInteractiveMessage');
    expect(hook).toHaveProperty('sendMedia');
    expect(hook).toHaveProperty('scheduleAutomatedReminders');
    expect(hook).toHaveProperty('sendExerciseContent');
    expect(hook).toHaveProperty('processWebhook');
    expect(hook).toHaveProperty('getAnalytics');
    expect(hook).toHaveProperty('getMessageQueue');
    expect(hook).toHaveProperty('getIncomingMessages');
    expect(hook).toHaveProperty('updateChatbotRules');
    expect(hook).toHaveProperty('getTemplates');
    expect(hook).toHaveProperty('verifyWebhook');
  });

  it('should maintain function references', () => {
    const hook1 = useWhatsApp();
    const hook2 = useWhatsApp();
    
    // Functions should be different instances but work identically
    expect(typeof hook1.sendTemplate).toBe('function');
    expect(typeof hook2.sendTemplate).toBe('function');
  });
});