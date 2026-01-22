import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, X, CircleDashed } from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Item {
  name: string;
  description: string;
}

interface NotExistsStepProps {
  items: Item[];
  onChange: (items: Item[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function NotExistsStep({
  items,
  onChange,
  onContinue,
  onBack,
}: NotExistsStepProps) {
  const [newItem, setNewItem] = useState({ name: "", description: "" });

  const addItem = () => {
    if (newItem.name.trim()) {
      onChange([...items, { ...newItem, name: newItem.name.trim() }]);
      setNewItem({ name: "", description: "" });
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">What doesn't exist yet?</DialogTitle>
        <DialogDescription>
          What products, features, or capabilities are planned but not yet built? 
          This helps your team understand what's aspirational vs. what's real.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2">
          <CircleDashed className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Planned but not built</Label>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 p-3 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30"
              >
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
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
            placeholder="What's planned?"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Textarea
            placeholder="Brief description (optional)"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="h-16 resize-none"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={!newItem.name.trim()}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Planned Item
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
