import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AddWebhookDialogProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddWebhookDialog({
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: AddWebhookDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>(['mark_external']);
  const [saving, setSaving] = useState(false);

  const availableEvents = [
    { id: 'mark_external', label: 'External Action Created', description: 'When an output is marked for external execution' },
  ];

  function handleEventToggle(eventId: string, checked: boolean) {
    if (checked) {
      setEventTypes([...eventTypes, eventId]);
    } else {
      setEventTypes(eventTypes.filter((e) => e !== eventId));
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    if (eventTypes.length === 0) {
      toast.error('Select at least one event type');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('company_webhooks').insert({
      company_id: companyId,
      name: name.trim(),
      url: url.trim(),
      secret: secret.trim() || null,
      event_types: eventTypes,
      created_by: user?.id,
    });

    setSaving(false);

    if (error) {
      console.error('Error creating webhook:', error);
      toast.error('Failed to create webhook');
    } else {
      toast.success('Webhook created successfully');
      setName('');
      setUrl('');
      setSecret('');
      setEventTypes(['mark_external']);
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Webhook</DialogTitle>
          <DialogDescription>
            Configure an endpoint to receive notifications when actions require external execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Zapier - Email Campaigns"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Webhook URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://hooks.zapier.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret">Signing Secret (optional)</Label>
            <Input
              id="secret"
              type="password"
              placeholder="For HMAC signature verification"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If provided, payloads will include an X-Axis-Signature header
            </p>
          </div>

          <div className="space-y-3">
            <Label>Trigger Events</Label>
            {availableEvents.map((event) => (
              <div key={event.id} className="flex items-start space-x-3">
                <Checkbox
                  id={event.id}
                  checked={eventTypes.includes(event.id)}
                  onCheckedChange={(checked) => handleEventToggle(event.id, !!checked)}
                />
                <div className="space-y-1">
                  <label
                    htmlFor={event.id}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {event.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating...' : 'Create Webhook'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
