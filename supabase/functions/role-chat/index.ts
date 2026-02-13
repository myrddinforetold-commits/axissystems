import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedWorkflowRequest {
  type: "send_memo" | "start_task";
  target_role_name: string;
  summary: string;
  content: string;
}

// Extract workflow requests from AI response using AI parsing
async function extractWorkflowRequests(
  content: string,
  moltbotApiUrl: string,
  moltbotApiKey: string,
  companyId: string,
  roleId: string
): Promise<ExtractedWorkflowRequest[]> {
  try {
    // Check if the content seems to contain workflow-related content
    const hasWorkflowIndicators = /workflow\s*request|approval\s*required|memo\s*to|task\s*for/i.test(content);
    if (!hasWorkflowIndicators) {
      return [];
    }

    const parseResponse = await fetch(`${moltbotApiUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${moltbotApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: companyId,
        role_id: roleId,
        message: content,
        messages: [
          {
            role: "system",
            content: `You are a parser that extracts workflow requests from AI assistant responses.

Extract any workflow requests the AI is proposing. Look for:
- Memos to other roles (e.g., "Memo to Product", "Send to Marketing")
- Tasks for roles to complete
- Anything marked as "Approval Required: Yes"

Return a JSON array of requests. Each request should have:
- type: "send_memo" or "start_task"
- target_role_name: The name of the target role (e.g., "Product", "Marketing", "Engineering")
- summary: A brief one-line summary of the request
- content: The full content/body of the memo or task

If no workflow requests are found, return an empty array: []

IMPORTANT: Only extract requests that require approval. Do not extract general suggestions or recommendations.
Only return valid JSON, no markdown code blocks.`,
          },
          {
            role: "user",
            content: content,
          },
        ],
        temperature: 0,
      }),
    });

    if (!parseResponse.ok) {
      console.error("Failed to parse workflow requests:", parseResponse.status);
      return [];
    }

    const parseResult = await parseResponse.json();
    const parsedContent = parseResult.choices?.[0]?.message?.content || "[]";
    
    // Clean up the response (remove markdown code blocks if present)
    const cleanedContent = parsedContent
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const requests = JSON.parse(cleanedContent);
    
    if (!Array.isArray(requests)) {
      return [];
    }

    return requests.filter(
      (r: unknown): r is ExtractedWorkflowRequest =>
        typeof r === "object" &&
        r !== null &&
        "type" in r &&
        "target_role_name" in r &&
        "summary" in r &&
        "content" in r &&
        (r.type === "send_memo" || r.type === "start_task")
    );
  } catch (error) {
    console.error("Error extracting workflow requests:", error);
    return [];
  }
}

// Create workflow requests in the database
async function createWorkflowRequests(
  supabaseService: SupabaseClient,
  requests: ExtractedWorkflowRequest[],
  requestingRoleId: string,
  companyId: string
): Promise<void> {
  if (requests.length === 0) return;

  try {
    // Fetch all roles for this company to match names
    const { data: roles } = await supabaseService
      .from("roles")
      .select("id, name")
      .eq("company_id", companyId);

    if (!roles || roles.length === 0) {
      console.error("No roles found for company");
      return;
    }

    const workflowInserts = [];

    for (const request of requests) {
      // Find target role by name (case-insensitive partial match)
      const targetRole = roles.find(
        (r) =>
          r.name.toLowerCase().includes(request.target_role_name.toLowerCase()) ||
          request.target_role_name.toLowerCase().includes(r.name.toLowerCase())
      );

      workflowInserts.push({
        company_id: companyId,
        requesting_role_id: requestingRoleId,
        target_role_id: targetRole?.id || null,
        request_type: request.type,
        summary: request.summary,
        proposed_content: request.content,
        status: "pending",
      });
    }

    if (workflowInserts.length > 0) {
      const { error } = await supabaseService
        .from("workflow_requests")
        .insert(workflowInserts);

      if (error) {
        console.error("Failed to insert workflow requests:", error);
      } else {
        console.log(`Created ${workflowInserts.length} workflow request(s)`);
      }
    }
  } catch (error) {
    console.error("Error creating workflow requests:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { role_id, message } = await req.json();

    if (!role_id || !message) {
      return new Response(
        JSON.stringify({ error: "role_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const MOLTBOT_API_URL = Deno.env.get("MOLTBOT_API_URL");
    const MOLTBOT_API_KEY = Deno.env.get("MOLTBOT_API_KEY");

    if (!MOLTBOT_API_URL || !MOLTBOT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Moltbot API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Create service client for inserting AI responses
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user token using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth claims error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Fetch role data (RLS will ensure user has access)
    const { data: role, error: roleError } = await supabaseUser
      .from("roles")
      .select("id, name, system_prompt, mandate, memory_scope, company_id")
      .eq("id", role_id)
      .single();

    if (roleError || !role) {
      return new Response(
        JSON.stringify({ error: "Role not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch company context for stage-appropriate behavior
    const { data: companyContext } = await supabaseUser
      .from("company_context")
      .select("stage")
      .eq("company_id", role.company_id)
      .maybeSingle();

  // Fetch role memory (private to this role)
  const { data: roleMemories } = await supabaseUser
    .from("role_memory")
    .select("content, memory_type")
    .eq("role_id", role_id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch company memory (shared across roles) if role's memory_scope allows
  let companyMemories: { content: string; label: string | null }[] = [];
  if (role.memory_scope === "company") {
    const { data } = await supabaseUser
      .from("company_memory")
      .select("content, label")
      .eq("company_id", role.company_id)
      .order("created_at", { ascending: false })
      .limit(15);
    companyMemories = data || [];
  }

  // Fetch conversation history (last 20 messages)
  const { data: history } = await supabaseUser
    .from("role_messages")
    .select("sender, content")
    .eq("role_id", role_id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Reverse to get chronological order
  const conversationHistory = (history || []).reverse();

  // Build memory context
  let memoryContext = "";
  
  // Add role-specific memory
  if (roleMemories && roleMemories.length > 0) {
    memoryContext += "\n\n## Role Memory (Private):\n" + 
      roleMemories.map(m => `- [${m.memory_type}] ${m.content}`).join("\n");
  }
  
  // Add company-wide memory
  if (companyMemories.length > 0) {
    memoryContext += "\n\n## Company Memory (Shared):\n" + 
      companyMemories.map(m => `- ${m.label ? `[${m.label}] ` : ""}${m.content}`).join("\n");
  }

    // Build stage-specific guidance based on company context
    let stageGuidance = "";
    const stage = companyContext?.stage || "early";
    
    if (stage === "early") {
      stageGuidance = `
## Company Stage Context:
This is an early-stage company with sparse data and high ambiguity.
- Do not ask for data or reports that likely don't exist
- Prefer directional guidance over detailed frameworks
- Keep clarifying questions to 2-3 essential ones maximum
- Offer hypotheses rather than demanding specifics
- Avoid audit-style questioning (e.g., "Where is your data?")
`;
    } else if (stage === "growing") {
      stageGuidance = `
## Company Stage Context:
This company has some established processes but limited historical data.
- Balance structured approaches with flexibility
- Some data may be available but incomplete
- Keep clarifying questions focused and practical
`;
    } else if (stage === "established") {
      stageGuidance = `
## Company Stage Context:
This is an established organization with clear processes.
- Can reference established processes and historical data
- Structured frameworks and detailed analysis are appropriate
- Can ask for specific data and reports when needed
`;
    }

    // Build system prompt with memory and stage context
    const fullSystemPrompt = `${role.system_prompt}${memoryContext}
${stageGuidance}
## Your Mandate:
${role.mandate}

## Behavioral Guidelines:
- Respond only to user input. Do not take autonomous actions.
- Maintain a professional, calm, and helpful tone.
- Stay within the scope of your defined mandate.
- If asked something outside your expertise, acknowledge it politely.

## Workflow Requests:
When you need to propose actions that require human approval (like sending memos to other roles or starting tasks), format them clearly with:
- "Workflow Request" header
- "To:" indicating the target role
- "Type:" indicating "Memo" or "Task"
- "Approval Required: Yes"
- The content of the request

This allows the system to capture your proposals for review.`;

    // Build messages array for AI
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: fullSystemPrompt },
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
      aiMessages.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    // Add current user message
    aiMessages.push({ role: "user", content: message });

    // Store user message
    const { error: insertUserError } = await supabaseUser
      .from("role_messages")
      .insert({
        role_id: role_id,
        company_id: role.company_id,
        sender: "user",
        content: message,
      });

    if (insertUserError) {
      console.error("Failed to store user message:", insertUserError);
    }

    const aiResponse = await fetch(`${MOLTBOT_API_URL}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLTBOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: role.company_id,
        role_id: role_id,
        message: message,
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = aiResponse.headers.get("content-type") || "";
    console.log("Moltbot response content-type:", contentType, "status:", aiResponse.status);

    // Check if response is SSE/streaming or plain JSON
    const isStreamingResponse = contentType.includes("text/event-stream") || contentType.includes("text/plain");

    if (!isStreamingResponse) {
      // Non-streaming response: parse as JSON and return as SSE
      const responseText = await aiResponse.text();
      console.log("Moltbot non-streaming response preview:", responseText.substring(0, 300));
      
      let assistantContent = "";
      try {
        const jsonResponse = JSON.parse(responseText);
        // Handle various response formats
        assistantContent = jsonResponse.choices?.[0]?.message?.content 
          || jsonResponse.content 
          || jsonResponse.response 
          || jsonResponse.message
          || (typeof jsonResponse === "string" ? jsonResponse : JSON.stringify(jsonResponse));
      } catch {
        // If not JSON, use raw text (but check for HTML)
        if (responseText.trim().startsWith("<!") || responseText.includes("<html")) {
          console.error("Moltbot returned HTML instead of JSON");
          return new Response(
            JSON.stringify({ error: "AI service returned an error page" }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        assistantContent = responseText;
      }

      // Store AI response
      if (assistantContent) {
        await supabaseService.from("role_messages").insert({
          role_id: role_id,
          company_id: role.company_id,
          sender: "ai",
          content: assistantContent,
        });

        // Check for workflow requests
        const extractedRequests = await extractWorkflowRequests(assistantContent, MOLTBOT_API_URL!, MOLTBOT_API_KEY!, role.company_id, role_id);
        if (extractedRequests.length > 0) {
          await createWorkflowRequests(supabaseService, extractedRequests, role_id, role.company_id);
        }
      }

      // Convert to SSE format for the frontend
      const encoder = new TextEncoder();
      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: assistantContent } }] })}\n\ndata: [DONE]\n\n`;
      
      return new Response(encoder.encode(sseData), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Streaming response: pipe through with content capture
    let fullResponse = "";
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        
        // Parse SSE data to extract content
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content || json.content;
              if (content) {
                fullResponse += content;
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
        
        controller.enqueue(chunk);
      },
    });

    const reader = aiResponse.body!.getReader();
    const writer = transformStream.writable.getWriter();

    // Background task: pipe chunks then run DB operations after stream ends
    const pipeAndProcess = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
        await writer.close();

        // NOW execute DB operations
        if (fullResponse) {
          console.log("Storing AI response, length:", fullResponse.length);
          
          const { error: insertError } = await supabaseService
            .from("role_messages")
            .insert({
              role_id: role_id,
              company_id: role.company_id,
              sender: "ai",
              content: fullResponse,
            });

          if (insertError) {
            console.error("Failed to store AI message:", insertError);
          }

          console.log("Checking for workflow requests in response...");
          const extractedRequests = await extractWorkflowRequests(fullResponse, MOLTBOT_API_URL!, MOLTBOT_API_KEY!, role.company_id, role_id);
          
          if (extractedRequests.length > 0) {
            console.log(`Extracted ${extractedRequests.length} workflow request(s)`);
            await createWorkflowRequests(supabaseService, extractedRequests, role_id, role.company_id);
          }
        }
      } catch (error) {
        console.error("Pipe and process error:", error);
      }
    };

    pipeAndProcess();

    return new Response(transformStream.readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("role-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
