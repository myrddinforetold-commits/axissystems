import { BrainCircuit } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MemoryRef {
  source: string;
  snippet: string;
}

interface MemoryReferenceBadgeProps {
  refs: MemoryRef[];
}

export default function MemoryReferenceBadge({ refs }: MemoryReferenceBadgeProps) {
  if (refs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-1">
      {refs.map((ref, i) => (
        <TooltipProvider key={i}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 rounded-full border border-chart-4/30 bg-chart-4/10 px-2 py-0.5 text-xs font-medium text-chart-4 cursor-default">
                <BrainCircuit className="h-3 w-3" />
                <span>Used memory</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs font-medium">{ref.source}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{ref.snippet}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
