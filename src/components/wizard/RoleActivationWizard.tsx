import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AutonomousModeStep from "./steps/AutonomousModeStep";
import SetObjectiveStep from "./steps/SetObjectiveStep";
import ActivationConfirmStep from "./steps/ActivationConfirmStep";

interface Role {
  id: string;
  name: string;
  mandate: string;
  authority_level: string;
  company_id: string;
}

interface RoleActivationWizardProps {
  open: boolean;
  onComplete: () => void;
  role: Role;
  companyId: string;
}

type Step = "autonomous" | "objective" | "confirm";

export default function RoleActivationWizard({
  open,
  onComplete,
  role,
  companyId,
}: RoleActivationWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>("autonomous");
  const [objective, setObjective] = useState<{ title: string; description: string } | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const handleObjectiveSet = (obj: { title: string; description: string }) => {
    setObjective(obj);
    setCurrentStep("confirm");
  };

  const handleActivate = async () => {
    if (!objective || !user) return;

    setIsActivating(true);
    try {
      // 1. Create the objective
      const { error: objectiveError } = await supabase.from("role_objectives").insert({
        role_id: role.id,
        company_id: companyId,
        title: objective.title,
        description: objective.description,
        status: "active",
        priority: 1,
        created_by: user.id,
      });

      if (objectiveError) throw objectiveError;

      // 2. Mark role as activated (using type assertion for new column)
      const { error: roleError } = await supabase
        .from("roles")
        .update({ is_activated: true } as any)
        .eq("id", role.id);

      if (roleError) throw roleError;

      // 3. Trigger the autonomous loop
      try {
        await supabase.functions.invoke("role-autonomous-loop", {
          body: { role_id: role.id },
        });
      } catch (loopError) {
        // Non-fatal - role is still activated
        console.warn("Failed to trigger autonomous loop:", loopError);
      }

      toast.success(`${role.name} is now active!`);
      onComplete();
    } catch (error: any) {
      console.error("Activation error:", error);
      toast.error("Failed to activate role: " + error.message);
    } finally {
      setIsActivating(false);
    }
  };

  // Progress indicator
  const steps = ["autonomous", "objective", "confirm"] as const;
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`h-2 w-2 rounded-full transition-colors ${
                index <= currentStepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {currentStep === "autonomous" && (
          <AutonomousModeStep
            roleName={role.name}
            onContinue={() => setCurrentStep("objective")}
          />
        )}

        {currentStep === "objective" && (
          <SetObjectiveStep
            roleName={role.name}
            onContinue={handleObjectiveSet}
            onBack={() => setCurrentStep("autonomous")}
          />
        )}

        {currentStep === "confirm" && objective && (
          <ActivationConfirmStep
            roleName={role.name}
            authorityLevel={role.authority_level}
            objectiveTitle={objective.title}
            onActivate={handleActivate}
            onBack={() => setCurrentStep("objective")}
            isActivating={isActivating}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
