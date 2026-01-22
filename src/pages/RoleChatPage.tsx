import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useChatStream } from "@/hooks/useChatStream";
import { useTaskExecution } from "@/hooks/useTaskExecution";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import CompanyMemoryPanel from "@/components/memory/CompanyMemoryPanel";
import AssignTaskDialog from "@/components/tasks/AssignTaskDialog";
import TaskPanel from "@/components/tasks/TaskPanel";
import ActiveTaskBanner from "@/components/tasks/ActiveTaskBanner";
import RoleObjectiveBanner from "@/components/workflow/RoleObjectiveBanner";
import RoleActivationWizard from "@/components/wizard/RoleActivationWizard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Eye } from "lucide-react";

interface Role {
  id: string;
  name: string;
  mandate: string;
  company_id: string;
  workflow_status: string;
  authority_level: string;
  is_activated: boolean;
}

interface RoleObjective {
  id: string;
  title: string;
  description: string;
  status: string;
}

export default function RoleChatPage() {
  const params = useParams<{ id?: string; companyId?: string; roleId: string }>();
  const companyId = params.id || params.companyId;
  const roleId = params.roleId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [role, setRole] = useState<Role | null>(null);
  const [companyName, setCompanyName] = useState<string | undefined>(undefined);
  const [currentObjective, setCurrentObjective] = useState<RoleObjective | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showActivationWizard, setShowActivationWizard] = useState(false);

  const handleChatError = useCallback((err: string) => {
    toast({
      title: "Chat Error",
      description: err,
      variant: "destructive",
    });
  }, [toast]);

  const handleTaskError = useCallback((err: string) => {
    toast({
      title: "Task Error",
      description: err,
      variant: "destructive",
    });
  }, [toast]);

  const { 
    messages, 
    isLoading, 
    isStreaming, 
    pinnedMessageIds,
    loadMessages, 
    sendMessage,
    pinToCompanyMemory,
  } = useChatStream({
    roleId: roleId || "",
    companyId: companyId,
    onError: handleChatError,
  });

  const {
    tasks,
    activeTask,
    attempts,
    isExecuting,
    isLoading: tasksLoading,
    loadTasks,
    loadAttempts,
    assignTask,
    stopTask,
    startTaskExecution,
  } = useTaskExecution({
    roleId: roleId || "",
    companyId: companyId || "",
    onError: handleTaskError,
  });

  // Realtime subscription for task updates
  useEffect(() => {
    if (!roleId) return;
    
    // Subscribe to task changes for this role
    const taskChannel = supabase
      .channel(`tasks-${roleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `role_id=eq.${roleId}`,
        },
        () => {
          // Reload tasks when any change occurs
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
    };
  }, [roleId, loadTasks]);

  // Realtime subscription for attempt updates
  useEffect(() => {
    if (!activeTask?.id) return;
    
    const attemptChannel = supabase
      .channel(`attempts-${activeTask.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_attempts',
          filter: `task_id=eq.${activeTask.id}`,
        },
        () => {
          loadAttempts(activeTask.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attemptChannel);
    };
  }, [activeTask?.id, loadAttempts]);

  useEffect(() => {
    async function fetchRole() {
      if (!roleId || !companyId || !user) {
        setError("Invalid role or company");
        setLoading(false);
        return;
      }

      try {
        // Fetch role with new is_activated column (using any cast for new column)
        const { data, error: fetchError } = await supabase
          .from("roles")
          .select("id, name, mandate, company_id, workflow_status, authority_level, is_activated")
          .eq("id", roleId)
          .eq("company_id", companyId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Role not found");

        const roleData = data as unknown as Role;
        setRole(roleData);
        
        // Check for existing objectives (could be auto-created from memos)
        const { data: existingObjectives } = await supabase
          .from("role_objectives")
          .select("id")
          .eq("role_id", roleId)
          .eq("status", "active")
          .limit(1);

        // Show activation wizard only if not activated AND no objectives exist
        if (!roleData.is_activated && (!existingObjectives || existingObjectives.length === 0)) {
          setShowActivationWizard(true);
        } else if (!roleData.is_activated && existingObjectives && existingObjectives.length > 0) {
          // Role has objectives from memos - auto-activate silently
          await supabase.from("roles").update({ is_activated: true }).eq("id", roleId);
          roleData.is_activated = true;
        }

        // Fetch company name
        const { data: companyData } = await supabase
          .from("companies")
          .select("name")
          .eq("id", companyId)
          .single();
        
        if (companyData?.name) {
          setCompanyName(companyData.name);
        }

        // Fetch current active objective (use any cast for new table)
        const { data: objectiveData } = await (supabase as any)
          .from("role_objectives")
          .select("id, title, description, status")
          .eq("role_id", roleId)
          .eq("status", "active")
          .order("priority", { ascending: true })
          .limit(1)
          .single();
        
        if (objectiveData) {
          setCurrentObjective(objectiveData as RoleObjective);
        }

        // Check if user is owner
        const { data: memberData } = await supabase
          .from("company_members")
          .select("role")
          .eq("company_id", companyId)
          .eq("user_id", user.id)
          .single();

        setIsOwner(memberData?.role === "owner");

        await loadMessages();
      } catch (err) {
        console.error("Failed to load role:", err);
        setError("Failed to load role. You may not have access.");
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [roleId, companyId, user, loadMessages]);

  const handleBack = () => {
    navigate(`/companies/${companyId}`);
  };

  const handleActivationComplete = async () => {
    setShowActivationWizard(false);
    // Refresh role data to get updated is_activated status
    const { data } = await supabase
      .from("roles")
      .select("id, name, mandate, company_id, workflow_status, authority_level, is_activated")
      .eq("id", roleId)
      .single();
    if (data) {
      setRole(data as unknown as Role);
    }
    // Reload objectives
    const { data: objectiveData } = await supabase
      .from("role_objectives")
      .select("id, title, description, status")
      .eq("role_id", roleId)
      .eq("status", "active")
      .order("priority", { ascending: true })
      .limit(1)
      .single();
    if (objectiveData) {
      setCurrentObjective(objectiveData as RoleObjective);
    }
  };

  const handlePinToMemory = async (messageId: string, content: string, label: string) => {
    await pinToCompanyMemory(messageId, content, label);
    toast({
      title: "Memory pinned",
      description: "Message saved to company memory.",
    });
  };

  const handleAssignTask = async (input: { title: string; description: string; completion_criteria: string; max_attempts: number }) => {
    const newTask = await assignTask(input);
    if (newTask) {
      toast({
        title: "Task assigned",
        description: "Task execution will begin shortly.",
      });
      startTaskExecution(newTask.id);
    }
  };

  const handleStopTask = async (taskId: string) => {
    await stopTask(taskId);
    toast({
      title: "Task stopped",
      description: "The task has been stopped.",
    });
  };

  // Track which tasks we've already tried to trigger
  const triggeredTasksRef = useRef<Set<string>>(new Set());

  // Auto-start orphaned pending tasks (created before auto-start was implemented)
  useEffect(() => {
    if (!activeTask || activeTask.status !== 'pending') return;
    if (triggeredTasksRef.current.has(activeTask.id)) return;
    
    // Check if task has been pending for more than 5 seconds with no attempts
    const taskAge = Date.now() - new Date(activeTask.created_at).getTime();
    const isOrphaned = taskAge > 5000 && activeTask.current_attempt === 0;
    
    if (isOrphaned) {
      console.log("Detected orphaned pending task, triggering execution...", activeTask.id);
      triggeredTasksRef.current.add(activeTask.id);
      startTaskExecution(activeTask.id);
    }
  }, [activeTask, startTaskExecution]);

  // Show toast when task completes or blocks
  useEffect(() => {
    if (activeTask?.status === "completed") {
      toast({
        title: "Task completed",
        description: activeTask.title,
      });
    } else if (activeTask?.status === "blocked") {
      toast({
        title: "Task blocked",
        description: "The task could not be completed and needs attention.",
        variant: "destructive",
      });
    }
  }, [activeTask?.status, activeTask?.title, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || "Role not found"}</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Company
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <ChatHeader
        roleName={role.name}
        mandate={role.mandate}
        onBack={handleBack}
        onOpenMemory={() => setShowMemoryPanel(true)}
        onOpenTasks={() => setShowTaskPanel(true)}
        hasActiveTask={activeTask !== null && (activeTask.status === "running" || activeTask.status === "pending")}
      />

      {/* Inspection Mode Banner */}
      <div className="border-b border-border bg-muted/30 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>Inspection Mode</span>
          <span className="text-xs">— Chat is for auditing role activity. Govern via Workflow.</span>
        </div>
        <Badge 
          variant={role.workflow_status === 'awaiting_approval' ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {role.workflow_status === 'idle' && 'Idle'}
          {role.workflow_status === 'in_task' && 'Working'}
          {role.workflow_status === 'awaiting_approval' && 'Awaiting Approval'}
        </Badge>
      </div>

      {/* Current Objective Banner */}
      {currentObjective && (
        <RoleObjectiveBanner objective={currentObjective} />
      )}
      
      {/* Active Task Banner */}
      {activeTask && (activeTask.status === "running" || activeTask.status === "pending") && (
        <ActiveTaskBanner
          task={activeTask}
          attempts={attempts}
          isExecuting={isExecuting}
          onViewDetails={() => setShowTaskPanel(true)}
          onStop={() => handleStopTask(activeTask.id)}
          onStart={() => startTaskExecution(activeTask.id)}
        />
      )}

      {/* Chat - Always visible for inspection */}
      <ChatMessages 
        messages={messages} 
        isLoading={isLoading}
        pinnedMessageIds={pinnedMessageIds}
        onPinToMemory={handlePinToMemory}
      />
      <ChatInput
        onSend={sendMessage}
        isStreaming={isStreaming}
      />
      
      {/* Memory Panel */}
      {companyId && (
        <CompanyMemoryPanel
          open={showMemoryPanel}
          onOpenChange={setShowMemoryPanel}
          companyId={companyId}
          isOwner={isOwner}
        />
      )}

      {/* Task Panel */}
      <TaskPanel
        open={showTaskPanel}
        onOpenChange={setShowTaskPanel}
        tasks={tasks}
        activeTask={activeTask}
        attempts={attempts}
        isExecuting={isExecuting}
        isLoading={tasksLoading}
        onAssignClick={() => {
          setShowTaskPanel(false);
          setShowAssignDialog(true);
        }}
        onStopTask={handleStopTask}
        onLoadAttempts={loadAttempts}
      />

      {/* Assign Task Dialog */}
      <AssignTaskDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onAssign={handleAssignTask}
        roleName={role.name}
      />

      {/* Role Activation Wizard */}
      {companyId && (
        <RoleActivationWizard
          open={showActivationWizard}
          onComplete={handleActivationComplete}
          role={role}
          companyId={companyId}
        />
      )}
    </div>
  );
}
