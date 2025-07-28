import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';

import { useAuth } from './useAuth';

// ============================================================================
// TIPOS E SCHEMAS
// ============================================================================

// Tipos de notificação
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Interface para notificação
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // em ms, 0 = persistente
  priority: NotificationPriority;
  position: NotificationPosition;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  isRead: boolean;
  isDismissed: boolean;
  isPersistent: boolean;
  canDismiss: boolean;
  showProgress?: boolean;
}

// Ações da notificação
export interface NotificationAction {
  id: string;
  label: string;
  action: () => void | Promise<void>;
  style?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

// Opções para criar notificação
export interface CreateNotificationOptions {
  type?: NotificationType;
  title: string;
  message: string;
  duration?: number;
  priority?: NotificationPriority;
  position?: NotificationPosition;
  actions?: Omit<NotificationAction, 'id'>[];
  metadata?: Record<string, any>;
  isPersistent?: boolean;
  canDismiss?: boolean;
  showProgress?: boolean;
}

// Schema de validação
const NotificationSchema = z.object({
  type: z.enum(['success', 'error', 'warning', 'info']).default('info'),
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Título muito longo'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(500, 'Mensagem muito longa'),
  duration: z.number().min(0).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  position: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center']).default('top-right'),
  isPersistent: z.boolean().default(false),
  canDismiss: z.boolean().default(true),
  showProgress: z.boolean().default(false),
});

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================

// Durações padrão por tipo (em ms)
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

// Configurações por tier
const TIER_LIMITS = {
  free: {
    maxNotifications: 5,
    maxPersistent: 1,
    allowCustomActions: false,
    allowPriority: false,
  },
  premium: {
    maxNotifications: 15,
    maxPersistent: 3,
    allowCustomActions: true,
    allowPriority: true,
  },
  enterprise: {
    maxNotifications: 50,
    maxPersistent: 10,
    allowCustomActions: true,
    allowPriority: true,
  },
};

// ============================================================================
// CONTEXTO DE NOTIFICAÇÕES (simulado)
// ============================================================================

// Estado global das notificações (em uma aplicação real, usaria Context ou Zustand)
let globalNotifications: Notification[] = [];
const notificationListeners: Set<() => void> = new Set();

// Função para notificar mudanças
const notifyListeners = () => {
  notificationListeners.forEach(listener => listener());
};

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

// Gerar ID único
const generateId = () => `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Ordenar notificações por prioridade e data
const sortNotifications = (notifications: Notification[]): Notification[] => {
  const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
  
  return [...notifications].sort((a, b) => {
    // Primeiro por prioridade
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Depois por data (mais recente primeiro)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
};

// Limpar notificações expiradas
const cleanupExpiredNotifications = () => {
  const now = Date.now();
  const before = globalNotifications.length;
  
  globalNotifications = globalNotifications.filter(notification => {
    if (notification.isPersistent || notification.duration === 0) {
      return true;
    }
    
    const expiresAt = notification.createdAt.getTime() + (notification.duration || DEFAULT_DURATIONS[notification.type]);
    return now < expiresAt;
  });
  
  if (globalNotifications.length !== before) {
    notifyListeners();
  }
};

// Configurar limpeza automática
setInterval(cleanupExpiredNotifications, 1000);

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useNotification = () => {
  const { tier, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [position, setPosition] = useState<NotificationPosition>('top-right');
  
  // Configurações baseadas no tier
  const limits = TIER_LIMITS[tier];
  
  // Sincronizar com estado global
  useEffect(() => {
    const updateNotifications = () => {
      setNotifications(sortNotifications(globalNotifications));
    };
    
    // Atualização inicial
    updateNotifications();
    
    // Registrar listener
    notificationListeners.add(updateNotifications);
    
    // Cleanup
    return () => {
      notificationListeners.delete(updateNotifications);
    };
  }, []);
  
  // Função para criar notificação
  const notify = useCallback((options: CreateNotificationOptions): string => {
    try {
      // Validar dados
      const validatedOptions = NotificationSchema.parse(options);
      
      // Verificar limites
      const activeNotifications = globalNotifications.filter(n => !n.isDismissed);
      const persistentNotifications = activeNotifications.filter(n => n.isPersistent);
      
      if (activeNotifications.length >= limits.maxNotifications) {
        console.warn('Limite de notificações atingido');
        // Remover a mais antiga não persistente
        const oldestNonPersistent = activeNotifications
          .filter(n => !n.isPersistent)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        
        if (oldestNonPersistent) {
          dismiss(oldestNonPersistent.id);
        } else {
          throw new Error('Não é possível criar mais notificações');
        }
      }
      
      if (validatedOptions.isPersistent && persistentNotifications.length >= limits.maxPersistent) {
        throw new Error('Limite de notificações persistentes atingido');
      }
      
      // Verificar permissões por tier
      if (!limits.allowPriority && validatedOptions.priority !== 'normal') {
        validatedOptions.priority = 'normal';
      }
      
      if (!limits.allowCustomActions && options.actions?.length) {
        console.warn('Ações customizadas não permitidas neste plano');
        options.actions = [];
      }
      
      // Criar notificação
      const id = generateId();
      const notification: Notification = {
        id,
        type: validatedOptions.type,
        title: validatedOptions.title,
        message: validatedOptions.message,
        duration: validatedOptions.duration ?? DEFAULT_DURATIONS[validatedOptions.type],
        priority: validatedOptions.priority,
        position: validatedOptions.position,
        actions: options.actions?.map((action, index) => ({
          ...action,
          id: `${id}_action_${index}`,
        })) || [],
        metadata: options.metadata || {},
        createdAt: new Date(),
        isRead: false,
        isDismissed: false,
        isPersistent: validatedOptions.isPersistent,
        canDismiss: validatedOptions.canDismiss,
        showProgress: validatedOptions.showProgress,
      };
      
      // Adicionar ao estado global
      globalNotifications.push(notification);
      notifyListeners();
      
      // Auto-dismiss se não for persistente
      if (!notification.isPersistent && notification.duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, notification.duration);
      }
      
      return id;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }, [tier, limits]);
  
  // Função para dispensar notificação
  const dismiss = useCallback((id: string) => {
    const notification = globalNotifications.find(n => n.id === id);
    if (notification && notification.canDismiss) {
      notification.isDismissed = true;
      notification.dismissedAt = new Date();
      notifyListeners();
    }
  }, []);
  
  // Função para marcar como lida
  const markAsRead = useCallback((id: string) => {
    const notification = globalNotifications.find(n => n.id === id);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      notifyListeners();
    }
  }, []);
  
  // Função para limpar todas
  const clearAll = useCallback(() => {
    globalNotifications.forEach(notification => {
      if (notification.canDismiss) {
        notification.isDismissed = true;
        notification.dismissedAt = new Date();
      }
    });
    notifyListeners();
  }, []);
  
  // Função para limpar lidas
  const clearRead = useCallback(() => {
    globalNotifications.forEach(notification => {
      if (notification.isRead && notification.canDismiss) {
        notification.isDismissed = true;
        notification.dismissedAt = new Date();
      }
    });
    notifyListeners();
  }, []);
  
  // Funções de conveniência
  const success = useCallback((title: string, message: string, options?: Partial<CreateNotificationOptions>) => {
    return notify({ ...options, type: 'success', title, message });
  }, [notify]);
  
  const error = useCallback((title: string, message: string, options?: Partial<CreateNotificationOptions>) => {
    return notify({ ...options, type: 'error', title, message });
  }, [notify]);
  
  const warning = useCallback((title: string, message: string, options?: Partial<CreateNotificationOptions>) => {
    return notify({ ...options, type: 'warning', title, message });
  }, [notify]);
  
  const info = useCallback((title: string, message: string, options?: Partial<CreateNotificationOptions>) => {
    return notify({ ...options, type: 'info', title, message });
  }, [notify]);
  
  // Estatísticas
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead && !n.isDismissed).length,
    active: notifications.filter(n => !n.isDismissed).length,
    persistent: notifications.filter(n => n.isPersistent && !n.isDismissed).length,
    byType: notifications.reduce((acc, n) => {
      if (!n.isDismissed) {
        acc[n.type] = (acc[n.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<NotificationType, number>),
  };
  
  return {
    // Dados
    notifications: notifications.filter(n => !n.isDismissed),
    allNotifications: notifications,
    position,
    limits,
    stats,
    
    // Funções principais
    notify,
    dismiss,
    markAsRead,
    clearAll,
    clearRead,
    
    // Funções de conveniência
    success,
    error,
    warning,
    info,
    
    // Configurações
    setPosition,
    
    // Capacidades baseadas no tier
    canUseCustomActions: limits.allowCustomActions,
    canUsePriority: limits.allowPriority,
  };
};

// ============================================================================
// HOOKS ESPECIALIZADOS
// ============================================================================

// Hook para notificações de sistema
export const useSystemNotifications = () => {
  const { notify, error, warning, info } = useNotification();
  
  const notifyBackupComplete = useCallback(() => {
    return info(
      'Backup Concluído',
      'Seus dados foram salvos com sucesso.',
      { priority: 'low', duration: 3000 }
    );
  }, [info]);
  
  const notifyMaintenanceMode = useCallback(() => {
    return warning(
      'Modo Manutenção',
      'O sistema entrará em manutenção em 10 minutos.',
      { 
        isPersistent: true,
        priority: 'high',
        actions: [{
          label: 'Salvar Trabalho',
          action: () => console.log('Salvando trabalho...'),
          style: 'primary'
        }]
      }
    );
  }, [warning]);
  
  const notifyConnectionLost = useCallback(() => {
    return error(
      'Conexão Perdida',
      'Verifique sua conexão com a internet.',
      { 
        isPersistent: true,
        priority: 'urgent',
        actions: [{
          label: 'Tentar Novamente',
          action: () => window.location.reload(),
          style: 'primary'
        }]
      }
    );
  }, [error]);
  
  const notifyLimitReached = useCallback((feature: string) => {
    return warning(
      'Limite Atingido',
      `Você atingiu o limite de ${feature} do seu plano.`,
      {
        priority: 'high',
        actions: [{
          label: 'Fazer Upgrade',
          action: () => console.log('Redirecionando para upgrade...'),
          style: 'primary'
        }]
      }
    );
  }, [warning]);
  
  return {
    notifyBackupComplete,
    notifyMaintenanceMode,
    notifyConnectionLost,
    notifyLimitReached,
  };
};

// Hook para notificações de progresso
export const useProgressNotifications = () => {
  const { notify, dismiss } = useNotification();
  
  const createProgressNotification = useCallback((title: string, message: string) => {
    return notify({
      type: 'info',
      title,
      message,
      isPersistent: true,
      canDismiss: false,
      showProgress: true,
      duration: 0,
    });
  }, [notify]);
  
  const updateProgress = useCallback((id: string, progress: number, message?: string) => {
    // Em uma implementação real, atualizaria o progresso da notificação
    console.log(`Progresso ${id}: ${progress}%`, message);
  }, []);
  
  const completeProgress = useCallback((id: string, successMessage?: string) => {
    dismiss(id);
    if (successMessage) {
      notify({
        type: 'success',
        title: 'Concluído',
        message: successMessage,
        duration: 3000,
      });
    }
  }, [dismiss, notify]);
  
  return {
    createProgressNotification,
    updateProgress,
    completeProgress,
  };
};

// Hook para notificações em tempo real
export const useRealTimeNotifications = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  
  useEffect(() => {
    // Simular conexão WebSocket para notificações em tempo real
    const mockWebSocket = {
      onmessage: (event: { data: string }) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'notification' && data.userId === user?.id) {
            notify({
              type: data.notificationType || 'info',
              title: data.title,
              message: data.message,
              priority: data.priority || 'normal',
              metadata: { source: 'realtime', ...data.metadata },
            });
          }
        } catch (error) {
          console.error('Erro ao processar notificação em tempo real:', error);
        }
      },
    };
    
    // Simular algumas notificações em tempo real
    const interval = setInterval(() => {
      if (Math.random() > 0.95) { // 5% de chance a cada segundo
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: 'notification',
            userId: user?.id,
            notificationType: 'info',
            title: 'Nova Mensagem',
            message: 'Você tem uma nova mensagem do sistema.',
            priority: 'normal',
          }),
        });
      }
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user?.id, notify]);
  
  return {
    // Em uma implementação real, retornaria funções para gerenciar a conexão WebSocket
    isConnected: true,
    reconnect: () => console.log('Reconectando...'),
  };
};

export default useNotification;