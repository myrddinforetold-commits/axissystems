import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Building2, Sprout, TrendingUp, Landmark } from "lucide-react";

interface CompanyStageStepProps {
  currentStage: string | null;
  onStageSelected: (stage: string) => void;
  onContinue: () => void;
  isLoading?: boolean;
}

const stages = [
  {
    value: "early",
    label: "Early-stage / Pre-revenue",
    description: "Sparse data, high ambiguity. You're still figuring things out.",
    icon: Sprout,
  },
  {
    value: "growing",
    label: "Growing team",
    description: "Some process in place, limited data. Building foundations.",
    icon: TrendingUp,
  },
  {
    value: "established",
    label: "Established organization",
    description: "Clear processes, historical data available.",
    icon: Landmark,
  },
];

export default function CompanyStageStep({
  currentStage,
  onStageSelected,
  onContinue,
  isLoading,
}: CompanyStageStepProps) {
  const [selectedStage, setSelectedStage] = useState(currentStage || "early");

  const handleContinue = () => {
    onStageSelected(selectedStage);
    onContinue();
  };

  return (
    <Card className="max-w-lg mx-auto border-border/50">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl">Company Context</CardTitle>
        <CardDescription className="text-base">
          Which best describes your company today?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={selectedStage}
          onValueChange={setSelectedStage}
          className="space-y-3"
        >
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.value}>
                <Label
                  htmlFor={stage.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedStage === stage.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <RadioGroupItem value={stage.value} id={stage.value} className="mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{stage.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        <div className="pt-2">
          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Continue"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            This helps the AI understand your company's context. You can change this later in settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
