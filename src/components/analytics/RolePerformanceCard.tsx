import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { RoleStats } from '@/hooks/useRoleAnalytics';

interface RolePerformanceCardProps {
  stats: RoleStats;
}

export function RolePerformanceCard({ stats }: RolePerformanceCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{stats.roleName}</CardTitle>
        <CardDescription>
          {stats.totalTasks} total task{stats.totalTasks !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-medium">{stats.successRate}%</span>
          </div>
          <Progress value={stats.successRate} className="h-2" />
        </div>

        {/* Task Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-medium">{stats.completedTasks}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">Blocked:</span>
            <span className="font-medium">{stats.blockedTasks}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Stopped:</span>
            <span className="font-medium">{stats.stoppedTasks}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Active:</span>
            <span className="font-medium">{stats.pendingTasks + stats.runningTasks}</span>
          </div>
        </div>

        {/* Avg Attempts */}
        <div className="text-xs text-muted-foreground">
          Avg. attempts per task: {stats.avgAttempts}
        </div>
      </CardContent>
    </Card>
  );
}
