import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Activity, Clock, CheckCircle2, XCircle, Play, Check, X, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { useWorkflowRequests, type WorkflowRequest } from '@/hooks/useWorkflowRequests';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RoleStatusCard from './RoleStatusCard';
import WorkflowRequestCard from './WorkflowRequestCard';
import RequestReviewDialog from './RequestReviewDialog';
import SystemAlertsTab from './SystemAlertsTab';

interface WorkflowTabProps {
  companyId: string;
  onPendingCountChange?: (count: number) => void;
}

export default function WorkflowTab({ companyId, onPendingCountChange }: WorkflowTabProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isKickingOff, setIsKickingOff] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dlqCount, setDlqCount] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState('requests');
  const [activeRequestsTab, setActiveRequestsTab] = useState<'pending' | 'resolved'>(
    searchParams.get('workflowView') === 'resolved' ? 'resolved' : 'pending'
  );
  const hasAutoSelectedDefaultTab = useRef(false);
  
  const {
    requests,
    rolesWithStatus,
    pendingCount,
    isLoading,
    processingIds,
    loadAll,
    approveRequest,
    denyRequest,
    approveMultiple,
    denyMultiple,
  } = useWorkflowRequests({
    companyId,
    onError: (error) => toast.error(error),
  });

  // Load DLQ count
  const loadDlqCount = async () => {
    const { count } = await supabase
      .from('dead_letter_queue')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('resolved_at', null);
    setDlqCount(count || 0);
  };

  useEffect(() => {
    loadDlqCount();
  }, [companyId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAll();
    await loadDlqCount();
    setIsRefreshing(false);
    toast.success('Workflow updated');
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');
  const linkedRequestId = searchParams.get('request');

  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

  const idleActivatedRoles = rolesWithStatus.filter(
    (role) => (role as any).is_activated && role.workflow_status === 'idle'
  );

  useEffect(() => {
    const requestedView = searchParams.get('workflowView');
    if (requestedView === 'pending' || requestedView === 'resolved') {
      setActiveRequestsTab(requestedView);
    }
  }, [searchParams]);

  useEffect(() => {
    if (linkedRequestId && requests.length > 0) {
      const linkedRequest = requests.find((r) => r.id === linkedRequestId);
      if (!linkedRequest) return;

      const nextTab = linkedRequest.status === 'pending' ? 'pending' : 'resolved';
      if (activeRequestsTab !== nextTab) {
        setActiveRequestsTab(nextTab);
      }
      if (!selectedRequest || selectedRequest.id !== linkedRequest.id) {
        setSelectedRequest(linkedRequest);
      }
      return;
    }

    if (!hasAutoSelectedDefaultTab.current && pendingRequests.length === 0 && resolvedRequests.length > 0) {
      setActiveRequestsTab('resolved');
      hasAutoSelectedDefaultTab.current = true;
    }
  }, [
    linkedRequestId,
    requests,
    pendingRequests.length,
    resolvedRequests.length,
    activeRequestsTab,
    selectedRequest,
  ]);

  const setRequestTab = (tab: 'pending' | 'resolved', clearRequest = false) => {
    setActiveRequestsTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('workflowView', tab);
      if (clearRequest) {
        next.delete('request');
      }
      return next;
    }, { replace: true });
  };

  const handleViewRequest = (request: WorkflowRequest) => {
    setSelectedRequest(request);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('workflowView', request.status === 'pending' ? 'pending' : 'resolved');
      next.set('request', request.id);
      return next;
    }, { replace: true });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map(r => r.id)));
    }
  };

  const handleKickoffIdleRoles = async () => {
    if (idleActivatedRoles.length === 0) {
      toast.info('No idle roles to start');
      return;
    }

    setIsKickingOff(true);
    let successCount = 0;
    let errorCount = 0;

    for (const role of idleActivatedRoles) {
      try {
        await supabase.functions.invoke('role-autonomous-loop', {
          body: { role_id: role.id },
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to kickoff role ${role.name}:`, error);
        errorCount++;
      }
    }

    setIsKickingOff(false);

    if (successCount > 0) {
      toast.success(`Started ${successCount} role${successCount > 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to start ${errorCount} role${errorCount > 1 ? 's' : ''}`);
    }
  };

  const handleApprove = async (editedContent?: string, notes?: string) => {
    if (!selectedRequest || !user) return;
    try {
      await approveRequest(selectedRequest.id, user.id, editedContent, notes);
      toast.success('Request approved');
      setSelectedRequest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
    }
  };

  const handleDeny = async (notes?: string) => {
    if (!selectedRequest || !user) return;
    try {
      await denyRequest(selectedRequest.id, user.id, notes);
      toast.success('Request denied');
      setSelectedRequest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deny request');
    }
  };

  const handleQuickApprove = async (request: WorkflowRequest) => {
    if (!user) return;
    try {
      await approveRequest(request.id, user.id);
      toast.success('Request approved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
    }
  };

  const handleQuickDeny = async (request: WorkflowRequest) => {
    if (!user) return;
    try {
      await denyRequest(request.id, user.id);
      toast.success('Request denied');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deny request');
    }
  };

  const handleBatchApprove = async () => {
    if (!user || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    try {
      const { successCount, failureCount } = await approveMultiple(ids, user.id);
      if (successCount > 0) {
        toast.success(`Approved ${successCount} request${successCount > 1 ? 's' : ''}`);
      }
      if (failureCount > 0) {
        toast.error(`Failed to approve ${failureCount} request${failureCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      toast.error('Failed to approve requests');
    }
  };

  const handleBatchDeny = async () => {
    if (!user || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    try {
      const { successCount, failureCount } = await denyMultiple(ids, user.id);
      if (successCount > 0) {
        toast.success(`Denied ${successCount} request${successCount > 1 ? 's' : ''}`);
      }
      if (failureCount > 0) {
        toast.error(`Failed to deny ${failureCount} request${failureCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      toast.error('Failed to deny requests');
    }
  };

  const handleDismissOldSuggestions = async () => {
    if (!user) return;
    
    // Get suggest_next_task requests older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oldSuggestions = pendingRequests.filter(
      r => r.request_type === 'suggest_next_task' && r.created_at < oneDayAgo
    );
    
    if (oldSuggestions.length === 0) {
      toast.info('No old suggestions to dismiss');
      return;
    }
    
    const ids = oldSuggestions.map(r => r.id);
    try {
      const { successCount, failureCount } = await denyMultiple(ids, user.id);
      if (successCount > 0) {
        toast.success(`Dismissed ${successCount} old suggestion${successCount > 1 ? 's' : ''}`);
      }
      if (failureCount > 0) {
        toast.error(`Failed to dismiss ${failureCount} suggestion${failureCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      toast.error('Failed to dismiss suggestions');
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
      {/* Main Section Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="requests" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Workflow
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            System Alerts
            {dlqCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {dlqCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          {/* Role Overview Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Role Overview
              </CardTitle>
              {idleActivatedRoles.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleKickoffIdleRoles}
                  disabled={isKickingOff}
                >
                  {isKickingOff ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start Idle Roles ({idleActivatedRoles.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {rolesWithStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No roles configured. Create roles to see their workflow status.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rolesWithStatus.map((role) => (
                    <RoleStatusCard
                      key={role.id}
                      role={role}
                      companyId={companyId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Requests Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Workflow Requests
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount} pending
                  </Badge>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeRequestsTab}
                onValueChange={(value) => setRequestTab(value === 'resolved' ? 'resolved' : 'pending', true)}
              >
                <TabsList className="mb-4">
                  <TabsTrigger value="pending" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                    {pendingCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {pendingCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="resolved" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-3">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No pending requests. All caught up!
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Batch actions bar */}
                      <div className="flex items-center justify-between py-2 px-1 border-b mb-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedIds.size === pendingRequests.length && pendingRequests.length > 0}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                          <span className="text-sm text-muted-foreground">
                            {selectedIds.size > 0 
                              ? `${selectedIds.size} selected` 
                              : 'Select all'}
                          </span>
                        </div>
                        {selectedIds.size > 0 && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleBatchApprove}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve ({selectedIds.size})
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleDismissOldSuggestions}
                              className="text-muted-foreground"
                              title="Dismiss AI suggestions older than 24 hours"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Clear Old
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleBatchDeny}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Deny ({selectedIds.size})
                            </Button>
                          </div>
                        )}
                      </div>

                      {pendingRequests.map((request) => (
                        <WorkflowRequestCard
                          key={request.id}
                          request={request}
                          onApprove={() => handleQuickApprove(request)}
                          onDeny={() => handleQuickDeny(request)}
                          onView={() => handleViewRequest(request)}
                          isProcessing={processingIds.has(request.id)}
                          isSelected={selectedIds.has(request.id)}
                          onToggleSelect={() => toggleSelection(request.id)}
                        />
                      ))}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="resolved" className="space-y-3">
                  {resolvedRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No resolved requests yet.
                      </p>
                    </div>
                  ) : (
                    resolvedRequests.slice(0, 20).map((request) => (
                      <WorkflowRequestCard
                        key={request.id}
                        request={request}
                        onApprove={() => {}}
                        onDeny={() => {}}
                        onView={() => handleViewRequest(request)}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <SystemAlertsTab companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <RequestReviewDialog
        request={selectedRequest}
        companyId={companyId}
        open={!!selectedRequest}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete('request');
              return next;
            }, { replace: true });
          }
        }}
        onApprove={handleApprove}
        onDeny={handleDeny}
        isProcessing={selectedRequest ? processingIds.has(selectedRequest.id) : false}
      />
    </div>
  );
}
