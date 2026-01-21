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
import { companyTemplates, CompanyTemplate } from '@/data/roleTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, Briefcase, User, Check } from 'lucide-react';

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

export default function TemplateSelectionDialog({
  open,
  onOpenChange,
  companyId,
  onComplete,
}: TemplateSelectionDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

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

      const { error } = await supabase.from('roles').insert(rolesToInsert);

      if (error) throw error;

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
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Start with pre-configured roles for your team, or skip to create roles manually.
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
      </DialogContent>
    </Dialog>
  );
}
