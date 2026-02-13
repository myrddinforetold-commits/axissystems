import { useState, useEffect, useRef, useCallback } from "react";

export type MoltbotAgentStatus = "idle" | "thinking" | "executing" | "awaiting_approval";

interface MoltbotStatusResponse {
  status: MoltbotAgentStatus;
  last_active: string | null;
  pending_workflow: boolean;
}

interface UseMoltbotStatusOptions {
  companyId?: string;
  roleId?: string;
  active?: boolean; // true = 30s polling, false = 5min polling
}

interface UseMoltbotStatusReturn {
  status: MoltbotAgentStatus;
  lastActive: string | null;
  pendingWorkflow: boolean;
  isLoading: boolean;
}

const ACTIVE_INTERVAL = 30_000;   // 30 seconds
const PASSIVE_INTERVAL = 300_000; // 5 minutes

export function useMoltbotStatus({
  companyId,
  roleId,
  active = false,
}: UseMoltbotStatusOptions): UseMoltbotStatusReturn {
  const [status, setStatus] = useState<MoltbotAgentStatus>("idle");
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [pendingWorkflow, setPendingWorkflow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!companyId || !roleId) return;

    try {
      setIsLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moltbot-status?company_id=${companyId}&role_id=${roleId}`
      );
      if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
      const data: MoltbotStatusResponse = await res.json();
      setStatus(data.status);
      setLastActive(data.last_active);
      setPendingWorkflow(data.pending_workflow);
    } catch {
      // Graceful degradation — default to idle
      setStatus("idle");
      setLastActive(null);
      setPendingWorkflow(false);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, roleId]);

  useEffect(() => {
    if (!companyId || !roleId) return;

    fetchStatus();

    const interval = active ? ACTIVE_INTERVAL : PASSIVE_INTERVAL;
    intervalRef.current = setInterval(fetchStatus, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [companyId, roleId, active, fetchStatus]);

  return { status, lastActive, pendingWorkflow, isLoading };
}
