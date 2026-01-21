import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onRequestAccess: () => void;
}

export function HeroSection({ onRequestAccess }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col">
      {/* Dynamic AI Wallpaper */}
      <div className="relative w-full aspect-video overflow-hidden">
        {/* Base: Animated gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 animate-gradient-shift bg-[length:200%_200%]" />
        
        {/* Layer 1: Glowing orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-cyan-500/20 rounded-full blur-3xl animate-float"
        />
        <div 
          className="absolute bottom-1/3 right-1/4 w-56 md:w-80 h-56 md:h-80 bg-purple-500/15 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "-5s" }}
        />
        <div 
          className="absolute top-1/2 right-1/3 w-48 md:w-64 h-48 md:h-64 bg-blue-400/20 rounded-full blur-2xl animate-pulse-glow"
          style={{ animationDelay: "-2s" }}
        />
        <div 
          className="absolute bottom-1/4 left-1/3 w-40 md:w-56 h-40 md:h-56 bg-indigo-500/15 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "-10s" }}
        />

        {/* Layer 2: Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        {/* Layer 3: Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/60 rounded-full animate-drift"
              style={{
                left: `${8 + i * 8}%`,
                animationDelay: `${i * -1.5}s`,
                animationDuration: `${12 + i * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Layer 4: Horizontal scan line */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,hsl(var(--foreground))_2px,hsl(var(--foreground))_4px)]" />
        </div>

        {/* Vignette overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />

        {/* Play button (centered) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0 animate-scale-in" style={{ animationDelay: "0.4s" }}>
          <div className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/5 backdrop-blur-sm hover:scale-110 hover:border-white/50 hover:bg-white/10 transition-all duration-300 cursor-pointer group shadow-[0_0_40px_rgba(56,189,248,0.2)]">
            <Play className="w-8 h-8 text-white/70 ml-1 group-hover:text-white transition-colors" />
          </div>
          <span className="text-sm text-white/50 tracking-wide">Video coming soon</span>
        </div>

        {/* Product walkthrough label */}
        <div className="absolute top-6 left-6 text-xs uppercase tracking-widest text-white/40 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Product walkthrough
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
