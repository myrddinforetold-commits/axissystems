import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  MessageSquare, 
  AlertTriangle, 
  Target, 
  Mail, 
  ClipboardCheck,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/hooks/useNotifications';

const typeIcons: Record<Notification['type'], React.ReactNode> = {
  workflow_request: <ClipboardCheck className="h-4 w-4 text-primary" />,
  task_completed: <CheckCircle className="h-4 w-4 text-primary" />,
  invitation: <Mail className="h-4 w-4 text-accent-foreground" />,
  memo_received: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
  objective_complete: <Target className="h-4 w-4 text-primary" />,
  system_alert: <AlertTriangle className="h-4 w-4 text-destructive" />,
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  onClose 
}: NotificationItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors group',
        notification.is_read 
          ? 'bg-transparent hover:bg-muted/50' 
          : 'bg-muted/50 hover:bg-muted'
      )}
      onClick={handleClick}
    >
      <div className="mt-0.5">
        {typeIcons[notification.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm line-clamp-1',
            !notification.is_read && 'font-medium'
          )}>
            {notification.title}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </div>
  );
}
