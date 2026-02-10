import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveTool {
  tool: string;
  status: "running" | "done";
  resultSummary?: string;
}

const toolLabels: Record<string, string> = {
  web_search: "Searching web",
  code_execute: "Running code",
  file_read: "Reading file",
  file_write: "Writing file",
  database_query: "Querying database",
  api_call: "Calling API",
};

function getToolLabel(tool: string): string {
  return toolLabels[tool] || tool.replace(/_/g, " ");
}

interface ToolUsageBadgeProps {
  tools: ActiveTool[];
}

export default function ToolUsageBadge({ tools }: ToolUsageBadgeProps) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-1">
      {tools.map((t, i) => (
        <div
          key={`${t.tool}-${i}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            t.status === "running"
              ? "border-chart-1/30 bg-chart-1/10 text-chart-1"
              : "border-border bg-muted text-muted-foreground opacity-60"
          )}
        >
          {t.status === "running" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          <span>{getToolLabel(t.tool)}{t.status === "running" ? "..." : ""}</span>
        </div>
      ))}
    </div>
  );
}
