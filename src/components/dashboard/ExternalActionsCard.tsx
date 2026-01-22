import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, CheckCircle2, ExternalLink, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

interface OutputAction {
  id: string;
  task_id: string;
  action_type: string;
  action_data: {
    task_title?: string;
    output_summary?: string;
    role_name?: string;
  };
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ExternalActionsCardProps {
  companyId: string;
}

export default function ExternalActionsCard({ companyId }: ExternalActionsCardProps) {
  const { user } = useAuth();
  const [actions, setActions] = useState<OutputAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<OutputAction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadActions();
  }, [companyId]);

  const loadActions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('output_actions')
      .select('*')
      .eq('company_id', companyId)
      .in('action_type', ['mark_external', 'delegate_to_human'])
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setActions(data as unknown as OutputAction[]);
    }
    setLoading(false);
  };

  const handleMarkComplete = async (actionId: string) => {
    const { error } = await supabase
      .from('output_actions')
      .update({
        status: 'completed',
        completed_by: user?.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', actionId);

    if (error) {
      toast.error('Failed to mark action as complete');
      return;
    }

    toast.success('Action marked as complete');
    setActions(prev => prev.filter(a => a.id !== actionId));
    setDetailsOpen(false);
  };

  const handleViewDetails = (action: OutputAction) => {
    setSelectedAction(action);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-orange-500" />
            External Actions Required
            <Badge variant="secondary" className="ml-auto">
              {actions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {action.action_data?.task_title || 'External Action'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {action.action_data?.role_name && `From ${action.action_data.role_name} • `}
                      {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(action)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkComplete(action.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              {selectedAction?.action_data?.task_title || 'External Action'}
            </DialogTitle>
            <DialogDescription>
              This action requires execution outside the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedAction?.action_data?.role_name && (
              <div>
                <p className="text-xs text-muted-foreground">From Role</p>
                <p className="text-sm font-medium">{selectedAction.action_data.role_name}</p>
              </div>
            )}

            {selectedAction?.action_data?.output_summary && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Output Summary</p>
                <div className="rounded-md border bg-muted/50 p-3 max-h-48 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{selectedAction.action_data.output_summary}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {selectedAction?.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">{selectedAction.notes}</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Created {selectedAction && formatDistanceToNow(new Date(selectedAction.created_at), { addSuffix: true })}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => selectedAction && handleMarkComplete(selectedAction.id)}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Mark Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
