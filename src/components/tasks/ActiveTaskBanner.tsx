import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import TaskStatusBadge from "./TaskStatusBadge";
import StopTaskButton from "./StopTaskButton";
import type { Task, TaskAttempt } from "@/hooks/useTaskExecution";

interface ActiveTaskBannerProps {
  task: Task;
  attempts?: TaskAttempt[];
  isExecuting: boolean;
  onViewDetails: () => void;
  onStop: () => Promise<void>;
}

export default function ActiveTaskBanner({
  task,
  attempts = [],
  isExecuting,
  onViewDetails,
  onStop,
}: ActiveTaskBannerProps) {
  const latestAttempt = attempts.length > 0 
    ? attempts[attempts.length - 1] 
    : null;

  // Estimate: assume ~30 seconds per attempt
  const remainingAttempts = task.max_attempts - task.current_attempt;
  const estimatedMinutes = Math.ceil((remainingAttempts * 30) / 60);

  return (
    <Card className="mx-4 mb-2 border-primary/50 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {isExecuting && (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{task.title}</span>
              <TaskStatusBadge
                status={task.status}
                currentAttempt={task.current_attempt}
                maxAttempts={task.max_attempts}
                size="sm"
              />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {task.status === "running" && (
                <>
                  Working on attempt {task.current_attempt + 1} of {task.max_attempts}
                  {estimatedMinutes > 0 && ` (~${estimatedMinutes} min remaining)`}
                </>
              )}
              {task.status === "pending" && "Starting execution..."}
              {task.status === "completed" && "Task completed successfully"}
              {task.status === "blocked" && "Task needs attention"}
              {task.status === "stopped" && "Task stopped"}
            </p>
            {/* Show latest output preview */}
            {latestAttempt && task.status === "running" && (
              <p className="text-xs text-muted-foreground/70 line-clamp-1 italic mt-1">
                Latest: "{latestAttempt.model_output.slice(0, 80)}..."
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              <Eye className="h-4 w-4" />
            </Button>
            {(task.status === "running" || task.status === "pending") && (
              <StopTaskButton onStop={onStop} isExecuting={isExecuting} size="icon" variant="ghost" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
