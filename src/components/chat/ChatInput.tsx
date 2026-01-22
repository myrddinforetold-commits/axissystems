import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, isStreaming, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { 
    isRecording, 
    isConnecting, 
    startRecording, 
    stopRecording,
    clearTranscript 
  } = useVoiceInput({
    onTranscript: (text) => {
      setMessage(text);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Voice Input Error",
        description: error,
      });
    },
  });

  const handleSubmit = () => {
    if (message.trim() && !isStreaming && !disabled) {
      onSend(message);
      setMessage("");
      clearTranscript();
      if (isRecording) {
        stopRecording();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <div className="border-t bg-card p-4">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : "Type a message or click the mic to speak..."}
          className="min-h-[44px] max-h-[150px] resize-none"
          disabled={isStreaming || disabled}
          rows={1}
        />
        <Button
          onClick={handleMicClick}
          disabled={isStreaming || disabled || isConnecting}
          size="icon"
          variant={isRecording ? "destructive" : "outline"}
          className="shrink-0 h-11 w-11 relative"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
          <>
              <MicOff className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
            </>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || isStreaming || disabled}
          size="icon"
          className="shrink-0 h-11 w-11"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {isRecording 
          ? "Speak now • Click mic to stop" 
          : "Enter to send • Shift+Enter for new line • Click mic to speak"}
      </p>
    </div>
  );
}
