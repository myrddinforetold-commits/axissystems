import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";

interface Task {
  id: string;
  status: string;
  role_name: string;
}

interface WorkProgressChartProps {
  activeTasks: Task[];
  completedTasks: Task[];
  companyId: string;
}

interface StatusCount {
  name: string;
  value: number;
  color: string;
}

interface RoleActivity {
  role: string;
  completed: number;
  active: number;
}

export default function WorkProgressChart({
  activeTasks,
  completedTasks,
  companyId,
}: WorkProgressChartProps) {
  const [allTimeCounts, setAllTimeCounts] = useState<StatusCount[]>([]);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    async function fetchAllStats() {
      // Get counts by status for the company
      const { data } = await supabase
        .from("tasks")
        .select("status")
        .eq("company_id", companyId);

      const counts: Record<string, number> = {
        completed: 0,
        pending: 0,
        running: 0,
        failed: 0,
        stopped: 0,
        blocked: 0,
        system_alert: 0,
      };

      data?.forEach((t) => {
        if (counts[t.status] !== undefined) {
          counts[t.status]++;
        }
      });

      setFailedCount(counts.failed + counts.system_alert + counts.blocked);

      setAllTimeCounts([
        { name: "Completed", value: counts.completed, color: "hsl(var(--chart-2))" },
        { name: "Active", value: counts.pending + counts.running, color: "hsl(var(--chart-1))" },
        { name: "Issues", value: counts.failed + counts.system_alert + counts.blocked, color: "hsl(var(--chart-5))" },
      ].filter(s => s.value > 0));
    }

    fetchAllStats();
  }, [companyId, activeTasks, completedTasks]);

  // Calculate role activity
  const roleActivityMap = new Map<string, RoleActivity>();
  
  [...activeTasks, ...completedTasks].forEach((task) => {
    const existing = roleActivityMap.get(task.role_name) || {
      role: task.role_name,
      completed: 0,
      active: 0,
    };
    
    if (task.status === "completed") {
      existing.completed++;
    } else {
      existing.active++;
    }
    
    roleActivityMap.set(task.role_name, existing);
  });

  const roleActivity = Array.from(roleActivityMap.values())
    .sort((a, b) => (b.completed + b.active) - (a.completed + a.active))
    .slice(0, 5);

  const totalTasks = allTimeCounts.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            {totalTasks === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No tasks yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={allTimeCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {allTimeCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, "Tasks"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            {allTimeCounts.map((stat) => (
              <div key={stat.name} className="flex items-center gap-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stat.color }}
                />
                <span className="text-muted-foreground">
                  {stat.name}: {stat.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Activity */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-primary" />
            Role Activity (This Week)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roleActivity.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No role activity this week
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={roleActivity} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="role"
                  width={100}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-2))" name="Completed" />
                <Bar dataKey="active" stackId="a" fill="hsl(var(--chart-1))" name="Active" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      {failedCount > 0 && (
        <Card className="border-destructive/50 md:col-span-3">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm">
              <strong>{failedCount}</strong> task{failedCount !== 1 ? "s" : ""} need attention
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
