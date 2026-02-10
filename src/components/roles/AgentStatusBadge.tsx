import { Circle, Loader2, Zap, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MoltbotAgentStatus } from "@/hooks/useMoltbotStatus";

interface AgentStatusBadgeProps {
  status: MoltbotAgentStatus;
  lastActive?: string | null;
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<
  MoltbotAgentStatus,
  { label: string; icon: typeof Circle; dotClass: string; textClass: string }
> = {
  idle: {
    label: "Ready",
    icon: Circle,
    dotClass: "bg-chart-2",
    textClass: "text-chart-2",
  },
  thinking: {
    label: "Thinking...",
    icon: Loader2,
    dotClass: "bg-chart-3 animate-pulse",
    textClass: "text-chart-3",
  },
  executing: {
    label: "Executing",
    icon: Zap,
    dotClass: "bg-chart-1 animate-pulse",
    textClass: "text-chart-1",
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    icon: AlertCircle,
    dotClass: "bg-chart-3 animate-pulse",
    textClass: "text-chart-3",
  },
};

export default function AgentStatusBadge({
  status,
  lastActive,
  showLabel = true,
  className,
}: AgentStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;

  const lastActiveText = lastActive
    ? `Last active ${formatDistanceToNow(new Date(lastActive), { addSuffix: true })}`
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              config.textClass,
              className
            )}
          >
            <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotClass)} />
            {showLabel && <span>{config.label}</span>}
            {status === "thinking" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
          {lastActiveText && (
            <p className="text-xs text-muted-foreground">{lastActiveText}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
