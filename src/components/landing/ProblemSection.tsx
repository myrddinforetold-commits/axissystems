import { useRef } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

export function ProblemSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36 px-6 bg-background"
    >
      <div className="max-w-2xl mx-auto">
        <h2
          className={cn(
            "text-2xl md:text-3xl lg:text-4xl font-light text-foreground mb-16 leading-[1.2] transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Companies Don't Run on Software —<br />
          They Run on Coordination.
        </h2>

        <div className="space-y-8 text-base md:text-lg leading-relaxed text-muted-foreground">
          {[
            {
              text: "Most work inside a company is not creation. It is deciding, routing, checking, updating, and following up.",
              delay: "150ms",
              className: "",
            },
            {
              text: "Software stores information. People operate the company.",
              delay: "300ms",
              className: "",
            },
            {
              text: "Axis Systems changes that relationship.",
              delay: "450ms",
              className: "text-foreground font-light",
            },
          ].map(({ text, delay, className }) => (
            <p
              key={text}
              className={cn(
                "transition-all duration-700",
                className,
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
              style={{ transitionDelay: inView ? delay : "0ms" }}
            >
              {text}
            </p>
          ))}
        </div>
      </div>

      {/* Animated divider */}
      <div className="max-w-2xl mx-auto mt-20">
        <div className="h-px bg-border/30 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-foreground/20 transition-all duration-1000 ease-out"
            style={{ width: inView ? "100%" : "0%", transitionDelay: "600ms" }}
          />
        </div>
      </div>
    </section>
  );
}
