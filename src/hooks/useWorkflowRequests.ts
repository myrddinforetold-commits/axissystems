import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type WorkflowRequest = Tables<'workflow_requests'> & {
  requesting_role?: { id: string; name: string; display_name: string | null };
  target_role?: { id: string; name: string; display_name: string | null } | null;
};

export type RoleWithStatus = Tables<'roles'> & {
  active_task_count: number;
  pending_request_count: number;
};

interface UseWorkflowRequestsOptions {
  companyId: string;
  onError?: (error: string) => void;
}

export function useWorkflowRequests({ companyId, onError }: UseWorkflowRequestsOptions) {
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [rolesWithStatus, setRolesWithStatus] = useState<RoleWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const loadRequests = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('workflow_requests')
        .select(`
          *,
          requesting_role:roles!workflow_requests_requesting_role_id_fkey(id, name, display_name),
          target_role:roles!workflow_requests_target_role_id_fkey(id, name, display_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setRequests(requestsData || []);
      setPendingCount(requestsData?.filter(r => r.status === 'pending').length || 0);
    } catch (err) {
      console.error('Error loading workflow requests:', err);
      onErrorRef.current?.('Failed to load workflow requests');
    }
  }, [companyId]);

  const loadRolesWithStatus = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (rolesError) throw rolesError;

      const { data: taskCounts } = await supabase
        .from('tasks')
        .select('role_id')
        .eq('company_id', companyId)
        .in('status', ['pending', 'running']);

      const { data: requestCounts } = await supabase
        .from('workflow_requests')
        .select('requesting_role_id')
        .eq('company_id', companyId)
        .eq('status', 'pending');

      const taskCountMap = new Map<string, number>();
      taskCounts?.forEach(t => {
        taskCountMap.set(t.role_id, (taskCountMap.get(t.role_id) || 0) + 1);
      });

      const requestCountMap = new Map<string, number>();
      requestCounts?.forEach(r => {
        requestCountMap.set(r.requesting_role_id, (requestCountMap.get(r.requesting_role_id) || 0) + 1);
      });

      const enrichedRoles: RoleWithStatus[] = (rolesData || []).map(role => ({
        ...role,
        active_task_count: taskCountMap.get(role.id) || 0,
        pending_request_count: requestCountMap.get(role.id) || 0,
      }));

      setRolesWithStatus(enrichedRoles);
    } catch (err) {
      console.error('Error loading roles with status:', err);
      onErrorRef.current?.('Failed to load roles');
    }
  }, [companyId]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadRequests(), loadRolesWithStatus()]);
    setIsLoading(false);
  }, [loadRequests, loadRolesWithStatus]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`workflow-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_requests',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          loadRequests();
          loadRolesWithStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roles',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          loadRolesWithStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, loadRequests, loadRolesWithStatus]);

  const approveRequest = useCallback(async (
    requestId: string, 
    reviewerId: string, 
    editedContent?: string,
    reviewNotes?: string
  ) => {
    // Optimistic update
    setRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'approved' as const } : r
    ));
    setPendingCount(prev => Math.max(0, prev - 1));
    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            request_id: requestId,
            action: 'approve',
            edited_content: editedContent,
            review_notes: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        // Handle "already processed" as a non-error - just refresh to sync state
        if (error.error === 'Request has already been processed') {
          await loadRequests();
          return { success: true, alreadyProcessed: true };
        }
        throw new Error(error.error || 'Failed to approve request');
      }

      return response.json();
    } catch (error) {
      // Rollback on error
      await loadRequests();
      throw error;
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, [loadRequests]);

  const denyRequest = useCallback(async (
    requestId: string, 
    reviewerId: string,
    reviewNotes?: string
  ) => {
    // Optimistic update
    setRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'denied' as const } : r
    ));
    setPendingCount(prev => Math.max(0, prev - 1));
    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            request_id: requestId,
            action: 'deny',
            review_notes: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        // Handle "already processed" as a non-error - just refresh to sync state
        if (error.error === 'Request has already been processed') {
          await loadRequests();
          return { success: true, alreadyProcessed: true };
        }
        throw new Error(error.error || 'Failed to deny request');
      }

      return response.json();
    } catch (error) {
      // Rollback on error
      await loadRequests();
      throw error;
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, [loadRequests]);

  const approveMultiple = useCallback(async (
    requestIds: string[],
    reviewerId: string
  ) => {
    // Optimistic update for all
    setRequests(prev => prev.map(r => 
      requestIds.includes(r.id) ? { ...r, status: 'approved' as const } : r
    ));
    setPendingCount(prev => Math.max(0, prev - requestIds.length));
    setProcessingIds(prev => {
      const next = new Set(prev);
      requestIds.forEach(id => next.add(id));
      return next;
    });

    const results = await Promise.allSettled(
      requestIds.map(async (requestId) => {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-approve`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              request_id: requestId,
              action: 'approve',
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          // Treat "already processed" as success for batch operations
          if (error.error === 'Request has already been processed') {
            return { success: true, alreadyProcessed: true };
          }
          throw new Error(error.error || 'Failed to approve request');
        }

        return response.json();
      })
    );

    setProcessingIds(prev => {
      const next = new Set(prev);
      requestIds.forEach(id => next.delete(id));
      return next;
    });

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    if (failureCount > 0) {
      await loadRequests();
    }

    return { successCount, failureCount };
  }, [loadRequests]);

  const denyMultiple = useCallback(async (
    requestIds: string[],
    reviewerId: string
  ) => {
    // Optimistic update for all
    setRequests(prev => prev.map(r => 
      requestIds.includes(r.id) ? { ...r, status: 'denied' as const } : r
    ));
    setPendingCount(prev => Math.max(0, prev - requestIds.length));
    setProcessingIds(prev => {
      const next = new Set(prev);
      requestIds.forEach(id => next.add(id));
      return next;
    });

    const results = await Promise.allSettled(
      requestIds.map(async (requestId) => {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-approve`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              request_id: requestId,
              action: 'deny',
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          // Treat "already processed" as success for batch operations
          if (error.error === 'Request has already been processed') {
            return { success: true, alreadyProcessed: true };
          }
          throw new Error(error.error || 'Failed to deny request');
        }

        return response.json();
      })
    );

    setProcessingIds(prev => {
      const next = new Set(prev);
      requestIds.forEach(id => next.delete(id));
      return next;
    });

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    if (failureCount > 0) {
      await loadRequests();
    }

    return { successCount, failureCount };
  }, [loadRequests]);

  return {
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
  };
}
