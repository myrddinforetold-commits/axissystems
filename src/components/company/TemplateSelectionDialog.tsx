import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { companyTemplates, CompanyTemplate } from '@/data/roleTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, Briefcase, User, Sprout, TrendingUp, Building2, ChevronRight } from 'lucide-react';

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onComplete: () => void;
}

const templateIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  startup: Users,
  agency: Briefcase,
  solo_founder: User,
};

const companyStages = [
  {
    value: 'early',
    label: 'Early-stage',
    description: 'Pre-product-market fit, exploring and iterating quickly',
    icon: Sprout,
  },
  {
    value: 'growth',
    label: 'Growing',
    description: 'Scaling operations, expanding team and customer base',
    icon: TrendingUp,
  },
  {
    value: 'scale',
    label: 'Established',
    description: 'Mature operations with structured processes',
    icon: Building2,
  },
];

export default function TemplateSelectionDialog({
  open,
  onOpenChange,
  companyId,
  onComplete,
}: TemplateSelectionDialogProps) {
  const [step, setStep] = useState<'stage' | 'template'>('stage');
  const [selectedStage, setSelectedStage] = useState<string>('early');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleStageConfirm = async () => {
    setIsApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Save company stage context
      const { error } = await supabase.from('company_context').insert({
        company_id: companyId,
        stage: selectedStage,
        set_by: user.id,
      });

      if (error) throw error;
      
      setStep('template');
    } catch (error) {
      console.error('Error saving company stage:', error);
      toast.error('Failed to save company stage');
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyTemplate = async (template: CompanyTemplate) => {
    setIsApplying(true);
    setSelectedTemplate(template.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Create all roles from the template
      const rolesToInsert = template.roles.map(role => ({
        company_id: companyId,
        name: role.name,
        mandate: role.mandate,
        system_prompt: role.system_prompt,
        authority_level: role.authority_level,
        memory_scope: role.memory_scope,
        created_by: user.id,
      }));

      const { data: createdRoles, error } = await supabase
        .from('roles')
        .insert(rolesToInsert)
        .select('id');

      if (error) throw error;

      // Trigger initial autonomous loop for each role
      if (createdRoles && createdRoles.length > 0) {
        // Fire and forget - trigger autonomous loop for each role
        for (const role of createdRoles) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/role-autonomous-loop`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ role_id: role.id }),
          }).catch(err => console.log('Autonomous loop trigger:', err));
        }
      }

      toast.success(`${template.name} template applied with ${template.roles.length} roles`);
      onComplete();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    } finally {
      setIsApplying(false);
      setSelectedTemplate(null);
    }
  };

  const handleSkip = () => {
    if (step === 'stage') {
      // Skip stage selection, go to templates
      setStep('template');
    } else {
      // Skip template selection, complete
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {step === 'stage' ? (
          <>
            <DialogHeader>
              <DialogTitle>What stage is your company?</DialogTitle>
              <DialogDescription>
                This helps AI roles calibrate their behavior to your context.
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={selectedStage}
              onValueChange={setSelectedStage}
              className="grid gap-3 py-4"
            >
              {companyStages.map((stage) => {
                const Icon = stage.icon;
                return (
                  <Label
                    key={stage.value}
                    htmlFor={stage.value}
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:border-foreground/50 ${
                      selectedStage === stage.value
                        ? 'border-foreground bg-muted/50'
                        : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value={stage.value} id={stage.value} className="sr-only" />
                    <div className="flex-shrink-0 w-10 h-10 rounded-md border border-border flex items-center justify-center bg-background">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{stage.label}</p>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </div>
                    {selectedStage === stage.value && (
                      <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                        <ChevronRight className="w-3 h-3 text-background" />
                      </div>
                    )}
                  </Label>
                );
              })}
            </RadioGroup>

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={handleSkip} disabled={isApplying}>
                Skip
              </Button>
              <Button onClick={handleStageConfirm} disabled={isApplying}>
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Choose a Template</DialogTitle>
              <DialogDescription>
                Start with pre-configured roles for your team. Roles begin working immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {companyTemplates.map((template) => {
                const Icon = templateIcons[template.id] || Users;
                const isSelected = selectedTemplate === template.id;
                
                return (
                  <Card
                    key={template.id}
                    className={`p-4 cursor-pointer transition-all hover:border-foreground/50 ${
                      isSelected ? 'border-foreground ring-1 ring-foreground' : ''
                    }`}
                    onClick={() => !isApplying && handleApplyTemplate(template)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-md border border-border flex items-center justify-center bg-muted">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{template.name}</h3>
                          <span className="text-xs text-muted-foreground">
                            {template.roles.length} roles
                          </span>
                          {isSelected && isApplying && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {template.roles.map((role) => (
                            <span
                              key={role.name}
                              className="inline-flex items-center px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isApplying}
              >
                Skip for now
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
