import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import TaskStatusBadge from "./TaskStatusBadge";
import StopTaskButton from "./StopTaskButton";
import type { Task } from "@/hooks/useTaskExecution";

interface ActiveTaskBannerProps {
  task: Task;
  isExecuting: boolean;
  onViewDetails: () => void;
  onStop: () => Promise<void>;
}

export default function ActiveTaskBanner({
  task,
  isExecuting,
  onViewDetails,
  onStop,
}: ActiveTaskBannerProps) {
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
              {task.status === "running" 
                ? `Attempt ${task.current_attempt + 1} of ${task.max_attempts}...`
                : task.status === "completed"
                ? "Task completed successfully"
                : task.status === "blocked"
                ? "Task needs attention"
                : "Task stopped"}
            </p>
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
