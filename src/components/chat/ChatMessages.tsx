import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ThinkingIndicator from "./ThinkingIndicator";
import ToolUsageBadge from "./ToolUsageBadge";
import MemoryReferenceBadge from "./MemoryReferenceBadge";
import type { ChatMessage as ChatMessageType } from "@/hooks/useChatStream";
import type { ActiveTool } from "./ToolUsageBadge";
import type { MemoryRef } from "./MemoryReferenceBadge";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  pinnedMessageIds?: Set<string>;
  onPinToMemory?: (messageId: string, content: string, label: string) => Promise<void>;
  isThinking?: boolean;
  activeTools?: ActiveTool[];
  memoryRefs?: MemoryRef[];
  roleName?: string;
}

export default function ChatMessages({ 
  messages, 
  isLoading,
  pinnedMessageIds,
  onPinToMemory,
  isThinking,
  activeTools,
  memoryRefs,
  roleName,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRef = useRef(false);

  const scrollToLatest = useCallback(() => {
    const root = scrollRef.current;
    const viewport = root?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, []);

  // Ensure first paint opens at the latest message (no visible "scroll through history").
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    scrollToLatest();
    const rafId = requestAnimationFrame(scrollToLatest);
    hasInitialScrollRef.current = true;
    return () => cancelAnimationFrame(rafId);
  }, [messages.length, scrollToLatest]);

  // Keep pinned to latest during live updates.
  useEffect(() => {
    if (!hasInitialScrollRef.current || messages.length === 0) return;
    scrollToLatest();
  }, [messages, scrollToLatest]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-muted rounded-full p-4 mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="font-medium text-foreground mb-1">Start a conversation</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Send a message to begin chatting with this AI role. Your conversation will be saved.
        </p>
      </div>
    );
  }

  const handlePinMessage = async (messageId: string, content: string, label: string) => {
    if (onPinToMemory) {
      await onPinToMemory(messageId, content, label);
    }
  };

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="py-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            sender={message.sender}
            content={message.content}
            isStreaming={message.isStreaming}
            messageId={message.id}
            isPinned={pinnedMessageIds?.has(message.id)}
            onPinToMemory={
              message.sender === "ai" && onPinToMemory
                ? (content, label) => handlePinMessage(message.id, content, label)
                : undefined
            }
          />
        ))}

        {/* Tool usage and memory badges during streaming */}
        {(activeTools && activeTools.length > 0) && (
          <ToolUsageBadge tools={activeTools} />
        )}
        {(memoryRefs && memoryRefs.length > 0) && (
          <MemoryReferenceBadge refs={memoryRefs} />
        )}

        {/* Thinking indicator */}
        {isThinking && roleName && (
          <ThinkingIndicator roleName={roleName} />
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
