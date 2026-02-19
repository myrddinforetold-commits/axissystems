import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "01",
    title: "Define your company structure",
    description: "Set the context, responsibilities, and operating boundaries for your organization.",
    detail: "Axis Systems builds a persistent understanding of your company — not a blank slate every session.",
  },
  {
    number: "02",
    title: "Assign responsibilities to roles",
    description: "CEO, Operations, Product — each role carries a mandate and memory, not just a prompt.",
    detail: "Roles are not chatbots. They hold ongoing responsibility for a defined area of your business.",
  },
  {
    number: "03",
    title: "Approve actions when required",
    description: "The system proposes. You decide. Nothing executes without sign-off.",
    detail: "Human approval is built into the architecture — not a setting you have to configure.",
  },
  {
    number: "04",
    title: "The system continues operating",
    description: "Work does not pause between sessions. Roles track open tasks and continue across time.",
    detail: "When you return, the work continued without you. Roles know what they were doing.",
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
      const progress = Math.max(0, Math.min(1,
        (window.innerHeight * 0.5 - rect.top) / (rect.height - window.innerHeight * 0.3)
      ));
      setScrollProgress(progress);
      setActiveStep(Math.min(3, Math.floor(progress * 4)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={sectionRef} id="how-it-works" className="py-24 md:py-36 px-6 bg-muted/20 border-y border-border/30">
      <div className="max-w-4xl mx-auto">
        <div className="mb-20">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono">
            How it works
          </p>
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            From structure to operations.
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-border/40">
            <div
              className="absolute top-0 left-0 w-full bg-foreground/30 transition-all duration-500"
              style={{ height: `${scrollProgress * 100}%` }}
            />
          </div>

          <div className="space-y-12 md:space-y-16">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  "relative pl-14 md:pl-24 transition-all duration-500",
                  index <= activeStep ? "opacity-100" : "opacity-30"
                )}
              >
                {/* Node */}
                <div className="absolute left-4 md:left-8 top-1 -translate-x-1/2 flex items-center justify-center z-10">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full border transition-all duration-500",
                      index <= activeStep
                        ? "bg-foreground border-foreground"
                        : "bg-background border-border/50"
                    )}
                  />
                </div>

                <div className="max-w-2xl">
                  <span className="text-[10px] font-mono text-muted-foreground/40 tracking-wider">
                    {step.number}
                  </span>
                  <h3
                    className="text-lg md:text-xl font-light text-foreground mt-2 mb-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {step.description}
                  </p>
                  <p className={cn(
                    "text-xs text-muted-foreground/60 leading-relaxed transition-all duration-300",
                    index === activeStep ? "opacity-100 max-h-20" : "opacity-0 max-h-0 overflow-hidden"
                  )}>
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Callout */}
        <div className="mt-16 ml-14 md:ml-24 max-w-2xl border-l-2 border-border/30 pl-6">
          <p className="text-sm text-muted-foreground/60 italic leading-relaxed">
            Unlike session-based tools, Axis Systems maintains operational state continuously. Roles know what they were doing before you returned.
          </p>
        </div>
      </div>
    </section>
  );
}
