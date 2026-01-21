import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  onRequestAccess: () => void;
}

export function CTASection({ onRequestAccess }: CTASectionProps) {
  return (
    <section className="py-24 md:py-32 px-6 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="max-w-4xl mx-auto text-center relative">
        <h2 className="text-2xl md:text-3xl font-medium text-foreground mb-4 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Ready to get started?
        </h2>
        <p className="text-muted-foreground mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Join the waitlist and be among the first to experience Axis Systems.
        </p>
        <div className="opacity-0 animate-scale-in" style={{ animationDelay: "0.3s" }}>
          <Button
            onClick={onRequestAccess}
            size="lg"
            className="px-8 py-6 text-base bg-foreground text-background hover:bg-foreground/90 rounded-none group hover:scale-105 transition-transform"
          >
            Request Access
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
