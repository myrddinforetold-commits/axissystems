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

    // Verify user
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        target_role:roles!workflow_requests_target_role_id_fkey(id, name, display_name)
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

    // Verify user has permission (company owner or platform admin)
    const { data: isOwner } = await supabaseService.rpc("is_company_owner", {
      _user_id: user.id,
      _company_id: request.company_id,
    });

    const { data: isAdmin } = await supabaseService.rpc("has_app_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the workflow request status
    const newStatus = action === "approve" ? "approved" : "denied";
    const { error: updateError } = await supabaseService
      .from("workflow_requests")
      .update({
        status: newStatus,
        reviewed_by: user.id,
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

          // Auto-create objective from memo directive and activate the role
          try {
            const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
            if (LOVABLE_API_KEY) {
              const objectivePrompt = `Extract a single actionable objective from this directive memo. Return JSON only: {"title": "short title max 50 chars", "description": "one sentence description max 100 chars"}

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
                  const objectiveData = JSON.parse(objectiveText);
                  
                  // Create objective for target role
                  const { error: objError } = await supabaseService.from("role_objectives").insert({
                    role_id: request.target_role_id,
                    company_id: request.company_id,
                    title: objectiveData.title,
                    description: objectiveData.description,
                    status: "active",
                    priority: 1,
                    created_by: user.id,
                  });

                  if (!objError) {
                    // Mark role as activated (skip wizard)
                    await supabaseService
                      .from("roles")
                      .update({ is_activated: true })
                      .eq("id", request.target_role_id);
                    
                    console.log(`Auto-created objective for role from memo: ${objectiveData.title}`);
                  } else {
                    console.error("Error creating objective from memo:", objError);
                  }
                }
              }
            }
          } catch (objErr) {
            console.error("Failed to auto-create objective from memo:", objErr);
            // Non-fatal - memo was still sent
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
              assigned_by: user.id,
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

          // Auto-start task execution (fire and forget using waitUntil)
          if (createdTask?.id) {
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
            
            // Use EdgeRuntime.waitUntil for background execution
            (globalThis as any).EdgeRuntime?.waitUntil?.(executeTask()) ?? executeTask();
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
