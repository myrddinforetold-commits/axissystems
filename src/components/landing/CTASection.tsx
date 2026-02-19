import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

interface CTASectionProps {
  onRequestAccess: () => void;
}

export function CTASection({ onRequestAccess }: CTASectionProps) {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36 px-6 bg-muted/20 border-t border-border/30"
    >
      <div className="max-w-2xl mx-auto">
        {/* Animated top line */}
        <div className="h-px bg-border/30 relative overflow-hidden mb-16">
          <div
            className="absolute inset-y-0 left-0 bg-foreground/30 transition-all duration-1000 ease-out"
            style={{ width: inView ? "100%" : "0%" }}
          />
        </div>

        <p
          className={cn(
            "text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono transition-all duration-500",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          )}
          style={{ transitionDelay: "200ms" }}
        >
          Get Started
        </p>

        <h2
          className={cn(
            "text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2] mb-12 transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
          style={{ fontFamily: "'JetBrains Mono', monospace", transitionDelay: "300ms" }}
        >
          Build a Company That Runs With You
        </h2>

        <div
          className={cn(
            "transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "450ms" }}
        >
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
      </div>
    </section>
  );
}
