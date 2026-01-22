import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, StopCircle, Clock, Archive, AlertTriangle } from "lucide-react";
import type { Task } from "@/hooks/useTaskExecution";

interface TaskStatusBadgeProps {
  status: Task["status"];
  currentAttempt?: number;
  maxAttempts?: number;
  size?: "sm" | "default";
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  },
  running: {
    label: "Running",
    variant: "default" as const,
    icon: Loader2,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  completed: {
    label: "Completed",
    variant: "default" as const,
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  blocked: {
    label: "Blocked",
    variant: "default" as const,
    icon: AlertCircle,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  stopped: {
    label: "Stopped",
    variant: "default" as const,
    icon: StopCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  archived: {
    label: "Archived",
    variant: "secondary" as const,
    icon: Archive,
    className: "bg-muted/50 text-muted-foreground opacity-60",
  },
  system_alert: {
    label: "Failed (DLQ)",
    variant: "destructive" as const,
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export default function TaskStatusBadge({ 
  status, 
  currentAttempt, 
  maxAttempts,
  size = "default" 
}: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const showAttempts = currentAttempt !== undefined && maxAttempts !== undefined;

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1 ${status === "running" ? "animate-spin" : ""}`} />
      {config.label}
      {showAttempts && status === "running" && (
        <span className="ml-1 opacity-70">
          ({currentAttempt}/{maxAttempts})
        </span>
      )}
    </Badge>
  );
}
