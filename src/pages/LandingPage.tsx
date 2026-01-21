import { useState } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductSection } from "@/components/landing/ProductSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { AudienceSection } from "@/components/landing/AudienceSection";
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
      <main className="pt-20 sm:pt-24 lg:pt-28">
        <HeroSection onRequestAccess={handleRequestAccess} />
        <ProductSection />
        <HowItWorksSection />
        <AudienceSection />
        <CTASection onRequestAccess={handleRequestAccess} />
      </main>
      <LandingFooter />
      <AccessRequestModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
