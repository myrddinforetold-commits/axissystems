import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MOLTBOT_API_URL = Deno.env.get("MOLTBOT_API_URL");
    const MOLTBOT_API_KEY = Deno.env.get("MOLTBOT_API_KEY");

    if (!MOLTBOT_API_URL || !MOLTBOT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Moltbot not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to fetch all data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is a member of this company
    const { data: membership } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", company_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this company" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all needed data in parallel
    const [companyRes, groundingRes, rolesRes, ownerRes] = await Promise.all([
      supabase.from("companies").select("id, name").eq("id", company_id).single(),
      supabase
        .from("company_grounding")
        .select("products, entities, intended_customer, constraints")
        .eq("company_id", company_id)
        .single(),
      supabase
        .from("roles")
        .select("id, name, mandate")
        .eq("company_id", company_id),
      supabase
        .from("company_members")
        .select("user_id")
        .eq("company_id", company_id)
        .eq("role", "owner")
        .single(),
    ]);

    const company = companyRes.data;
    const grounding = groundingRes.data;
    const roles = rolesRes.data;

    // Get owner profile name
    let ownerName = "Founder";
    if (ownerRes.data?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", ownerRes.data.user_id)
        .single();
      if (profile?.display_name) {
        ownerName = profile.display_name;
      }
    }

    const provisionPayload = {
      company_id: company?.id,
      company_name: company?.name,
      grounding: {
        products: grounding?.products || [],
        entities: grounding?.entities || [],
        intendedCustomer: grounding?.intended_customer,
        constraints: grounding?.constraints || [],
      },
      roles:
        roles?.map((r) => ({
          id: r.id,
          name: r.name,
          mandate: r.mandate,
        })) || [],
      owner: {
        name: ownerName,
      },
    };

    console.log("Provisioning Moltbot agents for company:", company?.name);

    const response = await fetch(`${MOLTBOT_API_URL}/provision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLTBOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(provisionPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Moltbot provision failed:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Provision failed", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("Moltbot provision successful:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Provision error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
