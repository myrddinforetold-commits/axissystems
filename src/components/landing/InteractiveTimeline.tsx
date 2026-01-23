import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "01",
    title: "Create a company",
    description: "Set up your organization in seconds with guided onboarding.",
    detail: "Define your company's mission, values, and operating context.",
  },
  {
    number: "02",
    title: "Define AI roles",
    description: "CEO, Chief of Staff, Product, Sales—whatever your org needs.",
    detail: "Each role comes with specialized capabilities and permissions.",
  },
  {
    number: "03",
    title: "Work inside role conversations",
    description: "Each role maintains specialized context and persistent memory.",
    detail: "Conversations compound. Nothing is forgotten.",
  },
  {
    number: "04",
    title: "Build shared memory",
    description: "Pin important insights for cross-role access and alignment.",
    detail: "Create an AI-native knowledge graph for your organization.",
  },
];

export function InteractiveTimeline() {
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const windowHeight = window.innerHeight;
      
      // Calculate progress through section
      const progress = Math.max(0, Math.min(1, 
        (windowHeight * 0.5 - sectionTop) / (sectionHeight - windowHeight * 0.3)
      ));
      
      setScrollProgress(progress);
      setActiveStep(Math.min(3, Math.floor(progress * 4)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-background to-muted/50" />
      
      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-20">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4 opacity-0 animate-fade-in">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-foreground opacity-0 animate-fade-in font-mono" style={{ animationDelay: "0.1s", fontFamily: "'JetBrains Mono', monospace" }}>
            From zero to operational AI in minutes
          </h2>
        </div>

        {/* Timeline container */}
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2">
            <div 
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-cyan-500 to-purple-500 transition-all duration-300"
              style={{ height: `${scrollProgress * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-16 md:space-y-24">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  "relative flex items-start gap-8 md:gap-16 transition-all duration-500",
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse",
                  index <= activeStep ? "opacity-100" : "opacity-40"
                )}
              >
                {/* Node */}
                <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 flex items-center justify-center z-10">
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all duration-500",
                      index <= activeStep 
                        ? "bg-cyan-500 border-cyan-400 shadow-[0_0_20px_hsl(180_100%_50%/0.5)]"
                        : "bg-background border-border"
                    )}
                  >
                    {index === activeStep && (
                      <div className="absolute inset-0 rounded-full animate-node-pulse bg-cyan-500/50" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={cn(
                  "flex-1 pl-20 md:pl-0 md:w-1/2",
                  index % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16 md:text-left"
                )}>
                  <div 
                    className={cn(
                      "glass-card p-6 rounded-xl transition-all duration-500",
                      index <= activeStep && "glow-border"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-mono transition-colors duration-300",
                      index <= activeStep ? "text-cyan-400" : "text-muted-foreground"
                    )}>
                      {step.number}
                    </span>
                    
                    <h3 className="text-xl font-medium text-foreground mt-2 mb-3 font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {step.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm mb-3">
                      {step.description}
                    </p>
                    
                    <p className={cn(
                      "text-xs text-muted-foreground/70 transition-opacity duration-300",
                      index === activeStep ? "opacity-100" : "opacity-0"
                    )}>
                      {step.detail}
                    </p>
                  </div>
                </div>
                
                {/* Spacer for alternating layout */}
                <div className="hidden md:block flex-1 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
