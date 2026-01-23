import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CheckCircle, XCircle, Bot, TrendingUp } from 'lucide-react';
import { useRoleAnalytics } from '@/hooks/useRoleAnalytics';
import { RolePerformanceCard } from './RolePerformanceCard';
import { TaskCompletionChart } from './TaskCompletionChart';
import { SuccessRateGauge } from './SuccessRateGauge';

interface RoleAnalyticsDashboardProps {
  companyId: string;
}

export function RoleAnalyticsDashboard({ companyId }: RoleAnalyticsDashboardProps) {
  const { roleStats, summary, trends, isLoading } = useRoleAnalytics(companyId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {summary.tasksThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalTasks > 0 
                ? `${Math.round((summary.completedTasks / summary.totalTasks) * 100)}% of total`
                : 'No tasks yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.blockedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tasks that got blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeRoles}</div>
            <p className="text-xs text-muted-foreground">
              Roles that are activated
            </p>
          </CardContent>
        </Card>

        <SuccessRateGauge rate={summary.overallSuccessRate} label="Success Rate" />
      </div>

      {/* Trends Chart */}
      <TaskCompletionChart data={trends} />

      {/* Role Breakdown */}
      {roleStats.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance by Role
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roleStats.map((stats) => (
              <RolePerformanceCard key={stats.roleId} stats={stats} />
            ))}
          </div>
        </div>
      )}

      {roleStats.length === 0 && summary.totalTasks === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No task data yet. Analytics will appear here once roles start executing tasks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
