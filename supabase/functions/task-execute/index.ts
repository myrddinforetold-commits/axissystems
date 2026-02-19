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
  error?: string;
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
    const isServiceRole = token === supabaseServiceKey;

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

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

    if (!axisResponse.ok) {
      const details = await axisResponse.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Axis API task execution failed", details }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const axisResult = await readAxisTaskStream(axisResponse);
    const modelOutput = axisResult.output?.trim() || "No output returned from runtime.";

    const evaluationResult: EvalResult =
      axisResult.evaluation || (axisResult.success ? "pass" : "fail");
    const evaluationReason =
      evaluationResult === "pass"
        ? "Task output accepted by runtime."
        : evaluationResult === "unclear"
        ? "Runtime returned unclear completion state."
        : "Runtime marked task as failed.";

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
      await supabaseService.from("role_messages").insert({
        role_id: taskRecord.role_id,
        company_id: taskRecord.company_id,
        sender: "ai",
        content: `✅ **Task Completed**\n\n**Task:** ${taskRecord.title}\n\n${modelOutput.substring(0, 2500)}${
          modelOutput.length > 2500 ? "\n\n(Truncated in chat; full output is in task history.)" : ""
        }`,
      });

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
