import { useEffect, useState, useRef } from "react";
import { useInView } from "@/hooks/useInView";

const trustItems = [
  "Enterprise Ready",
  "Human Approval Required",
  "Audit Trail Included",
  "Private by Default",
];

function useCounter(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return value;
}

const stats = [
  { value: 5, suffix: "+", label: "role types" },
  { value: 100, suffix: "%", label: "actions reviewable" },
  { value: 0, suffix: "", label: "session resets" },
];

export function LogoMarquee() {
  const { ref, inView } = useInView();
  const c0 = useCounter(stats[0].value, 1200, inView);
  const c1 = useCounter(stats[1].value, 1500, inView);
  const c2 = useCounter(stats[2].value, 800, inView);
  const counts = [c0, c1, c2];

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      {/* Trust signals bar */}
      <section className="py-4 border-b border-border/40 bg-muted/20 overflow-hidden">
        {/* Mobile: auto-scrolling marquee */}
        <div className="sm:hidden relative flex">
          <div className="flex animate-[marquee_18s_linear_infinite] shrink-0">
            {[...trustItems, ...trustItems].map((item, i) => (
              <span
                key={i}
                className="px-8 py-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60 font-mono whitespace-nowrap border-r border-border/40"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex animate-[marquee_18s_linear_infinite] shrink-0" aria-hidden>
            {[...trustItems, ...trustItems].map((item, i) => (
              <span
                key={i}
                className="px-8 py-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60 font-mono whitespace-nowrap border-r border-border/40"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        {/* Desktop: static centered */}
        <div className="hidden sm:block max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-center divide-x divide-border/40">
            {trustItems.map((item) => (
              <span
                key={item}
                className="px-8 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-mono whitespace-nowrap"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Animated counters */}
      <section className="py-12 border-b border-border/40 bg-background">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-3 divide-x divide-border/30">
            {stats.map((stat, i) => (
              <div key={stat.label} className="text-center px-4 md:px-8">
                <p
                  className="text-3xl md:text-4xl font-light text-foreground font-mono transition-all duration-300"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {counts[i]}{stat.suffix}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-mono">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
