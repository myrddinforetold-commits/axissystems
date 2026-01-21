import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import TaskStatusBadge from "./TaskStatusBadge";
import TaskAttemptCard from "./TaskAttemptCard";
import StopTaskButton from "./StopTaskButton";
import type { Task, TaskAttempt } from "@/hooks/useTaskExecution";

interface TaskDetailViewProps {
  task: Task;
  attempts: TaskAttempt[];
  isExecuting: boolean;
  onStop: () => Promise<void>;
}

export default function TaskDetailView({
  task,
  attempts,
  isExecuting,
  onStop,
}: TaskDetailViewProps) {
  const canStop = task.status === "running" || task.status === "pending";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-lg truncate">{task.title}</CardTitle>
              <TaskStatusBadge
                status={task.status}
                currentAttempt={task.current_attempt}
                maxAttempts={task.max_attempts}
              />
            </div>
            {canStop && (
              <StopTaskButton onStop={onStop} isExecuting={isExecuting} size="sm" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{task.description}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Completion Criteria</p>
            <p className="text-sm bg-muted/50 rounded-md p-2 whitespace-pre-wrap">
              {task.completion_criteria}
            </p>
          </div>
          {task.completion_summary && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Completion Summary</p>
              <p className="text-sm bg-primary/10 border border-primary/20 rounded-md p-2 whitespace-pre-wrap">
                {task.completion_summary}
              </p>
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
