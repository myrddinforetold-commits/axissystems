import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DependencyStatusBadgeProps {
  status: string;
  dependencyCount?: number;
  className?: string;
}

export default function DependencyStatusBadge({
  status,
  dependencyCount = 0,
  className,
}: DependencyStatusBadgeProps) {
  if (status === "ready" || dependencyCount === 0) {
    return null;
  }

  const config = {
    waiting_on_dependencies: {
      label: "Waiting",
      icon: Clock,
      className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    },
    dependencies_met: {
      label: "Dependencies Met",
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    },
  }[status] || {
    label: status,
    icon: Link2,
    className: "bg-muted text-muted-foreground",
  };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs gap-1", config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
      {dependencyCount > 0 && ` (${dependencyCount})`}
    </Badge>
  );
}
