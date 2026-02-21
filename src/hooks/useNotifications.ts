import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  company_id: string | null;
  type: 'workflow_request' | 'task_completed' | 'invitation' | 'memo_received' | 'objective_complete' | 'system_alert';
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface UseNotificationsOptions {
  companyId?: string | null;
  importantOnly?: boolean;
}

const IMPORTANT_WORKFLOW_SUMMARY_PATTERNS = [
  /requesting approval:\s*review output:/i,
  /requesting approval:\s*objective completion review:/i,
  /requesting approval:\s*external/i,
  /submitted output for review:/i,
  /review required/i,
];

function isImportantNotification(notification: Notification): boolean {
  if (notification.type === 'system_alert' || notification.type === 'invitation') {
    return true;
  }

  if (notification.type === 'workflow_request') {
    const text = `${notification.title} ${notification.message}`;
    return IMPORTANT_WORKFLOW_SUMMARY_PATTERNS.some((pattern) => pattern.test(text));
  }

  return false;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { companyId, importantOnly = true } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id, companyId, importantOnly],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      const allNotifications = data as Notification[];
      if (!importantOnly) return allNotifications;
      return allNotifications.filter(isImportantNotification);
    },
    enabled: !!user?.id,
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const unreadIds = notifications
        .filter((notification) => !notification.is_read)
        .map((notification) => notification.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
