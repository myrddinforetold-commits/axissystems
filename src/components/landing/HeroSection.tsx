import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onRequestAccess: () => void;
}

export function HeroSection({ onRequestAccess }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col">
      {/* Video Placeholder */}
      <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
        <div className="absolute top-6 left-6 text-xs uppercase tracking-widest text-muted-foreground">
          Product walkthrough
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
            <Play className="w-8 h-8 text-muted-foreground ml-1" />
          </div>
          <span className="text-sm text-muted-foreground">Video coming soon</span>
        </div>
      </div>

      {/* Hero Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-foreground leading-tight">
            An operating system for how companies think and act.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Axis Systems gives companies persistent AI roles that align decisions, execution, and context.
          </p>
          <Button
            onClick={onRequestAccess}
            size="lg"
            className="mt-12 px-8 py-6 text-base bg-foreground text-background hover:bg-foreground/90 rounded-none"
          >
            Request Access
          </Button>
        </div>
      </div>
    </section>
  );
}
