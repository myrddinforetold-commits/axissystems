import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, HelpCircle } from "lucide-react";
import type { TaskAttempt } from "@/hooks/useTaskExecution";

interface TaskAttemptCardProps {
  attempt: TaskAttempt;
  isLatest?: boolean;
}

const resultConfig = {
  pass: {
    label: "Pass",
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  fail: {
    label: "Fail",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  unclear: {
    label: "Unclear",
    icon: HelpCircle,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
};

export default function TaskAttemptCard({ attempt, isLatest }: TaskAttemptCardProps) {
  const config = resultConfig[attempt.evaluation_result];
  const Icon = config.icon;

  return (
    <Card className={`${isLatest ? "border-primary/50" : "opacity-70"}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Attempt {attempt.attempt_number}
            </span>
            {isLatest && (
              <Badge variant="outline" className="text-xs">Latest</Badge>
            )}
          </div>
          <Badge variant="outline" className={config.className}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-3 px-4 pt-0 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Output</p>
          <div className="text-sm bg-muted/50 rounded-md p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
            {attempt.model_output}
          </div>
        </div>
        {attempt.evaluation_reason && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Evaluation</p>
            <p className="text-sm text-muted-foreground italic">
              {attempt.evaluation_reason}
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(attempt.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
