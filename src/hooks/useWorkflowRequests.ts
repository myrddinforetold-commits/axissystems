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
  const [pendingCount, setPendingCount] = useState(0);

  // Store onError in a ref to avoid dependency issues causing infinite re-renders
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const loadRequests = useCallback(async () => {
    if (!companyId) return;

    try {
      // Fetch workflow requests with role names
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
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (rolesError) throw rolesError;

      // Fetch task counts per role
      const { data: taskCounts } = await supabase
        .from('tasks')
        .select('role_id')
        .eq('company_id', companyId)
        .in('status', ['pending', 'running']);

      // Fetch pending request counts per role
      const { data: requestCounts } = await supabase
        .from('workflow_requests')
        .select('requesting_role_id')
        .eq('company_id', companyId)
        .eq('status', 'pending');

      // Build counts maps
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
      throw new Error(error.error || 'Failed to approve request');
    }

    await loadAll();
    return response.json();
  }, [loadAll]);

  const denyRequest = useCallback(async (
    requestId: string, 
    reviewerId: string,
    reviewNotes?: string
  ) => {
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
      throw new Error(error.error || 'Failed to deny request');
    }

    await loadAll();
    return response.json();
  }, [loadAll]);

  return {
    requests,
    rolesWithStatus,
    pendingCount,
    isLoading,
    loadAll,
    approveRequest,
    denyRequest,
  };
}
