import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Eye, CheckCircle2, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/contexts/AuthContext";

interface Task {
  id: string;
  title: string;
  description: string;
  completion_summary: string | null;
  updated_at: string;
  role_name: string;
  role_id: string;
}

interface CompletedDeliverableCardProps {
  task: Task;
  companyId: string;
}

export default function CompletedDeliverableCard({ task, companyId }: CompletedDeliverableCardProps) {
  const { user } = useAuth();
  const [showOutput, setShowOutput] = useState(false);
  const [fullOutput, setFullOutput] = useState<string | null>(null);
  const [loadingOutput, setLoadingOutput] = useState(false);
  const [pinning, setPinning] = useState(false);

  const handleViewOutput = async () => {
    setShowOutput(true);
    if (fullOutput) return;

    setLoadingOutput(true);
    const { data } = await supabase
      .from("task_attempts")
      .select("model_output")
      .eq("task_id", task.id)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    setFullOutput(data?.model_output || "No output available");
    setLoadingOutput(false);
  };

  const handlePinToMemory = async () => {
    if (!user || !fullOutput) return;

    setPinning(true);
    const { error } = await supabase.from("company_memory").insert({
      company_id: companyId,
      source_role_id: task.role_id,
      pinned_by: user.id,
      content: fullOutput,
      label: `Task: ${task.title}`,
    });

    if (error) {
      toast.error("Failed to pin to memory");
    } else {
      toast.success("Output pinned to company memory");
    }
    setPinning(false);
  };

  return (
    <>
      <Card className="border-l-4 border-l-green-500/50 transition-colors hover:bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                <h4 className="truncate text-sm font-medium">{task.title}</h4>
              </div>
            {task.completion_summary && (
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground prose prose-xs dark:prose-invert max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.completion_summary}</ReactMarkdown>
              </div>
            )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                <span className="truncate">{task.role_name}</span>
              </div>
              <span>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleViewOutput}>
              <Eye className="mr-1 h-3 w-3" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showOutput} onOpenChange={setShowOutput}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {task.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bot className="h-4 w-4" />
                <span>{task.role_name}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
              </div>
              {fullOutput && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePinToMemory}
                  disabled={pinning}
                >
                  <Pin className="mr-1 h-3 w-3" />
                  {pinning ? "Pinning..." : "Pin to Memory"}
                </Button>
              )}
            </div>

            {task.completion_summary && (
              <div className="rounded-md bg-primary/10 p-3 text-sm prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words">
                <strong className="text-primary">Summary:</strong>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.completion_summary}</ReactMarkdown>
              </div>
            )}

            <ScrollArea className="h-[400px] rounded-md border p-4">
              {loadingOutput ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Loading output...
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullOutput || ""}</ReactMarkdown>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
