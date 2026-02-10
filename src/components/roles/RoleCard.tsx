import { Bot, Pencil, Shield, Database, MessageCircle, Crown, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AgentStatusBadge from '@/components/roles/AgentStatusBadge';
import { useMoltbotStatus } from '@/hooks/useMoltbotStatus';

interface Role {
  id: string;
  name: string;
  mandate: string;
  system_prompt: string;
  authority_level: string;
  memory_scope: string;
  created_at: string;
}

interface RoleCardProps {
  role: Role;
  isOwner: boolean;
  onEditMandate: (role: Role) => void;
}

const authorityLabels: Record<string, string> = {
  observer: 'Observer',
  advisor: 'Advisor',
  operator: 'Operator',
  executive: 'Executive',
  orchestrator: 'Chief of Staff',
};

const memoryScopeLabels: Record<string, string> = {
  role: 'Role-scoped',
  company: 'Company-wide',
};

export default function RoleCard({ role, isOwner, onEditMandate }: RoleCardProps) {
  const navigate = useNavigate();
  const { id: companyId } = useParams<{ id: string }>();

  const { status: agentStatus, lastActive } = useMoltbotStatus({
    companyId,
    roleId: role.id,
    active: false,
  });

  const isOrchestrator = role.authority_level === 'orchestrator';

  const handleOpenChat = () => {
    if (isOrchestrator) {
      navigate(`/companies/${companyId}/roles/${role.id}/dashboard`);
    } else {
      navigate(`/companies/${companyId}/roles/${role.id}/chat`);
    }
  };

  return (
    <Card className={`flex flex-col ${isOrchestrator ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isOrchestrator ? 'bg-primary/20' : 'bg-primary/10'}`}>
              {isOrchestrator ? (
                <Crown className="h-5 w-5 text-primary" />
              ) : (
                <Bot className="h-5 w-5 text-primary" />
              )}
            </div>
            <CardTitle className="text-lg">{role.name}</CardTitle>
            <AgentStatusBadge status={agentStatus} lastActive={lastActive} />
          </div>
          {isOwner && !isOrchestrator && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEditMandate(role)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit mandate</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">Mandate</p>
          <p className="mt-1 line-clamp-3 text-sm">{role.mandate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={isOrchestrator ? 'default' : 'secondary'} className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {authorityLabels[role.authority_level] || role.authority_level}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {memoryScopeLabels[role.memory_scope] || role.memory_scope}
          </Badge>
        </div>
        <Button onClick={handleOpenChat} className="w-full mt-2" variant={isOrchestrator ? 'default' : 'default'}>
          {isOrchestrator ? (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4 mr-2" />
              Open Chat
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
