import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

const capabilities = [
  {
    number: "01",
    name: "Persistent organizational memory",
    description: "Every role retains context from prior sessions. Decisions reference what came before.",
  },
  {
    number: "02",
    name: "Continuous task execution",
    description: "Work continues between sessions without waiting for a human to restart it.",
  },
  {
    number: "03",
    name: "Cross-role coordination",
    description: "Roles share relevant context and hand off work to each other within defined boundaries.",
  },
  {
    number: "04",
    name: "Human approval governance",
    description: "All consequential actions require explicit approval before execution.",
  },
  {
    number: "05",
    name: "Operational decision support",
    description: "Roles surface options, flag blockers, and prepare briefs for human review.",
  },
];

export function BentoFeatures() {
  const { ref, inView } = useInView();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36 px-6 bg-background"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-16">
          <p
            className={cn(
              "text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono transition-all duration-500",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            )}
          >
            Capabilities
          </p>
          <h2
            className={cn(
              "text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2] transition-all duration-700",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace", transitionDelay: "100ms" }}
          >
            What It Actually Does
          </h2>
        </div>

        <div className="space-y-0">
          {capabilities.map((cap, i) => (
            <div key={cap.number}>
              {/* Animated divider */}
              <div className="h-px bg-border/30 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-border/60 transition-all duration-700 ease-out"
                  style={{
                    width: inView ? "100%" : "0%",
                    transitionDelay: inView ? `${i * 80}ms` : "0ms",
                  }}
                />
              </div>

              <div
                className={cn(
                  "grid md:grid-cols-[auto_1fr_1.5fr] gap-6 md:gap-12 py-8 cursor-default",
                  "transition-all duration-300",
                  hoveredIndex === i
                    ? "bg-muted/30 -mx-4 px-4 md:-mx-6 md:px-6"
                    : ""
                )}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(16px)",
                  transition: "opacity 0.6s ease, transform 0.6s ease, background 0.2s ease, margin 0.2s ease, padding 0.2s ease",
                  transitionDelay: inView ? `${200 + i * 80}ms` : "0ms",
                }}
              >
                <span
                  className={cn(
                    "text-[10px] font-mono pt-1 w-6 hidden md:block transition-colors duration-300",
                    hoveredIndex === i ? "text-foreground/60" : "text-muted-foreground/40"
                  )}
                >
                  {cap.number}
                </span>
                <p
                  className={cn(
                    "text-sm font-medium leading-snug md:pt-0.5 transition-colors duration-300",
                    hoveredIndex === i ? "text-foreground" : "text-foreground/90"
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {cap.name}
                </p>
                <p
                  className={cn(
                    "text-sm leading-relaxed transition-colors duration-300",
                    hoveredIndex === i ? "text-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {cap.description}
                </p>
              </div>
            </div>
          ))}
          {/* Final divider */}
          <div className="h-px bg-border/30 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-border/60 transition-all duration-700 ease-out"
              style={{
                width: inView ? "100%" : "0%",
                transitionDelay: inView ? `${capabilities.length * 80}ms` : "0ms",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
