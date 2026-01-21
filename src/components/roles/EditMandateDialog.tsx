import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const editMandateSchema = z.object({
  mandate: z.string().trim().min(1, 'Mandate is required').max(1000, 'Mandate must be less than 1000 characters'),
});

type EditMandateFormData = z.infer<typeof editMandateSchema>;

interface Role {
  id: string;
  name: string;
  mandate: string;
  system_prompt: string;
}

interface EditMandateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onMandateUpdated: () => void;
}

export default function EditMandateDialog({
  open,
  onOpenChange,
  role,
  onMandateUpdated,
}: EditMandateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditMandateFormData>({
    resolver: zodResolver(editMandateSchema),
    defaultValues: {
      mandate: '',
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({ mandate: role.mandate });
    }
  }, [role, form]);

  const onSubmit = async (data: EditMandateFormData) => {
    if (!role) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('roles')
        .update({ mandate: data.mandate })
        .eq('id', role.id);

      if (error) throw error;

      toast.success('Mandate updated successfully');
      onOpenChange(false);
      onMandateUpdated();
    } catch (error) {
      console.error('Error updating mandate:', error);
      toast.error('Failed to update mandate');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Mandate for {role.name}</DialogTitle>
          <DialogDescription>
            Update the role's mandate. The system prompt cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="mandate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mandate</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the role's purpose in plain English..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lock className="h-4 w-4" />
                System Prompt (locked)
              </div>
              <p className="max-h-[120px] overflow-y-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {role.system_prompt}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
