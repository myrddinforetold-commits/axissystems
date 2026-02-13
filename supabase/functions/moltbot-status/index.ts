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
    const MOLTBOT_API_URL = Deno.env.get("MOLTBOT_API_URL");
    const MOLTBOT_API_KEY = Deno.env.get("MOLTBOT_API_KEY");

    if (!MOLTBOT_API_URL || !MOLTBOT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Moltbot API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");
    const roleId = url.searchParams.get("role_id");

    if (!companyId || !roleId) {
      return new Response(
        JSON.stringify({ error: "company_id and role_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(
      `${MOLTBOT_API_URL}/status?company_id=${companyId}&role_id=${roleId}`,
      {
        headers: {
          Authorization: `Bearer ${MOLTBOT_API_KEY}`,
        },
      }
    );

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
