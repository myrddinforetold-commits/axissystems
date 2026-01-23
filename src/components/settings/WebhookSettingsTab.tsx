import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Webhook, Plus, Trash2, TestTube, History, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import AddWebhookDialog from './AddWebhookDialog';
import WebhookDeliveriesDialog from './WebhookDeliveriesDialog';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  event_types: string[];
  is_active: boolean;
  headers: unknown;
  created_at: string;
}

interface WebhookSettingsTabProps {
  companyId: string;
}

export default function WebhookSettingsTab({ companyId }: WebhookSettingsTabProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, [companyId]);

  async function fetchWebhooks() {
    const { data, error } = await supabase
      .from('company_webhooks')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Failed to load webhooks');
    } else {
      setWebhooks(data || []);
    }
    setLoading(false);
  }

  async function handleToggleActive(webhookId: string, isActive: boolean) {
    const { error } = await supabase
      .from('company_webhooks')
      .update({ is_active: isActive })
      .eq('id', webhookId);

    if (error) {
      toast.error('Failed to update webhook');
    } else {
      setWebhooks(webhooks.map(w => 
        w.id === webhookId ? { ...w, is_active: isActive } : w
      ));
      toast.success(isActive ? 'Webhook enabled' : 'Webhook disabled');
    }
  }

  async function handleDelete(webhookId: string) {
    const { error } = await supabase
      .from('company_webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) {
      toast.error('Failed to delete webhook');
    } else {
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
      toast.success('Webhook deleted');
    }
  }

  async function handleTestWebhook(webhook: WebhookConfig) {
    setTestingWebhookId(webhook.id);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-dispatcher`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            test_webhook_id: webhook.id,
            company_id: companyId,
          }),
        }
      );

      if (response.ok) {
        toast.success('Test webhook sent! Check deliveries for response.');
      } else {
        const error = await response.json();
        toast.error(`Test failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Failed to send test webhook');
    } finally {
      setTestingWebhookId(null);
    }
  }

  function formatUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading webhooks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Integrations
              </CardTitle>
              <CardDescription>
                Connect to Zapier, Make, n8n, or custom endpoints to automate external actions
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No webhooks configured</p>
              <p className="text-sm mt-1">
                Add a webhook to receive notifications when external actions are created
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{webhook.name}</span>
                      {webhook.is_active ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {webhook.secret && (
                        <Badge variant="outline" className="text-xs">
                          Signed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate max-w-md">{formatUrl(webhook.url)}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {webhook.event_types.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedWebhookId(webhook.id)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook)}
                      disabled={testingWebhookId === webhook.id}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={(checked) => handleToggleActive(webhook.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(webhook.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Callback Endpoint</CardTitle>
          <CardDescription>
            External tools can report completion status back to Axis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            <p className="text-muted-foreground mb-2">POST to:</p>
            <code className="text-foreground">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-callback
            </code>
            <p className="text-muted-foreground mt-4 mb-2">Request body:</p>
            <pre className="text-foreground text-xs">
{`{
  "action_id": "uuid-from-payload",
  "status": "completed",
  "notes": "Email campaign sent successfully",
  "api_key": "your-webhook-secret"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <AddWebhookDialog
        companyId={companyId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          fetchWebhooks();
          setShowAddDialog(false);
        }}
      />

      <WebhookDeliveriesDialog
        webhookId={selectedWebhookId}
        open={!!selectedWebhookId}
        onOpenChange={(open) => !open && setSelectedWebhookId(null)}
      />
    </div>
  );
}
