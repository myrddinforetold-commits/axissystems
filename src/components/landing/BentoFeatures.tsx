const capabilities = [
  {
    number: "01",
    name: "Persistent organizational memory",
    description:
      "Every role retains context from prior sessions. Decisions reference what came before.",
  },
  {
    number: "02",
    name: "Continuous task execution",
    description:
      "Work continues between sessions without waiting for a human to restart it.",
  },
  {
    number: "03",
    name: "Cross-role coordination",
    description:
      "Roles share relevant context and hand off work to each other within defined boundaries.",
  },
  {
    number: "04",
    name: "Human approval governance",
    description:
      "All consequential actions require explicit approval before execution.",
  },
  {
    number: "05",
    name: "Operational decision support",
    description:
      "Roles surface options, flag blockers, and prepare briefs for human review.",
  },
];

export function BentoFeatures() {
  return (
    <section className="py-24 md:py-36 px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-16">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono">
            Capabilities
          </p>
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            What It Actually Does
          </h2>
        </div>

        <div className="space-y-0 divide-y divide-border/30">
          {capabilities.map((cap) => (
            <div
              key={cap.number}
              className="grid md:grid-cols-[auto_1fr_1.5fr] gap-6 md:gap-12 py-8 group"
            >
              <span className="text-[10px] font-mono text-muted-foreground/40 pt-1 w-6 hidden md:block">
                {cap.number}
              </span>
              <p
                className="text-sm font-medium text-foreground/90 leading-snug md:pt-0.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {cap.name}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
