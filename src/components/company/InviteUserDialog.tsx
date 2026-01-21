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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['member', 'owner']),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onInviteSent: () => void;
}

export default function InviteUserDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onInviteSent,
}: InviteUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'member',
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { data: invitation, error } = await supabase
        .from('company_invitations')
        .insert({
          company_id: companyId,
          email: data.email.toLowerCase(),
          role: data.role,
          invited_by: user.id,
        })
        .select('token')
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This email has already been invited');
        } else {
          throw error;
        }
        return;
      }

      const link = `${window.location.origin}/invite/${invitation.token}`;
      setInviteLink(link);
      toast.success('Invitation created');
      onInviteSent();
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error('Failed to create invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    form.reset();
    setInviteLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {companyName}</DialogTitle>
          <DialogDescription>
            Invite a team member to join this company.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Share this link with <strong>{form.getValues('email')}</strong>:
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link expires in 7 days. The recipient must sign up or log in with the exact email address invited.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
              <Button onClick={() => {
                setInviteLink(null);
                form.reset();
              }}>
                Invite Another
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="colleague@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="member" id="member" />
                          <label htmlFor="member" className="text-sm cursor-pointer">
                            Member
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="owner" id="owner" />
                          <label htmlFor="owner" className="text-sm cursor-pointer">
                            Owner
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Owners can manage roles and invite other members.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
