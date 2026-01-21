import { useState, useEffect, useCallback } from 'react';
import { Plus, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import RoleCard from './RoleCard';
import CreateRoleDialog from './CreateRoleDialog';
import EditMandateDialog from './EditMandateDialog';

interface Role {
  id: string;
  name: string;
  mandate: string;
  system_prompt: string;
  authority_level: string;
  memory_scope: string;
  created_at: string;
}

interface RolesTabProps {
  companyId: string;
  isOwner: boolean;
}

export default function RolesTab({ companyId, isOwner }: RolesTabProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching roles:', error);
    } else {
      setRoles(data ?? []);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleEditMandate = (role: Role) => {
    setEditingRole(role);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">AI Roles</h3>
          <p className="text-sm text-muted-foreground">
            {roles.length} role{roles.length !== 1 ? 's' : ''} defined
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        )}
      </div>

      {roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="mb-2 text-lg font-medium">No roles yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            {isOwner
              ? 'Create your first AI role to get started.'
              : 'No AI roles have been created for this company.'}
          </p>
          {isOwner && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isOwner={isOwner}
              onEditMandate={handleEditMandate}
            />
          ))}
        </div>
      )}

      <CreateRoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        companyId={companyId}
        onRoleCreated={fetchRoles}
      />

      <EditMandateDialog
        open={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
        role={editingRole}
        onMandateUpdated={fetchRoles}
      />
    </div>
  );
}
