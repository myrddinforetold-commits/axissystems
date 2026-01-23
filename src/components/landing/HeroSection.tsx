import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { NeuralMeshBackground } from "./NeuralMeshBackground";

interface HeroSectionProps {
  onRequestAccess: () => void;
}

export function HeroSection({ onRequestAccess }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col">
      {/* Dynamic AI Wallpaper */}
      <div className="relative w-full aspect-[16/9] lg:aspect-[21/9] overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        {/* Neural mesh canvas */}
        <NeuralMeshBackground />
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Floating accent elements */}
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-[hsl(var(--neon-cyan)/0.1)] rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-56 md:w-80 h-56 md:h-80 bg-[hsl(var(--neon-purple)/0.1)] rounded-full blur-[100px] animate-float" style={{ animationDelay: "-5s" }} />
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="glass-card px-6 py-3 rounded-full mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <span className="flex items-center gap-2 text-sm text-foreground/80">
              <Sparkles className="w-4 h-4 text-[hsl(var(--neon-cyan))]" />
              The future of enterprise AI
            </span>
          </div>
        </div>
        
        {/* Product label */}
        <div className="absolute top-6 left-6 text-xs uppercase tracking-widest text-foreground/40 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Axis Systems • 2026
        </div>
      </div>

      {/* Hero Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-light tracking-tight leading-[1.1] opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <span className="text-foreground">Your company's </span>
            <span className="text-gradient-shimmer">AI nervous system</span>
          </h1>
          
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            Axis gives every decision persistent context. Every role, aligned memory. 
            Every action, traced execution.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
            <Button
              onClick={onRequestAccess}
              size="lg"
              className="px-8 py-6 text-base bg-foreground text-background hover:bg-foreground/90 rounded-none group hover:scale-105 transition-all duration-300 glow-border"
            >
              Request Access
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              variant="ghost"
              size="lg"
              className="px-8 py-6 text-base text-muted-foreground hover:text-foreground rounded-none"
            >
              Watch Demo
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-16 flex items-center justify-center gap-8 text-xs text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.9s" }}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Enterprise Ready
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Private by Default
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
