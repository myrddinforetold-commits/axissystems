import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

const controlItems = [
  "Approve or reject proposed actions",
  "Set role boundaries and mandates",
  "Review the full audit trail",
  "Revoke role permissions at any time",
];

export function ControlSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36 px-6 bg-muted/20 border-y border-border/30"
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
          <div>
            <p
              className={cn(
                "text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono transition-all duration-500",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
              )}
            >
              Governance
            </p>
            <h2
              className={cn(
                "text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2] mb-10 transition-all duration-700",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace", transitionDelay: "100ms" }}
            >
              Control Without Micromanagement
            </h2>

            <div className="space-y-8">
              {[
                {
                  text: "Humans remain decision authorities. The system prepares, proposes, and executes within boundaries.",
                  delay: "250ms",
                },
                {
                  text: "Every action is reviewable and reversible.",
                  delay: "400ms",
                },
              ].map(({ text, delay }) => (
                <div
                  key={text}
                  className={cn(
                    "border-l-2 border-foreground/20 pl-6 transition-all duration-700",
                    inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  )}
                  style={{ transitionDelay: inView ? delay : "0ms" }}
                >
                  <p className="text-base text-foreground/80 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "transition-all duration-700",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "300ms" }}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-6 font-mono">
              Owners can
            </p>
            <ul className="space-y-0">
              {controlItems.map((item, i) => (
                <li key={item}>
                  {/* Animated divider */}
                  <div className="h-px bg-border/30 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-border/60 transition-all duration-700 ease-out"
                      style={{
                        width: inView ? "100%" : "0%",
                        transitionDelay: inView ? `${400 + i * 80}ms` : "0ms",
                      }}
                    />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-4 text-sm text-muted-foreground leading-relaxed py-4",
                      "group hover:text-foreground/80 transition-colors duration-200 cursor-default"
                    )}
                  >
                    <span className="w-1 h-1 rounded-full bg-foreground/30 shrink-0 group-hover:bg-foreground/60 transition-colors duration-200" />
                    {item}
                  </div>
                </li>
              ))}
              <div className="h-px bg-border/30 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-border/60 transition-all duration-700 ease-out"
                  style={{
                    width: inView ? "100%" : "0%",
                    transitionDelay: inView ? `${400 + controlItems.length * 80}ms` : "0ms",
                  }}
                />
              </div>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
