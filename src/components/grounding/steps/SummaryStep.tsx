import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, HelpCircle, Lightbulb, Loader2 } from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { CurrentStateSummary } from "../GroundingWizard";

interface SummaryStepProps {
  summary: CurrentStateSummary;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function SummaryStep({
  summary,
  onConfirm,
  onBack,
  isLoading,
}: SummaryStepProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Current State Summary</DialogTitle>
        <DialogDescription>
          Review what we've captured. Once you confirm, your team will use these facts 
          as the foundation for all their work.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[400px] pr-4">
        <div className="space-y-6 py-4">
          {/* Known Facts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Known Facts</h3>
            </div>
            {summary.knownFacts.length > 0 ? (
              <ul className="space-y-2 ml-6">
                {summary.knownFacts.map((fact, index) => (
                  <li
                    key={index}
                    className="text-sm text-foreground flex items-start gap-2"
                  >
                    <span className="text-primary mt-1">•</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground ml-6 italic">
                No facts established yet
              </p>
            )}
          </div>

          {/* Assumptions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Assumptions</h3>
            </div>
            {summary.assumptions.length > 0 ? (
              <ul className="space-y-2 ml-6">
                {summary.assumptions.map((assumption, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground ml-6 italic">
                No assumptions identified
              </p>
            )}
          </div>

          {/* Open Questions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-secondary-foreground" />
              <h3 className="font-semibold text-sm">Open Questions</h3>
            </div>
            {summary.openQuestions.length > 0 ? (
              <ul className="space-y-2 ml-6">
                {summary.openQuestions.map((question, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-secondary-foreground mt-1">?</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground ml-6 italic">
                No open questions — you've been thorough!
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="pt-4 space-y-3">
        <p className="text-xs text-muted-foreground text-center">
          By confirming, you unlock autonomous behavior for your team. 
          Roles will use these facts as their source of truth.
        </p>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack} disabled={isLoading}>
            Back
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm & Unlock Autonomy
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
