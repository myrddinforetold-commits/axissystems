import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

const comparisons = [
  {
    label: "Assistants",
    verb: "respond.",
    description:
      "They answer when asked. Every session starts fresh. There is no memory of what happened before, and no ongoing responsibility.",
  },
  {
    label: "Automation",
    verb: "triggers.",
    description:
      "It executes when conditions are met. Rigid by design. It cannot reason about context, adapt to changing priorities, or handle ambiguity.",
  },
  {
    label: "Frontier Intelligence",
    verb: "operates.",
    description:
      "Roles maintain ongoing responsibility. They carry context forward, coordinate across functions, and continue working between sessions.",
    highlight: true,
  },
];

export function BeyondAssistantsSection() {
  const { ref, inView } = useInView();

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
            Differentiation
          </p>
          <h2
            className={cn(
              "text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2] transition-all duration-700",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace", transitionDelay: "100ms" }}
          >
            Beyond Assistants
          </h2>
        </div>

        {/* Animated top divider */}
        <div className="h-px bg-border/30 relative overflow-hidden mb-0">
          <div
            className="absolute inset-y-0 left-0 bg-foreground/20 transition-all duration-1000 ease-out"
            style={{ width: inView ? "100%" : "0%", transitionDelay: "200ms" }}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border/30">
          {comparisons.map((item, i) => (
            <div
              key={item.label}
              className={cn(
                "py-10 md:py-0 md:px-10 first:md:pl-0 last:md:pr-0 transition-all duration-700 group",
                item.highlight ? "relative" : "",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: inView ? `${300 + i * 120}ms` : "0ms" }}
            >
              {item.highlight && (
                <div className="absolute inset-0 bg-foreground/[0.03] md:rounded-none pointer-events-none" />
              )}
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 font-mono">
                {item.label}
              </p>
              <p
                className={cn(
                  "text-xl md:text-2xl font-light mb-5 transition-colors duration-300",
                  item.highlight ? "text-foreground" : "text-foreground/60 group-hover:text-foreground/80"
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.verb}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Animated bottom divider */}
        <div className="h-px bg-border/30 relative overflow-hidden mt-0">
          <div
            className="absolute inset-y-0 left-0 bg-foreground/20 transition-all duration-1000 ease-out"
            style={{ width: inView ? "100%" : "0%", transitionDelay: "700ms" }}
          />
        </div>

        <div
          className={cn(
            "mt-14 max-w-2xl transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "800ms" }}
        >
          <p className="text-base md:text-lg text-muted-foreground/70 leading-relaxed">
            It manages ongoing operational state rather than isolated requests.
          </p>
        </div>
      </div>
    </section>
  );
}
