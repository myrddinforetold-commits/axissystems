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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ backgroundColor: "hsl(220, 20%, 6%)" }}>
      <NeuralMeshBackground />
      
      {/* Subtle vignette — keeps text readable without killing the log */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_30%,hsla(220,20%,4%,0.6)_100%)]" />
      
      {/* Very faint grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsla(220,20%,60%,0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsla(220,20%,60%,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 sm:pt-28">
        {/* Supporting tag */}
        <p
          className="text-xs uppercase tracking-[0.3em] opacity-0 animate-fade-in"
          style={{ color: "hsla(220,15%,60%,1)", animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          Autonomous Company Operating System
        </p>

        {/* Headline */}
        <h1
          className="mt-10 text-4xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] opacity-0 animate-fade-in-up"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(220,15%,92%)", animationDelay: "0.35s", animationFillMode: "forwards" }}
        >
          Your company now has
          <br />
          <span className="text-gradient-shimmer font-normal">software that works.</span>
        </h1>
        
        {/* Subheadline */}
        <p
          className="mt-8 text-base md:text-lg max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up"
          style={{ color: "hsla(220,15%,60%,1)", animationDelay: "0.55s", animationFillMode: "forwards" }}
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
            className="px-10 py-7 text-sm rounded-none group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden uppercase tracking-wide"
            style={{ backgroundColor: "hsl(220,15%,92%)", color: "hsl(220,20%,6%)" }}
          >
            <span className="relative z-10 flex items-center">
              Request Access
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={scrollToHowItWorks}
            className="px-10 py-7 text-sm rounded-none transition-all duration-300 uppercase tracking-wide border"
            style={{ color: "hsla(220,15%,55%,1)", borderColor: "hsla(220,15%,30%,1)" }}
          >
            See How It Works
          </Button>
        </div>
        
        {/* Supporting line */}
        <p
          className="mt-16 text-xs tracking-widest uppercase opacity-0 animate-fade-in"
          style={{ color: "hsla(220,15%,40%,1)", animationDelay: "0.9s", animationFillMode: "forwards" }}
        >
          Not assistants.&nbsp;&nbsp;Not automations.&nbsp;&nbsp;Operators.
        </p>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in" style={{ animationDelay: "1.3s", animationFillMode: "forwards" }}>
        <div className="flex flex-col items-center gap-2" style={{ color: "hsla(220,15%,40%,1)" }}>
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 animate-pulse" style={{ background: "linear-gradient(to bottom, hsla(220,15%,40%,0.4), transparent)" }} />
        </div>
      </div>
    </section>
  );
}
