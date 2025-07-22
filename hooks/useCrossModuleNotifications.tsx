import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import CrossModuleNotificationService, {
  CrossModuleNotification,
  NotificationRule,
} from '../services/crossModuleNotificationService';
import { useSystemEvents } from './useSystemEvents';

export interface CrossModuleNotificationsHook {
  notifications: CrossModuleNotification[];
  unreadCount: number;
  notificationsByPriority: {
    critical: CrossModuleNotification[];
    high: CrossModuleNotification[];
    normal: CrossModuleNotification[];
    low: CrossModuleNotification[];
  };
  markAsRead: (notificationId: string) => void;
  acknowledgeNotification: (notificationId: string) => void;
  createNotification: (notification: Omit<CrossModuleNotification, 'id' | 'timestamp' | 'isRead' | 'acknowledged'>) => void;
  getModuleNotifications: (module: string) => CrossModuleNotification[];
  stats: {
    total: number;
    unread: number;
    byPriority: Record<string, number>;
    byModule: Record<string, number>;
  };
  rules: NotificationRule[];
  addRule: (rule: Omit<NotificationRule, 'id'>) => void;
  updateRule: (ruleId: string, updates: Partial<NotificationRule>) => void;
  removeRule: (ruleId: string) => void;
  isInitialized: boolean;
}

export const useCrossModuleNotifications = (
  targetModule?: string
): CrossModuleNotificationsHook => {
  const { user } = useAuth();
  const { subscribeToSystemEvents } = useSystemEvents();
  const [notifications, setNotifications] = useState<CrossModuleNotification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize service and subscribe to events
  useEffect(() => {
    if (!user?.tenantId) return;

    // Initialize the service
    CrossModuleNotificationService.initialize(user.tenantId);
    
    // Load initial data
    const loadNotifications = () => {
      if (targetModule) {
        const moduleNotifications = CrossModuleNotificationService.getNotificationsByModule(
          targetModule,
          user.tenantId!,
          user.id,
          user.role
        );
        setNotifications(moduleNotifications);
      } else {
        // If no target module, get all notifications for this user
        const allModules = ['patients', 'appointments', 'tasks', 'protocols', 'mentorship', 'financial', 'equipment', 'management'];
        const allNotifications = allModules.flatMap(module =>
          CrossModuleNotificationService.getNotificationsByModule(
            module,
            user.tenantId!,
            user.id,
            user.role
          )
        );
        // Remove duplicates
        const uniqueNotifications = allNotifications.filter(
          (notification, index, self) =>
            index === self.findIndex(n => n.id === notification.id)
        );
        setNotifications(uniqueNotifications);
      }
      
      setRules(CrossModuleNotificationService.getNotificationRules(user.tenantId!));
      setIsInitialized(true);
    };

    loadNotifications();

    // Subscribe to new notifications
    const unsubscribeFunctions: (() => void)[] = [];

    if (targetModule) {
      const unsubscribe = CrossModuleNotificationService.subscribe(
        targetModule,
        (newNotification) => {
          // Check if notification is for this user
          if (
            (!newNotification.recipientId || newNotification.recipientId === user.id) &&
            (!newNotification.recipientRole || newNotification.recipientRole === user.role)
          ) {
            setNotifications(prev => [newNotification, ...prev]);
          }
        }
      );
      unsubscribeFunctions.push(unsubscribe);
    } else {
      // Subscribe to all modules
      const allModules = ['patients', 'appointments', 'tasks', 'protocols', 'mentorship', 'financial', 'equipment', 'management'];
      allModules.forEach(module => {
        const unsubscribe = CrossModuleNotificationService.subscribe(
          module,
          (newNotification) => {
            if (
              (!newNotification.recipientId || newNotification.recipientId === user.id) &&
              (!newNotification.recipientRole || newNotification.recipientRole === user.role)
            ) {
              setNotifications(prev => {
                // Avoid duplicates
                if (prev.some(n => n.id === newNotification.id)) return prev;
                return [newNotification, ...prev];
              });
            }
          }
        );
        unsubscribeFunctions.push(unsubscribe);
      });
    }

    // Subscribe to system events to process cross-module notifications
    const unsubscribeEvents = subscribeToSystemEvents((event) => {
      CrossModuleNotificationService.processSystemEvent(event);
    });

    return () => {
      unsubscribeFunctions.forEach(fn => fn());
      unsubscribeEvents();
    };
  }, [user, targetModule, subscribeToSystemEvents]);

  // Computed values
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const notificationsByPriority = useMemo(() => {
    return {
      critical: notifications.filter(n => n.priority === 'critical'),
      high: notifications.filter(n => n.priority === 'high'),
      normal: notifications.filter(n => n.priority === 'normal'),
      low: notifications.filter(n => n.priority === 'low'),
    };
  }, [notifications]);

  const stats = useMemo(() => {
    if (!user?.tenantId) {
      return { total: 0, unread: 0, byPriority: {}, byModule: {} };
    }
    return CrossModuleNotificationService.getNotificationStats(user.tenantId);
  }, [notifications, user?.tenantId]);

  // Actions
  const markAsRead = useCallback((notificationId: string) => {
    CrossModuleNotificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const acknowledgeNotification = useCallback((notificationId: string) => {
    CrossModuleNotificationService.acknowledgeNotification(notificationId);
    setNotifications(prev =>
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, acknowledged: true, isRead: true } 
          : n
      )
    );
  }, []);

  const createNotification = useCallback((
    notification: Omit<CrossModuleNotification, 'id' | 'timestamp' | 'isRead' | 'acknowledged'>
  ) => {
    if (!user?.tenantId) return;
    
    const fullNotification = {
      ...notification,
      tenantId: user.tenantId,
    };
    
    CrossModuleNotificationService.createManualNotification(fullNotification);
  }, [user?.tenantId]);

  const getModuleNotifications = useCallback((module: string) => {
    if (!user?.tenantId) return [];
    
    return CrossModuleNotificationService.getNotificationsByModule(
      module,
      user.tenantId,
      user.id,
      user.role
    );
  }, [user]);

  const addRule = useCallback((rule: Omit<NotificationRule, 'id'>) => {
    if (!user?.tenantId) return;
    
    const fullRule = {
      ...rule,
      tenantId: user.tenantId,
    };
    
    CrossModuleNotificationService.addNotificationRule(fullRule);
    setRules(CrossModuleNotificationService.getNotificationRules(user.tenantId));
  }, [user?.tenantId]);

  const updateRule = useCallback((ruleId: string, updates: Partial<NotificationRule>) => {
    CrossModuleNotificationService.updateNotificationRule(ruleId, updates);
    if (user?.tenantId) {
      setRules(CrossModuleNotificationService.getNotificationRules(user.tenantId));
    }
  }, [user?.tenantId]);

  const removeRule = useCallback((ruleId: string) => {
    CrossModuleNotificationService.removeNotificationRule(ruleId);
    if (user?.tenantId) {
      setRules(CrossModuleNotificationService.getNotificationRules(user.tenantId));
    }
  }, [user?.tenantId]);

  return {
    notifications,
    unreadCount,
    notificationsByPriority,
    markAsRead,
    acknowledgeNotification,
    createNotification,
    getModuleNotifications,
    stats,
    rules,
    addRule,
    updateRule,
    removeRule,
    isInitialized,
  };
};

export default useCrossModuleNotifications;