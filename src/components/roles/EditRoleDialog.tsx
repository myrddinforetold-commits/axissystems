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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Lock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const editRoleSchema = z.object({
  display_name: z.string().trim().max(50, 'Display name must be less than 50 characters').optional(),
  mandate: z.string().trim().min(1, 'Mandate is required').max(1000, 'Mandate must be less than 1000 characters'),
});

type EditRoleFormData = z.infer<typeof editRoleSchema>;

interface Role {
  id: string;
  name: string;
  display_name?: string | null;
  mandate: string;
  system_prompt: string;
}

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onRoleUpdated: () => void;
}

export default function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onRoleUpdated,
}: EditRoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditRoleFormData>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      display_name: '',
      mandate: '',
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({
        display_name: role.display_name || '',
        mandate: role.mandate,
      });
    }
  }, [role, form]);

  const onSubmit = async (data: EditRoleFormData) => {
    if (!role) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('roles')
        .update({
          display_name: data.display_name?.trim() || null,
          mandate: data.mandate,
        })
        .eq('id', role.id);

      if (error) throw error;

      toast.success('Role updated successfully');
      onOpenChange(false);
      onRoleUpdated();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
          <DialogDescription>
            Customize the display name and mandate. System instructions cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Display Name</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          A custom name shown in the UI. The internal role name "{role.name}" remains unchanged.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <FormControl>
                    <Input
                      placeholder={role.name}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional. Leave empty to use "{role.name}".
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                <span>System Instructions</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      System instructions are locked after creation to ensure AI behavior remains consistent and predictable.
                    </p>
                  </TooltipContent>
                </Tooltip>
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
