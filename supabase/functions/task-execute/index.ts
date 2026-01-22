import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
- role-autonomous-loop: Observe-Decide-Propose cycle for autonomous roles
- task-execute: This function - Runs tasks with AI, evaluates output, handles retries
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

### PRODUCT & BUILDER ROLES - Development Task Outputs:
When executing development tasks, Product and Builder roles should output:
- Implementation specifications that Lovable can directly use
- File names, component names, and table names to modify
- Acceptance criteria that can be verified after implementation
- Step-by-step implementation guidance referencing actual code patterns

Example output format for development tasks:
\`\`\`
## Feature: [Feature Name]
### Files to Modify:
- src/components/tasks/TaskDetailView.tsx
### Database Changes:
- ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 1
### Implementation Steps:
1. Add Button component with onClick handler
2. Call supabase.from('tasks').update() with new status
3. Show toast notification on success
### Acceptance Criteria:
- Button appears on task detail page
- Clicking updates task status in database
- Toast confirms success
\`\`\`
`;


interface Task {
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

interface Role {
  name: string;
  mandate: string;
  system_prompt: string;
  memory_scope: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is a service role call (server-to-server)
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    // Service client for writes (bypasses RLS for task_attempts)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // For service role calls, we skip user verification and use service client for reads too
    let supabaseClient;
    if (isServiceRole) {
      supabaseClient = supabaseService;
    } else {
      // User client for RLS-aware reads
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });

      // Verify user
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authorization" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      supabaseClient = supabaseUser;
    }

    // Fetch task
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

    // Check task status
    if (task.status === "completed" || task.status === "stopped") {
      return new Response(
        JSON.stringify({ error: `Task is already ${task.status}`, task }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (task.current_attempt >= task.max_attempts) {
      // Mark as blocked if max attempts reached
      await supabaseService
        .from("tasks")
        .update({ status: "blocked" })
        .eq("id", task_id);
      
      return new Response(
        JSON.stringify({ error: "Max attempts reached", task: { ...task, status: "blocked" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set status to running if pending
    if (task.status === "pending") {
      await supabaseService
        .from("tasks")
        .update({ status: "running" })
        .eq("id", task_id);
    }

    // Fetch role
    const { data: role, error: roleError } = await supabaseClient
      .from("roles")
      .select("name, mandate, system_prompt, memory_scope")
      .eq("id", task.role_id)
      .single();

    if (roleError || !role) {
      return new Response(
        JSON.stringify({ error: "Role not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch previous attempts for context
    const { data: previousAttempts } = await supabaseClient
      .from("task_attempts")
      .select("attempt_number, model_output, evaluation_result, evaluation_reason")
      .eq("task_id", task_id)
      .order("attempt_number", { ascending: true });

    // Build context from previous attempts
    let previousAttemptsContext = "";
    if (previousAttempts && previousAttempts.length > 0) {
      previousAttemptsContext = "\n\n## Previous Attempts:\n" + 
        previousAttempts.map(a => 
          `### Attempt ${a.attempt_number} (${a.evaluation_result}):\n${a.model_output}\n\nFeedback: ${a.evaluation_reason || "No specific feedback"}`
        ).join("\n\n");
    }

    // Load company grounding (source of truth for factual context)
    let groundingContext = "";
    const { data: grounding } = await supabaseClient
      .from("company_grounding")
      .select("*")
      .eq("company_id", task.company_id)
      .eq("status", "confirmed")
      .single();

    if (grounding) {
      groundingContext = `\n\n## COMPANY GROUNDING (Source of Truth)
CRITICAL: The following is the ONLY verified factual information about this company. 
Do NOT invent metrics, customer data, prospect information, or business outcomes beyond what is stated here.

### Intended Customer:
${grounding.intended_customer || "Not specified"}

### What Exists (Products/Services):
${Array.isArray(grounding.products) ? grounding.products.map((p: any) => `- ${p.name}: ${p.description || ""}`).join("\n") : "None specified"}

### Entities (People, Systems, Assets):
${Array.isArray(grounding.entities) ? grounding.entities.map((e: any) => `- ${e.name}: ${e.description || ""}`).join("\n") : "None specified"}

### What Does NOT Exist Yet:
${Array.isArray(grounding.not_yet_exists) ? grounding.not_yet_exists.map((n: any) => `- ${n.name}: ${n.description || ""}`).join("\n") : "Nothing specified"}

### Aspirations:
${Array.isArray(grounding.aspirations) ? grounding.aspirations.map((a: any) => `- ${a.description || a}`).join("\n") : "None specified"}

### Constraints:
${Array.isArray(grounding.constraints) ? grounding.constraints.map((c: any) => `- ${c.description || c}`).join("\n") : "None specified"}

### Current State Summary:
${grounding.current_state_summary ? JSON.stringify(grounding.current_state_summary) : "Not available"}
`;
    } else {
      groundingContext = `\n\n## COMPANY GROUNDING
WARNING: No confirmed grounding data available. You have LIMITED factual context about this company.
Do NOT invent business metrics, customer data, or outcomes. If information is needed but not available, explicitly state what data is missing.
`;
    }

    // Load role memory if applicable
    let memoryContext = "";
    const { data: roleMemories } = await supabaseClient
      .from("role_memory")
      .select("content, memory_type")
      .eq("role_id", task.role_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (roleMemories && roleMemories.length > 0) {
      memoryContext = "\n\n## Role Memory:\n" + 
        roleMemories.map(m => `- [${m.memory_type}] ${m.content}`).join("\n");
    }

    // Load company memory (pinned facts from conversations)
    const { data: companyMemories } = await supabaseClient
      .from("company_memory")
      .select("label, content")
      .eq("company_id", task.company_id)
      .order("created_at", { ascending: false })
      .limit(15);

    if (companyMemories && companyMemories.length > 0) {
      memoryContext += "\n\n## Company Memory (Verified Notes):\n" + 
        companyMemories.map(m => `- [${m.label || "note"}] ${m.content}`).join("\n");
    }

    const attemptNumber = task.current_attempt + 1;

    // Build system prompt for task execution
    const systemPrompt = `${role.system_prompt}

You are executing a specific task. Your output must directly address the task requirements.

## Your Role Mandate:
${role.mandate}
${groundingContext}
${AXIS_TECHNICAL_CONTEXT}
${memoryContext}

## Task Details:
Title: ${task.title}
Description: ${task.description}

## Completion Criteria:
${task.completion_criteria}

## CRITICAL ANTI-HALLUCINATION RULES:
1. ONLY reference facts explicitly stated in Company Grounding or Company Memory above
2. Do NOT invent metrics, percentages, customer counts, revenue figures, or conversion rates
3. Do NOT claim to have sent emails, accessed CRMs, or performed external actions you cannot actually do
4. Do NOT fabricate prospect names, company names, or specific business outcomes
5. If the task requires data you don't have, your output MUST state: "This task requires [specific data] which is not available. To proceed, I need: [what's needed]."
6. If you can only partially complete the task with available information, clearly distinguish between facts and recommendations/assumptions

## Your Actual Capabilities:
- Research and analysis (based on provided context)
- Creating documents, plans, specifications, and frameworks
- Synthesizing information and making recommendations
- Communicating with other roles via memos

## What You CANNOT Do (do not claim to have done these):
- Send external emails or messages
- Access CRM, analytics, or external databases
- Execute code or deploy software
- Make phone calls or schedule meetings
- Access real-time market data (unless provided)

## Technical Grounding Rules:
- Reference actual table names when discussing data structures (e.g., "role_memos" not "the messaging system")
- Do not propose creating infrastructure that already exists (see Technical Architecture above)
- If task requires unavailable integrations, explicitly state what's missing and provide alternatives
- Acknowledge existing systems before proposing extensions or improvements

## Other Instructions:
1. Focus solely on completing the task as described
2. Your output must satisfy the completion criteria
3. Be thorough but concise
4. If you cannot complete the task, explain why clearly
5. Do not include meta-commentary about the task itself
${previousAttemptsContext ? `\n## Learning from Previous Attempts:\nReview the previous attempts below and improve upon them. Address any feedback provided.\n${previousAttemptsContext}` : ""}

This is attempt ${attemptNumber} of ${task.max_attempts}.`;

    // Execute task with AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Execute the following task:\n\nTitle: ${task.title}\n\nDescription: ${task.description}\n\nCompletion Criteria:\n${task.completion_criteria}\n\nProvide your complete output now.` }
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const modelOutput = aiData.choices?.[0]?.message?.content || "";

    if (!modelOutput) {
      return new Response(
        JSON.stringify({ error: "No output from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Evaluate the output against completion criteria
    const evaluationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: `You are a strict evaluator. Your job is to determine if an AI output meets the specified completion criteria.

Be rigorous but fair. Consider:
- Does the output directly address what was asked?
- Are all criteria points satisfied?
- Is the output complete and actionable?

If you are uncertain whether the criteria are met, return "unclear".
Never assume success without confidence.` 
          },
          { 
            role: "user", 
            content: `## Task Title:
${task.title}

## Task Description:
${task.description}

## Completion Criteria:
${task.completion_criteria}

## AI Output to Evaluate:
${modelOutput}

Evaluate whether this output meets the completion criteria.` 
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "evaluate_completion",
            description: "Evaluate whether the AI output meets the task completion criteria",
            parameters: {
              type: "object",
              properties: {
                result: { 
                  type: "string", 
                  enum: ["pass", "fail", "unclear"],
                  description: "pass: criteria clearly met. fail: criteria clearly not met. unclear: cannot determine with confidence."
                },
                reason: { 
                  type: "string",
                  description: "Brief explanation of the evaluation decision"
                }
              },
              required: ["result", "reason"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "evaluate_completion" } }
      }),
    });

    let evaluationResult: "pass" | "fail" | "unclear" = "unclear";
    let evaluationReason = "Evaluation failed";

    if (evaluationResponse.ok) {
      const evalData = await evaluationResponse.json();
      const toolCall = evalData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          evaluationResult = args.result || "unclear";
          evaluationReason = args.reason || "No reason provided";
        } catch (e) {
          console.error("Failed to parse evaluation:", e);
        }
      }
    } else {
      console.error("Evaluation API error:", await evaluationResponse.text());
    }

    // Store the attempt using service client
    await supabaseService
      .from("task_attempts")
      .insert({
        task_id: task_id,
        attempt_number: attemptNumber,
        model_output: modelOutput,
        evaluation_result: evaluationResult,
        evaluation_reason: evaluationReason,
      });

    // Update task based on evaluation
    let newStatus = task.status;
    let completionSummary = null;

    if (evaluationResult === "pass") {
      newStatus = "completed";
      
      // Generate completion summary
      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { 
              role: "system", 
              content: "Generate a concise completion summary. Include: what was asked, what was delivered, and any assumptions made. Keep it brief and professional." 
            },
            { 
              role: "user", 
              content: `Task: ${task.title}\n\nDescription: ${task.description}\n\nCriteria: ${task.completion_criteria}\n\nOutput: ${modelOutput}` 
            }
          ],
          stream: false,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        completionSummary = summaryData.choices?.[0]?.message?.content || "Task completed successfully.";
      }

      // Ask AI if there are follow-up suggestions (memos or next tasks)
      try {
        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { 
                role: "system", 
                content: `You are an AI role that just completed a task. Analyze if follow-up actions are needed.

Consider:
1. Should another role be notified about this work? (memo)
2. Is there a logical next task that should be done? (next_task)

IMPORTANT: Only suggest follow-ups if truly necessary. Most tasks don't need follow-ups.
If you do suggest a memo, specify which type of role would be the recipient (e.g., "CFO", "Marketing Lead", etc).

Respond with JSON only, no explanation.` 
              },
              { 
                role: "user", 
                content: `Task Completed: ${task.title}
                
Description: ${task.description}

Output delivered:
${modelOutput}

Do you have any follow-up suggestions?` 
              }
            ],
            tools: [{
              type: "function",
              function: {
                name: "suggest_followups",
                description: "Suggest optional follow-up actions after task completion",
                parameters: {
                  type: "object",
                  properties: {
                    has_suggestions: {
                      type: "boolean",
                      description: "Whether there are any follow-up suggestions"
                    },
                    memo: {
                      type: "object",
                      properties: {
                        target_role_type: { type: "string", description: "Type of role to notify (e.g., 'CFO', 'CTO', 'Marketing Lead')" },
                        summary: { type: "string", description: "Brief summary of why this memo is needed" },
                        content: { type: "string", description: "The memo content" }
                      }
                    },
                    next_task: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        completion_criteria: { type: "string" },
                        summary: { type: "string", description: "Brief explanation of why this task is suggested" }
                      }
                    }
                  },
                  required: ["has_suggestions"]
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "suggest_followups" } }
          }),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          const toolCall = followUpData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const suggestions = JSON.parse(toolCall.function.arguments);
            
            if (suggestions.has_suggestions) {
              // Create workflow request for memo if suggested
              if (suggestions.memo?.target_role_type && suggestions.memo?.content) {
                // Try to find a matching role in the company
                const { data: targetRoles } = await supabaseService
                  .from("roles")
                  .select("id, name")
                  .eq("company_id", task.company_id)
                  .neq("id", task.role_id);
                
                // Find best matching role by name
                const targetRole = targetRoles?.find(r => 
                  r.name.toLowerCase().includes(suggestions.memo.target_role_type.toLowerCase()) ||
                  suggestions.memo.target_role_type.toLowerCase().includes(r.name.toLowerCase())
                );

                if (targetRole) {
                  await supabaseService
                    .from("workflow_requests")
                    .insert({
                      company_id: task.company_id,
                      requesting_role_id: task.role_id,
                      target_role_id: targetRole.id,
                      request_type: "send_memo",
                      summary: suggestions.memo.summary || `Notification about: ${task.title}`,
                      proposed_content: suggestions.memo.content,
                      source_task_id: task_id,
                    });
                }
              }

              // Create workflow request for next task if suggested
              if (suggestions.next_task?.title && suggestions.next_task?.description) {
                await supabaseService
                  .from("workflow_requests")
                  .insert({
                    company_id: task.company_id,
                    requesting_role_id: task.role_id,
                    request_type: "suggest_next_task",
                    summary: suggestions.next_task.summary || `Follow-up: ${suggestions.next_task.title}`,
                    proposed_content: JSON.stringify({
                      title: suggestions.next_task.title,
                      description: suggestions.next_task.description,
                      completion_criteria: suggestions.next_task.completion_criteria || "Task completed successfully."
                    }),
                    source_task_id: task_id,
                  });
              }
            }
          }
        }
      } catch (followUpError) {
        console.error("Follow-up suggestion error:", followUpError);
        // Don't fail the main task for follow-up errors
      }
    } else if (evaluationResult === "unclear") {
      newStatus = "blocked";
    } else if (attemptNumber >= task.max_attempts) {
      newStatus = "blocked";
    }
    // If fail and retries remain, status stays "running"

    await supabaseService
      .from("tasks")
      .update({ 
        status: newStatus, 
        current_attempt: attemptNumber,
        completion_summary: completionSummary
      })
      .eq("id", task_id);

    // Fetch updated task
    const { data: updatedTask } = await supabaseService
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    // Log task completion/blocked status to role's chat as audit trail
    if (newStatus === "completed") {
      const completionMessage = `✅ **Task Completed**

**Task:** ${task.title}

---

**Output:**
${modelOutput.substring(0, 1000)}${modelOutput.length > 1000 ? '...' : ''}

---

📊 *Completed in ${attemptNumber} attempt(s).*`;

      await supabaseService.from("role_messages").insert({
        role_id: task.role_id,
        company_id: task.company_id,
        sender: "ai",
        content: completionMessage,
      });
    } else if (newStatus === "blocked") {
      const blockedMessage = `⚠️ **Task Blocked - Needs Review**

**Task:** ${task.title}

---

**Issue:**
${evaluationReason || "Task could not be completed after maximum attempts."}

---

📊 *Attempted ${attemptNumber} time(s). Max attempts: ${task.max_attempts}.*

⏳ *Awaiting human review.*`;

      await supabaseService.from("role_messages").insert({
        role_id: task.role_id,
        company_id: task.company_id,
        sender: "ai",
        content: blockedMessage,
      });
    }

    const shouldRetry = evaluationResult === "fail" && attemptNumber < task.max_attempts;

    // Auto-continue execution if retry needed (self-invoke for next attempt)
    if (shouldRetry) {
      const continueExecution = async () => {
        try {
          await new Promise(r => setTimeout(r, 2000)); // 2 second delay between attempts
          await fetch(
            `${supabaseUrl}/functions/v1/task-execute`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ task_id }),
            }
          );
        } catch (err) {
          console.error("Failed to continue task execution:", err);
        }
      };
      
      // Use EdgeRuntime.waitUntil for background execution
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
        should_retry: shouldRetry
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
