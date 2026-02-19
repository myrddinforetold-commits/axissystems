import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

const useCases = [
  {
    title: "Operational coordination",
    description: "Roles manage ongoing work across functions — tracking status, flagging blockers, and keeping priorities aligned.",
  },
  {
    title: "Internal reporting",
    description: "Structured reports generated from live company context, not assembled manually from scattered sources.",
  },
  {
    title: "Customer follow-ups",
    description: "Roles draft, route, and track follow-up actions without waiting for a human to remember.",
  },
  {
    title: "Task routing",
    description: "Work is assigned to the right role based on mandate and context, not manual triage.",
  },
  {
    title: "Company knowledge continuity",
    description: "Decisions, context, and learnings persist across time — not lost when people leave or sessions end.",
  },
];

export function UseCasesSection() {
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
            Use Cases
          </p>
          <h2
            className={cn(
              "text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2] transition-all duration-700",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace", transitionDelay: "100ms" }}
          >
            Operational Use Cases
          </h2>
        </div>

        <div>
          {useCases.map((item, i) => (
            <div key={item.title}>
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
                  "py-8 md:py-10 grid md:grid-cols-[1fr_1.4fr] gap-4 md:gap-16 cursor-default",
                  "transition-all duration-300",
                  hoveredIndex === i ? "bg-muted/30 -mx-4 px-4 md:-mx-6 md:px-6" : ""
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
                <p
                  className={cn(
                    "text-sm font-medium leading-snug transition-colors duration-300",
                    hoveredIndex === i ? "text-foreground" : "text-foreground/90"
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {item.title}
                </p>
                <p
                  className={cn(
                    "text-sm leading-relaxed transition-colors duration-300",
                    hoveredIndex === i ? "text-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {item.description}
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
                transitionDelay: inView ? `${useCases.length * 80}ms` : "0ms",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
