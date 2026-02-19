export function ProblemSection() {
  return (
    <section className="py-24 md:py-36 px-6 bg-background">
      <div className="max-w-2xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground mb-16 leading-[1.2]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Companies Don't Run on Software —<br />
          They Run on Coordination.
        </h2>

        <div className="space-y-8 text-base md:text-lg leading-relaxed text-muted-foreground">
          <p>
            Most work inside a company is not creation. It is deciding, routing, checking, updating, and following up.
          </p>
          <p>
            Software stores information. People operate the company.
          </p>
          <p className="text-foreground font-light">
            Axis Systems changes that relationship.
          </p>
        </div>
      </div>
    </section>
  );
}
