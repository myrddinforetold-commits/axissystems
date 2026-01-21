import { useEffect, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

interface Role {
  id: string;
  name: string;
  mandate: string;
  company_id: string;
}

export default function RoleChatPage() {
  const { id: companyId, roleId } = useParams<{ id: string; roleId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

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
    onError: (err) => {
      toast({
        title: "Chat Error",
        description: err,
        variant: "destructive",
      });
    },
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
    onError: (err) => {
      toast({
        title: "Task Error",
        description: err,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    async function fetchRole() {
      if (!roleId || !companyId || !user) {
        setError("Invalid role or company");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("roles")
          .select("id, name, mandate, company_id")
          .eq("id", roleId)
          .eq("company_id", companyId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Role not found");

        setRole(data);

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
      // Start execution
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
      
      {/* Active Task Banner */}
      {activeTask && (activeTask.status === "running" || activeTask.status === "pending") && (
        <ActiveTaskBanner
          task={activeTask}
          isExecuting={isExecuting}
          onViewDetails={() => setShowTaskPanel(true)}
          onStop={() => handleStopTask(activeTask.id)}
        />
      )}
      
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
    </div>
  );
}
