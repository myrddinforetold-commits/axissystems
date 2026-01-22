import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Sparkles } from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Aspiration {
  goal: string;
  timeframe?: string;
}

interface AspirationsStepProps {
  items: Aspiration[];
  onChange: (items: Aspiration[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function AspirationsStep({
  items,
  onChange,
  onContinue,
  onBack,
}: AspirationsStepProps) {
  const [newItem, setNewItem] = useState({ goal: "", timeframe: "" });

  const addItem = () => {
    if (newItem.goal.trim()) {
      onChange([
        ...items,
        {
          goal: newItem.goal.trim(),
          timeframe: newItem.timeframe.trim() || undefined,
        },
      ]);
      setNewItem({ goal: "", timeframe: "" });
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Aspirations & Vision</DialogTitle>
        <DialogDescription>
          What are your goals and vision for the company? These guide your team's strategic thinking.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">Goals & Aspirations</Label>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20"
              >
                <div>
                  <p className="font-medium text-sm">{item.goal}</p>
                  {item.timeframe && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Timeframe: {item.timeframe}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeItem(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Input
            placeholder="What do you want to achieve?"
            value={newItem.goal}
            onChange={(e) => setNewItem({ ...newItem, goal: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Input
            placeholder="Timeframe (optional, e.g., 'Q2 2025', '6 months')"
            value={newItem.timeframe}
            onChange={(e) => setNewItem({ ...newItem, timeframe: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={!newItem.goal.trim()}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Aspiration
          </Button>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue}>
          Continue
        </Button>
      </div>
    </>
  );
}
