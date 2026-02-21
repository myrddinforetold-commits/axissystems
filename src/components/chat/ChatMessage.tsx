import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bot, User, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PinToMemoryDialog from "./PinToMemoryDialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  sender: "user" | "ai";
  content: string;
  isStreaming?: boolean;
  messageId?: string;
  isPinned?: boolean;
  onPinToMemory?: (content: string, label: string) => Promise<void>;
}

export default function ChatMessage({
  sender,
  content,
  isStreaming,
  messageId,
  isPinned,
  onPinToMemory,
}: ChatMessageProps) {
  const [showPinDialog, setShowPinDialog] = useState(false);
  const isUser = sender === "user";

  const handlePinConfirm = async (label: string) => {
    if (onPinToMemory) {
      await onPinToMemory(content, label);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group flex gap-3 px-4 py-3",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4 text-foreground" />
          )}
        </div>
        <div className="flex flex-col max-w-[75%]">
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap break-words">
                {content || (isStreaming ? "..." : "")}
              </p>
            ) : (
              <>
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || (isStreaming ? "..." : "")}
                  </ReactMarkdown>
                </div>
                {isStreaming && content && (
                  <span className="inline-block w-1.5 h-4 bg-current opacity-70 animate-pulse ml-0.5" />
                )}
              </>
            )}
          </div>
          
          {/* Pin action for AI messages */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-1 mt-1 ml-1">
              {isPinned ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Pin className="h-3 w-3 fill-current" />
                        <span>Pinned</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pinned to Company Memory</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : onPinToMemory ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPinDialog(true)}
                >
                  <Pin className="h-3 w-3 mr-1" />
                  Pin to Memory
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <PinToMemoryDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        content={content}
        onConfirm={handlePinConfirm}
      />
    </>
  );
}
