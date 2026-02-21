import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface CallbackArtifactInput {
  filename?: string;
  content?: string;
  base64?: string;
  mime_type?: string;
  mimeType?: string;
  encoding?: string;
  external_url?: string;
  externalUrl?: string;
}

interface PersistedArtifact {
  filename: string;
  mime_type: string;
  size_bytes?: number;
  storage_path?: string;
  external_url?: string;
}

function sanitizeFilename(input?: string): string {
  const fallback = `artifact-${Date.now()}.md`;
  const value = String(input || "").trim();
  if (!value) return fallback;
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120) || fallback;
}

function decodeBase64(base64Input: string): Uint8Array {
  const normalized = String(base64Input || "")
    .replace(/^data:[^;]+;base64,/, "")
    .replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeArtifacts(body: Record<string, unknown>): CallbackArtifactInput[] {
  const rawArtifacts = Array.isArray(body.artifacts)
    ? (body.artifacts as CallbackArtifactInput[])
    : body.artifact
      ? [body.artifact as CallbackArtifactInput]
      : [];

  const legacyHasInline = typeof body.artifact_content === "string" || typeof body.artifact_base64 === "string";
  if (legacyHasInline) {
    rawArtifacts.push({
      filename: (body.artifact_filename as string) || "external-output.md",
      content: body.artifact_content as string | undefined,
      base64: body.artifact_base64 as string | undefined,
      mime_type: (body.artifact_mime_type as string) || "text/markdown",
      encoding: typeof body.artifact_base64 === "string" ? "base64" : "text",
      external_url: body.artifact_url as string | undefined,
    });
  }

  return rawArtifacts;
}

async function persistArtifacts(params: {
  supabase: ReturnType<typeof createClient>;
  companyId: string;
  taskId?: string | null;
  artifacts: CallbackArtifactInput[];
}): Promise<PersistedArtifact[]> {
  const { supabase, companyId, taskId, artifacts } = params;
  const persisted: PersistedArtifact[] = [];

  for (const artifact of artifacts) {
    const filename = sanitizeFilename(artifact.filename);
    const mimeType = artifact.mime_type || artifact.mimeType || "application/octet-stream";
    const externalUrl = artifact.external_url || artifact.externalUrl;

    if (externalUrl && !artifact.content && !artifact.base64) {
      persisted.push({
        filename,
        mime_type: mimeType,
        external_url: String(externalUrl),
      });
      continue;
    }

    const hasBase64 = typeof artifact.base64 === "string" && artifact.base64.trim().length > 0;
    const hasContent = typeof artifact.content === "string" && artifact.content.length > 0;
    if (!hasBase64 && !hasContent) continue;

    let bodyBytes: Uint8Array;
    if (hasBase64 || artifact.encoding === "base64") {
      bodyBytes = decodeBase64(String(artifact.base64 || artifact.content || ""));
    } else {
      bodyBytes = new TextEncoder().encode(String(artifact.content || ""));
    }

    const prefix = `${companyId}/${taskId || "unlinked"}`;
    const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${filename}`;
    const storagePath = `${prefix}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from("artifacts")
      .upload(storagePath, bodyBytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload artifact:", uploadError);
      continue;
    }

    persisted.push({
      filename,
      mime_type: mimeType,
      size_bytes: bodyBytes.byteLength,
      storage_path: storagePath,
    });
  }

  return persisted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      action_id,
      status,
      notes,
      api_key,
      result_output,
      output,
    } = body;

    if (!action_id) {
      return new Response(
        JSON.stringify({ error: "action_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the output action to get the company_id
    const { data: action, error: actionError } = await supabase
      .from("output_actions")
      .select("id, company_id, status, task_id, action_data")
      .eq("id", action_id)
      .single();

    if (actionError || !action) {
      return new Response(
        JSON.stringify({ error: "Output action not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require and verify API key against active webhook secrets for this company.
    const providedApiKey = typeof api_key === "string" ? api_key.trim() : "";
    if (!providedApiKey) {
      return new Response(
        JSON.stringify({ error: "api_key is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: webhooks } = await supabase
      .from("company_webhooks")
      .select("secret")
      .eq("company_id", action.company_id)
      .eq("is_active", true)
      .not("secret", "is", null);

    const validSecret = webhooks?.some((w) => (w.secret || "").trim() === providedApiKey);
    if (!validSecret) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate status
    const validStatuses = ["pending", "completed", "failed"];
    const newStatus = status || "completed";
    if (!validStatuses.includes(newStatus)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the output action
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    const incomingArtifacts = normalizeArtifacts(body as Record<string, unknown>);
    const persistedArtifacts = await persistArtifacts({
      supabase,
      companyId: action.company_id,
      taskId: action.task_id,
      artifacts: incomingArtifacts,
    });

    const actionDataExisting =
      action.action_data && typeof action.action_data === "object" ? action.action_data : {};
    if (persistedArtifacts.length > 0) {
      updateData.action_data = {
        ...(actionDataExisting as Record<string, unknown>),
        artifacts: persistedArtifacts,
        artifact_count: persistedArtifacts.length,
        artifact_storage_bucket: "artifacts",
        artifact_uploaded_at: new Date().toISOString(),
      };
    }

    if (notes) {
      updateData.notes = notes;
    }

    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("output_actions")
      .update(updateData)
      .eq("id", action_id);

    if (updateError) {
      console.error("Failed to update output action:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update action" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If external executor completed successfully, also complete the linked task and push output back into workflow.
    if (newStatus === "completed" && action.task_id) {
      const artifactList = persistedArtifacts
        .map((artifact) => `- ${artifact.filename}${artifact.storage_path ? ` (stored)` : artifact.external_url ? ` (external URL)` : ""}`)
        .join("\n");
      const fallbackOutput = artifactList
        ? `External executor completed. Artifact(s):\n${artifactList}`
        : "Completed externally via webhook callback.";
      const externalOutput = String(result_output || output || notes || fallbackOutput);

      const { data: task } = await supabase
        .from("tasks")
        .select("id, company_id, role_id, title, description, completion_criteria, current_attempt, status")
        .eq("id", action.task_id)
        .maybeSingle();

      if (task && task.status !== "completed") {
        const nextAttempt = (task.current_attempt || 0) + 1;

        await supabase.from("task_attempts").insert({
          task_id: task.id,
          attempt_number: nextAttempt,
          model_output: externalOutput,
          evaluation_result: "pass",
          evaluation_reason: "Completed by external executor via webhook callback",
        });

        await supabase
          .from("tasks")
          .update({
            status: "completed",
            current_attempt: nextAttempt,
            completion_summary: "Completed externally via webhook callback.",
            requires_verification: true,
          })
          .eq("id", task.id);

        await supabase.from("role_messages").insert({
          role_id: task.role_id,
          company_id: task.company_id,
          sender: "ai",
          content: `✅ **Task Completed (External Executor)**\n\n**Task:** ${task.title}\n\n${externalOutput.slice(0, 2500)}${externalOutput.length > 2500 ? "\n\n(Truncated in chat; full output is in task history.)" : ""}${persistedArtifacts.length > 0 ? `\n\n📎 ${persistedArtifacts.length} artifact(s) attached in Outputs Library.` : ""}`,
        });

        await supabase.from("workflow_requests").insert({
          company_id: task.company_id,
          requesting_role_id: task.role_id,
          request_type: "review_output",
          summary: `Review output: ${task.title}`,
          proposed_content: JSON.stringify({
            task_id: task.id,
            task_title: task.title,
            task_description: task.description,
            completion_criteria: task.completion_criteria,
            output: externalOutput,
            attempts: nextAttempt,
            completion_summary: "Completed externally via webhook callback.",
            artifacts: persistedArtifacts,
          }),
          source_task_id: task.id,
        });
      }
    }

    console.log(`Output action ${action_id} updated to status: ${newStatus}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action_id,
        status: newStatus,
        message: `Action status updated to ${newStatus}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook callback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
