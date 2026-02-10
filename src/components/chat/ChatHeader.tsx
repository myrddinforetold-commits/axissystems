import { ArrowLeft, Bot, BrainCircuit, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AgentStatusBadge from "@/components/roles/AgentStatusBadge";
import type { MoltbotAgentStatus } from "@/hooks/useMoltbotStatus";

interface ChatHeaderProps {
  roleName: string;
  mandate: string;
  onBack: () => void;
  onOpenMemory?: () => void;
  onOpenTasks?: () => void;
  hasActiveTask?: boolean;
  agentStatus?: MoltbotAgentStatus;
  lastActive?: string | null;
}

export default function ChatHeader({ 
  roleName, 
  mandate, 
  onBack, 
  onOpenMemory,
  onOpenTasks,
  hasActiveTask,
  agentStatus,
  lastActive,
}: ChatHeaderProps) {
  return (
    <div className="border-b bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-semibold text-foreground truncate">{roleName}</h1>
            {agentStatus ? (
              <AgentStatusBadge status={agentStatus} lastActive={lastActive} />
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {mandate}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onOpenTasks && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenTasks}
                    className={hasActiveTask ? "text-primary" : ""}
                  >
                    <ClipboardList className="h-5 w-5" />
                    {hasActiveTask && (
                      <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tasks</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onOpenMemory && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenMemory}
                  >
                    <BrainCircuit className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Company Memory</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
