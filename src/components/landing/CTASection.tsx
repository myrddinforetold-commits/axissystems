import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface CTASectionProps {
  onRequestAccess: () => void;
}

export function CTASection({ onRequestAccess }: CTASectionProps) {
  return (
    <section className="py-32 md:py-40 px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--neon-cyan)/0.08),transparent_60%)]" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[hsl(var(--neon-cyan)/0.05)] rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[hsl(var(--neon-purple)/0.05)] rounded-full blur-[120px] animate-float" style={{ animationDelay: "-7s" }} />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:6rem_6rem]" />
      
      <div className="max-w-4xl mx-auto text-center relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 opacity-0 animate-fade-in">
          <Sparkles className="w-4 h-4 text-[hsl(var(--neon-cyan))]" />
          <span className="text-sm text-foreground/80">Join 50+ companies</span>
        </div>
        
        <h2 className="text-3xl md:text-5xl font-light text-foreground mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Ready to give your company
          <br />
          <span className="text-gradient-shimmer">a nervous system?</span>
        </h2>
        
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-12 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Join the waitlist and be among the first to experience 
          the future of enterprise AI coordination.
        </p>
        
        {/* CTA Button with glow effect */}
        <div className="opacity-0 animate-scale-in" style={{ animationDelay: "0.3s" }}>
          <Button
            onClick={onRequestAccess}
            size="lg"
            className="relative px-12 py-7 text-lg bg-foreground text-background hover:bg-foreground/90 rounded-none group overflow-hidden animate-glow-pulse"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <span className="relative z-10 flex items-center gap-2">
              Request Access
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </div>
        
        {/* Additional info */}
        <p className="mt-8 text-xs text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          No credit card required • Early access priority • Cancel anytime
        </p>
      </div>
    </section>
  );
}
