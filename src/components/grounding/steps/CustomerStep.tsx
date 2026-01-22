import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface CustomerStepProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function CustomerStep({
  value,
  onChange,
  onContinue,
  onBack,
}: CustomerStepProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Who is your customer?</DialogTitle>
        <DialogDescription>
          Describe your target customer or audience. If you're not sure yet, that's okay — 
          leave it blank and we'll note it as an open question.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">Target Customer</Label>
        </div>

        <Textarea
          placeholder="Describe your ideal customer or target market...

Examples:
• B2B SaaS companies with 50-500 employees
• Consumer mobile app users aged 18-35
• Enterprise healthcare organizations
• Small business owners in the retail sector"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] resize-none"
        />

        <p className="text-xs text-muted-foreground">
          Be as specific as you can. The more your team knows about who you're serving, 
          the better their recommendations will be.
        </p>
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
