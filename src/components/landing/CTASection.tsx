import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  onRequestAccess: () => void;
}

export function CTASection({ onRequestAccess }: CTASectionProps) {
  return (
    <section className="py-24 md:py-36 px-6 bg-muted/20 border-t border-border/30">
      <div className="max-w-2xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono">
          Get Started
        </p>

        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2] mb-12"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Build a Company That Runs With You
        </h2>

        <Button
          onClick={onRequestAccess}
          size="lg"
          className="px-10 py-7 text-sm bg-foreground text-background hover:bg-foreground/90 rounded-none group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden uppercase tracking-wide"
        >
          <span className="relative z-10 flex items-center">
            Request Access
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </Button>

        <p className="mt-6 text-xs text-muted-foreground/50 leading-relaxed">
          Access is invitation-based. We review every request.
        </p>
      </div>
    </section>
  );
}
