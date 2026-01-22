import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Target, Lightbulb } from "lucide-react";

interface SetObjectiveStepProps {
  roleName: string;
  onContinue: (objective: { title: string; description: string }) => void;
  onBack: () => void;
}

export default function SetObjectiveStep({ roleName, onContinue, onBack }: SetObjectiveStepProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const isValid = title.trim().length >= 3 && description.trim().length >= 10;

  const handleContinue = () => {
    if (isValid) {
      onContinue({ title: title.trim(), description: description.trim() });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Set First Objective</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          What should <span className="font-medium text-foreground">{roleName}</span> work toward?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="objective-title">Objective Title</Label>
          <Input
            id="objective-title"
            placeholder="e.g., Increase monthly recurring revenue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="objective-description">Description & Success Criteria</Label>
          <Textarea
            id="objective-description"
            placeholder="Describe what success looks like. Be specific about metrics, timelines, or deliverables..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            The more specific you are, the better the role can work toward this goal.
          </p>
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Tip</p>
          <p className="text-xs text-muted-foreground">
            You can add more objectives later. Start with your most important priority.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!isValid} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
