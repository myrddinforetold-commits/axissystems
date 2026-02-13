import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Technical architecture context for roles to understand what exists
const AXIS_TECHNICAL_CONTEXT = `
## Axis Systems Technical Architecture (Current State)

### Database Schema (PostgreSQL)
Tables that ALREADY EXIST (do not propose creating these):
- roles: AI role definitions with mandates, system prompts, authority levels (observer/advisor/operator/executive/orchestrator)
- tasks: Assigned work items with completion criteria, attempt tracking, max 3 retries
- task_attempts: Execution history with AI outputs and pass/fail/unclear evaluations
- workflow_requests: Human-in-the-loop approval queue (start_task, send_memo, continue_task, suggest_next_task)
- role_memos: Inter-role communications (from_role_id → to_role_id with content)
- company_memory: Shared organizational knowledge pinned by users (company-wide visibility)
- role_memory: Private role-specific learnings (role-scoped visibility)
- role_objectives: Current goals for each role with priority and status
- role_messages: Chat history between humans and roles
- company_grounding: Business context, products, entities, constraints, aspirations
- company_context: Company stage (early/growth/established) and grounding status
- profiles: User display names and avatars
- company_members: User-company associations with roles (owner/member)
- cos_reports: Chief of Staff generated reports

### Backend Functions (Deployed)
Functions that ALREADY EXIST:
- role-chat: Handles human-role conversations with streaming responses
- role-autonomous-loop: This function - Observe-Decide-Propose cycle
- task-execute: Runs tasks with AI, evaluates output, handles retries
- workflow-approve: Processes approval/denial of workflow requests
- grounding-summary: Generates AI summary of grounding data
- cos-summary: Chief of Staff reporting and analysis

### Frontend (React/TypeScript/Tailwind)
UI that ALREADY EXISTS:
- Role chat interface with streaming AI responses
- Workflow dashboard for approving/denying requests
- Task panel with execution monitoring
- Company memory panel for pinning knowledge
- Grounding wizard for company onboarding
- Role activation wizard with objective setting
- CoS (Chief of Staff) reporting interface

### External Integrations: NONE AVAILABLE
The system currently has NO external integrations:
- ❌ No email sending (cannot send emails to real people)
- ❌ No CRM access (no Salesforce, HubSpot, etc.)
- ❌ No analytics platforms (no Mixpanel, Amplitude, etc.)
- ❌ No external APIs or webhooks
- ❌ No calendar/scheduling integrations
- ❌ No Slack/Teams messaging
- ❌ No social media posting
- ❌ No code deployment capabilities

### What Roles CAN Do Within This System:
- Create documents, specifications, research, and analysis
- Send memos to other roles (internal communication only)
- Propose tasks that produce written deliverables
- Access and reference grounding data and company memory
- Mark objectives as complete when criteria are met

### PRODUCT & BUILDER ROLES - Additional Capabilities:
Product and Builder roles CAN propose development tasks that Lovable can implement:
- UI/UX improvements: New pages, components, layouts, styling changes
- Database changes: New tables, columns, indexes, RLS policies
- Edge function updates: New functions, modifications to existing ones
- Feature implementations: Complete features with frontend + backend specifications

Development tasks should include:
- Clear description of what to build
- Which files/tables/functions are affected
- Acceptance criteria that can be verified
- Reference to existing architecture (use actual table/component names)
`;


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
  groundingData: {
    products: Array<{ name: string; description: string }>;
    entities: Array<{ name: string; type: string }>;
    intendedCustomer: string | null;
    constraints: Array<{ type: string; description: string }>;
    currentStateSummary: {
      knownFacts: string[];
      assumptions: string[];
      openQuestions: string[];
    } | null;
    technicalContext: {
      databaseTables?: Array<{ name: string; description: string; keyColumns?: string }>;
      apiEndpoints?: Array<{ method: string; path: string; description: string }>;
      techStack?: Array<{ category: string; name: string; version?: string }>;
      externalServices?: Array<{ name: string; purpose: string }>;
    } | null;
  } | null;
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
  // Fetch role
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, name, mandate, system_prompt, workflow_status, company_id, is_activated")
    .eq("id", roleId)
    .single();

  if (roleError || !role) {
    console.error("Failed to fetch role:", roleError);
    return null;
  }

  // Fetch company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", role.company_id)
    .single();

  // Fetch company context (stage + grounding status)
  const { data: contextData } = await supabase
    .from("company_context")
    .select("stage, is_grounded")
    .eq("company_id", role.company_id)
    .single();

  // Fetch grounding data if grounded
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

  // Fetch active objectives
  const { data: objectives } = await supabase
    .from("role_objectives")
    .select("id, title, description, status, priority")
    .eq("role_id", roleId)
    .eq("status", "active")
    .order("priority", { ascending: true })
    .limit(5);

  // Fetch recent company memory
  const { data: memory } = await supabase
    .from("company_memory")
    .select("content, label, created_at")
    .eq("company_id", role.company_id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch pending workflow requests for this role
  const { data: pendingRequests } = await supabase
    .from("workflow_requests")
    .select("id")
    .eq("requesting_role_id", roleId)
    .eq("status", "pending");

  // Fetch recent messages
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

function buildAutonomousPrompt(context: RoleContext): string {
  const stageContext = context.companyStage
    ? `Company Stage: ${context.companyStage}. ${
        context.companyStage === "early"
          ? "Assume sparse data, prioritize speed over perfection, favor hypotheses over rigid frameworks."
          : context.companyStage === "growth"
          ? "Balance speed with process, support scaling decisions."
          : "Respect established processes, optimize for efficiency."
      }`
    : "";

  // Include grounding data as source of truth
  let groundingContext = "";
  if (context.groundingData) {
    const gd = context.groundingData;
    groundingContext = `
---
COMPANY GROUNDING (Source of Truth):
${gd.products.length > 0 ? `Products/Services: ${gd.products.map(p => p.name).join(", ")}` : "No products defined yet."}
${gd.entities.length > 0 ? `Entities: ${gd.entities.map(e => `${e.name} (${e.type})`).join(", ")}` : ""}
${gd.intendedCustomer ? `Target Customer: ${gd.intendedCustomer}` : "Target customer not defined."}
${gd.constraints.length > 0 ? `Constraints: ${gd.constraints.map(c => `[${c.type}] ${c.description}`).join("; ")}` : ""}

${gd.currentStateSummary ? `
Known Facts:
${gd.currentStateSummary.knownFacts.map(f => `• ${f}`).join("\n")}

Open Questions:
${gd.currentStateSummary.openQuestions.map(q => `? ${q}`).join("\n")}
` : ""}
${gd.technicalContext ? `
CUSTOMER TECHNICAL ARCHITECTURE:
${gd.technicalContext.databaseTables?.length ? `Database Tables: ${gd.technicalContext.databaseTables.map(t => `${t.name} (${t.description})`).join(", ")}` : ""}
${gd.technicalContext.apiEndpoints?.length ? `API Endpoints: ${gd.technicalContext.apiEndpoints.map(e => `${e.method} ${e.path}`).join(", ")}` : ""}
${gd.technicalContext.techStack?.length ? `Tech Stack: ${gd.technicalContext.techStack.map(t => `${t.name}${t.version ? `@${t.version}` : ""}`).join(", ")}` : ""}
${gd.technicalContext.externalServices?.length ? `External Services: ${gd.technicalContext.externalServices.map(s => `${s.name} (${s.purpose})`).join(", ")}` : ""}
` : ""}
---`;
  }

  const objectivesText = context.objectives.length > 0
    ? `Current Objectives:\n${context.objectives.map((o, i) => `${i + 1}. ${o.title}: ${o.description}`).join("\n")}`
    : "No active objectives assigned. Propose an initial objective based on your mandate.";

  const memoryText = context.recentMemory.length > 0
    ? `Recent Company Memory:\n${context.recentMemory.slice(0, 5).map((m) => `- ${m.label || "Note"}: ${m.content.slice(0, 200)}...`).join("\n")}`
    : "No company memory recorded yet.";

  const recentActivity = context.recentMessages.length > 0
    ? `Last Activity:\n${context.recentMessages.slice(0, 3).map((m) => `[${m.sender}]: ${m.content.slice(0, 100)}...`).join("\n")}`
    : "No recent activity.";

  return `${context.role.system_prompt}

---
CURRENT CONTEXT:
Company: ${context.company.name}
${stageContext}

${AXIS_TECHNICAL_CONTEXT}
${groundingContext}

${objectivesText}

${memoryText}

${recentActivity}

Pending Workflow Requests: ${context.pendingRequests}

---
CRITICAL CAPABILITY BOUNDARIES:

## What You CAN Propose Tasks For:
- Research and analysis (based on available context and grounding data)
- Creating documents, specifications, plans, frameworks, playbooks
- Writing internal memos to other roles
- Synthesizing information and making recommendations
- Drafting strategies, process documentation, or decision frameworks
- Preparing briefings, reports, or summaries

## What You CANNOT Propose (the system cannot execute these):
- Deploying code, SDKs, software, or infrastructure to any environment
- Sending external emails, Slack messages, or notifications to real people
- Accessing CRM, analytics platforms, or external databases
- Making API calls to external services (no email automation, no webhooks)
- Scheduling meetings or calendar events
- Creating actual integrations or technical implementations
- Running tests, CI/CD pipelines, or builds
- Publishing content externally (social media, websites)

## If Your Objective Requires External Capabilities:
If your objective requires integrations or capabilities that don't exist (email, CRM, analytics, 
external communications), propose a MEMO to the CEO explaining:
1. What capability is needed
2. Why it's needed for your objective
3. What you can accomplish once it's available

Do NOT propose a task claiming you'll "set up", "deploy", "send", or "integrate" something 
the system cannot actually do.

### For Non-Technical Roles (CEO, Sales, Growth, Marketing, etc.):
VALID task example: "Document the email outreach strategy and template requirements"
INVALID task example: "Deploy email automation system to production"
VALID task example: "Create technical specification for logging infrastructure"
INVALID task example: "Deploy Logging SDK to staging environment"

### For Technical Roles (Product, Builder, Engineering):
These roles CAN propose development tasks that Lovable will implement after approval.
The task output should be a specification that Lovable can directly use.

VALID development task examples:
- "Add a 'Mark Complete' button to TaskDetailView.tsx that calls supabase.update() on tasks table"
- "Create a notifications table with user_id, message, read_at columns and RLS policies"
- "Update role-chat edge function to include previous task outputs in context"
- "Add a dashboard page showing all active tasks across roles with filtering"
- "Implement task prioritization UI in TaskPanel.tsx with drag-and-drop reordering"

INVALID development task examples:
- "Deploy to production" (Lovable deploys automatically)
- "Set up CI/CD pipeline" (not applicable)
- "Integrate with Salesforce" (no external integrations available)
- "Send push notifications to users" (no mobile/push infrastructure)

## Referencing Existing Systems:
When your work relates to existing infrastructure (see Technical Architecture above), reference it accurately:
- Use actual table names (e.g., "role_memos" not "the messaging system")
- Acknowledge what exists before proposing extensions
- If documenting architecture, describe what IS, not what you imagine

---
AUTONOMOUS LOOP INSTRUCTIONS:
You are in an autonomous loop. Analyze the context above and decide what to do next.

CRITICAL: Base all decisions on KNOWN FACTS from grounding. Do NOT infer or assume information not provided.

Respond with a JSON object:
{
  "action": "propose_task" | "propose_memo" | "wait" | "complete_objective",
  "reasoning": "Brief explanation of your decision",
  "details": {
    // For propose_task:
    "title": "Task title",
    "description": "What to accomplish",
    "completion_criteria": "How to know it's done"
    
    // For propose_memo:
    "to_role": "Role name to send to",
    "content": "Memo content"
    
    // For complete_objective:
    "objective_id": "UUID of completed objective",
    "summary": "What was accomplished"
    
    // For wait:
    "reason": "Why waiting is appropriate"
  }
}

Rules:
- If you have pending workflow requests, action should be "wait"
- If objectives are complete, propose a new one or mark complete
- Be specific and actionable in proposals
- Consider company stage when calibrating urgency
- NEVER propose strategy that contradicts known facts or makes assumptions about unknowns
- NEVER propose tasks claiming to deploy, send, or access external systems (except Product/Builder proposing Lovable-implementable features)
- If external integrations are needed, propose a memo to CEO requesting them
- For non-technical roles: ONLY propose tasks that produce documents, research, memos, or internal communications
- For Product/Builder roles: You MAY propose development tasks with implementation specs for Lovable to build
`;

}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Gather context for the role
    const context = await gatherContext(supabase, role_id);
    if (!context) {
      return new Response(JSON.stringify({ error: "Role not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GROUNDING CHECK: If company is not grounded, block autonomous behavior
    if (!context.isGrounded) {
      return new Response(
        JSON.stringify({
          action: "blocked",
          mode: "grounding_required",
          reasoning: "Company has not completed the grounding phase. Autonomous behavior is disabled until foundational facts are established.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTIVATION CHECK: If role is not activated, block autonomous behavior
    if (!context.role.is_activated) {
      return new Response(
        JSON.stringify({
          action: "blocked",
          mode: "activation_required",
          reasoning: "Role has not been activated. Complete the activation wizard first.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already awaiting approval, don't run loop
    if (context.role.workflow_status === "awaiting_approval") {
      return new Response(
        JSON.stringify({
          action: "wait",
          reasoning: "Role is awaiting approval on existing request",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If has pending requests, wait
    if (context.pendingRequests > 0) {
      return new Response(
        JSON.stringify({
          action: "wait",
          reasoning: `Role has ${context.pendingRequests} pending workflow request(s)`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build autonomous prompt and call AI
    const prompt = buildAutonomousPrompt(context);
    
    const MOLTBOT_API_URL = Deno.env.get("MOLTBOT_API_URL");
    const MOLTBOT_API_KEY = Deno.env.get("MOLTBOT_API_KEY");

    if (!MOLTBOT_API_URL || !MOLTBOT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Moltbot API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch(`${MOLTBOT_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MOLTBOT_API_KEY}`,
      },
      body: JSON.stringify({
        company_id: context.role.company_id,
        role_id: role_id,
        message: prompt,
        messages: [
          { role: "system", content: "You are an autonomous AI role in a company operating system. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI decision
    let decision;
    try {
      // Extract JSON from response (may have markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI decision", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute the decision and build audit message
    let auditMessage = "";

    if (decision.action === "propose_task" && decision.details) {
      // Create a workflow request for the task
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
        // Update role status
        await supabase
          .from("roles")
          .update({ workflow_status: "awaiting_approval" })
          .eq("id", role_id);
      }

      // Build rich audit message for task proposals
      auditMessage = `🤖 **Autonomous Action: Task Proposed**

**Reasoning:** ${decision.reasoning}

---

📋 **Proposed Task:**
- **Title:** ${decision.details.title}
- **Description:** ${decision.details.description}
- **Completion Criteria:** ${decision.details.completion_criteria}

⏳ *Awaiting approval in the Workflow panel.*`;

    } else if (decision.action === "propose_memo" && decision.details) {
      // Find target role
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
        auditMessage = `🤖 **Autonomous Action: Memo Proposed**

**Reasoning:** ${decision.reasoning}

---

📬 **Proposed Memo to ${targetName}:**
${decision.details.content}

⏳ *Awaiting approval in the Workflow panel.*`;
      }
    } else if (decision.action === "complete_objective" && decision.details?.objective_id) {
      // Mark objective as completed
      await supabase
        .from("role_objectives")
        .update({ status: "completed" })
        .eq("id", decision.details.objective_id);

      auditMessage = `🤖 **Autonomous Action: Objective Completed**

**Reasoning:** ${decision.reasoning}

✅ *Objective marked as complete.*`;
    } else if (decision.action === "wait") {
      auditMessage = `🤖 **Autonomous Action: Waiting**

**Reasoning:** ${decision.reasoning}

⏸️ *No action required at this time.*`;
    } else {
      // Fallback for any other action
      auditMessage = `🤖 **Autonomous Action: ${decision.action}**

**Reasoning:** ${decision.reasoning}`;
    }

    // Log the decision as a message (fixed: use "ai" not "assistant")
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
