const audiences = [
  "Founders building their first operating layer",
  "Small teams seeking structure without overhead",
  "Operators who want AI that remembers",
  "Companies experimenting with AI responsibly",
];

export function AudienceSection() {
  return (
    <section className="py-24 md:py-32 px-6 bg-muted">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-medium text-foreground mb-12">
          Built for
        </h2>
        <ul className="space-y-4">
          {audiences.map((audience) => (
            <li
              key={audience}
              className="text-lg text-muted-foreground"
            >
              {audience}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
