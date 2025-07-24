import { 
  Chat, 
  ChatMessage, 
  ChatAttachment, 
  ChatNotification, 
  MessageTemplate, 
  UserStatus, 
  VoiceCall, 
  VideoCall,
  MessageType,
  User,
  UserRole
} from '../types';

export interface ChatEvent {
  type: 'message' | 'typing' | 'read' | 'online_status' | 'notification';
  data: any;
  chatId?: string;
  userId?: string;
  timestamp: string;
}

class ChatService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private eventListeners: Map<string, Function[]> = new Map();
  private messageQueue: ChatMessage[] = [];
  private isConnected = false;
  private currentUserId: string | null = null;
  private currentTenantId: string | null = null;

  /**
   * Inicializa conexão WebSocket
   */
  initialize(userId: string, tenantId: string): void {
    this.currentUserId = userId;
    this.currentTenantId = tenantId;
    this.connect();
  }

  /**
   * Conecta ao WebSocket
   */
  private connect(): void {
    try {
      // Em produção, isso seria uma URL WebSocket real
      // Para desenvolvimento, vamos simular a conexão
      this.simulateWebSocketConnection();
      
      // URL real seria algo como: wss://api.fisioflow.com/ws
      // this.ws = new WebSocket(`wss://api.fisioflow.com/ws?userId=${this.currentUserId}&tenantId=${this.currentTenantId}`);
      
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Simula conexão WebSocket para desenvolvimento
   */
  private simulateWebSocketConnection(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    console.log('Chat service connected (simulated)');
    this.emit('connected', { userId: this.currentUserId });

    // Processa mensagens na fila
    this.processMessageQueue();
  }

  /**
   * Agenda reconexão
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connect();
      }, this.reconnectInterval);
    }
  }

  /**
   * Envia mensagem
   */
  async sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const fullMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    if (this.isConnected) {
      this.emit('message_sent', fullMessage);
      
      // Simula envio via WebSocket
      this.simulateMessageDelivery(fullMessage);
    } else {
      // Adiciona à fila se não conectado
      this.messageQueue.push(fullMessage);
    }

    // Salva localmente
    this.saveMessageLocally(fullMessage);
    
    return fullMessage;
  }

  /**
   * Simula entrega de mensagem
   */
  private simulateMessageDelivery(message: ChatMessage): void {
    // Simula delay de rede
    setTimeout(() => {
      this.emit('message_received', message);
      
      // Simula notificação para o destinatário
      if (message.receiverId !== this.currentUserId) {
        this.simulateNotification(message);
      }
    }, 100 + Math.random() * 500);
  }

  /**
   * Simula notificação
   */
  private simulateNotification(message: ChatMessage): void {
    const notification: ChatNotification = {
      id: `notif-${Date.now()}`,
      userId: message.receiverId,
      chatId: message.chatId,
      messageId: message.id,
      type: 'new_message',
      title: 'Nova mensagem',
      body: this.getNotificationBody(message),
      createdAt: new Date().toISOString(),
      tenantId: message.tenantId,
    };

    this.emit('notification', notification);
  }

  /**
   * Obtém corpo da notificação
   */
  private getNotificationBody(message: ChatMessage): string {
    switch (message.type) {
      case 'text':
        return message.text || 'Mensagem de texto';
      case 'image':
        return '📷 Imagem';
      case 'video':
        return '🎥 Vídeo';
      case 'audio':
        return '🎵 Áudio';
      case 'exercise':
        return '💪 Exercício compartilhado';
      case 'appointment':
        return '📅 Agendamento';
      default:
        return 'Nova mensagem';
    }
  }

  /**
   * Marca mensagem como lida
   */
  async markAsRead(messageId: string, chatId: string): Promise<void> {
    const readTimestamp = new Date().toISOString();
    
    // Atualiza localmente
    this.updateMessageReadStatus(messageId, readTimestamp);
    
    // Envia via WebSocket
    if (this.isConnected) {
      this.emit('message_read', { messageId, chatId, readAt: readTimestamp });
    }
  }

  /**
   * Envia status de digitação
   */
  sendTypingStatus(chatId: string, isTyping: boolean): void {
    if (this.isConnected) {
      this.emit('typing', { 
        chatId, 
        userId: this.currentUserId, 
        isTyping,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Atualiza status online
   */
  updateOnlineStatus(status: 'available' | 'busy' | 'away' | 'offline'): void {
    const userStatus: UserStatus = {
      userId: this.currentUserId!,
      isOnline: status !== 'offline',
      lastSeen: new Date().toISOString(),
      isTyping: false,
      status,
    };

    this.saveUserStatusLocally(userStatus);

    if (this.isConnected) {
      this.emit('online_status', userStatus);
    }
  }

  /**
   * Cria novo chat
   */
  async createChat(participantIds: string[], participantRoles: Record<string, UserRole>): Promise<Chat> {
    const chatId = `chat-${participantIds.sort().join('-')}-${Date.now()}`;
    
    const chat: Chat = {
      id: chatId,
      participants: participantIds,
      participantRoles,
      lastMessageTimestamp: new Date().toISOString(),
      unreadCount: {},
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: this.currentTenantId!,
      settings: {
        allowFileSharing: true,
        allowVoiceMessages: true,
        allowVideoCall: true,
        enableTranslation: false,
        enableNotifications: true,
        notificationSound: 'default',
      }
    };

    // Inicializa contador de não lidas
    participantIds.forEach(id => {
      chat.unreadCount[id] = 0;
    });

    this.saveChatLocally(chat);
    return chat;
  }

  /**
   * Upload de anexo
   */
  async uploadAttachment(file: File): Promise<ChatAttachment> {
    // Simula upload - em produção seria um upload real
    const attachment: ChatAttachment = {
      id: `attach-${Date.now()}`,
      type: this.getAttachmentType(file.type),
      url: URL.createObjectURL(file), // Em produção seria URL do servidor
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };

    // Gera thumbnail para imagens/vídeos
    if (file.type.startsWith('image/')) {
      attachment.thumbnailUrl = await this.generateThumbnail(file);
    }

    return attachment;
  }

  /**
   * Gera thumbnail
   */
  private async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = 100;
        canvas.height = 100;
        ctx?.drawImage(img, 0, 0, 100, 100);
        resolve(canvas.toDataURL());
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Determina tipo de anexo
   */
  private getAttachmentType(mimeType: string): 'image' | 'video' | 'audio' | 'file' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  }

  /**
   * Busca mensagens
   */
  async searchMessages(chatId: string, query: string, limit = 50): Promise<ChatMessage[]> {
    const messages = this.getMessagesLocally(chatId);
    
    return messages
      .filter(msg => 
        msg.text?.toLowerCase().includes(query.toLowerCase()) ||
        msg.attachments?.some(att => att.name.toLowerCase().includes(query.toLowerCase()))
      )
      .slice(0, limit);
  }

  /**
   * Obtém templates de mensagem
   */
  getMessageTemplates(userRole: UserRole): MessageTemplate[] {
    const templates = this.getTemplatesLocally();
    return templates.filter(t => t.userRole === userRole && t.isActive);
  }

  /**
   * Cria template de mensagem
   */
  async createMessageTemplate(template: Omit<MessageTemplate, 'id' | 'createdAt' | 'usageCount'>): Promise<MessageTemplate> {
    const fullTemplate: MessageTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.saveTemplateLocally(fullTemplate);
    return fullTemplate;
  }

  /**
   * Compartilha exercício no chat
   */
  async shareExercise(chatId: string, receiverId: string, exerciseId: string, message?: string): Promise<ChatMessage> {
    return this.sendMessage({
      chatId,
      senderId: this.currentUserId!,
      receiverId,
      text: message || 'Exercício compartilhado',
      type: 'exercise',
      metadata: { exerciseId },
      tenantId: this.currentTenantId!,
    });
  }

  /**
   * Inicia chamada de voz
   */
  async startVoiceCall(chatId: string, receiverId: string): Promise<VoiceCall> {
    const call: VoiceCall = {
      id: `voice-${Date.now()}`,
      chatId,
      initiatorId: this.currentUserId!,
      receiverId,
      status: 'initiated',
      tenantId: this.currentTenantId!,
    };

    this.saveCallLocally(call);
    
    if (this.isConnected) {
      this.emit('voice_call_initiated', call);
    }

    return call;
  }

  /**
   * Traduz mensagem
   */
  async translateMessage(messageId: string, targetLanguage: string): Promise<string> {
    // Simula tradução - em produção seria API de tradução real
    const message = this.getMessageLocally(messageId);
    if (!message?.text) return '';

    // Simulação simples
    const translations: Record<string, string> = {
      'en': 'Hello, how are you?',
      'es': 'Hola, ¿cómo estás?',
      'fr': 'Bonjour, comment allez-vous?',
    };

    return translations[targetLanguage] || message.text;
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Métodos de armazenamento local (simulação)
  private saveMessageLocally(message: ChatMessage): void {
    const messages = this.getMessagesLocally(message.chatId);
    messages.push(message);
    localStorage.setItem(`chat-messages-${message.chatId}`, JSON.stringify(messages));
  }

  private getMessagesLocally(chatId: string): ChatMessage[] {
    try {
      const data = localStorage.getItem(`chat-messages-${chatId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private getMessageLocally(messageId: string): ChatMessage | null {
    // Busca em todos os chats locais
    const chats = this.getChatsLocally();
    for (const chat of chats) {
      const messages = this.getMessagesLocally(chat.id);
      const message = messages.find(m => m.id === messageId);
      if (message) return message;
    }
    return null;
  }

  private updateMessageReadStatus(messageId: string, readAt: string): void {
    const message = this.getMessageLocally(messageId);
    if (message) {
      message.readAt = readAt;
      this.saveMessageLocally(message);
    }
  }

  private saveChatLocally(chat: Chat): void {
    const chats = this.getChatsLocally();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.push(chat);
    }
    
    localStorage.setItem('fisioflow-chats', JSON.stringify(chats));
  }

  private getChatsLocally(): Chat[] {
    try {
      const data = localStorage.getItem('fisioflow-chats');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveUserStatusLocally(status: UserStatus): void {
    localStorage.setItem(`user-status-${status.userId}`, JSON.stringify(status));
  }

  private saveCallLocally(call: VoiceCall | VideoCall): void {
    const calls = this.getCallsLocally();
    calls.push(call);
    localStorage.setItem('fisioflow-calls', JSON.stringify(calls));
  }

  private getCallsLocally(): (VoiceCall | VideoCall)[] {
    try {
      const data = localStorage.getItem('fisioflow-calls');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private getTemplatesLocally(): MessageTemplate[] {
    try {
      const data = localStorage.getItem('fisioflow-message-templates');
      return data ? JSON.parse(data) : this.getDefaultTemplates();
    } catch {
      return this.getDefaultTemplates();
    }
  }

  private saveTemplateLocally(template: MessageTemplate): void {
    const templates = this.getTemplatesLocally();
    templates.push(template);
    localStorage.setItem('fisioflow-message-templates', JSON.stringify(templates));
  }

  private getDefaultTemplates(): MessageTemplate[] {
    return [
      {
        id: 'template-1',
        title: 'Saudação Inicial',
        content: 'Olá! Como posso ajudá-lo hoje?',
        category: 'greeting',
        userRole: 'fisio' as UserRole,
        isActive: true,
        usageCount: 0,
        createdById: 'system',
        createdAt: new Date().toISOString(),
        tenantId: this.currentTenantId!,
      },
      {
        id: 'template-2',
        title: 'Lembrete de Exercício',
        content: 'Lembre-se de fazer seus exercícios hoje! Se tiver dúvidas, estou aqui para ajudar.',
        category: 'reminder',
        userRole: 'fisio' as UserRole,
        isActive: true,
        usageCount: 0,
        createdById: 'system',
        createdAt: new Date().toISOString(),
        tenantId: this.currentTenantId!,
      },
      {
        id: 'template-3',
        title: 'Agendamento',
        content: 'Gostaria de agendar uma consulta? Que dia e horário seria melhor para você?',
        category: 'appointment',
        userRole: 'fisio' as UserRole,
        isActive: true,
        usageCount: 0,
        createdById: 'system',
        createdAt: new Date().toISOString(),
        tenantId: this.currentTenantId!,
      },
    ];
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.simulateMessageDelivery(message);
      }
    }
  }

  /**
   * Desconecta o serviço
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
  }

  /**
   * Obtém status de conexão
   */
  isConnectedToChat(): boolean {
    return this.isConnected;
  }

  /**
   * Obtém chats do usuário atual
   */
  getUserChats(): Chat[] {
    if (!this.currentUserId) return [];
    
    return this.getChatsLocally().filter(chat => 
      chat.participants.includes(this.currentUserId!) &&
      chat.tenantId === this.currentTenantId
    );
  }

  /**
   * Obtém mensagens de um chat
   */
  getChatMessages(chatId: string, limit = 100): ChatMessage[] {
    return this.getMessagesLocally(chatId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-limit);
  }
}

export const chatService = new ChatService();