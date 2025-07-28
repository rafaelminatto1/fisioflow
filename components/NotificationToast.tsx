import React, { useEffect, useState } from 'react';

import { Notification } from '../types';

import {
  IconCheckCircle,
  IconAlertTriangle,
  IconBell,
  IconX,
} from './icons/IconComponents';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const notificationConfig = {
  success: {
    icon: <IconCheckCircle size={20} />,
    style: 'bg-emerald-800/50 border-emerald-500/50 text-emerald-300',
    iconColor: 'text-emerald-400',
  },
  error: {
    icon: <IconAlertTriangle size={20} />,
    style: 'bg-red-800/50 border-red-500/50 text-red-300',
    iconColor: 'text-red-400',
  },
  info: {
    icon: <IconBell />,
    style: 'bg-blue-800/50 border-blue-500/50 text-blue-300',
    iconColor: 'text-blue-400',
  },
};

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    // Allow time for animation before removing from DOM
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const config = notificationConfig[notification.type];

  return (
    <div
      role="alert"
      className={`relative w-full max-w-sm rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out ${config.style} ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${config.iconColor}`}>{config.icon}</div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-semibold text-slate-100">
            {notification.title}
          </p>
          <p className="mt-1 text-sm text-slate-300">{notification.message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="-mr-2 -mt-2 ml-4 rounded-full p-1.5 text-current hover:bg-white/10"
          aria-label="Dismiss"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
