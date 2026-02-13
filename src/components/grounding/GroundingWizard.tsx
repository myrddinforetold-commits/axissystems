import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExistsStep from "./steps/ExistsStep";
import NotExistsStep from "./steps/NotExistsStep";
import AspirationsStep from "./steps/AspirationsStep";
import CustomerStep from "./steps/CustomerStep";
import ConstraintsStep from "./steps/ConstraintsStep";
import TechnicalStep, { type TechnicalContext } from "./steps/TechnicalStep";
import SummaryStep from "./steps/SummaryStep";

export interface GroundingData {
  products: Array<{ name: string; description: string }>;
  entities: Array<{ name: string; type: "company" | "team" | "asset" }>;
  notYetExists: Array<{ name: string; description: string }>;
  aspirations: Array<{ goal: string; timeframe?: string }>;
  intendedCustomer: string;
  constraints: Array<{
    type: "technical" | "market" | "organizational";
    description: string;
  }>;
  technicalContext: TechnicalContext;
}

export interface CurrentStateSummary {
  knownFacts: string[];
  assumptions: string[];
  openQuestions: string[];
}

interface GroundingWizardProps {
  open: boolean;
  companyId: string;
  companyStage: string;
  onComplete: () => void;
}

type Step = "exists" | "not_exists" | "aspirations" | "customer" | "constraints" | "technical" | "summary";

const STEPS: Step[] = ["exists", "not_exists", "aspirations", "customer", "constraints", "technical", "summary"];

export default function GroundingWizard({
  open,
  companyId,
  companyStage,
  onComplete,
}: GroundingWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>("exists");
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<CurrentStateSummary | null>(null);

  const [groundingData, setGroundingData] = useState<GroundingData>({
    products: [],
    entities: [],
    notYetExists: [],
    aspirations: [],
    intendedCustomer: "",
    constraints: [],
    technicalContext: {
      databaseTables: [],
      apiEndpoints: [],
      techStack: [],
      externalServices: [],
    },
  });

  const currentStepIndex = STEPS.indexOf(currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const updateGroundingData = <K extends keyof GroundingData>(
    key: K,
    value: GroundingData[K]
  ) => {
    setGroundingData((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    try {
      // Save grounding data first using raw SQL via rpc or direct insert
      const { error: upsertError } = await (supabase
        .from("company_grounding" as any)
        .upsert({
          company_id: companyId,
          products: groundingData.products,
          entities: groundingData.entities,
          not_yet_exists: groundingData.notYetExists,
          aspirations: groundingData.aspirations,
          intended_customer: groundingData.intendedCustomer,
          constraints: groundingData.constraints,
          technical_context: groundingData.technicalContext,
          status: "pending_confirmation",
        } as any, { onConflict: "company_id" }) as any);

      if (upsertError) throw upsertError;

      // Generate summary via edge function
      const { data, error } = await supabase.functions.invoke("grounding-summary", {
        body: {
          company_id: companyId,
          company_stage: companyStage,
          grounding_data: groundingData,
        },
      });

      if (error) throw error;

      setSummary(data.summary);
      setCurrentStep("summary");
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate summary: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!user || !summary) return;

    setIsLoading(true);
    try {
      // Update grounding with summary and confirm
      const { error: groundingError } = await (supabase
        .from("company_grounding" as any)
        .update({
          current_state_summary: summary,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
        } as any)
        .eq("company_id", companyId) as any);

      if (groundingError) throw groundingError;

      // Mark company as grounded
      const { error: contextError } = await (supabase
        .from("company_context")
        .update({ is_grounded: true } as any)
        .eq("company_id", companyId) as any);

      if (contextError) throw contextError;

      // Provision Moltbot agents (fire-and-forget, don't block onboarding)
      supabase.functions.invoke("moltbot-provision", {
        body: { company_id: companyId },
      }).then(({ error }) => {
        if (error) console.error("Moltbot provision failed:", error);
        else console.log("Moltbot agents provisioned successfully");
      });

      toast.success("Grounding complete! Your team is ready to work.");
      onComplete();
    } catch (error: any) {
      console.error("Error confirming grounding:", error);
      toast.error("Failed to confirm: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-4">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`h-2 w-2 rounded-full transition-colors ${
                index <= currentStepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {currentStep === "exists" && (
          <ExistsStep
            products={groundingData.products}
            entities={groundingData.entities}
            onProductsChange={(products) => updateGroundingData("products", products)}
            onEntitiesChange={(entities) => updateGroundingData("entities", entities)}
            onContinue={handleNext}
          />
        )}

        {currentStep === "not_exists" && (
          <NotExistsStep
            items={groundingData.notYetExists}
            onChange={(items) => updateGroundingData("notYetExists", items)}
            onContinue={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === "aspirations" && (
          <AspirationsStep
            items={groundingData.aspirations}
            onChange={(items) => updateGroundingData("aspirations", items)}
            onContinue={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === "customer" && (
          <CustomerStep
            value={groundingData.intendedCustomer}
            onChange={(value) => updateGroundingData("intendedCustomer", value)}
            onContinue={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === "constraints" && (
          <ConstraintsStep
            items={groundingData.constraints}
            onChange={(items) => updateGroundingData("constraints", items)}
            onContinue={handleNext}
            onBack={handleBack}
            isLoading={false}
          />
        )}

        {currentStep === "technical" && (
          <TechnicalStep
            data={groundingData.technicalContext}
            onChange={(data) => updateGroundingData("technicalContext", data)}
            onContinue={handleGenerateSummary}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}

        {currentStep === "summary" && summary && (
          <SummaryStep
            summary={summary}
            onConfirm={handleConfirm}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
