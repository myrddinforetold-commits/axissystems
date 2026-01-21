import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pin } from "lucide-react";

interface PinToMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onConfirm: (label: string) => Promise<void>;
}

export default function PinToMemoryDialog({
  open,
  onOpenChange,
  content,
  onConfirm,
}: PinToMemoryDialogProps) {
  const [label, setLabel] = useState("");
  const [isPinning, setIsPinning] = useState(false);

  const handleConfirm = async () => {
    setIsPinning(true);
    try {
      await onConfirm(label.trim());
      setLabel("");
      onOpenChange(false);
    } finally {
      setIsPinning(false);
    }
  };

  const truncatedContent = content.length > 200 
    ? content.slice(0, 200) + "..." 
    : content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4" />
            Pin to Company Memory
          </DialogTitle>
          <DialogDescription>
            This message will be saved as shared company memory and available to all roles with company-level memory access.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground line-clamp-4">
              {truncatedContent}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              placeholder="e.g., Q3 Strategy, Client Requirements"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Add a descriptive label to help identify this memory later.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPinning}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPinning}>
            {isPinning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pinning...
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" />
                Pin Memory
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
