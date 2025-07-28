import React from 'react';

import { useNotifications } from '../hooks/useNotification';

import NotificationToast from './NotificationToast';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed right-4 top-4 z-[100] w-full max-w-sm">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
