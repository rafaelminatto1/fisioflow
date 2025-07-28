import React, { useState } from 'react';

import { useCrossModuleNotifications } from '../hooks/useCrossModuleNotifications';
import { CrossModuleNotification } from '../services/crossModuleNotificationService';

import {
  IconBell,
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconUsers,
  IconCalendar,
  IconClipboardList,
  IconFileText,
  IconDollarSign,
  IconTool,
  IconGraduationCap,
  IconTrendingUp,
  IconEye,
  IconFilter,
} from './icons/IconComponents';

interface CrossModuleNotificationsProps {
  targetModule?: string;
  showUnreadOnly?: boolean;
  maxHeight?: string;
  onNotificationClick?: (notification: CrossModuleNotification) => void;
}

const CrossModuleNotifications: React.FC<CrossModuleNotificationsProps> = ({
  targetModule,
  showUnreadOnly = false,
  maxHeight = 'max-h-96',
  onNotificationClick,
}) => {
  const {
    notifications,
    unreadCount,
    notificationsByPriority,
    markAsRead,
    acknowledgeNotification,
    stats,
    isInitialized,
  } = useCrossModuleNotifications(targetModule);

  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'high'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-gray-500">Carregando notificações...</div>
      </div>
    );
  }

  const getModuleIcon = (sourceModule: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      patients: <IconUsers className="h-4 w-4 text-blue-500" />,
      appointments: <IconCalendar className="h-4 w-4 text-green-500" />,
      tasks: <IconClipboardList className="h-4 w-4 text-purple-500" />,
      protocols: <IconFileText className="h-4 w-4 text-indigo-500" />,
      mentorship: <IconGraduationCap className="h-4 w-4 text-orange-500" />,
      financial: <IconDollarSign className="h-4 w-4 text-emerald-500" />,
      equipment: <IconTool className="h-4 w-4 text-gray-500" />,
      management: <IconTrendingUp className="h-4 w-4 text-red-500" />,
    };
    return iconMap[sourceModule] || <IconBell className="h-4 w-4 text-gray-400" />;
  };

  const getPriorityColor = (priority: CrossModuleNotification['priority']) => {
    const colorMap = {
      critical: 'text-red-600 bg-red-50 border-red-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      normal: 'text-blue-600 bg-blue-50 border-blue-200',
      low: 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return colorMap[priority];
  };

  const getPriorityIcon = (priority: CrossModuleNotification['priority']) => {
    if (priority === 'critical' || priority === 'high') {
      return <IconAlertTriangle className="h-4 w-4" />;
    }
    return <IconBell className="h-4 w-4" />;
  };

  const filteredNotifications = notifications
    .filter(notification => {
      if (showUnreadOnly && notification.isRead) return false;
      
      switch (filter) {
        case 'unread':
          return !notification.isRead;
        case 'critical':
          return notification.priority === 'critical';
        case 'high':
          return notification.priority === 'high';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // Sort by priority first, then by timestamp
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const handleNotificationClick = (notification: CrossModuleNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.actionUrl) {
      // Navigate to the action URL if no custom handler
      window.location.href = notification.actionUrl;
    }
  };

  const handleAcknowledge = (notification: CrossModuleNotification, event: React.MouseEvent) => {
    event.stopPropagation();
    acknowledgeNotification(notification.id);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  if (filteredNotifications.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div>
          <IconBell className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Nenhuma notificação
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'unread' ? 'Você está em dia!' : 'Não há notificações para mostrar.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header with Stats and Filters */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">
            Notificações
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                {unreadCount}
              </span>
            )}
          </h3>
          
          {!targetModule && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Total: {stats.total}</span>
              <span>•</span>
              <span>Não lidas: {stats.unread}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todas</option>
            <option value="unread">Não lidas</option>
            <option value="critical">Críticas</option>
            <option value="high">Alta prioridade</option>
          </select>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            <IconEye className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className={`overflow-y-auto ${maxHeight}`}>
        <div className="divide-y divide-gray-100">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Module Icon */}
                <div className="flex-shrink-0">
                  {getModuleIcon(notification.sourceModule)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className={`text-sm font-medium ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        
                        {/* Priority Badge */}
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          getPriorityColor(notification.priority)
                        }`}>
                          {getPriorityIcon(notification.priority)}
                          <span className="ml-1 capitalize">{notification.priority}</span>
                        </span>
                        
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.message}
                      </p>
                      
                      <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                        <span className="capitalize">{notification.sourceModule}</span>
                        <span>•</span>
                        <span>{formatTimestamp(notification.timestamp)}</span>
                        {notification.targetModules.length > 1 && (
                          <>
                            <span>•</span>
                            <span>{notification.targetModules.length} módulos</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      {notification.requiresAcknowledgment && !notification.acknowledged && (
                        <button
                          onClick={(e) => handleAcknowledge(notification, e)}
                          className="rounded p-1 text-green-600 hover:bg-green-50"
                          title="Confirmar"
                        >
                          <IconCheck className="h-4 w-4" />
                        </button>
                      )}
                      
                      {notification.actionUrl && (
                        <div className="text-xs text-blue-600">
                          Ver →
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats (when expanded) */}
      {isExpanded && !targetModule && (
        <div className="border-t border-gray-200 p-4">
          <h4 className="mb-3 text-sm font-medium text-gray-900">
            Estatísticas por Prioridade
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-red-600">Críticas:</span>
              <span className="font-medium">{notificationsByPriority.critical.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-600">Alta:</span>
              <span className="font-medium">{notificationsByPriority.high.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-600">Normal:</span>
              <span className="font-medium">{notificationsByPriority.normal.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Baixa:</span>
              <span className="font-medium">{notificationsByPriority.low.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossModuleNotifications;