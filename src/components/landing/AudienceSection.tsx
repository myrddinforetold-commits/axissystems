import { Check } from "lucide-react";

const audiences = [
  "Founders building their first operating layer",
  "Small teams seeking structure without overhead",
  "Operators who want AI that remembers",
  "Companies experimenting with AI responsibly",
];

export function AudienceSection() {
  return (
    <section className="py-24 md:py-32 px-6 bg-muted relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted to-transparent opacity-50" />
      
      <div className="max-w-4xl mx-auto text-center relative">
        <h2 className="text-2xl md:text-3xl font-medium text-foreground mb-12 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Built for
        </h2>
        <ul className="space-y-5 inline-block text-left">
          {audiences.map((audience, index) => (
            <li
              key={audience}
              className="flex items-center gap-4 text-lg text-muted-foreground opacity-0 animate-slide-in-right group"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-colors">
                <Check className="w-3.5 h-3.5 text-muted-foreground group-hover:text-background transition-colors" />
              </span>
              <span className="group-hover:text-foreground transition-colors">
                {audience}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
