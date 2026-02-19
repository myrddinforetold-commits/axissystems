import { useRef } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

const roles = ["CEO", "Operations", "Product", "Finance", "Support"];

export function CategorySection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36 px-6 bg-muted/20 border-y border-border/30"
    >
      <div className="max-w-2xl mx-auto">
        <p
          className={cn(
            "text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono transition-all duration-500",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          )}
        >
          Category
        </p>

        <h2
          className={cn(
            "text-2xl md:text-3xl lg:text-4xl font-light text-foreground mb-10 leading-[1.2] transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
          style={{ fontFamily: "'JetBrains Mono', monospace", transitionDelay: "100ms" }}
        >
          A New Kind of System
        </h2>

        <p
          className={cn(
            "text-base md:text-lg text-muted-foreground leading-relaxed mb-12 transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "200ms" }}
        >
          Axis Systems assigns responsibilities to persistent AI roles inside your company structure.
        </p>

        {/* Role pills with staggered reveal */}
        <div className="flex flex-wrap gap-2 mb-14">
          {roles.map((role, i) => (
            <span
              key={role}
              className={cn(
                "px-4 py-1.5 text-xs font-mono text-muted-foreground border border-border/50 bg-background/50 tracking-wider uppercase",
                "transition-all duration-500 hover:border-foreground/40 hover:text-foreground/80 cursor-default",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
              )}
              style={{ transitionDelay: inView ? `${300 + i * 60}ms` : "0ms" }}
            >
              {role}
            </span>
          ))}
        </div>

        {/* Statements with animated left border */}
        <div className="space-y-6">
          {[
            { text: "They do not reset every conversation.", delay: "600ms" },
            { text: "They accumulate knowledge and act on it.", delay: "750ms" },
          ].map(({ text, delay }) => (
            <div
              key={text}
              className={cn(
                "pl-6 transition-all duration-700",
                inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}
              style={{ transitionDelay: inView ? delay : "0ms" }}
            >
              {/* Animated border line */}
              <div className="relative">
                <div
                  className="absolute left-[-1.5rem] top-0 bottom-0 w-0.5 bg-foreground/20 origin-top transition-transform duration-500"
                  style={{
                    transform: inView ? "scaleY(1)" : "scaleY(0)",
                    transitionDelay: inView ? delay : "0ms",
                  }}
                />
                <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
