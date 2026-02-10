import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock, ListTodo } from 'lucide-react';
import AgentStatusBadge from '@/components/roles/AgentStatusBadge';
import { useMoltbotStatus } from '@/hooks/useMoltbotStatus';
import type { RoleWithStatus } from '@/hooks/useWorkflowRequests';

interface RoleStatusCardProps {
  role: RoleWithStatus;
  companyId: string;
}

export default function RoleStatusCard({ role, companyId }: RoleStatusCardProps) {
  const navigate = useNavigate();

  const { status: agentStatus, lastActive } = useMoltbotStatus({
    companyId,
    roleId: role.id,
    active: false,
  });

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
              <AgentStatusBadge status={agentStatus} lastActive={lastActive} />
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
