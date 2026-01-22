import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface GroundingStatusBannerProps {
  onStartGrounding: () => void;
}

export default function GroundingStatusBanner({ onStartGrounding }: GroundingStatusBannerProps) {
  return (
    <Alert className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <AlertTitle className="text-destructive">
        Grounding Required
      </AlertTitle>
      <AlertDescription className="text-destructive/80">
        <p className="mb-3">
          Before your team can start working autonomously, you need to establish the 
          foundational facts about your company. This ensures all recommendations are 
          grounded in reality, not assumptions.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onStartGrounding}
          className="border-destructive/50 hover:bg-destructive/20"
        >
          Start Grounding Phase
        </Button>
      </AlertDescription>
    </Alert>
  );
}
