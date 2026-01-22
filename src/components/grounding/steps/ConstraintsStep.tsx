import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, AlertTriangle, Loader2 } from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Constraint {
  type: "technical" | "market" | "organizational";
  description: string;
}

interface ConstraintsStepProps {
  items: Constraint[];
  onChange: (items: Constraint[]) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const CONSTRAINT_EXAMPLES = {
  technical: "e.g., Must use existing AWS infrastructure",
  market: "e.g., Competitors have 2-year head start",
  organizational: "e.g., Team of 3, limited budget",
};

export default function ConstraintsStep({
  items,
  onChange,
  onContinue,
  onBack,
  isLoading,
}: ConstraintsStepProps) {
  const [newItem, setNewItem] = useState<Constraint>({
    type: "technical",
    description: "",
  });

  const addItem = () => {
    if (newItem.description.trim()) {
      onChange([...items, { ...newItem, description: newItem.description.trim() }]);
      setNewItem({ type: "technical", description: "" });
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Known Constraints</DialogTitle>
        <DialogDescription>
          What limitations should your team be aware of? Technical, market, or organizational constraints 
          help prevent unrealistic recommendations.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <Label className="text-sm font-medium">Constraints & Limitations</Label>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-muted/50"
              >
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">{item.type}</span>
                  <p className="text-sm mt-1">{item.description}</p>
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
          <div className="flex gap-2">
            <Select
              value={newItem.type}
              onValueChange={(value: Constraint["type"]) =>
                setNewItem({ ...newItem, type: value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="organizational">Organizational</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={CONSTRAINT_EXAMPLES[newItem.type]}
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={addItem}
              disabled={!newItem.description.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onContinue} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Summary...
            </>
          ) : (
            "Generate Summary"
          )}
        </Button>
      </div>
    </>
  );
}
