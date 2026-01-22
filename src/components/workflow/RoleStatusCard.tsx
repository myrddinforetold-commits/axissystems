import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Circle, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoleWithStatus } from '@/hooks/useWorkflowRequests';

interface RoleStatusCardProps {
  role: RoleWithStatus;
  companyId: string;
}

const statusConfig = {
  idle: {
    label: 'Idle',
    icon: Circle,
    className: 'text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
  in_task: {
    label: 'In Task',
    icon: ListTodo,
    className: 'text-primary',
    dotClassName: 'bg-primary animate-pulse',
  },
  awaiting_approval: {
    label: 'Awaiting',
    icon: AlertCircle,
    className: 'text-amber-500',
    dotClassName: 'bg-amber-500 animate-pulse',
  },
};

export default function RoleStatusCard({ role, companyId }: RoleStatusCardProps) {
  const navigate = useNavigate();
  const status = role.workflow_status as keyof typeof statusConfig;
  const config = statusConfig[status] || statusConfig.idle;
  const StatusIcon = config.icon;

  const handleClick = () => {
    navigate(`/company/${companyId}/role/${role.id}`);
  };

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {role.display_name || role.name}
              </h3>
              <div className={cn('flex items-center gap-1.5 text-xs', config.className)}>
                <span className={cn('h-2 w-2 rounded-full', config.dotClassName)} />
                {config.label}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {role.active_task_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              <ListTodo className="mr-1 h-3 w-3" />
              {role.active_task_count} task{role.active_task_count !== 1 ? 's' : ''}
            </Badge>
          )}
          {role.pending_request_count > 0 && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
              <Clock className="mr-1 h-3 w-3" />
              {role.pending_request_count} pending
            </Badge>
          )}
        </div>

        <div className="mt-3 text-xs text-muted-foreground line-clamp-2">
          {role.mandate}
        </div>
      </CardContent>
    </Card>
  );
}
