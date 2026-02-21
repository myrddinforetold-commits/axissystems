import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AXIS_API_URL = Deno.env.get("AXIS_API_URL");
const AXIS_API_SECRET = Deno.env.get("AXIS_API_SECRET");

interface RoleContext {
  role: {
    id: string;
    name: string;
    display_name?: string | null;
    mandate: string;
    system_prompt: string;
    workflow_status: string;
    company_id: string;
    is_activated: boolean;
    authority_level: "observer" | "advisor" | "operator" | "executive" | "orchestrator";
    created_by: string;
  };
  company: {
    id: string;
    name: string;
  };
  companyStage: string | null;
  isGrounded: boolean;
  groundingData: any;
  objectives: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: number;
  }>;
  recentMemory: Array<{
    content: string;
    label: string | null;
    created_at: string;
  }>;
  pendingRequests: number;
  recentMessages: Array<{
    sender: string;
    content: string;
    created_at: string;
  }>;
}

function isGovernanceRole(role: {
  name?: string | null;
  display_name?: string | null;
  authority_level?: string | null;
}): boolean {
  const roleName = `${role.display_name || ""} ${role.name || ""}`.toLowerCase();
  if (role.authority_level === "executive" || role.authority_level === "orchestrator") return true;
  return roleName.includes("ceo") || roleName.includes("chief of staff");
}

async function autoApproveInternalTransition(
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
        review_notes: "Auto-approved by internal autonomy policy (memo/task transition).",
      }),
    });
  } catch (error) {
    console.error("Immediate auto-approval failed:", error);
  }
}

interface RoleForRouting {
  id: string;
  name: string;
  display_name: string | null;
  authority_level: "observer" | "advisor" | "operator" | "executive" | "orchestrator";
  created_at: string;
}

function scoreCeoCandidate(role: RoleForRouting): number {
  const name = role.name.toLowerCase();
  const displayName = (role.display_name || "").toLowerCase();

  if (name === "ceo" || displayName === "ceo") return 100;
  if (name.includes("chief executive officer") || displayName.includes("chief executive officer")) return 95;
  if (name.includes("ceo") || displayName.includes("ceo")) return 90;
  if (role.authority_level === "executive" && (name.includes("founder") || displayName.includes("founder"))) return 80;
  if (role.authority_level === "executive") return 70;
  if (role.authority_level === "orchestrator") return 50;
  return 0;
}

async function findCeoRoleForRouting(
  supabase: any,
  companyId: string,
  requestingRoleId: string
): Promise<Pick<RoleForRouting, "id" | "name" | "display_name"> | null> {
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, name, display_name, authority_level, created_at")
    .eq("company_id", companyId);

  if (error || !roles?.length) {
    console.error("Failed to load roles for CEO routing:", error);
    return null;
  }

  const best = (roles as RoleForRouting[])
    .filter((role) => role.id !== requestingRoleId)
    .map((role) => ({ role, score: scoreCeoCandidate(role) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.role.created_at).getTime() - new Date(b.role.created_at).getTime();
    })[0];

  if (!best || best.score <= 0) {
    return null;
  }

  return {
    id: best.role.id,
    name: best.role.name,
    display_name: best.role.display_name,
  };
}

async function gatherContext(supabase: any, roleId: string): Promise<RoleContext | null> {
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, name, display_name, mandate, system_prompt, workflow_status, company_id, is_activated, authority_level, created_by")
    .eq("id", roleId)
    .single();

  if (roleError || !role) {
    console.error("Failed to fetch role:", roleError);
    return null;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", role.company_id)
    .single();

  const { data: contextData } = await supabase
    .from("company_context")
    .select("stage, is_grounded")
    .eq("company_id", role.company_id)
    .single();

  let groundingData = null;
  if (contextData?.is_grounded) {
    const { data: grounding } = await supabase
      .from("company_grounding")
      .select("products, entities, intended_customer, constraints, current_state_summary, technical_context")
      .eq("company_id", role.company_id)
      .eq("status", "confirmed")
      .single();

    if (grounding) {
      groundingData = {
        products: grounding.products || [],
        entities: grounding.entities || [],
        intendedCustomer: grounding.intended_customer,
        constraints: grounding.constraints || [],
        currentStateSummary: grounding.current_state_summary,
        technicalContext: grounding.technical_context || null,
      };
    }
  }

  const { data: objectives } = await supabase
    .from("role_objectives")
    .select("id, title, description, status, priority")
    .eq("role_id", roleId)
    .eq("status", "active")
    .order("priority", { ascending: true })
    .limit(5);

  const { data: memory } = await supabase
    .from("company_memory")
    .select("content, label, created_at")
    .eq("company_id", role.company_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: pendingRequests } = await supabase
    .from("workflow_requests")
    .select("id")
    .eq("requesting_role_id", roleId)
    .eq("status", "pending");

  const { data: messages } = await supabase
    .from("role_messages")
    .select("sender, content, created_at")
    .eq("role_id", roleId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    role,
    company: company || { id: role.company_id, name: "Unknown" },
    companyStage: contextData?.stage || null,
    isGrounded: contextData?.is_grounded || false,
    groundingData,
    objectives: objectives || [],
    recentMemory: memory || [],
    pendingRequests: pendingRequests?.length || 0,
    recentMessages: messages || [],
  };
}

async function hasPendingObjectiveReviewRequest(
  supabase: any,
  companyId: string,
  requestingRoleId: string,
  objectiveId: string
): Promise<boolean> {
  const summaryKey = `Objective completion review: ${objectiveId}`;
  const { data, error } = await supabase
    .from("workflow_requests")
    .select("id")
    .eq("company_id", companyId)
    .eq("requesting_role_id", requestingRoleId)
    .eq("status", "pending")
    .eq("summary", summaryKey)
    .limit(1);

  if (error) {
    console.error("Failed checking pending objective review request:", error);
    return false;
  }

  return Boolean(data && data.length > 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!AXIS_API_URL || !AXIS_API_SECRET) {
      return new Response(
        JSON.stringify({ error: "AXIS_API_URL / AXIS_API_SECRET not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { role_id } = await req.json();
    if (!role_id) {
      return new Response(JSON.stringify({ error: "role_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const context = await gatherContext(supabase, role_id);
    if (!context) {
      return new Response(JSON.stringify({ error: "Role not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!context.isGrounded) {
      return new Response(
        JSON.stringify({
          action: "blocked",
          mode: "grounding_required",
          reasoning: "Company has not completed the grounding phase.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!context.role.is_activated) {
      return new Response(
        JSON.stringify({
          action: "blocked",
          mode: "activation_required",
          reasoning: "Role has not been activated.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (context.role.workflow_status === "awaiting_approval") {
      return new Response(
        JSON.stringify({
          action: "wait",
          reasoning: "Role is awaiting approval on existing request",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (context.pendingRequests > 0) {
      return new Response(
        JSON.stringify({
          action: "wait",
          reasoning: `Role has ${context.pendingRequests} pending workflow request(s)`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const axisResponse = await fetch(`${AXIS_API_URL}/api/v1/autonomous`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AXIS_API_SECRET}`,
      },
      body: JSON.stringify({
        company_id: context.company.id,
        role_id: context.role.id,
        context: {
          role: {
            name: context.role.name,
            mandate: context.role.mandate,
          },
          company: context.company,
          grounding: context.groundingData,
          objectives: context.objectives,
          recentMemory: context.recentMemory,
          recentMessages: [...context.recentMessages]
            .reverse()
            .slice(-8)
            .map((m) => ({
              sender: m.sender,
              content: m.content,
            })),
          pendingRequests: context.pendingRequests,
        },
      }),
    });

    if (!axisResponse.ok) {
      const errorText = await axisResponse.text();
      console.error("Axis API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const decision = await axisResponse.json();
    const roleIsGovernance = isGovernanceRole(context.role);

    let auditMessage = "";

    if (decision.action === "propose_task" && decision.details) {
      if (roleIsGovernance) {
        const { data: wfRequest, error: wfError } = await supabase.from("workflow_requests").insert({
          company_id: context.role.company_id,
          requesting_role_id: context.role.id,
          request_type: "start_task",
          summary: `Task: ${decision.details.title}`,
          proposed_content: JSON.stringify({
            title: decision.details.title,
            description: decision.details.description,
            completion_criteria: decision.details.completion_criteria,
          }),
        }).select("id").single();

        if (wfError) {
          console.error("Failed to create workflow request:", wfError);
        } else {
          if (wfRequest?.id) {
            const runAutoApprove = autoApproveInternalTransition(
              supabaseUrl,
              supabaseServiceKey,
              wfRequest.id
            );
            (globalThis as any).EdgeRuntime?.waitUntil?.(runAutoApprove) ?? runAutoApprove;
          }
          await supabase
            .from("roles")
            .update({ workflow_status: "awaiting_approval" })
            .eq("id", role_id);
        }

        auditMessage = `🤖 **Autonomous Action: Task Proposed** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n📋 **Proposed Task:**\n- **Title:** ${decision.details.title}\n- **Description:** ${decision.details.description}\n- **Completion Criteria:** ${decision.details.completion_criteria}\n\n⚡ *Submitted to Workflow and immediate internal auto-approval has been requested.*`;
      } else {
        const reviewerRole = await findCeoRoleForRouting(
          supabase,
          context.role.company_id,
          context.role.id
        );

        if (!reviewerRole) {
          auditMessage = `🤖 **Autonomous Action: Task Proposal Deferred** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n⚠️ *No CEO/Chief of Staff role found for approval routing.*`;
        } else {
          const escalationMemo = `Task proposal from ${context.role.display_name || context.role.name}:\n\n` +
            `Title: ${decision.details.title}\n` +
            `Description: ${decision.details.description}\n` +
            `Completion criteria: ${decision.details.completion_criteria}\n\n` +
            `Request: Please approve/adjust this task and assign next execution step.`;

          const { data: wfRequest, error: wfError } = await supabase
            .from("workflow_requests")
            .insert({
              company_id: context.role.company_id,
              requesting_role_id: context.role.id,
              target_role_id: reviewerRole.id,
              request_type: "send_memo",
              summary: `Task proposal escalation: ${decision.details.title}`,
              proposed_content: escalationMemo,
            })
            .select("id")
            .single();

          if (wfError) {
            console.error("Failed to escalate task proposal to governance role:", wfError);
          } else if (wfRequest?.id) {
            const runAutoApprove = autoApproveInternalTransition(
              supabaseUrl,
              supabaseServiceKey,
              wfRequest.id
            );
            (globalThis as any).EdgeRuntime?.waitUntil?.(runAutoApprove) ?? runAutoApprove;
          }

          const reviewerName = reviewerRole.display_name || reviewerRole.name;
          auditMessage = `🤖 **Autonomous Action: Task Escalated** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n📬 *Proposed task has been escalated to ${reviewerName} for approval and routing.*`;
        }
      }
    } else if (decision.action === "propose_memo" && decision.details) {
      const { data: targetRole } = await supabase
        .from("roles")
        .select("id, name, display_name")
        .eq("company_id", context.role.company_id)
        .ilike("name", `%${decision.details.to_role}%`)
        .single();

      if (targetRole) {
        const { data: wfRequest, error: wfError } = await supabase.from("workflow_requests").insert({
          company_id: context.role.company_id,
          requesting_role_id: context.role.id,
          target_role_id: targetRole.id,
          request_type: "send_memo",
          summary: `Memo to ${decision.details.to_role}`,
          proposed_content: decision.details.content,
        }).select("id").single();

        if (wfError) {
          console.error("Failed to create memo request:", wfError);
        } else {
          if (wfRequest?.id) {
            const runAutoApprove = autoApproveInternalTransition(
              supabaseUrl,
              supabaseServiceKey,
              wfRequest.id
            );
            (globalThis as any).EdgeRuntime?.waitUntil?.(runAutoApprove) ?? runAutoApprove;
          }
          await supabase
            .from("roles")
            .update({ workflow_status: "awaiting_approval" })
            .eq("id", role_id);
        }

        const targetName = targetRole.display_name || targetRole.name;
        auditMessage = `🤖 **Autonomous Action: Memo Proposed** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n📬 **Proposed Memo to ${targetName}:**\n${decision.details.content}\n\n⚡ *Submitted to Workflow and immediate internal auto-approval has been requested.*`;
      }
    } else if (decision.action === "complete_objective" && decision.details?.objective_id) {
      const objectiveId = String(decision.details.objective_id);
      const summaryKey = `Objective completion review: ${objectiveId}`;
      const objective = context.objectives.find((o) => o.id === objectiveId);
      if (roleIsGovernance) {
        const { data: completedObjective, error: completeError } = await supabase
          .from("role_objectives")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", objectiveId)
          .eq("role_id", context.role.id)
          .eq("status", "active")
          .select("id, title")
          .maybeSingle();

        if (completeError || !completedObjective) {
          console.error("Failed to auto-complete governance objective:", completeError);
          auditMessage = `🤖 **Autonomous Action: Objective Completion Failed** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n⚠️ *Could not mark objective as completed.*`;
        } else {
          const { data: remainingObjectives } = await supabase
            .from("role_objectives")
            .select("id")
            .eq("role_id", context.role.id)
            .eq("status", "active")
            .limit(1);

          if (!remainingObjectives || remainingObjectives.length === 0) {
            const fallbackTitle = `Set next objective after: ${completedObjective.title}`;
            const fallbackDescription =
              "Define the next strategic objective based on latest completed outputs, priorities, and constraints.";
            await supabase.from("role_objectives").insert({
              role_id: context.role.id,
              company_id: context.role.company_id,
              title: fallbackTitle.slice(0, 90),
              description: fallbackDescription,
              status: "active",
              priority: 1,
              created_by: context.role.created_by,
            });
          }

          auditMessage = `🤖 **Autonomous Action: Objective Completed** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n✅ *Objective marked complete by governance role autonomy. A next objective has been queued if none remained active.*`;
        }
      } else {
        const reviewerRole = await findCeoRoleForRouting(
          supabase,
          context.role.company_id,
          context.role.id
        );

        if (!reviewerRole) {
          auditMessage = `🤖 **Autonomous Action: Objective Completion Deferred** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n⚠️ *No CEO/Chief of Staff role found for completion routing.*`;
        } else {
          const existingPending = await hasPendingObjectiveReviewRequest(
            supabase,
            context.role.company_id,
            context.role.id,
            objectiveId
          );

          if (existingPending) {
            auditMessage = `🤖 **Autonomous Action: Objective Completion Pending Review** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n⏸️ *An objective completion request is already pending for governance routing.*`;
          } else {
            const summaryText = decision.details?.summary || "Objective appears complete and is ready for governance review.";
            const escalationMemo = `Objective completion candidate from ${context.role.display_name || context.role.name}:\n\n` +
              `Objective: ${objective?.title || objectiveId}\n` +
              `Summary: ${summaryText}\n\n` +
              `Request: Please decide if this objective should be marked complete and set/approve the next objective.`;

            const { data: wfRequest, error: wfError } = await supabase
              .from("workflow_requests")
              .insert({
                company_id: context.role.company_id,
                requesting_role_id: context.role.id,
                target_role_id: reviewerRole.id,
                request_type: "send_memo",
                summary: summaryKey,
                proposed_content: escalationMemo,
              })
              .select("id")
              .single();

            if (wfError) {
              console.error("Failed to route objective completion to governance:", wfError);
              auditMessage = `🤖 **Autonomous Action: Objective Review Failed** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n⚠️ *Could not route objective completion to CEO/Chief of Staff.*`;
            } else {
              if (wfRequest?.id) {
                const runAutoApprove = autoApproveInternalTransition(
                  supabaseUrl,
                  supabaseServiceKey,
                  wfRequest.id
                );
                (globalThis as any).EdgeRuntime?.waitUntil?.(runAutoApprove) ?? runAutoApprove;
              }
              const reviewerName = reviewerRole.display_name || reviewerRole.name;
              auditMessage = `🤖 **Autonomous Action: Objective Completion Escalated** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n📬 *Completion routed to ${reviewerName} for decision and next-objective assignment.*`;
            }
          }
        }
      }
    } else if (decision.action === "wait") {
      auditMessage = `🤖 **Autonomous Action: Waiting** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n⏸️ *No action required at this time.*`;
    }

    if (auditMessage) {
      await supabase.from("role_messages").insert({
        role_id: context.role.id,
        company_id: context.role.company_id,
        sender: "ai",
        content: auditMessage,
      });
    }

    return new Response(JSON.stringify(decision), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Autonomous loop error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
