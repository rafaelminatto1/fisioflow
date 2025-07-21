import React, { useState, useEffect } from 'react';
import { useTrialManager, TrialNotification } from '../hooks/useTrialManager';
import {
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Zap,
  Calendar,
  Gift,
} from 'lucide-react';

interface TrialNotificationsProps {
  className?: string;
  showInline?: boolean;
  maxNotifications?: number;
}

const TrialNotifications: React.FC<TrialNotificationsProps> = ({
  className = '',
  showInline = false,
  maxNotifications = 3,
}) => {
  const {
    trialInfo,
    getTrialNotifications,
    convertToSubscription,
    extendTrial,
  } = useTrialManager();
  const [notifications, setNotifications] = useState<TrialNotification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<
    Set<string>
  >(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const trialNotifications = getTrialNotifications();
    setNotifications(trialNotifications);
  }, [trialInfo, getTrialNotifications]);

  const getIcon = (type: TrialNotification['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBgColor = (type: TrialNotification['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const dismissNotification = (index: number) => {
    const notificationKey = `${notifications[index].type}_${notifications[index].title}_${index}`;
    setDismissedNotifications((prev) => new Set([...prev, notificationKey]));
  };

  const visibleNotifications = notifications
    .slice(0, maxNotifications)
    .filter((notification, index) => {
      const notificationKey = `${notification.type}_${notification.title}_${index}`;
      return !dismissedNotifications.has(notificationKey);
    });

  if (!trialInfo || visibleNotifications.length === 0) {
    return null;
  }

  // Trial status banner
  const TrialStatusBanner = () => (
    <div className="mb-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="h-6 w-6" />
          <div>
            <h3 className="text-lg font-semibold">
              Trial {trialInfo.plan.toUpperCase()} Ativo
            </h3>
            <p className="text-purple-100">
              {trialInfo.daysRemaining > 0
                ? `${trialInfo.daysRemaining} dias restantes`
                : 'Expira hoje!'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="mb-1 flex items-center space-x-2 text-purple-100">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              Até {new Date(trialInfo.endDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
          {trialInfo.canExtend && (
            <button
              onClick={() => extendTrial(7)}
              className="rounded-full bg-white/20 px-3 py-1 text-xs transition-colors hover:bg-white/30"
            >
              <Gift className="mr-1 inline h-3 w-3" />
              Estender Trial
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-purple-100">
          <span>Progresso do Trial</span>
          <span>
            {Math.max(
              0,
              Math.round(
                ((new Date(trialInfo.endDate).getTime() -
                  new Date().getTime()) /
                  (new Date(trialInfo.endDate).getTime() -
                    new Date(trialInfo.startDate).getTime())) *
                  100
              )
            )}
            %
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/20">
          <div
            className="h-2 rounded-full bg-white transition-all duration-300"
            style={{
              width: `${Math.max(
                0,
                Math.round(
                  ((new Date(trialInfo.endDate).getTime() -
                    new Date().getTime()) /
                    (new Date(trialInfo.endDate).getTime() -
                      new Date(trialInfo.startDate).getTime())) *
                    100
                )
              )}%`,
            }}
          />
        </div>
      </div>
    </div>
  );

  if (showInline) {
    return (
      <div className={`space-y-3 ${className}`}>
        <TrialStatusBanner />

        {visibleNotifications.map((notification, index) => (
          <div
            key={index}
            className={`rounded-lg border p-4 ${getBgColor(notification.type)} transition-all duration-300`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getIcon(notification.type)}
                <div className="flex-1">
                  <h4 className="mb-1 font-medium text-gray-900">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {notification.message}
                  </p>
                  {notification.action && (
                    <button
                      onClick={notification.action.onClick}
                      className="mt-2 inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      {notification.action.label}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismissNotification(index)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Floating notifications (default)
  return (
    <div className={`fixed right-4 top-4 z-50 space-y-3 ${className}`}>
      {/* Trial status mini banner */}
      <div className="max-w-sm rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
            <span className="text-sm font-medium text-gray-900">
              Trial {trialInfo.plan.toUpperCase()}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <div className="mb-2 text-xs text-gray-600">
              {trialInfo.daysRemaining > 0
                ? `${trialInfo.daysRemaining} dias restantes`
                : 'Expira hoje!'}
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200">
              <div
                className="h-1.5 rounded-full bg-purple-500 transition-all duration-300"
                style={{
                  width: `${Math.max(
                    0,
                    Math.round(
                      ((new Date(trialInfo.endDate).getTime() -
                        new Date().getTime()) /
                        (new Date(trialInfo.endDate).getTime() -
                          new Date(trialInfo.startDate).getTime())) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
            <button
              onClick={() => convertToSubscription(trialInfo.plan)}
              className="mt-2 w-full rounded bg-purple-600 py-1 text-xs text-white transition-colors hover:bg-purple-700"
            >
              Fazer Upgrade
            </button>
          </div>
        )}
      </div>

      {/* Individual notifications */}
      {visibleNotifications.map((notification, index) => (
        <div
          key={index}
          className={`max-w-sm transform rounded-lg border border-gray-200 bg-white p-4 shadow-lg transition-all duration-300 hover:scale-105`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getIcon(notification.type)}
              <div className="flex-1">
                <h4 className="mb-1 text-sm font-medium text-gray-900">
                  {notification.title}
                </h4>
                <p className="text-xs text-gray-600">{notification.message}</p>
                {notification.action && (
                  <button
                    onClick={notification.action.onClick}
                    className="mt-2 inline-flex items-center rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => dismissNotification(index)}
              className="ml-2 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrialNotifications;
