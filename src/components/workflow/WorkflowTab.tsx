import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Activity, Clock, CheckCircle2, XCircle, Play } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isKickingOff, setIsKickingOff] = useState(false);
  
  const {
    requests,
    rolesWithStatus,
    pendingCount,
    isLoading,
    approveRequest,
    denyRequest,
  } = useWorkflowRequests({
    companyId,
    onError: (error) => toast.error(error),
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  // Find idle activated roles that could be kicked off
  const idleActivatedRoles = rolesWithStatus.filter(
    (role) => (role as any).is_activated && role.workflow_status === 'idle'
  );

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
    setIsProcessing(true);
    try {
      await approveRequest(selectedRequest.id, user.id, editedContent, notes);
      toast.success('Request approved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async (notes?: string) => {
    if (!selectedRequest || !user) return;
    setIsProcessing(true);
    try {
      await denyRequest(selectedRequest.id, user.id, notes);
      toast.success('Request denied');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deny request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickApprove = async (request: WorkflowRequest) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await approveRequest(request.id, user.id);
      toast.success('Request approved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickDeny = async (request: WorkflowRequest) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await denyRequest(request.id, user.id);
      toast.success('Request denied');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deny request');
    } finally {
      setIsProcessing(false);
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
                pendingRequests.map((request) => (
                  <WorkflowRequestCard
                    key={request.id}
                    request={request}
                    onApprove={() => handleQuickApprove(request)}
                    onDeny={() => handleQuickDeny(request)}
                    onView={() => setSelectedRequest(request)}
                    isProcessing={isProcessing}
                  />
                ))
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
        isProcessing={isProcessing}
      />
    </div>
  );
}
