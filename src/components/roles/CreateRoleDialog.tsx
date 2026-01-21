import { useState } from 'react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const createRoleSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  mandate: z.string().trim().min(1, 'Mandate is required').max(1000, 'Mandate must be less than 1000 characters'),
  system_prompt: z.string().trim().min(1, 'System prompt is required').max(4000, 'System prompt must be less than 4000 characters'),
  authority_level: z.enum(['observer', 'advisor', 'operator', 'executive', 'orchestrator']),
  memory_scope: z.enum(['role', 'company']),
});

type CreateRoleFormData = z.infer<typeof createRoleSchema>;

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onRoleCreated: () => void;
}

export default function CreateRoleDialog({
  open,
  onOpenChange,
  companyId,
  onRoleCreated,
}: CreateRoleDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      mandate: '',
      system_prompt: '',
      authority_level: 'advisor',
      memory_scope: 'role',
    },
  });

  const onSubmit = async (data: CreateRoleFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('roles').insert({
        company_id: companyId,
        name: data.name,
        mandate: data.mandate,
        system_prompt: data.system_prompt,
        authority_level: data.authority_level,
        memory_scope: data.memory_scope,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Role created successfully');
      form.reset();
      onOpenChange(false);
      onRoleCreated();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create AI Role</DialogTitle>
          <DialogDescription>
            Define a new AI role for your company. The system prompt cannot be changed after creation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sales Assistant" {...field} />
                  </FormControl>
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
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This can be edited later.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the LLM system instructions..."
                      className="min-h-[120px] resize-none font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-destructive">
                    ⚠️ This cannot be changed after creation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authority_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authority Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select authority level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="observer">Observer - Can only watch and report</SelectItem>
                      <SelectItem value="advisor">Advisor - Can suggest actions</SelectItem>
                      <SelectItem value="operator">Operator - Can execute tasks</SelectItem>
                      <SelectItem value="executive">Executive - Full autonomy</SelectItem>
                      <SelectItem value="orchestrator">Orchestrator - Chief of Staff (read-only synthesis)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memory_scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Memory Scope</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="role" id="role" />
                        <Label htmlFor="role" className="font-normal">
                          Role only
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="company" id="company" />
                        <Label htmlFor="company" className="font-normal">
                          Company-wide
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Determines what memories this role can access.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Role'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
