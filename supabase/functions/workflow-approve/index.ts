import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApproveRequest {
  request_id: string;
  action: "approve" | "deny";
  edited_content?: string;
  review_notes?: string;
}

type ExecutionLane = "development" | "marketing" | "research";

const EXECUTION_LANE_KEYWORDS: Record<ExecutionLane, string[]> = {
  development: [
    "development",
    "engineering",
    "build",
    "code",
    "api",
    "backend",
    "frontend",
    "implementation",
    "mvp",
    "deploy",
    "sprint",
  ],
  marketing: [
    "marketing",
    "go-to-market",
    "gtm",
    "campaign",
    "content",
    "brand",
    "growth",
    "acquisition",
    "linkedin",
    "email",
    "ads",
    "seo",
  ],
  research: [
    "research",
    "analysis",
    "benchmark",
    "competitor",
    "market map",
    "interviews",
    "discovery",
    "validation",
    "report",
    "insights",
  ],
};

function inferExecutionLane(text: string): ExecutionLane {
  const normalized = String(text || "").toLowerCase();
  const scores: Record<ExecutionLane, number> = {
    development: 0,
    marketing: 0,
    research: 0,
  };

  (Object.keys(EXECUTION_LANE_KEYWORDS) as ExecutionLane[]).forEach((lane) => {
    EXECUTION_LANE_KEYWORDS[lane].forEach((keyword) => {
      if (normalized.includes(keyword)) scores[lane] += 1;
    });
  });

  if (scores.development >= scores.marketing && scores.development >= scores.research) {
    return "development";
  }
  if (scores.marketing >= scores.research) return "marketing";
  return "research";
}

function getExecutionRoleSpec(lane: ExecutionLane): {
  name: string;
  mandate: string;
  system_prompt: string;
  authority_level: "operator" | "advisor";
} {
  if (lane === "development") {
    return {
      name: "Development",
      mandate: "Execute product development work and ship technical deliverables through external execution tooling.",
      authority_level: "operator",
      system_prompt: `You are the Development execution role.

Primary responsibility:
- Convert approved plans into technical execution specs.
- Delegate implementation tasks through external executor workflows.
- Keep delivery structured, testable, and production-aware.

Execution policy:
- You do not claim code is deployed unless external callbacks confirm completion.
- For implementation tasks, prefer external executors (Codex or Claude Code) via webhook workflows.
- When blocked by missing integrations, immediately surface precise setup requirements for owners.

Always include:
1. Scope
2. Deliverables
3. Dependencies
4. Verification checklist`,
    };
  }

  if (lane === "marketing") {
    return {
      name: "Marketing",
      mandate: "Execute marketing plans and campaigns through external execution tooling and measurable experiments.",
      authority_level: "operator",
      system_prompt: `You are the Marketing execution role.

Primary responsibility:
- Convert approved GTM strategy into concrete campaign execution plans.
- Delegate outbound/content/launch execution through external executors.
- Track hypotheses, channels, KPIs, and iteration loops.

Execution policy:
- Prefer external executors (Claude Code and compatible workflow tools) for campaign operations and content ops.
- Never mark campaign work complete without clear output artifacts or webhook completion callback.
- Escalate integration blockers with exact setup instructions.`,
    };
  }

  return {
    name: "Research",
    mandate: "Run structured research, synthesis, and market intelligence to support execution decisions.",
    authority_level: "advisor",
    system_prompt: `You are the Research execution role.

Primary responsibility:
- Produce high-signal research briefs that directly inform execution decisions.
- Maintain evidence quality, sources, assumptions, and confidence levels.

Execution policy:
- Prefer external research tools/workflows (e.g., Perplexity pipelines) when configured.
- If integrations are missing, provide an exact setup checklist for owners and proceed with best available internal analysis.
- Distinguish clearly between verified evidence and inference.`,
  };
}

function integrationGuidanceForLane(lane: ExecutionLane): {
  providers: string;
  setupHint: string;
} {
  if (lane === "development") {
    return {
      providers: "Codex or Claude Code",
      setupHint: "Connect a `mark_external` webhook in Settings > Webhooks that routes build tasks to your chosen coding executor.",
    };
  }
  if (lane === "marketing") {
    return {
      providers: "Claude Code (recommended) or custom marketing automation endpoint",
      setupHint: "Connect a `mark_external` webhook in Settings > Webhooks to run campaigns/content workflows and return completion via webhook-callback.",
    };
  }
  return {
    providers: "Perplexity workflow or research endpoint",
    setupHint: "Connect a `mark_external` webhook in Settings > Webhooks for research pipelines and return structured findings via webhook-callback.",
  };
}

async function findChiefOfStaffRole(
  supabaseService: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: byName } = await supabaseService
    .from("roles")
    .select("id, name, display_name, authority_level")
    .eq("company_id", companyId)
    .or("name.ilike.%chief of staff%,display_name.ilike.%chief of staff%")
    .limit(1)
    .maybeSingle();

  if (byName) return byName;

  const { data: byAuthority } = await supabaseService
    .from("roles")
    .select("id, name, display_name, authority_level")
    .eq("company_id", companyId)
    .eq("authority_level", "orchestrator")
    .limit(1)
    .maybeSingle();

  return byAuthority || null;
}

async function ensureExecutionRole(params: {
  supabaseService: ReturnType<typeof createClient>;
  companyId: string;
  createdBy: string;
  lane: ExecutionLane;
  supabaseUrl: string;
  supabaseServiceKey: string;
}) {
  const { supabaseService, companyId, createdBy, lane, supabaseUrl, supabaseServiceKey } = params;
  const laneRoleNames = {
    development: ["development", "engineering", "builder"],
    marketing: ["marketing", "growth"],
    research: ["research", "analyst", "strategy"],
  } as const;

  for (const roleName of laneRoleNames[lane]) {
    const { data: existingRole } = await supabaseService
      .from("roles")
      .select("id, name, display_name, authority_level")
      .eq("company_id", companyId)
      .or(`name.ilike.%${roleName}%,display_name.ilike.%${roleName}%`)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingRole) {
      return { role: existingRole, created: false };
    }
  }

  const spec = getExecutionRoleSpec(lane);
  const { data: createdRole, error } = await supabaseService
    .from("roles")
    .insert({
      company_id: companyId,
      created_by: createdBy,
      name: spec.name,
      display_name: spec.name,
      mandate: spec.mandate,
      system_prompt: spec.system_prompt,
      authority_level: spec.authority_level,
      memory_scope: "company",
      is_activated: true,
    })
    .select("id, name, display_name, authority_level")
    .single();

  if (error) {
    console.error("Failed to auto-create execution role:", error);
    return { role: null, created: false };
  }

  const provisionSync = async () => {
    try {
      await fetch(`${supabaseUrl}/functions/v1/moltbot-provision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ company_id: companyId }),
      });
    } catch (provisionError) {
      console.error("Failed to sync auto-created execution role to Moltbot:", provisionError);
    }
  };

  (globalThis as any).EdgeRuntime?.waitUntil?.(provisionSync()) ?? provisionSync();

  return { role: createdRole, created: true };
}

async function notifyOwnersForExecutionSetup(params: {
  supabaseService: ReturnType<typeof createClient>;
  companyId: string;
  lane: ExecutionLane;
  roleName: string;
}) {
  const { supabaseService, companyId, lane, roleName } = params;
  const integration = integrationGuidanceForLane(lane);

  const { data: owners } = await supabaseService
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", "owner");

  if (!owners?.length) return;

  const rows = owners.map((owner) => ({
    user_id: owner.user_id,
    company_id: companyId,
    type: "system_alert",
    title: `Execution Setup Required: ${roleName}`,
    message: `${roleName} is ready for execution. Connect external tooling (${integration.providers}) before full execution handoff. ${integration.setupHint}`,
    link: `/companies/${companyId}?tab=settings`,
  }));

  await supabaseService.from("notifications").insert(rows);
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

function deriveObjectiveFromMemo(memo: string): { title: string; description: string } {
  const normalized = String(memo || "").replace(/\r/g, "").trim();
  const lines = normalized
    .split("\n")
    .map((l) => l.replace(/^\s*[-*#\d.)\s]+/, "").trim())
    .filter((l) => l.length > 0);

  let title = lines[0] || "Execute assigned memo directive";
  const colonIdx = title.indexOf(":");
  if (colonIdx > 0 && colonIdx < 30) {
    title = title.slice(colonIdx + 1).trim() || title;
  }

  if (title.length > 90) title = `${title.slice(0, 87)}...`;
  if (title.length < 8) title = "Execute assigned memo directive";

  const compact = normalized.replace(/\s+/g, " ").trim();
  let description = compact;
  if (description.length > 240) description = `${description.slice(0, 237)}...`;
  if (description.length < 12) {
    description = "Carry out the directive in the approved memo and report outcomes.";
  }

  return { title, description };
}

function deriveTaskFromMemo(
  memo: string,
  objective: { title: string; description: string }
): { title: string; description: string; completion_criteria: string } {
  const normalized = String(memo || "").replace(/\s+/g, " ").trim();
  const fallbackDescription =
    normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;

  return {
    title: objective.title || "Execute approved memo directive",
    description:
      objective.description ||
      fallbackDescription ||
      "Execute the approved memo directive and produce a concrete deliverable.",
    completion_criteria:
      "Deliver a concrete output that fulfills the memo directive, includes key reasoning/evidence, and recommends clear next steps.",
  };
}

const EXTERNAL_EXECUTION_KEYWORDS = [
  "build",
  "implement",
  "code",
  "engineering",
  "feature",
  "frontend",
  "backend",
  "api",
  "repository",
  "github",
  "deploy",
  "migration",
  "bug fix",
  "refactor",
  "codex",
  "claude code",
  "marketing",
  "campaign",
  "linkedin",
  "outreach",
  "email sequence",
  "copywriting",
  "landing page",
  "seo",
  "social",
  "content",
  "ad creative",
  "paid ads",
  "gtm",
  "go-to-market",
];

function shouldRouteToExternalExecutor(task: {
  title?: string | null;
  description?: string | null;
  completion_criteria?: string | null;
}): boolean {
  const text = `${task.title || ""}\n${task.description || ""}\n${task.completion_criteria || ""}`.toLowerCase();
  return EXTERNAL_EXECUTION_KEYWORDS.some((keyword) => text.includes(keyword));
}

async function dispatchExternalActionWebhook(params: {
  supabaseUrl: string;
  supabaseServiceKey: string;
  outputActionId: string;
  companyId: string;
  actionData: Record<string, unknown>;
}): Promise<void> {
  const { supabaseUrl, supabaseServiceKey, outputActionId, companyId, actionData } = params;
  try {
    await fetch(`${supabaseUrl}/functions/v1/webhook-dispatcher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        output_action_id: outputActionId,
        company_id: companyId,
        action_data: actionData,
      }),
    });
  } catch (error) {
    console.error("Failed to dispatch external action webhook:", error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey || isLegacyServiceRoleJwt(token);

    let user: { id: string } | null = null;
    if (!isServiceRole) {
      const supabaseUser = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser(token);

      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ error: "Invalid authorization" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      user = { id: authUser.id };
    }

    // Parse request body
    const body: ApproveRequest = await req.json();
    const { request_id, action, edited_content, review_notes } = body;

    if (!request_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: request_id and action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["approve", "deny"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'approve' or 'deny'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the workflow request
    const { data: request, error: fetchError } = await supabaseService
      .from("workflow_requests")
      .select(`
        *,
        requesting_role:roles!workflow_requests_requesting_role_id_fkey(id, name, display_name, company_id),
        target_role:roles!workflow_requests_target_role_id_fkey(id, name, display_name, authority_level)
      `)
      .eq("id", request_id)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ error: "Workflow request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if request is still pending
    if (request.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Request has already been processed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let actingUserId: string | null = user?.id || null;
    if (isServiceRole) {
      const { data: ownerMember } = await supabaseService
        .from("company_members")
        .select("user_id")
        .eq("company_id", request.company_id)
        .eq("role", "owner")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      actingUserId = ownerMember?.user_id || null;
    } else if (actingUserId) {
      // Verify user has permission (company owner or platform admin)
      const { data: isOwner } = await supabaseService.rpc("is_company_owner", {
        _user_id: actingUserId,
        _company_id: request.company_id,
      });

      const { data: isAdmin } = await supabaseService.rpc("has_app_role", {
        _user_id: actingUserId,
        _role: "admin",
      });

      if (!isOwner && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Insufficient permissions" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!actingUserId) {
      return new Response(
        JSON.stringify({ error: "No valid actor found for workflow review" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the workflow request status
    const newStatus = action === "approve" ? "approved" : "denied";
    const { error: updateError } = await supabaseService
      .from("workflow_requests")
      .update({
        status: newStatus,
        reviewed_by: actingUserId,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
        proposed_content: edited_content || request.proposed_content,
      })
      .eq("id", request_id);

    if (updateError) {
      console.error("Error updating request:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log approval/denial to requesting role's chat as audit trail
    const statusEmoji = action === "approve" ? "✅" : "❌";
    const statusText = action === "approve" ? "Approved" : "Denied";
    
    let auditContent = `${statusEmoji} **Workflow Request ${statusText}**\n\n`;
    if (isServiceRole && action === "approve") {
      auditContent += `🤖 *Auto-approved by internal autonomy policy.*\n\n`;
    }
    
    if (request.request_type === "start_task" || request.request_type === "suggest_next_task") {
      let taskDetails;
      try {
        taskDetails = JSON.parse(request.proposed_content);
      } catch {
        taskDetails = { title: request.summary };
      }
      
      auditContent += `**Task:** ${taskDetails.title || request.summary}\n`;
      if (action === "approve") {
        auditContent += `\n🚀 *Task approved and queued under execution policy.*`;
      } else {
        auditContent += `\n📝 **Review Notes:** ${review_notes || "None provided"}`;
      }
    } else if (request.request_type === "send_memo") {
      const targetName = request.target_role?.display_name || request.target_role?.name || "Unknown";
      auditContent += `**Memo to ${targetName}**\n`;
      if (action === "approve") {
        auditContent += `\n📨 *Memo has been delivered and any resulting execution has been queued per policy.*`;
      } else {
        auditContent += `\n📝 **Review Notes:** ${review_notes || "None provided"}`;
      }
    } else if (request.request_type === "continue_task") {
      auditContent += `**Continue Task**\n`;
      if (action === "approve") {
        auditContent += `\n🔄 *Task execution resumed.*`;
      } else {
        auditContent += `\n📝 **Review Notes:** ${review_notes || "None provided"}`;
      }
    }

    // Insert audit message to requesting role's chat
    await supabaseService.from("role_messages").insert({
      role_id: request.requesting_role_id,
      company_id: request.company_id,
      sender: "ai",
      content: auditContent,
    });

    // If approved, perform the action based on request type
    if (action === "approve") {
      const contentToUse = edited_content || request.proposed_content;

      switch (request.request_type) {
        case "send_memo": {
          if (!request.target_role_id) {
            return new Response(
              JSON.stringify({ error: "Memo request missing target role" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Create the memo record
          const { error: memoError } = await supabaseService
            .from("role_memos")
            .insert({
              company_id: request.company_id,
              from_role_id: request.requesting_role_id,
              to_role_id: request.target_role_id,
              content: contentToUse,
              workflow_request_id: request_id,
            });

          if (memoError) {
            console.error("Error creating memo:", memoError);
            return new Response(
              JSON.stringify({ error: "Failed to create memo" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Also insert a message into the target role's chat
          const fromRoleName = request.requesting_role?.display_name || request.requesting_role?.name || "Unknown Role";
          const memoMessageContent = `📬 **Memo from ${fromRoleName}:**\n\n${contentToUse}`;

          const { error: messageError } = await supabaseService
            .from("role_messages")
            .insert({
              role_id: request.target_role_id,
              company_id: request.company_id,
              sender: "ai",
              content: memoMessageContent,
            });

          if (messageError) {
            console.error("Error inserting memo message:", messageError);
          }

          const targetName = `${request.target_role?.display_name || ""} ${request.target_role?.name || ""}`.toLowerCase();
          const targetIsCeo =
            targetName.includes("ceo") ||
            targetName.includes("chief executive officer") ||
            request.target_role?.authority_level === "executive";
          const isCompletionUpdateMemo =
            typeof request.summary === "string" &&
            request.summary.toLowerCase().startsWith("completion update:");
          const shouldAutoCreateExecution = !(targetIsCeo || isCompletionUpdateMemo);

          if (!shouldAutoCreateExecution) {
            console.log("Skipping auto objective/task creation for memo (completion update or CEO target).");
            break;
          }

          // Auto-create objective from memo directive and activate the role
          let objectiveData = deriveObjectiveFromMemo(contentToUse);
          try {
            const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
            if (LOVABLE_API_KEY) {
              const objectivePrompt = `Extract a single actionable objective from this directive memo.
Return strict JSON only with this shape:
{"title":"specific objective title (max 90 chars)","description":"single concise sentence including deliverable/scope (max 240 chars)"}
Rules:
- Preserve the core directive intent from the memo.
- Avoid generic wording like "follow lead from ceo" or "complete ceo task".
- Make it concrete enough for immediate execution.

Memo:
${contentToUse}`;

              const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [{ role: "user", content: objectivePrompt }],
                  response_format: { type: "json_object" },
                }),
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const objectiveText = aiData.choices?.[0]?.message?.content;
                if (objectiveText) {
                  try {
                    const parsed = JSON.parse(objectiveText);
                    if (parsed?.title && parsed?.description) {
                      objectiveData = {
                        title: String(parsed.title).trim().slice(0, 90),
                        description: String(parsed.description).trim().slice(0, 240),
                      };
                    }
                  } catch (parseErr) {
                    console.error("Failed to parse objective extraction JSON, using fallback:", parseErr);
                  }
                }
              }
            }

            const { error: objError } = await supabaseService.from("role_objectives").insert({
              role_id: request.target_role_id,
              company_id: request.company_id,
              title: objectiveData.title,
              description: objectiveData.description,
              status: "active",
              priority: 1,
              created_by: actingUserId,
            });

            if (!objError) {
              await supabaseService
                .from("roles")
                .update({ is_activated: true })
                .eq("id", request.target_role_id);

              console.log(`Auto-created objective for role from memo: ${objectiveData.title}`);
            } else {
              console.error("Error creating objective from memo:", objError);
            }
          } catch (objErr) {
            console.error("Failed to auto-create objective from memo:", objErr);
            // Non-fatal - memo was still sent
          }

          // Create a tracked task from the approved memo so Dashboard/Outputs/Analytics update
          const derivedTask = deriveTaskFromMemo(contentToUse, objectiveData);
          const { data: createdTask, error: createdTaskError } = await supabaseService
            .from("tasks")
            .insert({
              role_id: request.target_role_id,
              company_id: request.company_id,
              assigned_by: actingUserId,
              title: derivedTask.title,
              description: derivedTask.description,
              completion_criteria: derivedTask.completion_criteria,
              status: "pending",
            })
            .select("id, title")
            .single();

          if (createdTaskError) {
            console.error("Error creating tracked memo task:", createdTaskError);
          } else if (createdTask?.id) {
            const routeExternal = shouldRouteToExternalExecutor({
              title: derivedTask.title,
              description: derivedTask.description,
              completion_criteria: derivedTask.completion_criteria,
            });

            if (routeExternal) {
              const actionData = {
                task_title: createdTask.title,
                output_summary: derivedTask.description,
                role_name: request.target_role?.display_name || request.target_role?.name || "Unknown Role",
                execution_route: "external_webhook",
              };

              const { data: externalAction, error: externalActionError } = await supabaseService
                .from("output_actions")
                .insert({
                  task_id: createdTask.id,
                  company_id: request.company_id,
                  action_type: "mark_external",
                  action_data: actionData,
                  status: "pending",
                  notes: "Auto-routed for external execution (marketing/development task).",
                })
                .select("id")
                .single();

              if (externalActionError) {
                console.error("Failed to create external action for memo-derived task:", externalActionError);
              } else if (externalAction?.id) {
                const dispatchPromise = dispatchExternalActionWebhook({
                  supabaseUrl,
                  supabaseServiceKey,
                  outputActionId: externalAction.id,
                  companyId: request.company_id,
                  actionData,
                });
                (globalThis as any).EdgeRuntime?.waitUntil?.(dispatchPromise) ?? dispatchPromise;
              }

              await supabaseService.from("role_messages").insert({
                role_id: request.target_role_id,
                company_id: request.company_id,
                sender: "ai",
                content: `🧭 **Task Created from Approved Memo**\n\n**Task:** ${createdTask.title}\n\n🔌 *Routed to external executor via webhook queue (marketing/development mode).*`,
              });
            } else {
              await supabaseService.from("role_messages").insert({
                role_id: request.target_role_id,
                company_id: request.company_id,
                sender: "ai",
                content: `🧭 **Task Created from Approved Memo**\n\n**Task:** ${createdTask.title}\n\n🚀 *Execution started automatically. Progress will appear in Tasks, Outputs, and Analytics.*`,
              });

              const executeTask = async () => {
                try {
                  const response = await fetch(`${supabaseUrl}/functions/v1/task-execute`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({ task_id: createdTask.id }),
                  });
                  console.log("Auto-started memo-derived task execution:", response.status);
                } catch (err) {
                  console.error("Failed to auto-start memo-derived task:", err);
                }
              };

              (globalThis as any).EdgeRuntime?.waitUntil?.(executeTask()) ?? executeTask();
            }
          }

          break;
        }

        case "start_task":
        case "suggest_next_task": {
          // Parse the proposed content as task details
          // Expected format: { title, description, completion_criteria }
          let taskDetails;
          try {
            taskDetails = JSON.parse(contentToUse);
          } catch {
            // If not JSON, use content as description
            taskDetails = {
              title: request.summary,
              description: contentToUse,
              completion_criteria: "Task completed successfully based on the description provided.",
            };
          }

          // Use target_role_id if specified, otherwise fall back to requesting_role_id
          const targetRoleId = request.target_role_id || request.requesting_role_id;

          // Create the task for the target role
          const { data: createdTask, error: taskError } = await supabaseService
            .from("tasks")
            .insert({
              role_id: targetRoleId,
              company_id: request.company_id,
              assigned_by: actingUserId,
              title: taskDetails.title || request.summary,
              description: taskDetails.description || contentToUse,
              completion_criteria: taskDetails.completion_criteria || "Task completed successfully.",
              status: "pending",
            })
            .select("id")
            .single();

          if (taskError) {
            console.error("Error creating task:", taskError);
            return new Response(
              JSON.stringify({ error: "Failed to create task" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const routeExternal = shouldRouteToExternalExecutor({
            title: taskDetails.title || request.summary,
            description: taskDetails.description || contentToUse,
            completion_criteria: taskDetails.completion_criteria || "Task completed successfully.",
          });

          // Route to external executor (marketing/development) or execute internally.
          if (createdTask?.id) {
            if (routeExternal) {
              const actionData = {
                task_title: taskDetails.title || request.summary,
                output_summary: String(taskDetails.description || "").slice(0, 1000),
                role_name: request.requesting_role?.display_name || request.requesting_role?.name || "Unknown Role",
                execution_route: "external_webhook",
              };

              const { data: externalAction, error: externalActionError } = await supabaseService
                .from("output_actions")
                .insert({
                  task_id: createdTask.id,
                  company_id: request.company_id,
                  action_type: "mark_external",
                  action_data: actionData,
                  status: "pending",
                  notes: "Auto-routed for external execution (marketing/development task).",
                })
                .select("id")
                .single();

              if (externalActionError) {
                console.error("Failed to create external action:", externalActionError);
              } else if (externalAction?.id) {
                const dispatchPromise = dispatchExternalActionWebhook({
                  supabaseUrl,
                  supabaseServiceKey,
                  outputActionId: externalAction.id,
                  companyId: request.company_id,
                  actionData,
                });
                (globalThis as any).EdgeRuntime?.waitUntil?.(dispatchPromise) ?? dispatchPromise;
              }

              await supabaseService.from("role_messages").insert({
                role_id: targetRoleId,
                company_id: request.company_id,
                sender: "ai",
                content: `🔌 **Task Routed for External Execution**\n\n**Task:** ${taskDetails.title || request.summary}\n\nQueued to webhook integrations (e.g., Codex/Claude Code/Zapier) for execution.`,
              });
            } else {
              const executeTask = async () => {
                try {
                  const response = await fetch(
                    `${supabaseUrl}/functions/v1/task-execute`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify({ task_id: createdTask.id }),
                    }
                  );
                  console.log("Auto-started task execution:", response.status);
                } catch (err) {
                  console.error("Failed to auto-start task:", err);
                }
              };

              (globalThis as any).EdgeRuntime?.waitUntil?.(executeTask()) ?? executeTask();
            }
          }
          break;
        }

        case "continue_task": {
          // Find the source task and update it to running
          if (request.source_task_id) {
            const { error: taskUpdateError } = await supabaseService
              .from("tasks")
              .update({ status: "running" })
              .eq("id", request.source_task_id);

            if (taskUpdateError) {
              console.error("Error updating task:", taskUpdateError);
            }
          }
          break;
        }

        case "review_output": {
          // Human has reviewed the task output and approves continuing autonomous work
          // Parse the content to check for any follow-up suggestions
          try {
            const outputData = JSON.parse(contentToUse);

            if (outputData?.review_type === "objective_completion" && outputData?.objective_id) {
              const objectiveId = String(outputData.objective_id);
              const { data: completedObjective, error: completeError } = await supabaseService
                .from("role_objectives")
                .update({
                  status: "completed",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", objectiveId)
                .eq("role_id", request.requesting_role_id)
                .eq("status", "active")
                .select("id, title")
                .maybeSingle();

              if (completeError) {
                console.error("Failed to mark objective completed after review approval:", completeError);
              } else if (completedObjective) {
                await supabaseService.from("role_messages").insert({
                  role_id: request.requesting_role_id,
                  company_id: request.company_id,
                  sender: "ai",
                  content: `✅ **Objective Completion Approved**\n\n**Objective:** ${completedObjective.title}\n\nHuman review approved completion. Objective has been marked as completed.`,
                });
              }
            }
            
            // Log approval to chat
            const approvalMessage = `✅ **Output Reviewed & Approved**

**Task:** ${outputData.task_title || 'Task'}

Human has reviewed the output and approved. Autonomous work may continue.`;

            await supabaseService.from("role_messages").insert({
              role_id: request.requesting_role_id,
              company_id: request.company_id,
              sender: "ai",
              content: approvalMessage,
            });

            // Planning -> execution handoff:
            // When Product output is CEO-approved, bootstrap execution lane and route through Chief of Staff.
            const requestingRoleLabel = `${request.requesting_role?.display_name || ""} ${request.requesting_role?.name || ""}`.toLowerCase();
            const isProductRole = requestingRoleLabel.includes("product");

            if (isProductRole) {
              const laneContext = [
                request.summary,
                outputData?.task_title,
                outputData?.task_description,
                outputData?.completion_summary,
                outputData?.summary,
                outputData?.output,
              ]
                .filter(Boolean)
                .join("\n");

              const lane = inferExecutionLane(laneContext);
              const integration = integrationGuidanceForLane(lane);
              const { role: executionRole, created: createdExecutionRole } = await ensureExecutionRole({
                supabaseService,
                companyId: request.company_id,
                createdBy: actingUserId,
                lane,
                supabaseUrl,
                supabaseServiceKey,
              });

              const cosRole = await findChiefOfStaffRole(supabaseService, request.company_id);
              const executionRoleName = executionRole?.display_name || executionRole?.name || `${lane[0].toUpperCase()}${lane.slice(1)}`;

              if (cosRole) {
                const handoffMemo = `📌 **Execution Handoff Triggered (CEO-approved Product output)**\n\n` +
                  `Lane selected: **${lane.toUpperCase()}**\n` +
                  `Execution role: **${executionRoleName}** ${createdExecutionRole ? "(created automatically)" : "(already existed)"}\n\n` +
                  `Chief of Staff actions:\n` +
                  `1. Confirm execution objective and scope for ${executionRoleName}.\n` +
                  `2. Coordinate first execution task handoff from planning to delivery.\n` +
                  `3. Ensure integrations are connected before high-volume execution.\n\n` +
                  `Integration recommendation: **${integration.providers}**\n` +
                  `${integration.setupHint}\n\n` +
                  `Owner setup path: Settings -> Webhooks`;

                await supabaseService.from("role_messages").insert({
                  role_id: cosRole.id,
                  company_id: request.company_id,
                  sender: "ai",
                  content: handoffMemo,
                });
              } else {
                await supabaseService.from("role_messages").insert({
                  role_id: request.requesting_role_id,
                  company_id: request.company_id,
                  sender: "ai",
                  content: `⚠️ **Execution Handoff Blocked**\n\nNo Chief of Staff role was found. Create or activate a Chief of Staff role to continue execution routing.`,
                });
              }

              if (executionRole?.id) {
                await supabaseService.from("role_messages").insert({
                  role_id: executionRole.id,
                  company_id: request.company_id,
                  sender: "ai",
                  content: `🚀 **Execution Lane Activated**\n\nYou are now the execution role for **${lane.toUpperCase()}** work.\n\n` +
                    `Awaiting Chief of Staff task handoff. Integration recommendation for external execution: ${integration.providers}.`,
                });
              }

              await notifyOwnersForExecutionSetup({
                supabaseService,
                companyId: request.company_id,
                lane,
                roleName: executionRoleName,
              });
            }

            // Trigger the autonomous loop for this role to continue work
            const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
            if (SUPABASE_URL) {
              const continueLoop = async () => {
                try {
                  await fetch(`${SUPABASE_URL}/functions/v1/role-autonomous-loop`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({ role_id: request.requesting_role_id }),
                  });
                } catch (err) {
                  console.error("Failed to trigger autonomous loop:", err);
                }
              };
              (globalThis as any).EdgeRuntime?.waitUntil?.(continueLoop()) ?? continueLoop();
            }
          } catch (parseErr) {
            console.error("Failed to parse review_output content:", parseErr);
          }
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: newStatus,
        message: action === "approve" ? "Request approved and executed" : "Request denied"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
