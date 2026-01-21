import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Task {
  id: string;
  company_id: string;
  role_id: string;
  assigned_by: string;
  title: string;
  description: string;
  completion_criteria: string;
  status: "pending" | "running" | "completed" | "blocked" | "stopped";
  max_attempts: number;
  current_attempt: number;
  completion_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAttempt {
  id: string;
  task_id: string;
  attempt_number: number;
  model_output: string;
  evaluation_result: "pass" | "fail" | "unclear";
  evaluation_reason: string | null;
  created_at: string;
}

export interface TaskInput {
  title: string;
  description: string;
  completion_criteria: string;
  max_attempts: number;
}

interface UseTaskExecutionOptions {
  roleId: string;
  companyId: string;
  onError?: (error: string) => void;
}

export function useTaskExecution({ roleId, companyId, onError }: UseTaskExecutionOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [attempts, setAttempts] = useState<TaskAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const executingRef = useRef(false);
  const onErrorRef = useRef(onError);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const loadTasks = useCallback(async () => {
    if (!roleId || !companyId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("role_id", roleId)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Type assertion since Supabase types may not be updated yet
      const typedData = data as unknown as Task[];
      setTasks(typedData);
      
      // Find active task (pending or running)
      const active = typedData.find(t => t.status === "pending" || t.status === "running");
      setActiveTask(active || null);

      // Load attempts for active task
      if (active) {
        const { data: attemptData } = await supabase
          .from("task_attempts")
          .select("*")
          .eq("task_id", active.id)
          .order("attempt_number", { ascending: true });
        
        setAttempts((attemptData as unknown as TaskAttempt[]) || []);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
      onErrorRef.current?.("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [roleId, companyId]);

  const loadAttempts = useCallback(async (taskId: string) => {
    const { data, error } = await supabase
      .from("task_attempts")
      .select("*")
      .eq("task_id", taskId)
      .order("attempt_number", { ascending: true });

    if (!error && data) {
      setAttempts(data as unknown as TaskAttempt[]);
    }
  }, []);

  const assignTask = useCallback(async (input: TaskInput): Promise<Task | null> => {
    if (!roleId || !companyId) {
      onErrorRef.current?.("Invalid role or company");
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      onErrorRef.current?.("Not authenticated");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          role_id: roleId,
          company_id: companyId,
          assigned_by: user.id,
          title: input.title,
          description: input.description,
          completion_criteria: input.completion_criteria,
          max_attempts: input.max_attempts,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      const newTask = data as unknown as Task;
      setTasks(prev => [newTask, ...prev]);
      setActiveTask(newTask);
      setAttempts([]);
      
      return newTask;
    } catch (err) {
      console.error("Failed to assign task:", err);
      onErrorRef.current?.("Failed to assign task");
      return null;
    }
  }, [roleId, companyId]);

  const stopTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "stopped" })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: "stopped" as const } : t
      ));
      
      if (activeTask?.id === taskId) {
        setActiveTask(prev => prev ? { ...prev, status: "stopped" } : null);
      }

      // Stop polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      executingRef.current = false;
      setIsExecuting(false);
    } catch (err) {
      console.error("Failed to stop task:", err);
      onErrorRef.current?.("Failed to stop task");
    }
  }, [activeTask]);

  const executeAttempt = useCallback(async (taskId: string): Promise<boolean> => {
    if (executingRef.current) return false;
    
    executingRef.current = true;
    setIsExecuting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ task_id: taskId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Execution failed");
      }

      // Update task state
      if (result.task) {
        const updatedTask = result.task as Task;
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        setActiveTask(updatedTask);
      }

      // Add new attempt
      if (result.attempt) {
        setAttempts(prev => [...prev, result.attempt as TaskAttempt]);
      }

      // Return whether we should retry
      return result.should_retry === true;
    } catch (err) {
      console.error("Attempt execution error:", err);
      onErrorRef.current?.(err instanceof Error ? err.message : "Execution failed");
      return false;
    } finally {
      executingRef.current = false;
      setIsExecuting(false);
    }
  }, []);

  const startTaskExecution = useCallback(async (taskId: string) => {
    let shouldRetry = true;
    
    while (shouldRetry) {
      // Check if task was stopped
      const { data: currentTask } = await supabase
        .from("tasks")
        .select("status")
        .eq("id", taskId)
        .single();

      if (currentTask?.status === "stopped" || currentTask?.status === "completed" || currentTask?.status === "blocked") {
        break;
      }

      shouldRetry = await executeAttempt(taskId);
      
      // Small delay between attempts
      if (shouldRetry) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Reload to get final state
    await loadTasks();
  }, [executeAttempt, loadTasks]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    activeTask,
    attempts,
    isLoading,
    isExecuting,
    loadTasks,
    loadAttempts,
    assignTask,
    stopTask,
    startTaskExecution,
  };
}
