import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  current_attempt: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  role_name: string;
}

interface ActiveWorkCardProps {
  task: Task;
}

export default function ActiveWorkCard({ task }: ActiveWorkCardProps) {
  const progressPercent = (task.current_attempt / task.max_attempts) * 100;
  const isRunning = task.status === "running";

  return (
    <Card className="border-l-4 border-l-primary/50 transition-colors hover:bg-muted/30">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-medium">{task.title}</h4>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {task.description}
            </p>
          </div>
          <Badge 
            variant={isRunning ? "default" : "secondary"} 
            className={`shrink-0 text-xs ${isRunning ? "animate-pulse" : ""}`}
          >
            {isRunning ? "Running" : "Pending"}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            <span className="truncate">{task.role_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
          </div>
        </div>

        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Attempt {task.current_attempt}/{task.max_attempts}
            </span>
            <span className="text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
