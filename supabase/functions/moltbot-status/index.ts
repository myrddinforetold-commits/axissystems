const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AXIS_API_URL = Deno.env.get("AXIS_API_URL");
    const AXIS_API_SECRET = Deno.env.get("AXIS_API_SECRET");

    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");
    const roleId = url.searchParams.get("role_id");

    if (!companyId || !roleId) {
      return new Response(
        JSON.stringify({ error: "company_id and role_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!AXIS_API_URL || !AXIS_API_SECRET) {
      // Graceful degradation — return idle status
      return new Response(
        JSON.stringify({
          status: "idle",
          last_active: null,
          pending_workflow: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(`${AXIS_API_URL}/api/v1/status?company_id=${companyId}&role_id=${roleId}`, {
      headers: {
        Authorization: `Bearer ${AXIS_API_SECRET}`,
      },
    });

    if (!res.ok) {
      // Graceful degradation — return idle status
      return new Response(
        JSON.stringify({
          status: "idle",
          last_active: null,
          pending_workflow: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("moltbot-status error:", error);
    return new Response(
      JSON.stringify({
        status: "idle",
        last_active: null,
        pending_workflow: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
