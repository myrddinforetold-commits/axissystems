import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, Loader2, Archive, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import TaskStatusBadge from "./TaskStatusBadge";
import TaskDetailView from "./TaskDetailView";
import DependencyStatusBadge from "./DependencyStatusBadge";
import type { Task, TaskAttempt } from "@/hooks/useTaskExecution";
import { toast } from "sonner";

interface TaskPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  activeTask: Task | null;
  attempts: TaskAttempt[];
  isExecuting: boolean;
  isLoading: boolean;
  onAssignClick: () => void;
  onStopTask: (taskId: string) => Promise<void>;
  onLoadAttempts: (taskId: string) => Promise<void>;
  onArchiveTask?: (taskId: string) => Promise<void>;
  onVerifyTask?: (taskId: string) => Promise<void>;
}

export default function TaskPanel({
  open,
  onOpenChange,
  tasks,
  activeTask,
  attempts,
  isExecuting,
  isLoading,
  onAssignClick,
  onStopTask,
  onLoadAttempts,
  onArchiveTask,
  onVerifyTask,
}: TaskPanelProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const selectedTask = selectedTaskId 
    ? tasks.find(t => t.id === selectedTaskId) || null
    : activeTask;

  const handleTaskClick = async (task: Task) => {
    setSelectedTaskId(task.id);
    await onLoadAttempts(task.id);
  };

  const handleArchive = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (onArchiveTask) {
      await onArchiveTask(taskId);
      toast.success("Task archived");
    }
  };

  const handleVerify = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (onVerifyTask) {
      await onVerifyTask(taskId);
      toast.success("Task verified");
    }
  };

  const completedTasks = tasks.filter(t => 
    t.status === "completed" || t.status === "blocked" || t.status === "stopped"
  );
  
  const archivedTasks = tasks.filter(t => t.status === "archived");
  const unverifiedCount = tasks.filter(t => t.requires_verification && !t.verified_at).length;

  const hasActiveTask = activeTask !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Task Execution</SheetTitle>
          <SheetDescription>
            Assign and monitor tasks for this AI role
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Assign New Task Button */}
          <Button 
            onClick={onAssignClick} 
            className="w-full"
            disabled={hasActiveTask}
          >
            <Plus className="h-4 w-4 mr-2" />
            {hasActiveTask ? "Task in Progress" : "Assign New Task"}
          </Button>

          {hasActiveTask && (
            <p className="text-xs text-muted-foreground text-center -mt-2">
              Complete or stop the current task before assigning a new one
            </p>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedTask ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTaskId(null)}
                className="text-muted-foreground"
              >
                ← Back to list
              </Button>
              <TaskDetailView
                task={selectedTask}
                attempts={selectedTaskId === activeTask?.id || selectedTaskId === null ? attempts : []}
                isExecuting={isExecuting}
                onStop={() => onStopTask(selectedTask.id)}
                allTasks={tasks}
              />
            </>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-4 pr-4">
                {/* Active Task */}
                {activeTask && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Active Task</h3>
                    <Card 
                      className="cursor-pointer hover:bg-accent/50 transition-colors border-primary/50"
                      onClick={() => handleTaskClick(activeTask)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{activeTask.title}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <TaskStatusBadge
                                status={activeTask.status}
                                currentAttempt={activeTask.current_attempt}
                                maxAttempts={activeTask.max_attempts}
                                size="sm"
                              />
                              <DependencyStatusBadge
                                status={activeTask.dependency_status}
                                dependencyCount={activeTask.depends_on?.length || 0}
                              />
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Previous Tasks</h3>
                        {unverifiedCount > 0 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {unverifiedCount} unverified
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {completedTasks.map(task => (
                          <Card 
                            key={task.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => handleTaskClick(task)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{task.title}</p>
                                    {task.requires_verification && !task.verified_at && (
                                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs shrink-0">
                                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                        Unverified
                                      </Badge>
                                    )}
                                    {task.verified_at && (
                                      <Badge variant="outline" className="text-green-600 border-green-300 text-xs shrink-0">
                                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                        Verified
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <TaskStatusBadge status={task.status} size="sm" />
                                    <DependencyStatusBadge
                                      status={task.dependency_status}
                                      dependencyCount={task.depends_on?.length || 0}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {task.current_attempt}/{task.max_attempts} attempts
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {task.requires_verification && !task.verified_at && onVerifyTask && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={(e) => handleVerify(e, task.id)}
                                      title="Mark as verified"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {onArchiveTask && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => handleArchive(e, task.id)}
                                      title="Archive task"
                                    >
                                      <Archive className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Archived Tasks Toggle */}
                {archivedTasks.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-muted-foreground"
                        onClick={() => setShowArchived(!showArchived)}
                      >
                        <span className="flex items-center gap-2">
                          <Archive className="h-4 w-4" />
                          Archived ({archivedTasks.length})
                        </span>
                        {showArchived ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {showArchived && (
                        <div className="space-y-2 mt-2">
                          {archivedTasks.map(task => (
                            <Card 
                              key={task.id}
                              className="cursor-pointer hover:bg-accent/50 transition-colors opacity-60"
                              onClick={() => handleTaskClick(task)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{task.title}</p>
                                    <TaskStatusBadge status={task.status} size="sm" />
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {tasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tasks yet</p>
                    <p className="text-sm">Assign a task to get started</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
