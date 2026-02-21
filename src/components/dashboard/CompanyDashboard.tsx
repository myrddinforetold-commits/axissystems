import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ActiveWorkCard from "./ActiveWorkCard";
import CompletedDeliverableCard from "./CompletedDeliverableCard";
import WorkProgressChart from "./WorkProgressChart";
import ExternalActionsCard from "./ExternalActionsCard";
import ObjectiveProgressCard from "./ObjectiveProgressCard";
import { ClipboardList, CheckCircle2, AlertTriangle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  current_attempt: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  completion_summary: string | null;
  role_name: string;
  role_id: string;
}

interface CompanyDashboardProps {
  companyId: string;
}

export default function CompanyDashboard({ companyId }: CompanyDashboardProps) {
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [attentionTasks, setAttentionTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      
      // Fetch active tasks
      const { data: activeData } = await supabase
        .from("tasks")
        .select(`
          id, title, description, status, current_attempt, max_attempts,
          created_at, updated_at, completion_summary, role_id,
          roles!inner(name)
        `)
        .eq("company_id", companyId)
        .in("status", ["pending", "running"])
        .order("updated_at", { ascending: false })
        .limit(10);

      // Fetch completed tasks (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: completedData } = await supabase
        .from("tasks")
        .select(`
          id, title, description, status, current_attempt, max_attempts,
          created_at, updated_at, completion_summary, role_id,
          roles!inner(name)
        `)
        .eq("company_id", companyId)
        .eq("status", "completed")
        .gte("updated_at", sevenDaysAgo.toISOString())
        .order("updated_at", { ascending: false })
        .limit(20);

      // Fetch tasks requiring attention
      const { data: attentionData } = await supabase
        .from("tasks")
        .select(`
          id, title, description, status, current_attempt, max_attempts,
          created_at, updated_at, completion_summary, role_id,
          roles!inner(name)
        `)
        .eq("company_id", companyId)
        .in("status", ["blocked", "system_alert", "stopped"])
        .order("updated_at", { ascending: false })
        .limit(10);

      const formatTasks = (data: any[]): Task[] =>
        data?.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          current_attempt: t.current_attempt,
          max_attempts: t.max_attempts,
          created_at: t.created_at,
          updated_at: t.updated_at,
          completion_summary: t.completion_summary,
          role_name: t.roles?.name || "Unknown Role",
          role_id: t.role_id,
        })) || [];

      setActiveTasks(formatTasks(activeData || []));
      setCompletedTasks(formatTasks(completedData || []));
      setAttentionTasks(formatTasks(attentionData || []));
      setLoading(false);
    }

    fetchTasks();
    
    // Set up realtime subscription for task updates
    const channel = supabase
      .channel("dashboard-tasks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* External Actions (only shows if there are pending actions) */}
      <ExternalActionsCard companyId={companyId} />

      {/* Objective Progress */}
      <ObjectiveProgressCard companyId={companyId} />

      {/* Progress Overview */}
      <WorkProgressChart 
        activeTasks={activeTasks} 
        completedTasks={completedTasks} 
        companyId={companyId}
      />

      {attentionTasks.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Needs Attention
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {attentionTasks.length} task{attentionTasks.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attentionTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.role_name} • {task.status.replace("_", " ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/companies/${companyId}/roles/${task.role_id}/chat`)}
                  >
                    Open Role
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Work */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              Active Work
              {activeTasks.length > 0 && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No active tasks right now
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Assign tasks to roles to see work in progress
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <ActiveWorkCard key={task.id} task={task} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Completed Deliverables */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Completed This Week
              {completedTasks.length > 0 && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {completedTasks.length} deliverable{completedTasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No completed tasks this week
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Completed work will appear here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-3">
                  {completedTasks.map((task) => (
                    <CompletedDeliverableCard key={task.id} task={task} companyId={companyId} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
