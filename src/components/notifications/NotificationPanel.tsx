import { Bell, CheckCheck, Inbox } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const { 
    notifications, 
    isLoading, 
    unreadCount,
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = parseISO(notification.created_at);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else {
      key = format(date, 'MMMM d, yyyy');
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(notification);
    return groups;
  }, {} as Record<string, typeof notifications>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({unreadCount} unread)
                </span>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <Separator />
        
        <ScrollArea className="h-[calc(100vh-5rem)]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see updates about tasks and approvals here
              </p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedNotifications).map(([date, items]) => (
                <div key={date} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground px-3 py-1.5">
                    {date}
                  </p>
                  <div className="space-y-1">
                    {items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={(id) => markAsRead.mutate(id)}
                        onDelete={(id) => deleteNotification.mutate(id)}
                        onClose={() => onOpenChange(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
