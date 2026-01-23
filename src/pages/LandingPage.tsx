import { useState } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { LogoMarquee } from "@/components/landing/LogoMarquee";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { InteractiveTimeline } from "@/components/landing/InteractiveTimeline";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AccessRequestModal } from "@/components/landing/AccessRequestModal";

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRequestAccess = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader onRequestAccess={handleRequestAccess} />
      <main>
        <HeroSection onRequestAccess={handleRequestAccess} />
        <LogoMarquee />
        <section id="product">
          <ProductDemo />
        </section>
        <section id="features">
          <BentoFeatures />
        </section>
        <section id="how-it-works">
          <InteractiveTimeline />
        </section>
        <CTASection onRequestAccess={handleRequestAccess} />
      </main>
      <LandingFooter />
      <AccessRequestModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
