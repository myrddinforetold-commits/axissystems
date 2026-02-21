import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Bot, User, ArrowRight, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface Message {
  sender: "user" | "ai";
  content: string;
}

type OnboardingState =
  | "ask_name"
  | "ask_company"
  | "ask_url"
  | "confirm"
  | "ask_customer"
  | "ask_goal"
  | "manual_description"
  | "manual_customer"
  | "manual_goal"
  | "manual_confirm"
  | "done";

const STEP_LABELS: Record<string, string> = {
  ask_name: "Step 1 of 4 — About You",
  ask_company: "Step 1 of 4 — About You",
  ask_url: "Step 2 of 4 — Company Info",
  confirm: "Step 3 of 4 — Review",
  ask_customer: "Step 3 of 4 — Fill Gaps",
  ask_goal: "Step 3 of 4 — Fill Gaps",
  manual_description: "Step 2 of 4 — Company Info",
  manual_customer: "Step 3 of 4 — Fill Gaps",
  manual_goal: "Step 3 of 4 — Fill Gaps",
  manual_confirm: "Step 4 of 4 — Review",
  done: "Complete!",
};

export default function OnboardingChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      content:
        "Welcome to Axis! I'll help you set up your AI executive team in about 60 seconds.\n\nWhat's your name?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<OnboardingState>("ask_name");
  const [context, setContext] = useState<Record<string, unknown>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || state === "done") return;

    const userMsg: Message = { sender: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "onboarding-chat",
        {
          body: { message: trimmed, state, context },
        }
      );

      if (error) throw error;

      const aiMsg: Message = { sender: "ai", content: data.reply };
      setMessages((prev) => [...prev, aiMsg]);
      setState(data.state);
      setContext(data.context || {});

      if (data.done && data.company_id) {
        setCompanyId(data.company_id);
      }
    } catch (err: unknown) {
      console.error("Onboarding chat error:", err);
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Error: " + errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          content:
            "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stepLabel = STEP_LABELS[state] || "";
  const progressPercent =
    state === "done"
      ? 100
      : state === "ask_name" || state === "ask_company"
        ? 25
        : state === "ask_url" || state === "manual_description"
          ? 50
          : state === "confirm" ||
              state === "ask_customer" ||
              state === "ask_goal" ||
              state === "manual_customer" ||
              state === "manual_goal"
            ? 75
            : state === "manual_confirm"
              ? 90
              : 50;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl flex flex-col h-[600px]">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Set Up Your Company</h2>
            </div>
            <span className="text-xs text-muted-foreground">{stepLabel}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 py-2 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.sender === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4 text-foreground" />
                )}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {msg.sender === "user" ? (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                ) : (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3 rounded-bl-md">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3">
          {state === "done" && companyId ? (
            <Button
              onClick={() =>
                navigate(`/companies/${companyId}`, { replace: true })
              }
              className="w-full"
              size="lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                className="min-h-[44px] max-h-[120px] resize-none"
                disabled={isLoading}
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 h-11 w-11"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
