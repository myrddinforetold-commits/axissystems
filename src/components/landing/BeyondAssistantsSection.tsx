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
    label: "Axis Systems",
    verb: "operates.",
    description:
      "Roles maintain ongoing responsibility. They carry context forward, coordinate across functions, and continue working between sessions.",
    highlight: true,
  },
];

export function BeyondAssistantsSection() {
  return (
    <section className="py-24 md:py-36 px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-16">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono">
            Differentiation
          </p>
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Beyond Assistants
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border/30">
          {comparisons.map((item) => (
            <div key={item.label} className="py-8 md:py-0 md:px-10 first:md:pl-0 last:md:pr-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 font-mono">
                {item.label}
              </p>
              <p
                className="text-xl md:text-2xl font-light text-foreground mb-5"
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

        <div className="mt-14 pt-10 border-t border-border/30">
          <p className="text-base md:text-lg text-muted-foreground/70 leading-relaxed max-w-2xl">
            It manages ongoing operational state rather than isolated requests.
          </p>
        </div>
      </div>
    </section>
  );
}
