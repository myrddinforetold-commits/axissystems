import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, CheckCircle2, Circle, Bot } from 'lucide-react';

interface Objective {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  role_id: string;
  role_name: string;
  role_display_name: string | null;
  created_at: string;
  tasks_total: number;
  tasks_completed: number;
}

interface RoleObjectiveGroup {
  role_id: string;
  role_name: string;
  role_display_name: string | null;
  is_activated: boolean;
  objectives: Objective[];
}

interface ObjectiveProgressCardProps {
  companyId: string;
}

export default function ObjectiveProgressCard({ companyId }: ObjectiveProgressCardProps) {
  const navigate = useNavigate();
  const [roleGroups, setRoleGroups] = useState<RoleObjectiveGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchObjectives() {
      // Fetch all active objectives with their roles
      const { data: objectives, error: objError } = await supabase
        .from('role_objectives')
        .select(`
          id, title, description, status, priority, role_id, created_at,
          roles!inner(id, name, display_name, is_activated)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('priority', { ascending: true });

      if (objError) {
        console.error('Error fetching objectives:', objError);
        setLoading(false);
        return;
      }

      // Get task counts for each role
      const { data: taskCounts } = await supabase
        .from('tasks')
        .select('role_id, status')
        .eq('company_id', companyId);

      // Calculate task stats per role
      const roleTaskStats: Record<string, { total: number; completed: number }> = {};
      taskCounts?.forEach((task) => {
        if (!roleTaskStats[task.role_id]) {
          roleTaskStats[task.role_id] = { total: 0, completed: 0 };
        }
        roleTaskStats[task.role_id].total++;
        if (task.status === 'completed') {
          roleTaskStats[task.role_id].completed++;
        }
      });

      // Group objectives by role
      const groupedByRole: Record<string, RoleObjectiveGroup> = {};

      objectives?.forEach((obj: any) => {
        const roleId = obj.role_id;
        if (!groupedByRole[roleId]) {
          groupedByRole[roleId] = {
            role_id: roleId,
            role_name: obj.roles.name,
            role_display_name: obj.roles.display_name,
            is_activated: obj.roles.is_activated,
            objectives: [],
          };
        }

        const stats = roleTaskStats[roleId] || { total: 0, completed: 0 };
        groupedByRole[roleId].objectives.push({
          id: obj.id,
          title: obj.title,
          description: obj.description,
          status: obj.status,
          priority: obj.priority,
          role_id: roleId,
          role_name: obj.roles.name,
          role_display_name: obj.roles.display_name,
          created_at: obj.created_at,
          tasks_total: stats.total,
          tasks_completed: stats.completed,
        });
      });

      setRoleGroups(Object.values(groupedByRole));
      setLoading(false);
    }

    fetchObjectives();
  }, [companyId]);

  if (loading) {
    return null;
  }

  if (roleGroups.length === 0) {
    return null;
  }

  const totalObjectives = roleGroups.reduce((sum, g) => sum + g.objectives.length, 0);
  const activeRoles = roleGroups.filter((g) => g.is_activated).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Objective Progress
            </CardTitle>
            <CardDescription>
              {totalObjectives} active objective{totalObjectives !== 1 ? 's' : ''} across {activeRoles} activated role{activeRoles !== 1 ? 's' : ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[240px] pr-4">
          <div className="space-y-4">
            {roleGroups.map((group) => (
              <div
                key={group.role_id}
                className="rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/companies/${companyId}/roles/${group.role_id}/chat`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {group.role_display_name || group.role_name}
                    </span>
                    {group.is_activated ? (
                      <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    {group.objectives[0]?.tasks_completed || 0}/{group.objectives[0]?.tasks_total || 0} tasks
                  </div>
                </div>

                <div className="space-y-2">
                  {group.objectives.slice(0, 2).map((obj) => (
                    <div key={obj.id} className="flex items-start gap-2">
                      <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{obj.title}</p>
                      </div>
                    </div>
                  ))}
                  {group.objectives.length > 2 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      +{group.objectives.length - 2} more objective{group.objectives.length - 2 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
