import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, Bot, Target, Shield, Loader2 } from "lucide-react";

interface ActivationConfirmStepProps {
  roleName: string;
  authorityLevel: string;
  objectiveTitle: string;
  onActivate: () => void;
  onBack: () => void;
  isActivating: boolean;
}

const authorityLabels: Record<string, string> = {
  observer: "Observer",
  advisor: "Advisor",
  operator: "Operator",
  executive: "Executive",
  orchestrator: "Orchestrator",
};

export default function ActivationConfirmStep({
  roleName,
  authorityLevel,
  objectiveTitle,
  onActivate,
  onBack,
  isActivating,
}: ActivationConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Ready to Activate</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Review your configuration and activate the role.
        </p>
      </div>

      {/* Summary Card */}
      <Card className="border-border/50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium">{roleName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Authority Level</p>
              <p className="font-medium">{authorityLabels[authorityLevel] || authorityLevel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">First Objective</p>
              <p className="font-medium">{objectiveTitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <div className="rounded-lg border border-border p-4 space-y-2">
        <p className="text-sm font-medium">When activated, this role will:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Begin working toward the objective</li>
          <li>• Surface workflow requests for your approval</li>
          <li>• Learn and adapt based on your feedback</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isActivating} className="flex-1">
          Back
        </Button>
        <Button onClick={onActivate} disabled={isActivating} className="flex-1">
          {isActivating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Activating...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 mr-2" />
              Activate Role
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
