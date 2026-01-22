import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Activity, Clock, CheckCircle2, XCircle, Play, Check, X } from 'lucide-react';
import { useWorkflowRequests, type WorkflowRequest } from '@/hooks/useWorkflowRequests';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RoleStatusCard from './RoleStatusCard';
import WorkflowRequestCard from './WorkflowRequestCard';
import RequestReviewDialog from './RequestReviewDialog';

interface WorkflowTabProps {
  companyId: string;
}

export default function WorkflowTab({ companyId }: WorkflowTabProps) {
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isKickingOff, setIsKickingOff] = useState(false);
  
  const {
    requests,
    rolesWithStatus,
    pendingCount,
    isLoading,
    processingIds,
    approveRequest,
    denyRequest,
    approveMultiple,
    denyMultiple,
  } = useWorkflowRequests({
    companyId,
    onError: (error) => toast.error(error),
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  const idleActivatedRoles = rolesWithStatus.filter(
    (role) => (role as any).is_activated && role.workflow_status === 'idle'
  );

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Workflow Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
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
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve ({selectedIds.size})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBatchDeny}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                      onView={() => setSelectedRequest(request)}
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
                    onView={() => setSelectedRequest(request)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <RequestReviewDialog
        request={selectedRequest}
        companyId={companyId}
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        onApprove={handleApprove}
        onDeny={handleDeny}
        isProcessing={selectedRequest ? processingIds.has(selectedRequest.id) : false}
      />
    </div>
  );
}
