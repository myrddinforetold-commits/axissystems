import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { NeuralMeshBackground } from "./NeuralMeshBackground";

interface HeroSectionProps {
  onRequestAccess: () => void;
}

export function HeroSection({ onRequestAccess }: HeroSectionProps) {
  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <NeuralMeshBackground />
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/30 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.3)_0%,hsl(var(--background)/0.6)_70%)]" />
      <div className="absolute inset-0 bg-background/20" />
      
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[hsl(var(--neon-cyan)/0.08)] rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[hsl(var(--neon-purple)/0.08)] rounded-full blur-[100px] animate-float" style={{ animationDelay: "-3s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--neon-cyan)/0.04)] rounded-full blur-[150px] animate-pulse-slow" />
      
      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 sm:pt-28">
        {/* Supporting tag */}
        <p
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-10 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          Autonomous Company Operating System
        </p>

        {/* Headline */}
        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] opacity-0 animate-fade-in-up"
          style={{ fontFamily: "'JetBrains Mono', monospace", animationDelay: "0.35s", animationFillMode: "forwards" }}
        >
          Your company now has
          <br />
          <span className="text-gradient-shimmer font-normal">software that works.</span>
        </h1>
        
        {/* Subheadline */}
        <p
          className="mt-8 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.55s", animationFillMode: "forwards" }}
        >
          Axis Systems introduces persistent AI roles that plan, coordinate, and execute operational work — under your approval.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}
        >
          <Button
            onClick={onRequestAccess}
            size="lg"
            className="px-10 py-7 text-sm bg-foreground text-background hover:bg-foreground/90 rounded-none group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center tracking-wide uppercase">
              Request Access
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={scrollToHowItWorks}
            className="px-10 py-7 text-sm text-muted-foreground hover:text-foreground rounded-none border border-border/30 hover:border-border/60 transition-all duration-300 uppercase tracking-wide"
          >
            See How It Works
          </Button>
        </div>
        
        {/* Supporting line */}
        <p
          className="mt-16 text-xs text-muted-foreground/50 tracking-widest uppercase opacity-0 animate-fade-in"
          style={{ animationDelay: "0.9s", animationFillMode: "forwards" }}
        >
          Not assistants.&nbsp;&nbsp;Not automations.&nbsp;&nbsp;Operators.
        </p>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in" style={{ animationDelay: "1.3s", animationFillMode: "forwards" }}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/40 to-transparent animate-pulse" />
        </div>
      </div>
    </section>
  );
}
