import { Users, Brain, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Role-Based AI Agents",
    description:
      "Define AI roles that mirror your org structure. Each role maintains its own context and expertise.",
  },
  {
    icon: Brain,
    title: "Persistent Memory",
    description:
      "Conversations persist. Context compounds. Decisions reference what came before.",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-Loop",
    description:
      "Every action requires approval. AI advises. Humans decide.",
  },
];

export function ProductSection() {
  return (
    <section className="py-24 md:py-32 px-6 bg-muted relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--border)),transparent_70%)] opacity-30" />
      
      <div className="max-w-6xl mx-auto relative">
        <h2 className="text-2xl md:text-3xl font-medium text-foreground text-center mb-16 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          What Axis Systems provides
        </h2>
        <div className="grid md:grid-cols-3 gap-12 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="text-center md:text-left group opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.2 + index * 0.15}s` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 mb-6 border border-border rounded-none bg-background group-hover:bg-foreground group-hover:border-foreground transition-colors duration-300">
                <feature.icon className="w-5 h-5 text-foreground group-hover:text-background transition-colors duration-300" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
