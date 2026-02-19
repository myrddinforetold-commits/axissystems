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
    mandate: string;
    system_prompt: string;
    workflow_status: string;
    company_id: string;
    is_activated: boolean;
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

async function gatherContext(supabase: any, roleId: string): Promise<RoleContext | null> {
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, name, mandate, system_prompt, workflow_status, company_id, is_activated")
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    let auditMessage = "";

    if (decision.action === "propose_task" && decision.details) {
      const { error: wfError } = await supabase.from("workflow_requests").insert({
        company_id: context.role.company_id,
        requesting_role_id: context.role.id,
        request_type: "start_task",
        summary: `Task: ${decision.details.title}`,
        proposed_content: JSON.stringify({
          title: decision.details.title,
          description: decision.details.description,
          completion_criteria: decision.details.completion_criteria,
        }),
      });

      if (wfError) {
        console.error("Failed to create workflow request:", wfError);
      } else {
        await supabase
          .from("roles")
          .update({ workflow_status: "awaiting_approval" })
          .eq("id", role_id);
      }

      auditMessage = `🤖 **Autonomous Action: Task Proposed** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n📋 **Proposed Task:**\n- **Title:** ${decision.details.title}\n- **Description:** ${decision.details.description}\n- **Completion Criteria:** ${decision.details.completion_criteria}\n\n⏳ *Awaiting approval in the Workflow panel.*`;
    } else if (decision.action === "propose_memo" && decision.details) {
      const { data: targetRole } = await supabase
        .from("roles")
        .select("id, name, display_name")
        .eq("company_id", context.role.company_id)
        .ilike("name", `%${decision.details.to_role}%`)
        .single();

      if (targetRole) {
        const { error: wfError } = await supabase.from("workflow_requests").insert({
          company_id: context.role.company_id,
          requesting_role_id: context.role.id,
          target_role_id: targetRole.id,
          request_type: "send_memo",
          summary: `Memo to ${decision.details.to_role}`,
          proposed_content: decision.details.content,
        });

        if (wfError) {
          console.error("Failed to create memo request:", wfError);
        } else {
          await supabase
            .from("roles")
            .update({ workflow_status: "awaiting_approval" })
            .eq("id", role_id);
        }

        const targetName = targetRole.display_name || targetRole.name;
        auditMessage = `🤖 **Autonomous Action: Memo Proposed** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n📬 **Proposed Memo to ${targetName}:**\n${decision.details.content}\n\n⏳ *Awaiting approval in the Workflow panel.*`;
      }
    } else if (decision.action === "complete_objective" && decision.details?.objective_id) {
      await supabase
        .from("role_objectives")
        .update({ status: "completed" })
        .eq("id", decision.details.objective_id);

      auditMessage = `🤖 **Autonomous Action: Objective Completed** (via Axis API/Kimi)\n\n**Reasoning:** ${decision.reasoning}\n\n✅ *Objective marked as complete.*`;
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
