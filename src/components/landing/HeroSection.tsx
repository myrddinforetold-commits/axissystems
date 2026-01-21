import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onRequestAccess: () => void;
}

export function HeroSection({ onRequestAccess }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col">
      {/* Video Placeholder */}
      <div className="relative w-full aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        <div className="absolute top-6 left-6 text-xs uppercase tracking-widest text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Product walkthrough
        </div>
        <div className="flex flex-col items-center gap-4 opacity-0 animate-scale-in" style={{ animationDelay: "0.4s" }}>
          <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center bg-background/50 backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer group">
            <Play className="w-8 h-8 text-muted-foreground ml-1 group-hover:text-foreground transition-colors" />
          </div>
          <span className="text-sm text-muted-foreground">Video coming soon</span>
        </div>
      </div>

      {/* Hero Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-foreground leading-tight opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            An operating system for how companies think and act.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            Axis Systems gives companies persistent AI roles that align decisions, execution, and context.
          </p>
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
            <Button
              onClick={onRequestAccess}
              size="lg"
              className="mt-12 px-8 py-6 text-base bg-foreground text-background hover:bg-foreground/90 rounded-none hover:scale-105 transition-transform"
            >
              Request Access
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
