import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import TaskStatusBadge from "./TaskStatusBadge";
import TaskAttemptCard from "./TaskAttemptCard";
import StopTaskButton from "./StopTaskButton";
import DependencyStatusBadge from "./DependencyStatusBadge";
import type { Task, TaskAttempt } from "@/hooks/useTaskExecution";
import { Link2 } from "lucide-react";

interface TaskDetailViewProps {
  task: Task;
  attempts: TaskAttempt[];
  isExecuting: boolean;
  onStop: () => Promise<void>;
  allTasks?: Task[];
}

export default function TaskDetailView({
  task,
  attempts,
  isExecuting,
  onStop,
  allTasks = [],
}: TaskDetailViewProps) {
  const canStop = task.status === "running" || task.status === "pending";
  
  // Get dependency task names
  const dependencyTasks = task.depends_on?.length > 0
    ? allTasks.filter(t => task.depends_on.includes(t.id))
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-lg truncate">{task.title}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <TaskStatusBadge
                  status={task.status}
                  currentAttempt={task.current_attempt}
                  maxAttempts={task.max_attempts}
                />
                <DependencyStatusBadge 
                  status={task.dependency_status} 
                  dependencyCount={task.depends_on?.length || 0}
                />
              </div>
            </div>
            {canStop && (
              <StopTaskButton onStop={onStop} isExecuting={isExecuting} size="sm" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm break-words whitespace-pre-wrap">{task.description}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Completion Criteria</p>
            <p className="text-sm bg-muted/50 rounded-md p-2 whitespace-pre-wrap break-words">
              {task.completion_criteria}
            </p>
          </div>
          {task.completion_summary && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Completion Summary</p>
              <p className="text-sm bg-primary/10 border border-primary/20 rounded-md p-2 whitespace-pre-wrap break-words">
                {task.completion_summary}
              </p>
            </div>
          )}
          {dependencyTasks.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Dependencies ({dependencyTasks.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {dependencyTasks.map(dep => (
                  <Badge
                    key={dep.id}
                    variant={dep.status === "completed" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {dep.title.substring(0, 25)}{dep.title.length > 25 ? "..." : ""}
                    {dep.status === "completed" && " ✓"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Created: {new Date(task.created_at).toLocaleString()}</span>
            <span>Attempts: {task.current_attempt}/{task.max_attempts}</span>
          </div>
        </CardContent>
      </Card>

      {attempts.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-3">Attempt History</h3>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {attempts.slice().reverse().map((attempt, index) => (
                  <TaskAttemptCard
                    key={attempt.id}
                    attempt={attempt}
                    isLatest={index === 0}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
