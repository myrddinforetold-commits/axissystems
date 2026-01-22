import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Pencil, SkipForward } from "lucide-react";

interface ActivationMessageStepProps {
  roleName: string;
  mandate: string;
  companyName?: string;
  onSend: (message: string) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

function generateOpeningMessage(roleName: string, mandate: string, companyName?: string): string {
  const roleTitle = companyName ? `${roleName} for ${companyName}` : roleName;
  return `Welcome. I'm ${roleTitle}.

My focus: ${mandate}

I'm here to provide perspective within my domain. I may ask clarifying questions before offering recommendations.

What's on your mind?`;
}

export default function ActivationMessageStep({
  roleName,
  mandate,
  companyName,
  onSend,
  onSkip,
  isLoading,
}: ActivationMessageStepProps) {
  const defaultMessage = generateOpeningMessage(roleName, mandate, companyName);
  const [message, setMessage] = useState(defaultMessage);
  const [isEditing, setIsEditing] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
    }
  };

  return (
    <Card className="max-w-lg mx-auto border-border/50">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Activate {roleName}</CardTitle>
        <CardDescription className="text-base">
          Send an opening message to activate this role.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            readOnly={!isEditing}
            className={`min-h-[160px] resize-none ${
              isEditing
                ? "border-primary"
                : "bg-muted/50 cursor-default"
            }`}
          />
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="absolute top-2 right-2"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSend}
            className="flex-1"
            disabled={isLoading || !message.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? "Sending..." : "Send & Activate"}
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          This message will be sent to the role to establish context. You can edit it before sending.
        </p>
      </CardContent>
    </Card>
  );
}
