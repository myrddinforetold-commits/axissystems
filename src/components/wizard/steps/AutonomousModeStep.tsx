import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Eye, MessageSquare, CheckCircle2 } from "lucide-react";

interface AutonomousModeStepProps {
  roleName: string;
  onContinue: () => void;
}

export default function AutonomousModeStep({ roleName, onContinue }: AutonomousModeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Meet {roleName}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This role operates autonomously using a continuous thinking loop.
        </p>
      </div>

      {/* Autonomous Loop Visualization */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium">Observe</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium">Decide</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium">Request</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Points */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Works toward objectives</p>
            <p className="text-xs text-muted-foreground">
              The role continuously works toward goals you define
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Actions require approval</p>
            <p className="text-xs text-muted-foreground">
              Impactful actions surface as workflow requests for your review
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">You stay in control</p>
            <p className="text-xs text-muted-foreground">
              Approve, deny, or provide feedback on any proposed action
            </p>
          </div>
        </div>
      </div>

      <Button onClick={onContinue} className="w-full">
        Continue
      </Button>
    </div>
  );
}
