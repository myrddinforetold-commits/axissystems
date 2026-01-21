import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());

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
      onError?.("Failed to load conversation history");
    } finally {
      setIsLoading(false);
    }
  }, [roleId, companyId, onError]);

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

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error("Not authenticated");
        }

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
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          // Process line-by-line
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                assistantContent += deltaContent;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            } catch {
              // Re-buffer partial JSON
              textBuffer = line + "\n" + textBuffer;
              break;
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
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                assistantContent += deltaContent;
              }
            } catch {
              /* ignore */
            }
          }
        }

        // Mark streaming complete
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
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        onError?.(errorMessage);

        // Remove the failed AI message placeholder
        setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
      } finally {
        setIsStreaming(false);
      }
    },
    [roleId, isStreaming, onError, loadMessages]
  );

  const pinToCompanyMemory = useCallback(
    async (messageId: string, content: string, label: string) => {
      if (!companyId) {
        onError?.("Company ID is required to pin memories");
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
        onError?.("Failed to pin message to company memory");
        throw err;
      }
    },
    [companyId, roleId, onError]
  );

  return {
    messages,
    isLoading,
    isStreaming,
    pinnedMessageIds,
    loadMessages,
    sendMessage,
    pinToCompanyMemory,
  };
}
