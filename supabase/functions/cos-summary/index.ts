import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  role_id: string;
  report_type: "weekly_summary" | "blockers" | "action_items";
  date_range?: {
    start: string;
    end: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { role_id, report_type, date_range }: RequestBody = await req.json();

    if (!role_id || !report_type) {
      return new Response(JSON.stringify({ error: "Missing role_id or report_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user-authenticated client for validation
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service role client for cross-role data access
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const MOLTBOT_API_URL = Deno.env.get("MOLTBOT_API_URL");
    const MOLTBOT_API_KEY = Deno.env.get("MOLTBOT_API_KEY");

    if (!MOLTBOT_API_URL || !MOLTBOT_API_KEY) {
      return new Response(JSON.stringify({ error: "Moltbot API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the CoS role and verify it's an orchestrator
    const { data: role, error: roleError } = await supabaseService
      .from("roles")
      .select("id, name, mandate, company_id, authority_level")
      .eq("id", role_id)
      .single();

    if (roleError || !role) {
      return new Response(JSON.stringify({ error: "Role not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (role.authority_level !== "orchestrator") {
      return new Response(JSON.stringify({ error: "Only orchestrator roles can generate summaries" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a company member
    const { data: membership } = await supabaseService
      .from("company_members")
      .select("id")
      .eq("company_id", role.company_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this company" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate date range (default to last 7 days)
    const endDate = date_range?.end ? new Date(date_range.end) : new Date();
    const startDate = date_range?.start 
      ? new Date(date_range.start) 
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch ALL roles for this company (except the orchestrator itself)
    const { data: allRoles } = await supabaseService
      .from("roles")
      .select("id, name, mandate, authority_level")
      .eq("company_id", role.company_id)
      .neq("id", role_id);

    // Fetch ALL role conversations for the company within date range
    const { data: allMessages } = await supabaseService
      .from("role_messages")
      .select("content, sender, created_at, role_id")
      .eq("company_id", role.company_id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    // Fetch company memories
    const { data: companyMemories } = await supabaseService
      .from("company_memory")
      .select("content, label, created_at")
      .eq("company_id", role.company_id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Group messages by role
    const messagesByRole: Record<string, typeof allMessages> = {};
    allMessages?.forEach((msg) => {
      if (!messagesByRole[msg.role_id]) {
        messagesByRole[msg.role_id] = [];
      }
      messagesByRole[msg.role_id]!.push(msg);
    });

    // Build context for AI
    let contextSections = "";

    // Add role conversations
    allRoles?.forEach((r) => {
      const roleMessages = messagesByRole[r.id] || [];
      if (roleMessages.length > 0) {
        contextSections += `\n\n### ${r.name} (${r.authority_level})\n`;
        contextSections += `**Mandate**: ${r.mandate}\n\n`;
        contextSections += "**Recent Conversations**:\n";
        roleMessages.slice(-15).forEach((msg) => {
          const sender = msg.sender === "user" ? "Human" : "AI";
          contextSections += `- [${sender}] ${msg.content.substring(0, 300)}${msg.content.length > 300 ? "..." : ""}\n`;
        });
      }
    });

    // Add company memories
    if (companyMemories && companyMemories.length > 0) {
      contextSections += "\n\n### Company Memory (Shared Context)\n";
      companyMemories.forEach((mem) => {
        contextSections += `- ${mem.label ? `[${mem.label}] ` : ""}${mem.content}\n`;
      });
    }

    // Build report-type specific instructions
    const reportInstructions: Record<string, string> = {
      weekly_summary: `Generate a comprehensive weekly summary covering:
1. Key activities and progress across all departments
2. Notable decisions or outcomes
3. Emerging themes or patterns
4. Suggested priorities for the coming week`,
      blockers: `Identify and analyze blockers:
1. Active blockers preventing progress
2. Potential blockers emerging
3. Dependencies between teams
4. Suggested resolution paths (advisory only)`,
      action_items: `Extract and prioritize action items:
1. Urgent items requiring immediate attention
2. Important but non-urgent items
3. Items requiring cross-team coordination
4. Suggested owners and timelines (advisory only)`,
    };

    const systemPrompt = `You are the Chief of Staff for this organization. Your role is to synthesize information across all departments and provide clear, actionable intelligence to leadership.

You have READ-ONLY access to:
- All role conversations (organized by department/role)
- Company-wide shared memories

Your output should be:
- Objective and factual
- Organized by theme or priority
- Action-oriented but ADVISORY ONLY
- Clear about what requires human decision

You CANNOT:
- Take any actions
- Message other roles
- Make decisions on behalf of anyone

IMPORTANT: All suggestions require human approval before execution.

Format your response as a well-structured markdown report with clear sections and bullet points.

Date Range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}

${reportInstructions[report_type]}`;

    // Call AI to generate report
    const aiResponse = await fetch(`${MOLTBOT_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MOLTBOT_API_KEY}`,
      },
      body: JSON.stringify({
        company_id: role.company_id,
        role_id: role_id,
        message: `Based on the following organizational data, generate the requested report:\n${contextSections || "No data available for this period."}`,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Based on the following organizational data, generate the requested report:\n${contextSections || "No data available for this period."}` },
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to generate report" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const reportContent = aiData.choices?.[0]?.message?.content || "Unable to generate report.";

    // Store the report
    const { data: savedReport, error: saveError } = await supabaseService
      .from("cos_reports")
      .insert({
        company_id: role.company_id,
        role_id: role_id,
        report_type: report_type,
        content: reportContent,
        generated_by: user.id,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save report:", saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: {
          id: savedReport?.id,
          content: reportContent,
          report_type: report_type,
          created_at: savedReport?.created_at || new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in cos-summary:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
