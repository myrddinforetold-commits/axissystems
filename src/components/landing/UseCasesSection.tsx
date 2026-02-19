const useCases = [
  {
    title: "Operational coordination",
    description:
      "Roles manage ongoing work across functions — tracking status, flagging blockers, and keeping priorities aligned.",
  },
  {
    title: "Internal reporting",
    description:
      "Structured reports generated from live company context, not assembled manually from scattered sources.",
  },
  {
    title: "Customer follow-ups",
    description:
      "Roles draft, route, and track follow-up actions without waiting for a human to remember.",
  },
  {
    title: "Task routing",
    description:
      "Work is assigned to the right role based on mandate and context, not manual triage.",
  },
  {
    title: "Company knowledge continuity",
    description:
      "Decisions, context, and learnings persist across time — not lost when people leave or sessions end.",
  },
];

export function UseCasesSection() {
  return (
    <section className="py-24 md:py-36 px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-16">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono">
            Use Cases
          </p>
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Operational Use Cases
          </h2>
        </div>

        <div className="divide-y divide-border/30">
          {useCases.map((item) => (
            <div
              key={item.title}
              className="py-8 md:py-10 grid md:grid-cols-[1fr_1.4fr] gap-4 md:gap-16"
            >
              <p
                className="text-sm font-medium text-foreground/90"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.title}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
