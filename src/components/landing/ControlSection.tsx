const controlItems = [
  "Approve or reject proposed actions",
  "Set role boundaries and mandates",
  "Review the full audit trail",
  "Revoke role permissions at any time",
];

export function ControlSection() {
  return (
    <section className="py-24 md:py-36 px-6 bg-muted/20 border-y border-border/30">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono">
              Governance
            </p>
            <h2
              className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-[1.2] mb-10"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Control Without Micromanagement
            </h2>

            <div className="space-y-8">
              <div className="border-l-2 border-foreground/20 pl-6">
                <p className="text-base text-foreground/80 leading-relaxed">
                  Humans remain decision authorities. The system prepares, proposes, and executes within boundaries.
                </p>
              </div>
              <div className="border-l-2 border-foreground/20 pl-6">
                <p className="text-base text-foreground/80 leading-relaxed">
                  Every action is reviewable and reversible.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-6 font-mono">
              Owners can
            </p>
            <ul className="space-y-4">
              {controlItems.map((item) => (
                <li key={item} className="flex items-start gap-4 text-sm text-muted-foreground leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-foreground/30 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
