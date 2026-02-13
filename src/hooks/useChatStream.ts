import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveTool } from "@/components/chat/ToolUsageBadge";
import type { MemoryRef } from "@/components/chat/MemoryReferenceBadge";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  content: string;
  created_at: string;
  isStreaming?: boolean;
}

interface UseChatStreamOptions {
  roleId: string;
  companyId?: string;
  onError?: (error: string) => void;
}

export function useChatStream({ roleId, companyId, onError }: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [activeTools, setActiveTools] = useState<ActiveTool[]>([]);
  const [memoryRefs, setMemoryRefs] = useState<MemoryRef[]>([]);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  
  const onErrorRef = useRef(onError);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("role_messages")
        .select("id, sender, content, created_at")
        .eq("role_id", roleId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(
        (data || []).map((msg) => ({
          id: msg.id,
          sender: msg.sender as "user" | "ai",
          content: msg.content,
          created_at: msg.created_at,
        }))
      );

      // Load pinned message IDs if companyId is provided
      if (companyId) {
        const { data: pinnedData } = await supabase
          .from("company_memory")
          .select("source_message_id")
          .eq("company_id", companyId)
          .not("source_message_id", "is", null);

        if (pinnedData) {
          setPinnedMessageIds(
            new Set(pinnedData.map((p) => p.source_message_id).filter(Boolean) as string[])
          );
        }
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      onErrorRef.current?.("Failed to load conversation history");
    } finally {
      setIsLoading(false);
    }
  }, [roleId, companyId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        sender: "user",
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      // Add placeholder for AI response
      const aiMessageId = `ai-${Date.now()}`;
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        sender: "ai",
        content: "",
        created_at: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsThinking(true);
      setActiveTools([]);
      setMemoryRefs([]);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error("Not authenticated");
        }

        // Add a timeout for the entire stream (90 seconds)
        const controller = new AbortController();
        const streamTimeout = setTimeout(() => controller.abort(), 90000);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/role-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              role_id: roleId,
              message: content.trim(),
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          clearTimeout(streamTimeout);
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed: ${response.status}`);
        }

        if (!response.body) {
          clearTimeout(streamTimeout);
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let textBuffer = "";
        let currentEventType = "";
        let lastChunkTime = Date.now();

        // Inactivity timeout: if no chunks arrive for 30s, abort
        const inactivityCheck = setInterval(() => {
          if (Date.now() - lastChunkTime > 30000) {
            controller.abort();
          }
        }, 5000);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            lastChunkTime = Date.now();
            textBuffer += decoder.decode(value, { stream: true });

            // Process line-by-line
            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);

              // Track SSE event type
              if (line.startsWith("event: ")) {
                currentEventType = line.slice(7).trim();
                continue;
              }

              if (line.startsWith(":") || line.trim() === "") {
                currentEventType = "";
                continue;
              }
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") break;

              try {
                const parsed = JSON.parse(jsonStr);

                // Handle error events from the edge function
                if (currentEventType === "error") {
                  throw new Error(parsed.error || "Stream error from AI service");
                }

                // Handle Moltbot SSE event types
                switch (currentEventType) {
                  case "tool_start":
                    setActiveTools((prev) => [
                      ...prev,
                      { tool: parsed.tool, status: "running" },
                    ]);
                    currentEventType = "";
                    continue;

                  case "tool_end":
                    setActiveTools((prev) =>
                      prev.map((t) =>
                        t.tool === parsed.tool
                          ? { ...t, status: "done" as const, resultSummary: parsed.result_summary }
                          : t
                      )
                    );
                    currentEventType = "";
                    continue;

                  case "memory_ref":
                    setMemoryRefs((prev) => [
                      ...prev,
                      { source: parsed.source, snippet: parsed.snippet },
                    ]);
                    currentEventType = "";
                    continue;

                  case "done":
                    if (parsed.content) {
                      assistantContent = parsed.content;
                    }
                    currentEventType = "";
                    continue;

                  case "delta":
                  default: {
                    // Handle both Moltbot delta format and existing OpenAI-style format
                    const deltaContent =
                      parsed.content || parsed.choices?.[0]?.delta?.content;
                    if (deltaContent) {
                      setIsThinking(false);
                      assistantContent += deltaContent;
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === aiMessageId
                            ? { ...msg, content: assistantContent }
                            : msg
                        )
                      );
                    }
                    currentEventType = "";
                    break;
                  }
                }
              } catch (e) {
                // If it's a thrown error (not parse error), re-throw
                if (e instanceof Error && e.message.includes("Stream error")) {
                  throw e;
                }
                // Re-buffer partial JSON
                textBuffer = line + "\n" + textBuffer;
                break;
              }
            }
          }
        } finally {
          clearTimeout(streamTimeout);
          clearInterval(inactivityCheck);
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent =
                parsed.content || parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                assistantContent += deltaContent;
              }
            } catch {
              /* ignore */
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent =
                parsed.content || parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                assistantContent += deltaContent;
              }
            } catch {
              /* ignore */
            }
          }
        }

        // Mark streaming complete
        setIsThinking(false);
        setActiveTools([]);
        setMemoryRefs([]);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: assistantContent, isStreaming: false }
              : msg
          )
        );

        // Reload messages to get actual IDs from database
        setTimeout(() => loadMessages(), 500);
      } catch (err) {
        console.error("Chat error:", err);
        let errorMessage = "Failed to send message";
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            errorMessage = "AI response timed out. The AI service may be busy — please try again.";
          } else {
            errorMessage = err.message;
          }
        }
        onErrorRef.current?.(errorMessage);

        // Remove the failed AI message placeholder
        setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
        setIsThinking(false);
        setActiveTools([]);
        setMemoryRefs([]);
      } finally {
        setIsStreaming(false);
      }
    },
    [roleId, isStreaming, loadMessages]
  );

  const pinToCompanyMemory = useCallback(
    async (messageId: string, content: string, label: string) => {
      if (!companyId) {
        onErrorRef.current?.("Company ID is required to pin memories");
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get the source role ID from the message
        const { data: message } = await supabase
          .from("role_messages")
          .select("role_id")
          .eq("id", messageId)
          .single();

        const { error } = await supabase.from("company_memory").insert({
          company_id: companyId,
          content,
          source_message_id: messageId,
          source_role_id: message?.role_id || roleId,
          pinned_by: user.id,
          label: label || null,
        });

        if (error) throw error;

        // Update pinned message IDs
        setPinnedMessageIds((prev) => new Set([...prev, messageId]));
      } catch (err) {
        console.error("Failed to pin memory:", err);
        onErrorRef.current?.("Failed to pin message to company memory");
        throw err;
      }
    },
    [companyId, roleId]
  );

  return {
    messages,
    isLoading,
    isStreaming,
    isThinking,
    activeTools,
    memoryRefs,
    pinnedMessageIds,
    loadMessages,
    sendMessage,
    pinToCompanyMemory,
  };
}
