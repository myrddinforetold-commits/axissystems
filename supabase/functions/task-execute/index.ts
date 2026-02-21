import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AXIS_API_URL = Deno.env.get("AXIS_API_URL");
const AXIS_API_SECRET = Deno.env.get("AXIS_API_SECRET");

type EvalResult = "pass" | "fail" | "unclear";

interface TaskRecord {
  id: string;
  company_id: string;
  role_id: string;
  title: string;
  description: string;
  completion_criteria: string;
  status: string;
  max_attempts: number;
  current_attempt: number;
}

interface AxisTaskResult {
  output: string;
  evaluation: EvalResult;
  success: boolean;
  evaluationReason?: string;
  error?: string;
}

interface RoleInfo {
  id: string;
  name: string;
  display_name: string | null;
  authority_level: "observer" | "advisor" | "operator" | "executive" | "orchestrator";
}

function isLegacyServiceRoleJwt(token: string): boolean {
  try {
    const segments = token.split(".");
    if (segments.length !== 3) return false;
    const payloadBase64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

function isGovernanceRole(role: RoleInfo | null): boolean {
  if (!role) return false;
  const roleName = `${role.display_name || ""} ${role.name || ""}`.toLowerCase();
  if (role.authority_level === "executive" || role.authority_level === "orchestrator") return true;
  return roleName.includes("ceo") || roleName.includes("chief of staff");
}

async function findGovernanceReviewer(
  supabaseService: ReturnType<typeof createClient>,
  companyId: string,
  requestingRoleId: string
): Promise<RoleInfo | null> {
  const { data: roles } = await supabaseService
    .from("roles")
    .select("id, name, display_name, authority_level, created_at")
    .eq("company_id", companyId);

  if (!roles?.length) return null;

  const scored = (roles as Array<RoleInfo & { created_at: string }>)
    .filter((role) => role.id !== requestingRoleId)
    .map((role) => {
      const name = `${role.display_name || ""} ${role.name}`.toLowerCase();
      let score = 0;
      if (name.includes("ceo")) score = 100;
      else if (name.includes("chief executive officer")) score = 95;
      else if (name.includes("chief of staff")) score = 90;
      else if (role.authority_level === "executive") score = 80;
      else if (role.authority_level === "orchestrator") score = 70;
      return { role, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.role.created_at).getTime() - new Date(b.role.created_at).getTime();
    });

  const best = scored[0];
  if (!best || best.score <= 0) return null;
  return {
    id: best.role.id,
    name: best.role.name,
    display_name: best.role.display_name,
    authority_level: best.role.authority_level,
  };
}

async function autoApproveWorkflowRequest(
  supabaseUrl: string,
  supabaseServiceKey: string,
  requestId: string
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/workflow-approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        request_id: requestId,
        action: "approve",
        review_notes: "Auto-approved by internal governance routing policy.",
      }),
    });
  } catch (error) {
    console.error("Failed to auto-approve governance routing memo:", error);
  }
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "their", "into", "about", "after",
  "before", "while", "where", "when", "what", "which", "must", "should", "could", "would", "have",
  "has", "had", "are", "was", "were", "been", "being", "will", "can", "not", "but", "or", "if",
  "then", "than", "also", "each", "only", "using", "based", "include", "includes", "including"
]);

function extractKeywords(text: string): string[] {
  const tokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));

  return Array.from(new Set(tokens)).slice(0, 24);
}

function evaluateOutputAgainstTask(
  task: TaskRecord,
  output: string,
  runtimeEvaluation: EvalResult,
  runtimeReason?: string
): { result: EvalResult; reason: string } {
  const text = String(output || "").trim();
  const lower = text.toLowerCase();
  const runtimePrefix = runtimeReason
    ? `Runtime check: ${runtimeReason}`
    : `Runtime evaluation: ${runtimeEvaluation}.`;

  if (!text) {
    return { result: "fail", reason: `${runtimePrefix} No output returned.` };
  }

  if (runtimeEvaluation === "fail") {
    return { result: "fail", reason: `${runtimePrefix} Runtime marked task as failed.` };
  }

  const pointerOnlyPattern =
    /(task already complete|deliverable verified at|see (the )?(file|doc)|\bverified at\b|\.md\b|file path)/i;
  const looksLikePointerOnly = pointerOnlyPattern.test(lower) && text.length < 1200;
  if (looksLikePointerOnly) {
    return {
      result: "fail",
      reason: `${runtimePrefix} Output references external files instead of providing full inline deliverable.`
    };
  }

  const requestedComplexity = (task.description?.length || 0) + (task.completion_criteria?.length || 0);
  const minLength = requestedComplexity > 220 ? 320 : 180;
  const hasCompletionCheck = /completion check/i.test(lower);
  const sectionCount = (text.match(/^##\s+/gm) || []).length;
  const bulletCount = (text.match(/^\s*[-*]\s+/gm) || []).length;
  const hasStructure = sectionCount >= 2 || bulletCount >= 4;

  const keywords = extractKeywords(`${task.description || ""} ${task.completion_criteria || ""}`);
  const keywordHits = keywords.filter((k) => lower.includes(k)).length;
  const coverage = keywords.length > 0 ? keywordHits / keywords.length : 1;

  if (text.length < 120) {
    return { result: "fail", reason: `${runtimePrefix} Output too short for requested task scope.` };
  }

  if (coverage < 0.22) {
    return { result: "fail", reason: `${runtimePrefix} Low completion-criteria keyword coverage.` };
  }

  if (runtimeEvaluation === "unclear") {
    return { result: "unclear", reason: `${runtimePrefix} Runtime returned unclear completion state.` };
  }

  if (text.length < minLength || !hasCompletionCheck || !hasStructure || coverage < 0.42) {
    return {
      result: "unclear",
      reason: `${runtimePrefix} Output exists but needs stronger structure/criteria coverage before completion.`
    };
  }

  return {
    result: "pass",
    reason: `${runtimePrefix} Quality gate passed for structure and completion-criteria coverage.`
  };
}

async function readAxisTaskStream(response: Response): Promise<AxisTaskResult> {
  if (!response.body) {
    throw new Error("Axis API returned no response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];

  let output = "";
  let evaluation: EvalResult = "unclear";
  let success = false;
  let evaluationReason: string | undefined;

  const flushEvent = () => {
    if (!eventName && dataLines.length === 0) return;

    const payloadText = dataLines.join("\n").trim();
    dataLines = [];

    if (!payloadText) {
      eventName = "";
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      eventName = "";
      return;
    }

    if (eventName === "output") {
      if (typeof payload?.chunk === "string") {
        output += payload.chunk;
      }
    } else if (eventName === "done") {
      if (typeof payload?.output === "string" && payload.output.length > 0) {
        output = payload.output;
      }
      if (typeof payload?.evaluation_reason === "string" && payload.evaluation_reason.length > 0) {
        evaluationReason = payload.evaluation_reason;
      }
      if (payload?.evaluation === "pass" || payload?.evaluation === "fail" || payload?.evaluation === "unclear") {
        evaluation = payload.evaluation;
      } else if (payload?.success === true) {
        evaluation = "pass";
      } else if (payload?.success === false) {
        evaluation = "fail";
      }
      success = payload?.success === true || evaluation === "pass";
    } else if (eventName === "error") {
      throw new Error(payload?.error || "Axis task stream error");
    }

    eventName = "";
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);

        if (line === "") {
          flushEvent();
        } else if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }

        newlineIndex = buffer.indexOf("\n");
      }
    }

    buffer += decoder.decode();
    if (buffer.length > 0) {
      const trailing = buffer.split(/\r?\n/);
      for (const rawLine of trailing) {
        if (rawLine.startsWith("event:")) {
          eventName = rawLine.slice(6).trim();
        } else if (rawLine.startsWith("data:")) {
          dataLines.push(rawLine.slice(5).trimStart());
        }
      }
    }

    flushEvent();

    return {
      output,
      evaluation,
      success,
      evaluationReason,
    };
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancellation errors
    }
  }
}

serve(async (req) => {
  let requestTaskId: string | null = null;
  let supabaseServiceForCatch: ReturnType<typeof createClient> | null = null;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!AXIS_API_URL || !AXIS_API_SECRET) {
      return new Response(
        JSON.stringify({ error: "AXIS_API_URL / AXIS_API_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { task_id } = await req.json();
    requestTaskId = task_id ?? null;

    if (!task_id) {
      return new Response(
        JSON.stringify({ error: "task_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey || isLegacyServiceRoleJwt(token);

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    supabaseServiceForCatch = supabaseService;

    let supabaseClient;
    if (isServiceRole) {
      supabaseClient = supabaseService;
    } else {
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: userData, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Invalid authorization" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      supabaseClient = supabaseUser;
    }

    const { data: task, error: taskError } = await supabaseClient
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: "Task not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskRecord = task as TaskRecord;

    if (taskRecord.status === "completed" || taskRecord.status === "stopped") {
      return new Response(
        JSON.stringify({ error: `Task is already ${taskRecord.status}`, task: taskRecord }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (taskRecord.current_attempt >= taskRecord.max_attempts) {
      await supabaseService
        .from("tasks")
        .update({ status: "blocked" })
        .eq("id", task_id);

      return new Response(
        JSON.stringify({ error: "Max attempts reached", task: { ...taskRecord, status: "blocked" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (taskRecord.status === "pending") {
      await supabaseService
        .from("tasks")
        .update({ status: "running" })
        .eq("id", task_id);
    }

    const attemptNumber = taskRecord.current_attempt + 1;

    const axisResponse = await fetch(`${AXIS_API_URL}/api/v1/task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AXIS_API_SECRET}`,
      },
      body: JSON.stringify({
        company_id: taskRecord.company_id,
        role_id: taskRecord.role_id,
        task: {
          id: taskRecord.id,
          title: taskRecord.title,
          description: taskRecord.description,
          completion_criteria: taskRecord.completion_criteria,
        },
      }),
    });

    let axisResult: AxisTaskResult;
    if (!axisResponse.ok) {
      const details = await axisResponse.text().catch(() => "");
      axisResult = {
        output: details || "Axis API task execution failed before output was produced.",
        evaluation: "fail",
        success: false,
        error: "Axis API task execution failed",
      };
    } else {
      try {
        axisResult = await readAxisTaskStream(axisResponse);
      } catch (streamError) {
        axisResult = {
          output: `Task stream error: ${
            streamError instanceof Error ? streamError.message : "Unknown stream error"
          }`,
          evaluation: "fail",
          success: false,
          error: "Axis API stream failed",
        };
      }
    }
    const modelOutput = axisResult.output?.trim() || "No output returned from runtime.";

    const runtimeEvaluation: EvalResult =
      axisResult.evaluation || (axisResult.success ? "pass" : "fail");
    const scoredEvaluation = evaluateOutputAgainstTask(
      taskRecord,
      modelOutput,
      runtimeEvaluation,
      axisResult.evaluationReason
    );
    const evaluationResult: EvalResult = scoredEvaluation.result;
    const evaluationReason = scoredEvaluation.reason;

    await supabaseService.from("task_attempts").insert({
      task_id,
      attempt_number: attemptNumber,
      model_output: modelOutput,
      evaluation_result: evaluationResult,
      evaluation_reason: evaluationReason,
    });

    const implementationKeywords = [
      "implement",
      "create table",
      "deploy",
      "migration",
      "send email",
      "crm",
      "integrate",
      "build feature",
      "configure server",
    ];
    const requiresVerification = implementationKeywords.some(
      (keyword) =>
        taskRecord.title.toLowerCase().includes(keyword) ||
        taskRecord.description.toLowerCase().includes(keyword)
    );

    let newStatus = taskRecord.status;
    let completionSummary: string | null = null;

    if (evaluationResult === "pass") {
      newStatus = "completed";
      completionSummary = `Completed via Axis API/Kimi on attempt ${attemptNumber}.`;
    } else if (evaluationResult === "unclear") {
      newStatus = "blocked";
    } else if (attemptNumber >= taskRecord.max_attempts) {
      newStatus = "system_alert";

      await supabaseService.from("dead_letter_queue").insert({
        task_id,
        role_id: taskRecord.role_id,
        company_id: taskRecord.company_id,
        failure_reason: evaluationReason,
        attempts_made: attemptNumber,
        last_output: modelOutput.substring(0, 10000),
      });
    }

    await supabaseService
      .from("tasks")
      .update({
        status: newStatus,
        current_attempt: attemptNumber,
        completion_summary: completionSummary,
        requires_verification: requiresVerification,
      })
      .eq("id", task_id);

    const { data: updatedTask } = await supabaseService
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (newStatus === "completed") {
      const { data: taskRole } = await supabaseService
        .from("roles")
        .select("id, name, display_name, authority_level")
        .eq("id", taskRecord.role_id)
        .maybeSingle();
      const currentRole = (taskRole as RoleInfo | null) || null;
      const roleIsGovernance = isGovernanceRole(currentRole);

      await supabaseService.from("role_messages").insert({
        role_id: taskRecord.role_id,
        company_id: taskRecord.company_id,
        sender: "ai",
        content: `✅ **Task Completed**\n\n**Task:** ${taskRecord.title}\n\n${modelOutput.substring(0, 2500)}${
          modelOutput.length > 2500 ? "\n\n(Truncated in chat; full output is in task history.)" : ""
        }`,
      });

      if (roleIsGovernance) {
        await supabaseService.from("workflow_requests").insert({
          company_id: taskRecord.company_id,
          requesting_role_id: taskRecord.role_id,
          request_type: "review_output",
          summary: `Review output: ${taskRecord.title}`,
          proposed_content: JSON.stringify({
            task_id: taskRecord.id,
            task_title: taskRecord.title,
            task_description: taskRecord.description,
            completion_criteria: taskRecord.completion_criteria,
            output: modelOutput,
            attempts: attemptNumber,
            completion_summary: completionSummary,
          }),
          source_task_id: taskRecord.id,
        });
      } else {
        const reviewerRole = await findGovernanceReviewer(
          supabaseService,
          taskRecord.company_id,
          taskRecord.role_id
        );

        if (reviewerRole) {
          const completionMemo = `Execution output ready for approval from ${currentRole?.display_name || currentRole?.name || "Role"}.\n\n` +
            `Task: ${taskRecord.title}\n` +
            `Summary: ${completionSummary || "Completed successfully."}\n\n` +
            `Output preview:\n${modelOutput.slice(0, 1800)}${modelOutput.length > 1800 ? "\n\n(Truncated preview)" : ""}\n\n` +
            `Please decide objective completion and next assignment.`;

          const { data: wfRequest } = await supabaseService
            .from("workflow_requests")
            .insert({
              company_id: taskRecord.company_id,
              requesting_role_id: taskRecord.role_id,
              target_role_id: reviewerRole.id,
              request_type: "send_memo",
              summary: `Execution completion review: ${taskRecord.title}`,
              proposed_content: completionMemo,
              source_task_id: taskRecord.id,
            })
            .select("id")
            .single();

          if (wfRequest?.id) {
            const runAutoApprove = autoApproveWorkflowRequest(supabaseUrl, supabaseServiceKey, wfRequest.id);
            (globalThis as any).EdgeRuntime?.waitUntil?.(runAutoApprove) ?? runAutoApprove;
          }

          await supabaseService.from("role_messages").insert({
            role_id: taskRecord.role_id,
            company_id: taskRecord.company_id,
            sender: "ai",
            content: `📬 **Completion Routed to Governance**\n\nTask output was sent to ${reviewerRole.display_name || reviewerRole.name} for objective/next-step approval.`,
          });
        }
      }

      if (roleIsGovernance) {
        // If this governance task was triggered from an incoming memo, queue completion memo back
        // to originating role so they can continue their loop with executive/orchestrator direction.
        const { data: originMemo } = await supabaseService
          .from("role_memos")
          .select("from_role_id, created_at")
          .eq("company_id", taskRecord.company_id)
          .eq("to_role_id", taskRecord.role_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (originMemo?.from_role_id && originMemo.from_role_id !== taskRecord.role_id) {
          const completionMemo = `Task completed: ${taskRecord.title}

Completion summary: ${completionSummary || "Completed successfully."}

Key output:
${modelOutput.slice(0, 1800)}${modelOutput.length > 1800 ? "\n\n(Truncated preview; full output is in task history.)" : ""}

Recommended next action:
- Review this output and set/approve the next objective milestone.`;

          await supabaseService.from("workflow_requests").insert({
            company_id: taskRecord.company_id,
            requesting_role_id: taskRecord.role_id,
            target_role_id: originMemo.from_role_id,
            request_type: "send_memo",
            summary: `Completion update: ${taskRecord.title}`,
            proposed_content: completionMemo,
            source_task_id: taskRecord.id,
          });

          await supabaseService.from("role_messages").insert({
            role_id: originMemo.from_role_id,
            company_id: taskRecord.company_id,
            sender: "ai",
            content: `📣 **Completion Update Available**\n\n${taskRecord.title} was completed. A memo draft to this role is now in Workflow for approval.`,
          });
        }
      }
    } else if (newStatus === "blocked") {
      await supabaseService.from("role_messages").insert({
        role_id: taskRecord.role_id,
        company_id: taskRecord.company_id,
        sender: "ai",
        content: `⚠️ **Task Blocked**\n\n**Task:** ${taskRecord.title}\n\nReason: ${evaluationReason}`,
      });
    } else if (newStatus === "system_alert") {
      await supabaseService.from("role_messages").insert({
        role_id: taskRecord.role_id,
        company_id: taskRecord.company_id,
        sender: "ai",
        content: `🚨 **Task Failed - Dead Letter Queue**\n\n**Task:** ${taskRecord.title}\n\nReason: ${evaluationReason}`,
      });
    }

    const shouldRetry = evaluationResult === "fail" && attemptNumber < taskRecord.max_attempts;

    if (shouldRetry) {
      const continueExecution = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await fetch(`${supabaseUrl}/functions/v1/task-execute`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ task_id }),
          });
        } catch (err) {
          console.error("Failed to continue task execution:", err);
        }
      };

      (globalThis as any).EdgeRuntime?.waitUntil?.(continueExecution()) ?? continueExecution();
    }

    return new Response(
      JSON.stringify({
        task: updatedTask,
        attempt: {
          attempt_number: attemptNumber,
          model_output: modelOutput,
          evaluation_result: evaluationResult,
          evaluation_reason: evaluationReason,
        },
        should_retry: shouldRetry,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Task execution error:", error);

    if (requestTaskId && supabaseServiceForCatch) {
      try {
        await supabaseServiceForCatch
          .from("tasks")
          .update({ status: "blocked" })
          .eq("id", requestTaskId)
          .eq("status", "running");
      } catch (stateErr) {
        console.error("Failed to mark task blocked after execution error:", stateErr);
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
