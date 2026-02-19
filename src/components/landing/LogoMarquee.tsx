const trustItems = [
  "Enterprise Ready",
  "Human Approval Required",
  "Audit Trail Included",
  "Private by Default",
];

export function LogoMarquee() {
  return (
    <section className="py-5 border-y border-border/40 bg-muted/20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-0 sm:divide-x sm:divide-border/40">
          {trustItems.map((item) => (
            <span
              key={item}
              className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
