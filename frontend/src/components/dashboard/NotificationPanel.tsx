'use client';

import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const NotificationPanel = () => {
  // Fetch notifications from backend API
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      // TODO: Replace with actual API call to fetch notifications
      return [] as Notification[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const removeNotification = (id: number) => {
    setLocalNotifications(localNotifications.filter(n => n.id !== id));
  };

  const markAsRead = (id: number) => {
    setLocalNotifications(localNotifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-l-yellow-500';
      case 'success':
        return 'border-l-green-500';
      case 'info':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Notifications</CardTitle>
          <span className="text-sm text-muted-foreground">
            {localNotifications.filter(n => !n.read).length} unread
          </span>
        </div>
      </CardHeader>
      <CardContent>
      
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {localNotifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No notifications</p>
          ) : (
            localNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-l-4 rounded-r-lg transition-all duration-200 ${getBorderColor(notification.type)} ${
                notification.read ? 'bg-gray-50' : 'bg-white shadow-sm'
              }`}
            >
              <div className="flex items-start space-x-3">
                {getIcon(notification.type)}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notification.title}
                      </h4>
                      <p className={`text-sm ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-6 p-0 text-xs mt-2"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
          )}
        </div>
        
        {localNotifications.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="link" size="sm">
              View all notifications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPanel;