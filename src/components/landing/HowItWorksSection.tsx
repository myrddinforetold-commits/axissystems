const steps = [
  {
    number: "01",
    title: "Create a company",
    description: "Set up your organization in seconds.",
  },
  {
    number: "02",
    title: "Define AI roles",
    description: "CEO, Chief of Staff, Product, Sales—whatever your org needs.",
  },
  {
    number: "03",
    title: "Work inside role conversations",
    description: "Each role maintains specialized context and memory.",
  },
  {
    number: "04",
    title: "Build shared company memory",
    description: "Pin important insights for cross-role access.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-medium text-foreground text-center mb-16">
          How it works
        </h2>
        <div className="space-y-12">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-6 md:gap-8 items-start"
            >
              <span className="text-sm font-medium text-muted-foreground pt-1 w-8 flex-shrink-0">
                {step.number}
              </span>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
