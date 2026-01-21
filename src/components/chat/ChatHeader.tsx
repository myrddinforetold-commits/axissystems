import { ArrowLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatHeaderProps {
  roleName: string;
  mandate: string;
  onBack: () => void;
}

export default function ChatHeader({ roleName, mandate, onBack }: ChatHeaderProps) {
  return (
    <div className="border-b bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-semibold text-foreground truncate">{roleName}</h1>
            <Badge variant="secondary" className="shrink-0">AI Role</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {mandate}
          </p>
        </div>
      </div>
    </div>
  );
}
