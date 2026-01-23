import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { NeuralMeshBackground } from "./NeuralMeshBackground";

interface HeroSectionProps {
  onRequestAccess: () => void;
}

export function HeroSection({ onRequestAccess }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Neural mesh canvas - full screen */}
      <NeuralMeshBackground />
      
      {/* Layered gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_70%)]" />
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Floating accent orbs with enhanced animations */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[hsl(var(--neon-cyan)/0.08)] rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[hsl(var(--neon-purple)/0.08)] rounded-full blur-[100px] animate-float" style={{ animationDelay: "-3s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--neon-cyan)/0.04)] rounded-full blur-[150px] animate-pulse-slow" />
      <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-[hsl(180_100%_50%/0.06)] rounded-full blur-[80px] animate-float" style={{ animationDelay: "-7s" }} />
      
      {/* Product label */}
      <div className="absolute top-24 left-6 text-xs uppercase tracking-widest text-foreground/30 opacity-0 animate-fade-in z-10" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
        Axis Systems • 2026
      </div>
      
      {/* Main content - centered overlay */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="glass-card px-6 py-3 rounded-full mb-8 inline-flex opacity-0 animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
          <span className="flex items-center gap-2 text-sm text-foreground/80">
            <Sparkles className="w-4 h-4 text-[hsl(var(--neon-cyan))] animate-pulse" />
            The future of enterprise AI
          </span>
        </div>
        
        {/* Headline with word-by-word reveal */}
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-light tracking-tight leading-[1.05]">
          <span className="block opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
            <span className="text-foreground">Your company's</span>
          </span>
          <span className="block mt-2 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}>
            <span className="text-gradient-shimmer font-normal">AI nervous system</span>
          </span>
        </h1>
        
        {/* Subheadline */}
        <p className="mt-8 text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}>
          Axis gives every decision persistent context. Every role, aligned memory. 
          Every action, traced execution.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.9s", animationFillMode: "forwards" }}>
          <Button
            onClick={onRequestAccess}
            size="lg"
            className="px-10 py-7 text-base bg-foreground text-background hover:bg-foreground/90 rounded-none group hover:scale-105 transition-all duration-300 glow-border relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center">
              Request Access
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            className="px-10 py-7 text-base text-muted-foreground hover:text-foreground rounded-none border border-transparent hover:border-border/50 transition-all duration-300"
          >
            Watch Demo
          </Button>
        </div>
        
        {/* Trust indicators */}
        <div className="mt-20 flex flex-wrap items-center justify-center gap-8 text-xs text-muted-foreground">
          <span className="flex items-center gap-2 opacity-0 animate-fade-in" style={{ animationDelay: "1.1s", animationFillMode: "forwards" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            SOC 2 Compliant
          </span>
          <span className="flex items-center gap-2 opacity-0 animate-fade-in" style={{ animationDelay: "1.2s", animationFillMode: "forwards" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animationDelay: "0.2s" }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Enterprise Ready
          </span>
          <span className="flex items-center gap-2 opacity-0 animate-fade-in" style={{ animationDelay: "1.3s", animationFillMode: "forwards" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animationDelay: "0.4s" }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Private by Default
          </span>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in" style={{ animationDelay: "1.5s", animationFillMode: "forwards" }}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/50 to-transparent animate-pulse" />
        </div>
      </div>
    </section>
  );
}
