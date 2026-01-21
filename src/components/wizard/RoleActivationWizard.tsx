import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CompanyStageStep from "./CompanyStageStep";
import ActivationMessageStep from "./ActivationMessageStep";
import TaskModeIntroStep from "./TaskModeIntroStep";

interface Role {
  id: string;
  name: string;
  mandate: string;
  company_id: string;
}

interface RoleActivationWizardProps {
  role: Role;
  companyId: string;
  onSendMessage: (message: string) => void;
  onComplete: () => void;
  onEnableTaskMode: () => Promise<void>;
}

type WizardStep = "company-stage" | "activation-message" | "task-mode-intro";

export default function RoleActivationWizard({
  role,
  companyId,
  onSendMessage,
  onComplete,
  onEnableTaskMode,
}: RoleActivationWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>("company-stage");
  const [existingStage, setExistingStage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingContext, setCheckingContext] = useState(true);

  // Check if company context already exists
  useEffect(() => {
    async function checkCompanyContext() {
      try {
        const { data } = await supabase
          .from("company_context")
          .select("stage")
          .eq("company_id", companyId)
          .maybeSingle();

        if (data?.stage) {
          setExistingStage(data.stage);
          // Skip company stage step if already set
          setStep("activation-message");
        }
      } catch (error) {
        console.error("Error checking company context:", error);
      } finally {
        setCheckingContext(false);
      }
    }

    checkCompanyContext();
  }, [companyId]);

  const handleStageSelected = async (stage: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      if (existingStage) {
        // Update existing context
        await supabase
          .from("company_context")
          .update({ stage, set_by: user.id })
          .eq("company_id", companyId);
      } else {
        // Insert new context
        await supabase
          .from("company_context")
          .insert({
            company_id: companyId,
            stage,
            set_by: user.id,
          });
      }
      setExistingStage(stage);
    } catch (error) {
      console.error("Error saving company stage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFromStage = () => {
    setStep("activation-message");
  };

  const handleSendActivationMessage = (message: string) => {
    onSendMessage(message);
    setStep("task-mode-intro");
  };

  const handleSkipActivation = () => {
    onComplete();
  };

  const handleEnableTaskMode = async () => {
    setIsLoading(true);
    try {
      await onEnableTaskMode();
      onComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipTaskMode = () => {
    onComplete();
  };

  if (checkingContext) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      {step === "company-stage" && (
        <CompanyStageStep
          currentStage={existingStage}
          onStageSelected={handleStageSelected}
          onContinue={handleContinueFromStage}
          isLoading={isLoading}
        />
      )}
      {step === "activation-message" && (
        <ActivationMessageStep
          roleName={role.name}
          mandate={role.mandate}
          onSend={handleSendActivationMessage}
          onSkip={handleSkipActivation}
          isLoading={isLoading}
        />
      )}
      {step === "task-mode-intro" && (
        <TaskModeIntroStep
          roleName={role.name}
          onEnable={handleEnableTaskMode}
          onSkip={handleSkipTaskMode}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
