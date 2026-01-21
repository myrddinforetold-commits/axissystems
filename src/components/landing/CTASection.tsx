import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onRequestAccess: () => void;
}

export function CTASection({ onRequestAccess }: CTASectionProps) {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-medium text-foreground mb-8">
          Ready to get started?
        </h2>
        <Button
          onClick={onRequestAccess}
          size="lg"
          className="px-8 py-6 text-base bg-foreground text-background hover:bg-foreground/90 rounded-none"
        >
          Request Access
        </Button>
      </div>
    </section>
  );
}
