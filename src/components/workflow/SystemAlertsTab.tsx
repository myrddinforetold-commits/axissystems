import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Loader2, Eye, Archive, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface DLQEntry {
  id: string;
  task_id: string;
  role_id: string;
  company_id: string;
  failure_reason: string;
  attempts_made: number;
  last_output: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  task?: {
    title: string;
    description: string;
    completion_criteria: string;
  };
  role?: {
    name: string;
    display_name: string | null;
  };
}

interface SystemAlertsTabProps {
  companyId: string;
}

export default function SystemAlertsTab({ companyId }: SystemAlertsTabProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DLQEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DLQEntry | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dead_letter_queue')
        .select(`
          *,
          task:tasks(title, description, completion_criteria),
          role:roles(name, display_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries((data as DLQEntry[]) || []);
    } catch (error) {
      console.error('Failed to load DLQ entries:', error);
      toast.error('Failed to load system alerts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [companyId]);

  const unresolvedEntries = entries.filter(e => !e.resolved_at);
  const resolvedEntries = entries.filter(e => e.resolved_at);

  const handleResolve = async (action: 'archive' | 'retry') => {
    if (!selectedEntry || !user) return;
    
    setIsResolving(true);
    try {
      // Update DLQ entry as resolved
      const { error: dlqError } = await supabase
        .from('dead_letter_queue')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: resolutionNotes || (action === 'archive' ? 'Archived by operator' : 'Marked for retry'),
        })
        .eq('id', selectedEntry.id);

      if (dlqError) throw dlqError;

      // Update task status based on action
      if (action === 'archive') {
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ status: 'archived' })
          .eq('id', selectedEntry.task_id);
        
        if (taskError) throw taskError;
        toast.success('Task archived successfully');
      } else {
        // Reset task for retry
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ 
            status: 'pending',
            current_attempt: 0,
          })
          .eq('id', selectedEntry.task_id);
        
        if (taskError) throw taskError;
        toast.success('Task reset for retry');
      }

      setSelectedEntry(null);
      setResolutionNotes('');
      loadEntries();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast.error('Failed to resolve alert');
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            System Alerts (Dead Letter Queue)
            {unresolvedEntries.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unresolvedEntries.length} unresolved
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadEntries}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {unresolvedEntries.length === 0 && !showResolved ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No system alerts. All tasks running smoothly!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {unresolvedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between p-4 border rounded-lg bg-destructive/5 border-destructive/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <span className="font-medium truncate">
                        {entry.task?.title || 'Unknown Task'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {entry.role?.display_name || entry.role?.name || 'Unknown Role'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {entry.failure_reason}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{entry.attempts_made} attempts</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Toggle for resolved entries */}
          {resolvedEntries.length > 0 && (
            <div className="mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
                className="text-muted-foreground"
              >
                {showResolved ? 'Hide' : 'Show'} resolved ({resolvedEntries.length})
              </Button>
              
              {showResolved && (
                <div className="space-y-3 mt-3">
                  {resolvedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between p-4 border rounded-lg opacity-60"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium truncate">
                            {entry.task?.title || 'Unknown Task'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.resolution_notes || 'Resolved'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Review Failed Task
            </DialogTitle>
          </DialogHeader>
          
          {selectedEntry && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Task</h4>
                  <p className="text-sm">{selectedEntry.task?.title}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedEntry.task?.description}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Completion Criteria</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedEntry.task?.completion_criteria}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1 text-destructive">Failure Reason</h4>
                  <p className="text-sm bg-destructive/10 p-3 rounded border border-destructive/20">
                    {selectedEntry.failure_reason}
                  </p>
                </div>
                
                {selectedEntry.last_output && (
                  <div>
                    <h4 className="font-medium mb-1">Last Output</h4>
                    <ScrollArea className="h-48 border rounded p-3">
                      <pre className="text-xs whitespace-pre-wrap">
                        {selectedEntry.last_output}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium mb-1">Resolution Notes (optional)</h4>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about how this was resolved..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleResolve('retry')}
              disabled={isResolving}
            >
              {isResolving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reset & Retry
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleResolve('archive')}
              disabled={isResolving}
            >
              {isResolving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Archive Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
