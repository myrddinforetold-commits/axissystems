import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/hooks/useChatStream";
import type { Task } from "@/hooks/useTaskExecution";
import { Bot, ClipboardList, Clock3, AlertTriangle } from "lucide-react";

interface AutonomousActivityPanelProps {
  messages: ChatMessage[];
  tasks: Task[];
  onOpenTasks?: () => void;
}

function classifyAutonomyMessage(content: string) {
  if (content.includes("⚠️ Task Blocked")) {
    return { label: "Blocked", variant: "destructive" as const };
  }
  if (content.includes("📬 Proposed Memo")) {
    return { label: "Memo", variant: "secondary" as const };
  }
  if (content.includes("🤖 Autonomous Action")) {
    return { label: "Action", variant: "outline" as const };
  }
  if (content.includes("⏳ Awaiting approval")) {
    return { label: "Awaiting Approval", variant: "secondary" as const };
  }
  if (content.includes("Runtime check:") || content.includes("no CEO role found")) {
    return { label: "Routing/Runtime", variant: "destructive" as const };
  }
  return { label: "System", variant: "outline" as const };
}

function summarize(content: string) {
  return content
    .replace(/\s+/g, " ")
    .replace(/^📬\s*Proposed Memo to [^:]+:\s*/i, "")
    .replace(/^🤖\s*Autonomous Action:\s*/i, "")
    .trim();
}

export default function AutonomousActivityPanel({
  messages,
  tasks,
  onOpenTasks,
}: AutonomousActivityPanelProps) {
  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [messages]
  );

  const runningCount = tasks.filter((task) => task.status === "running").length;
  const pendingCount = tasks.filter((task) => task.status === "pending").length;
  const alertCount = tasks.filter(
    (task) => task.status === "blocked" || task.status === "system_alert"
  ).length;

  return (
    <aside className="h-full w-full border-l border-border bg-muted/20 flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium truncate">Autonomous Activity</p>
          </div>
          {onOpenTasks && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenTasks}>
              Open Tasks
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          System actions, memos, and execution updates.
        </p>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border bg-background px-2 py-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              Running
            </div>
            <p className="text-sm font-semibold mt-1">{runningCount}</p>
          </div>
          <div className="rounded-md border bg-background px-2 py-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <ClipboardList className="h-3 w-3" />
              Pending
            </div>
            <p className="text-sm font-semibold mt-1">{pendingCount}</p>
          </div>
          <div className="rounded-md border bg-background px-2 py-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Alerts
            </div>
            <p className="text-sm font-semibold mt-1">{alertCount}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {sortedMessages.length === 0 ? (
            <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
              No autonomous activity yet.
            </div>
          ) : (
            sortedMessages.map((message) => {
              const classification = classifyAutonomyMessage(message.content);
              return (
                <div key={message.id} className="rounded-md border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={classification.variant} className="text-[10px]">
                      {classification.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                    {summarize(message.content)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
