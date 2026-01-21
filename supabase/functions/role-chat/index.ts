import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
- If asked something outside your expertise, acknowledge it politely.`;

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

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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

    // Create a transform stream to capture the full response
    let fullResponse = "";
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        
        // Parse SSE data to extract content
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
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
      async flush() {
        // Store AI response after stream completes
        if (fullResponse) {
          await supabaseService
            .from("role_messages")
            .insert({
              role_id: role_id,
              company_id: role.company_id,
              sender: "ai",
              content: fullResponse,
            });
        }
      },
    });

    // Pipe the AI response through our transform stream
    aiResponse.body?.pipeTo(writable);

    return new Response(readable, {
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
