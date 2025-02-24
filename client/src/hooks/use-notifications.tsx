import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

type Notification = {
  type: 'ITEM_STATUS_CHANGE' | 'NEW_MATCH' | 'MODERATION_UPDATE' | 'ADMIN_ALERT';
  message: string;
  data?: any;
};

type NotificationsContextType = {
  notifications: Notification[];
  clearNotifications: () => void;
};

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const notification: Notification = JSON.parse(event.data);
      setNotifications(prev => [...prev, notification]);
      
      // Show toast notification
      toast({
        title: notification.type.split('_').map(word => 
          word.charAt(0) + word.slice(1).toLowerCase()
        ).join(' '),
        description: notification.message,
      });
    };

    ws.onclose = () => {
      // Attempt to reconnect after a delay
      setTimeout(() => {
        setSocket(null);
      }, 5000);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [user]);

  const clearNotifications = () => setNotifications([]);

  return (
    <NotificationsContext.Provider value={{ notifications, clearNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
