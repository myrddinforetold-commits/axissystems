import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebhookDelivery {
  id: string;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  delivered_at: string | null;
  retry_count: number;
  created_at: string;
  // deno-lint-ignore no-explicit-any
  payload: any;
}

interface WebhookDeliveriesDialogProps {
  webhookId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WebhookDeliveriesDialog({
  webhookId,
  open,
  onOpenChange,
}: WebhookDeliveriesDialogProps) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);

  useEffect(() => {
    if (webhookId && open) {
      fetchDeliveries();
    }
  }, [webhookId, open]);

  async function fetchDeliveries() {
    if (!webhookId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching deliveries:', error);
    } else {
      setDeliveries(data || []);
    }
    setLoading(false);
  }

  function getStatusBadge(delivery: WebhookDelivery) {
    if (delivery.error_message && !delivery.response_status) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    
    if (!delivery.delivered_at) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    }

    if (delivery.response_status && delivery.response_status >= 200 && delivery.response_status < 300) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {delivery.response_status}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        {delivery.response_status}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Delivery History</DialogTitle>
              <DialogDescription>
                Recent webhook delivery attempts and responses
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchDeliveries} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        {selectedDelivery ? (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDelivery(null)}
            >
              ← Back to list
            </Button>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                {getStatusBadge(selectedDelivery)}
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Request Payload</h4>
                <ScrollArea className="h-40 rounded-md border p-4">
                  <pre className="text-xs">
                    {JSON.stringify(selectedDelivery.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              {selectedDelivery.response_body && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Response Body</h4>
                  <ScrollArea className="h-32 rounded-md border p-4">
                    <pre className="text-xs">{selectedDelivery.response_body}</pre>
                  </ScrollArea>
                </div>
              )}

              {selectedDelivery.error_message && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Error</h4>
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{selectedDelivery.error_message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading deliveries...
              </div>
            ) : deliveries.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No deliveries yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>{getStatusBadge(delivery)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {(delivery.payload as { event?: string })?.event || 'unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDelivery(delivery)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
