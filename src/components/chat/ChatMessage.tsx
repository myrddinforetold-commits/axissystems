import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  sender: "user" | "ai";
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({ sender, content, isStreaming }: ChatMessageProps) {
  const isUser = sender === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
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
      <div
        className={cn(
          "flex-1 max-w-[75%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {content || (isStreaming ? "..." : "")}
        </p>
        {isStreaming && content && (
          <span className="inline-block w-1.5 h-4 bg-current opacity-70 animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}
