import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleStats {
  roleId: string;
  roleName: string;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  stoppedTasks: number;
  pendingTasks: number;
  runningTasks: number;
  successRate: number;
  avgAttempts: number;
}

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  overallSuccessRate: number;
  activeRoles: number;
  tasksThisWeek: number;
}

export interface TaskTrend {
  date: string;
  completed: number;
  blocked: number;
  stopped: number;
}

export function useRoleAnalytics(companyId: string) {
  // Fetch role-level statistics
  const { data: roleStats = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['role-analytics', companyId],
    queryFn: async () => {
      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('company_id', companyId);

      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      // Fetch all tasks for the company
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, role_id, status, current_attempt')
        .eq('company_id', companyId);

      if (tasksError) throw tasksError;

      // Compute stats per role
      const stats: RoleStats[] = roles.map((role) => {
        const roleTasks = tasks?.filter(t => t.role_id === role.id) || [];
        const completed = roleTasks.filter(t => t.status === 'completed').length;
        const blocked = roleTasks.filter(t => t.status === 'blocked').length;
        const stopped = roleTasks.filter(t => t.status === 'stopped').length;
        const pending = roleTasks.filter(t => t.status === 'pending').length;
        const running = roleTasks.filter(t => t.status === 'running').length;
        const total = roleTasks.length;
        const finishedTasks = completed + blocked + stopped;
        
        return {
          roleId: role.id,
          roleName: role.name,
          totalTasks: total,
          completedTasks: completed,
          blockedTasks: blocked,
          stoppedTasks: stopped,
          pendingTasks: pending,
          runningTasks: running,
          successRate: finishedTasks > 0 ? Math.round((completed / finishedTasks) * 100) : 0,
          avgAttempts: total > 0 
            ? Math.round((roleTasks.reduce((sum, t) => sum + (t.current_attempt || 0), 0) / total) * 10) / 10 
            : 0,
        };
      });

      return stats.filter(s => s.totalTasks > 0);
    },
    enabled: !!companyId,
  });

  // Fetch summary statistics
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['analytics-summary', companyId],
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, status, created_at')
        .eq('company_id', companyId);

      if (error) throw error;

      const { data: roles } = await supabase
        .from('roles')
        .select('id, is_activated')
        .eq('company_id', companyId);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const allTasks = tasks || [];
      const completed = allTasks.filter(t => t.status === 'completed').length;
      const blocked = allTasks.filter(t => t.status === 'blocked').length;
      const stopped = allTasks.filter(t => t.status === 'stopped').length;
      const finishedTasks = completed + blocked + stopped;
      const tasksThisWeek = allTasks.filter(t => new Date(t.created_at) >= oneWeekAgo).length;

      return {
        totalTasks: allTasks.length,
        completedTasks: completed,
        blockedTasks: blocked,
        overallSuccessRate: finishedTasks > 0 ? Math.round((completed / finishedTasks) * 100) : 0,
        activeRoles: roles?.filter(r => r.is_activated).length || 0,
        tasksThisWeek,
      } as AnalyticsSummary;
    },
    enabled: !!companyId,
  });

  // Fetch task trends (last 14 days)
  const { data: trends = [], isLoading: isLoadingTrends } = useQuery({
    queryKey: ['task-trends', companyId],
    queryFn: async () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('status, created_at')
        .eq('company_id', companyId)
        .gte('created_at', fourteenDaysAgo.toISOString());

      if (error) throw error;

      // Group by date
      const dateMap = new Map<string, { completed: number; blocked: number; stopped: number }>();
      
      // Initialize last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap.set(dateStr, { completed: 0, blocked: 0, stopped: 0 });
      }

      // Populate with actual data
      tasks?.forEach((task) => {
        const dateStr = new Date(task.created_at).toISOString().split('T')[0];
        const current = dateMap.get(dateStr);
        if (current) {
          if (task.status === 'completed') current.completed++;
          else if (task.status === 'blocked') current.blocked++;
          else if (task.status === 'stopped') current.stopped++;
        }
      });

      return Array.from(dateMap.entries()).map(([date, counts]) => ({
        date,
        ...counts,
      })) as TaskTrend[];
    },
    enabled: !!companyId,
  });

  return {
    roleStats,
    summary: summary ?? {
      totalTasks: 0,
      completedTasks: 0,
      blockedTasks: 0,
      overallSuccessRate: 0,
      activeRoles: 0,
      tasksThisWeek: 0,
    },
    trends,
    isLoading: isLoadingRoles || isLoadingSummary || isLoadingTrends,
  };
}
