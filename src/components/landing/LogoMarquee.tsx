const trustItems = [
  "Enterprise Ready",
  "Human Approval Required",
  "Audit Trail Included",
  "Private by Default",
];

export function LogoMarquee() {
  return (
    <section className="py-4 border-y border-border/40 bg-muted/20 overflow-x-auto">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-start sm:justify-center divide-x divide-border/40 min-w-max sm:min-w-0 mx-auto">
          {trustItems.map((item) => (
            <span
              key={item}
              className="px-5 sm:px-8 py-2 text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-mono whitespace-nowrap"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

