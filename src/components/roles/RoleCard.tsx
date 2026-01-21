import { Bot, Pencil, Shield, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
};

const memoryScopeLabels: Record<string, string> = {
  role: 'Role-scoped',
  company: 'Company-wide',
};

export default function RoleCard({ role, isOwner, onEditMandate }: RoleCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{role.name}</CardTitle>
          </div>
          {isOwner && (
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
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {authorityLabels[role.authority_level] || role.authority_level}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {memoryScopeLabels[role.memory_scope] || role.memory_scope}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
