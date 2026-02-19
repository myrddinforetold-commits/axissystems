import { useState } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { LogoMarquee } from "@/components/landing/LogoMarquee";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { CategorySection } from "@/components/landing/CategorySection";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { InteractiveTimeline } from "@/components/landing/InteractiveTimeline";
import { BeyondAssistantsSection } from "@/components/landing/BeyondAssistantsSection";
import { ControlSection } from "@/components/landing/ControlSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
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
        <ProblemSection />
        <CategorySection />
        <section id="features">
          <BentoFeatures />
        </section>
        <InteractiveTimeline />
        <BeyondAssistantsSection />
        <ControlSection />
        <UseCasesSection />
        <CTASection onRequestAccess={handleRequestAccess} />
      </main>
      <LandingFooter />
      <AccessRequestModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
