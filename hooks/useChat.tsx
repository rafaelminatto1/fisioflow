import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { 
  Chat, 
  ChatMessage, 
  ChatNotification, 
  MessageTemplate, 
  UserStatus, 
  User,
  UserRole 
} from '../types';
import { chatService } from '../services/chatService';
import { notificationService } from '../services/notificationService';
import { useAuth } from './useAuth';
import { useNotification } from './useNotification';

interface ChatContextType {
  // Estado
  chats: Chat[];
  currentChat: Chat | null;
  messages: ChatMessage[];
  isConnected: boolean;
  onlineUsers: Map<string, UserStatus>;
  notifications: ChatNotification[];
  typingUsers: Map<string, string[]>; // chatId -> userIds
  
  // Ações de chat
  createChat: (participantIds: string[], participantRoles: Record<string, UserRole>) => Promise<Chat>;
  selectChat: (chatId: string) => void;
  sendMessage: (text: string, type?: 'text' | 'image' | 'video' | 'audio', attachments?: File[]) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  markAsRead: (messageId: string) => Promise<void>;
  
  // Recursos específicos para fisioterapia
  shareExercise: (exerciseId: string, message?: string) => Promise<void>;
  scheduleAppointment: (appointmentData: any) => Promise<void>;
  sendReminder: (templateId: string) => Promise<void>;
  
  // Templates
  templates: MessageTemplate[];
  useTemplate: (templateId: string) => Promise<void>;
  
  // Busca e filtros
  searchMessages: (query: string) => Promise<ChatMessage[]>;
  
  // Status e notificações
  updateStatus: (status: 'available' | 'busy' | 'away' | 'offline') => void;
  clearNotifications: (chatId?: string) => void;
  
  // Chamadas
  startVoiceCall: () => Promise<void>;
  startVideoCall: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat deve ser usado dentro de ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map());
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  // Inicializa chat service quando usuário está disponível
  useEffect(() => {
    if (user?.id && user?.tenantId) {
      chatService.initialize(user.id, user.tenantId);
      loadUserChats();
      loadTemplates();
      setupEventListeners();
    }

    return () => {
      chatService.disconnect();
    };
  }, [user]);

  const setupEventListeners = useCallback(() => {
    // Conexão estabelecida
    chatService.on('connected', () => {
      setIsConnected(true);
      addNotification({
        type: 'success',
        title: 'Chat Conectado',
        message: 'Você está online e pode receber mensagens.',
      });
    });

    // Nova mensagem recebida
    chatService.on('message_received', (message: ChatMessage) => {
      // Atualiza mensagens se for do chat atual
      if (currentChat?.id === message.chatId) {
        setMessages(prev => [...prev, message]);
      }

      // Atualiza lista de chats
      updateChatWithNewMessage(message);

      // Mostra notificação se não for do chat atual ou usuário não está ativo
      if (currentChat?.id !== message.chatId || document.hidden) {
        showMessageNotification(message);
      }
    });

    // Mensagem enviada
    chatService.on('message_sent', (message: ChatMessage) => {
      if (currentChat?.id === message.chatId) {
        setMessages(prev => [...prev, message]);
      }
      updateChatWithNewMessage(message);
    });

    // Status de digitação
    chatService.on('typing', (data: { chatId: string; userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const currentTyping = newMap.get(data.chatId) || [];
        
        if (data.isTyping) {
          if (!currentTyping.includes(data.userId)) {
            newMap.set(data.chatId, [...currentTyping, data.userId]);
          }
        } else {
          newMap.set(data.chatId, currentTyping.filter(id => id !== data.userId));
        }
        
        return newMap;
      });
    });

    // Status online
    chatService.on('online_status', (status: UserStatus) => {
      setOnlineUsers(prev => new Map(prev.set(status.userId, status)));
    });

    // Notificações
    chatService.on('notification', (notification: ChatNotification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Envia notificação push se a mensagem não é do usuário atual
      if (notification.type === 'message' && notification.senderId !== user?.id) {
        const senderName = notification.senderName || 'Usuário';
        const messageText = notification.message || 'Nova mensagem';
        notificationService.sendChatNotification(senderName, messageText, notification.chatId);
      }
    });

  }, [currentChat, addNotification]);

  const loadUserChats = useCallback(() => {
    const userChats = chatService.getUserChats();
    setChats(userChats);
  }, []);

  const loadTemplates = useCallback(() => {
    if (user?.role) {
      const userTemplates = chatService.getMessageTemplates(user.role);
      setTemplates(userTemplates);
    }
  }, [user?.role]);

  const createChat = useCallback(async (participantIds: string[], participantRoles: Record<string, UserRole>) => {
    const newChat = await chatService.createChat(participantIds, participantRoles);
    setChats(prev => [newChat, ...prev]);
    return newChat;
  }, []);

  const selectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChat(chat);
      const chatMessages = chatService.getChatMessages(chatId);
      setMessages(chatMessages);
      
      // Marca mensagens como lidas
      const unreadMessages = chatMessages.filter(m => !m.readAt && m.senderId !== user?.id);
      unreadMessages.forEach(message => {
        chatService.markAsRead(message.id, chatId);
      });
    }
  }, [chats, user?.id]);

  const sendMessage = useCallback(async (
    text: string, 
    type: 'text' | 'image' | 'video' | 'audio' = 'text',
    attachments?: File[]
  ) => {
    if (!currentChat || !user) return;

    const receiverId = currentChat.participants.find(id => id !== user.id);
    if (!receiverId) return;

    let messageAttachments;
    if (attachments && attachments.length > 0) {
      messageAttachments = await Promise.all(
        attachments.map(file => chatService.uploadAttachment(file))
      );
    }

    await chatService.sendMessage({
      chatId: currentChat.id,
      senderId: user.id,
      receiverId,
      text,
      type,
      attachments: messageAttachments,
      tenantId: user.tenantId!,
    });
  }, [currentChat, user]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (currentChat) {
      chatService.sendTypingStatus(currentChat.id, isTyping);
    }
  }, [currentChat]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (currentChat) {
      await chatService.markAsRead(messageId, currentChat.id);
    }
  }, [currentChat]);

  const shareExercise = useCallback(async (exerciseId: string, message?: string) => {
    if (!currentChat || !user) return;

    const receiverId = currentChat.participants.find(id => id !== user.id);
    if (!receiverId) return;

    await chatService.shareExercise(currentChat.id, receiverId, exerciseId, message);
  }, [currentChat, user]);

  const scheduleAppointment = useCallback(async (appointmentData: any) => {
    if (!currentChat || !user) return;

    const receiverId = currentChat.participants.find(id => id !== user.id);
    if (!receiverId) return;

    await chatService.sendMessage({
      chatId: currentChat.id,
      senderId: user.id,
      receiverId,
      text: 'Agendamento proposto',
      type: 'appointment',
      metadata: { appointmentId: appointmentData.id },
      tenantId: user.tenantId!,
    });
  }, [currentChat, user]);

  const sendReminder = useCallback(async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      await sendMessage(template.content);
    }
  }, [templates, sendMessage]);

  const useTemplate = useCallback(async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      await sendMessage(template.content);
      
      // Atualiza contador de uso
      template.usageCount++;
    }
  }, [templates, sendMessage]);

  const searchMessages = useCallback(async (query: string) => {
    if (!currentChat) return [];
    return chatService.searchMessages(currentChat.id, query);
  }, [currentChat]);

  const updateStatus = useCallback((status: 'available' | 'busy' | 'away' | 'offline') => {
    chatService.updateOnlineStatus(status);
  }, []);

  const clearNotifications = useCallback((chatId?: string) => {
    if (chatId) {
      setNotifications(prev => prev.filter(n => n.chatId !== chatId));
    } else {
      setNotifications([]);
    }
  }, []);

  const startVoiceCall = useCallback(async () => {
    if (!currentChat || !user) return;

    const receiverId = currentChat.participants.find(id => id !== user.id);
    if (!receiverId) return;

    const call = await chatService.startVoiceCall(currentChat.id, receiverId);
    
    addNotification({
      type: 'info',
      title: 'Chamada Iniciada',
      message: 'Chamada de voz iniciada. Aguardando resposta...',
    });
  }, [currentChat, user, addNotification]);

  const startVideoCall = useCallback(async () => {
    if (!currentChat || !user) return;

    addNotification({
      type: 'info',
      title: 'Videochamada',
      message: 'Funcionalidade de videochamada em desenvolvimento.',
    });
  }, [currentChat, user, addNotification]);

  // Funções auxiliares
  const updateChatWithNewMessage = useCallback((message: ChatMessage) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === message.chatId) {
        return {
          ...chat,
          lastMessage: message,
          lastMessageTimestamp: message.timestamp,
          updatedAt: message.timestamp,
          unreadCount: {
            ...chat.unreadCount,
            [message.receiverId]: (chat.unreadCount[message.receiverId] || 0) + 1
          }
        };
      }
      return chat;
    }));
  }, []);

  const showMessageNotification = useCallback((message: ChatMessage) => {
    const senderName = getSenderName(message.senderId);
    
    addNotification({
      type: 'info',
      title: `Nova mensagem de ${senderName}`,
      message: getMessagePreview(message),
    });

    // Reproduz som de notificação (se habilitado)
    playNotificationSound();
  }, [addNotification]);

  const getSenderName = useCallback((senderId: string): string => {
    // Em implementação real, buscaria dados do usuário
    return 'Usuário';
  }, []);

  const getMessagePreview = useCallback((message: ChatMessage): string => {
    switch (message.type) {
      case 'text':
        return message.text || '';
      case 'image':
        return '📷 Enviou uma imagem';
      case 'video':
        return '🎥 Enviou um vídeo';
      case 'audio':
        return '🎵 Enviou um áudio';
      case 'exercise':
        return '💪 Compartilhou um exercício';
      case 'appointment':
        return '📅 Propôs um agendamento';
      default:
        return 'Nova mensagem';
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignora erro se não conseguir reproduzir
      });
    } catch {
      // Ignora erro
    }
  }, []);

  const contextValue: ChatContextType = {
    // Estado
    chats,
    currentChat,
    messages,
    isConnected,
    onlineUsers,
    notifications,
    typingUsers,
    
    // Ações
    createChat,
    selectChat,
    sendMessage,
    sendTyping,
    markAsRead,
    
    // Recursos específicos
    shareExercise,
    scheduleAppointment,
    sendReminder,
    
    // Templates
    templates,
    useTemplate,
    
    // Busca
    searchMessages,
    
    // Status
    updateStatus,
    clearNotifications,
    
    // Chamadas
    startVoiceCall,
    startVideoCall,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export default useChat;