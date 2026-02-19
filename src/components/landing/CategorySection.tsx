const roles = ["CEO", "Operations", "Product", "Finance", "Support"];

export function CategorySection() {
  return (
    <section className="py-24 md:py-36 px-6 bg-muted/20 border-y border-border/30">
      <div className="max-w-2xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 font-mono">
          Category
        </p>

        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground mb-10 leading-[1.2]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          A New Kind of System
        </h2>

        <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-12">
          Axis Systems assigns responsibilities to persistent AI roles inside your company structure.
        </p>

        {/* Role pills */}
        <div className="flex flex-wrap gap-2 mb-14">
          {roles.map((role, i) => (
            <span
              key={role}
              className="px-4 py-1.5 text-xs font-mono text-muted-foreground border border-border/50 bg-background/50 tracking-wider uppercase"
            >
              {role}
            </span>
          ))}
        </div>

        {/* Statements with left border */}
        <div className="space-y-6">
          <div className="border-l-2 border-foreground/20 pl-6">
            <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
              They do not reset every conversation.
            </p>
          </div>
          <div className="border-l-2 border-foreground/20 pl-6">
            <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
              They accumulate knowledge and act on it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
